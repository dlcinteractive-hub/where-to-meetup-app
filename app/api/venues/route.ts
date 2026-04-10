import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '../../lib/supabase-server'
import { fetchAndSaveVenues } from '../../lib/venues'

export async function POST(req: NextRequest) {
  try {
    const { lat, lng, radius = 5000, types, meetupId } = await req.json()

    if (!lat || !lng) {
      return NextResponse.json({ error: 'lat and lng are required' }, { status: 400 })
    }

    if (!meetupId) {
      return NextResponse.json({ error: 'meetupId is required' }, { status: 400 })
    }

    if (!process.env.GOOGLE_MAPS_API_KEY) {
      return NextResponse.json({ error: 'Maps API not configured' }, { status: 500 })
    }

    // Delete old venues before refetching (cascades to votes — intentional)
    await supabaseAdmin.from('venues').delete().eq('meetup_id', meetupId)

    // Always fetch fresh from Places API + AI ranking
    const venues = await fetchAndSaveVenues(lat, lng, meetupId, { radius, types: types ?? ['restaurant'] })
    return NextResponse.json({ venues })

  } catch (error) {
    console.error('Venue search error:', error)
    return NextResponse.json({ error: 'Failed to search venues' }, { status: 500 })
  }
}
