import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '../../lib/supabase-server'
import { calculateOptimalMidpoint } from '../../lib/midpoint'

export async function POST(req: NextRequest) {
  try {
    const { title, creatorName, locations } = await req.json()

    if (!locations || locations.length < 1) {
      return NextResponse.json({ error: 'At least 1 location is required' }, { status: 400 })
    }

    const { data: meetup, error: meetupError } = await supabaseAdmin
      .from('meetups')
      .insert({ title: title || 'Meetup', creator_name: creatorName || 'Anonymous' })
      .select()
      .single()

    if (meetupError) throw meetupError

    const locationsWithId = locations.map((loc: any) => ({ ...loc, meetup_id: meetup.id }))
    const { error: locationsError } = await supabaseAdmin
      .from('locations')
      .insert(locationsWithId)
    if (locationsError) throw locationsError

    // With 1 location (organizer only), status stays 'planning' and midpoint stays null.
    // Midpoint is set by /api/locations when a second person joins.
    if (locations.length >= 2) {
      const midpoint = await calculateOptimalMidpoint(locations)
      const { error: updateError } = await supabaseAdmin
        .from('meetups')
        .update({ midpoint_lat: midpoint.lat, midpoint_lng: midpoint.lng, status: 'voting' })
        .eq('id', meetup.id)
      if (updateError) throw updateError
      return NextResponse.json(
        { id: meetup.id, shareToken: meetup.share_token, midpoint },
        { status: 201 }
      )
    }

    return NextResponse.json({ id: meetup.id, shareToken: meetup.share_token }, { status: 201 })

  } catch (error) {
    console.error('Error creating meetup:', error)
    return NextResponse.json({ error: 'Failed to create meetup' }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const token = searchParams.get('token')

    if (!token) {
      return NextResponse.json({ error: 'Share token required' }, { status: 400 })
    }

    const { data: meetup, error } = await supabaseAdmin
      .from('meetups')
      .select('*, locations(*), venues(*)')
      .eq('share_token', token)
      .single()

    if (error || !meetup) {
      return NextResponse.json({ error: 'Meetup not found' }, { status: 404 })
    }

    return NextResponse.json(meetup)

  } catch (error) {
    console.error('Error fetching meetup:', error)
    return NextResponse.json({ error: 'Failed to fetch meetup' }, { status: 500 })
  }
}
