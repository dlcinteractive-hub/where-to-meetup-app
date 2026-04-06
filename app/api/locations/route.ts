import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '../../lib/supabase-server'
import { calculateOptimalMidpoint } from '../../lib/midpoint'
import { fetchAndSaveVenues } from '../../lib/venues'

export async function POST(req: NextRequest) {
  try {
    const { meetupId, name, address, lat, lng } = await req.json()

    if (!meetupId || !address || lat == null || lng == null) {
      return NextResponse.json(
        { error: 'meetupId, address, lat, and lng are required' },
        { status: 400 }
      )
    }

    // Save the new location
    const { error: locError } = await supabaseAdmin
      .from('locations')
      .insert({ meetup_id: meetupId, name: name || address, address, lat, lng })

    if (locError) throw locError

    // Fetch all current locations for this meetup
    const { data: allLocations, error: fetchError } = await supabaseAdmin
      .from('locations')
      .select('name, address, lat, lng')
      .eq('meetup_id', meetupId)

    if (fetchError) throw fetchError

    if (allLocations && allLocations.length >= 2) {
      const midpoint = await calculateOptimalMidpoint(allLocations as any)

      // Clear old venues — cascades to votes (intentional: venues reset when group changes)
      await supabaseAdmin.from('venues').delete().eq('meetup_id', meetupId)

      // Update meetup: new midpoint + promote to voting
      const { error: updateError } = await supabaseAdmin
        .from('meetups')
        .update({ midpoint_lat: midpoint.lat, midpoint_lng: midpoint.lng, status: 'voting' })
        .eq('id', meetupId)

      if (updateError) throw updateError

      // Fetch + save new venues — Realtime notifies all open tabs on INSERT
      await fetchAndSaveVenues(midpoint.lat, midpoint.lng, meetupId)
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Add location error:', error)
    return NextResponse.json({ error: 'Failed to add location' }, { status: 500 })
  }
}
