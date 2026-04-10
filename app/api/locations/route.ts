import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '../../lib/supabase-server'
import { calculateOptimalMidpoint } from '../../lib/midpoint'
import { fetchAndSaveVenues } from '../../lib/venues'
import { VOTING_DURATION_MS } from '../../lib/constants'

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

      // Update meetup: new midpoint + promote to voting + set timer
      const votingEndsAt = new Date(Date.now() + VOTING_DURATION_MS).toISOString()
      const { error: updateError } = await supabaseAdmin
        .from('meetups')
        .update({ midpoint_lat: midpoint.lat, midpoint_lng: midpoint.lng, status: 'voting', voting_ends_at: votingEndsAt })
        .eq('id', meetupId)

      if (updateError) throw updateError

      // Read venue_types from meetup for category-aware search
      const { data: meetup } = await supabaseAdmin
        .from('meetups').select('venue_types').eq('id', meetupId).single()
      const types = meetup?.venue_types ?? ['restaurant']

      await fetchAndSaveVenues(midpoint.lat, midpoint.lng, meetupId, { types })
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Add location error:', error)
    return NextResponse.json({ error: 'Failed to add location' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { locationId, adminToken } = await req.json()

    if (!locationId || !adminToken) {
      return NextResponse.json({ error: 'locationId and adminToken are required' }, { status: 400 })
    }

    // Verify admin token — find the meetup that owns this location and has this token
    const { data: location, error: locFetchError } = await supabaseAdmin
      .from('locations')
      .select('meetup_id')
      .eq('id', locationId)
      .single()

    if (locFetchError || !location) {
      return NextResponse.json({ error: 'Location not found' }, { status: 404 })
    }

    const { data: meetup, error: meetupFetchError } = await supabaseAdmin
      .from('meetups')
      .select('id, admin_token')
      .eq('id', location.meetup_id)
      .single()

    if (meetupFetchError || !meetup) {
      return NextResponse.json({ error: 'Meetup not found' }, { status: 404 })
    }

    if (meetup.admin_token !== adminToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Guard: cannot remove the last location
    const { count, error: countError } = await supabaseAdmin
      .from('locations')
      .select('id', { count: 'exact', head: true })
      .eq('meetup_id', meetup.id)

    if (countError) throw countError
    if ((count ?? 0) <= 1) {
      return NextResponse.json({ error: 'Cannot remove the last location' }, { status: 400 })
    }

    // Delete the location
    const { error: deleteError } = await supabaseAdmin
      .from('locations')
      .delete()
      .eq('id', locationId)

    if (deleteError) throw deleteError

    // Fetch remaining locations
    const { data: remaining, error: remainError } = await supabaseAdmin
      .from('locations')
      .select('name, address, lat, lng')
      .eq('meetup_id', meetup.id)

    if (remainError) throw remainError

    // Clear old venues (cascades to votes — intentional)
    await supabaseAdmin.from('venues').delete().eq('meetup_id', meetup.id)

    if (remaining && remaining.length >= 2) {
      const midpoint = await calculateOptimalMidpoint(remaining as any)
      const votingEndsAt = new Date(Date.now() + VOTING_DURATION_MS).toISOString()
      await supabaseAdmin
        .from('meetups')
        .update({ midpoint_lat: midpoint.lat, midpoint_lng: midpoint.lng, status: 'voting', voting_ends_at: votingEndsAt })
        .eq('id', meetup.id)
      const { data: meetupData } = await supabaseAdmin
        .from('meetups').select('venue_types').eq('id', meetup.id).single()
      await fetchAndSaveVenues(midpoint.lat, midpoint.lng, meetup.id, { types: meetupData?.venue_types ?? ['restaurant'] })
    } else {
      // Back to planning — 1 location left
      await supabaseAdmin
        .from('meetups')
        .update({ midpoint_lat: null, midpoint_lng: null, status: 'planning' })
        .eq('id', meetup.id)
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Remove location error:', error)
    return NextResponse.json({ error: 'Failed to remove location' }, { status: 500 })
  }
}
