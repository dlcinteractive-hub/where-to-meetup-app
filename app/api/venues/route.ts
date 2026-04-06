import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { lat, lng, radius = 5000, type = 'restaurant' } = await req.json()

    if (!lat || !lng) {
      return NextResponse.json({ error: 'lat and lng are required' }, { status: 400 })
    }

    const apiKey = process.env.GOOGLE_MAPS_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'Maps API not configured' }, { status: 500 })
    }

    const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=${radius}&type=${type}&key=${apiKey}`
    const response = await fetch(url)
    const data = await response.json()

    if (data.status !== 'OK') {
      throw new Error(`Places API error: ${data.status}`)
    }

    const venues = data.results.slice(0, 10).map((place: any) => ({
      place_id: place.place_id,
      name: place.name,
      address: place.formatted_address,
      lat: place.geometry.location.lat,
      lng: place.geometry.location.lng,
      rating: place.rating,
      price_level: place.price_level,
      types: place.types,
      photo_reference: place.photos?.[0]?.photo_reference,
      opening_hours: place.opening_hours
    }))

    return NextResponse.json({ venues })

  } catch (error) {
    console.error('Venue search error:', error)
    return NextResponse.json({ error: 'Failed to search venues' }, { status: 500 })
  }
}
