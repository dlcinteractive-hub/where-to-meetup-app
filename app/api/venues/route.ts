import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '../../lib/supabase-server'

export async function POST(req: NextRequest) {
  try {
    const { lat, lng, radius = 5000, type = 'restaurant', meetupId } = await req.json()

    if (!lat || !lng) {
      return NextResponse.json({ error: 'lat and lng are required' }, { status: 400 })
    }

    const apiKey = process.env.GOOGLE_MAPS_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'Maps API not configured' }, { status: 500 })
    }

    // If meetupId provided, check if venues already saved
    if (meetupId) {
      const { data: existing } = await supabaseAdmin
        .from('venues')
        .select('*')
        .eq('meetup_id', meetupId)
        .limit(10)

      if (existing && existing.length > 0) {
        return NextResponse.json({ venues: existing })
      }
    }

    // Fetch from Places API
    const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=${radius}&type=${type}&key=${apiKey}`
    const response = await fetch(url)
    const data = await response.json()

    if (data.status !== 'OK') {
      throw new Error(`Places API error: ${data.status}`)
    }

    const venues = data.results.slice(0, 10).map((place: any) => ({
      place_id: place.place_id,
      name: place.name,
      address: place.formatted_address ?? place.vicinity,
      lat: place.geometry.location.lat,
      lng: place.geometry.location.lng,
      rating: place.rating ?? null,
      price_level: place.price_level ?? null,
      types: place.types ?? [],
      photo_reference: place.photos?.[0]?.photo_reference ?? null,
      opening_hours: place.opening_hours ?? null,
    }))

    // Save venues to Supabase if meetupId provided
    if (meetupId && venues.length > 0) {
      const venuesWithMeetupId = venues.map((v: any) => ({ ...v, meetup_id: meetupId }))
      const { data: saved, error } = await supabaseAdmin
        .from('venues')
        .insert(venuesWithMeetupId)
        .select()

      if (!error && saved) {
        return NextResponse.json({ venues: saved })
      }
    }

    return NextResponse.json({ venues })

  } catch (error) {
    console.error('Venue search error:', error)
    return NextResponse.json({ error: 'Failed to search venues' }, { status: 500 })
  }
}
