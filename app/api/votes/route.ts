import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '../../lib/supabase-server'

export async function POST(req: NextRequest) {
  try {
    const { meetupId, venueId, voterName } = await req.json()

    if (!meetupId || !venueId) {
      return NextResponse.json({ error: 'meetupId and venueId are required' }, { status: 400 })
    }

    // Get voter IP for deduplication
    const forwarded = req.headers.get('x-forwarded-for')
    const voterIp = forwarded ? forwarded.split(',')[0].trim() : 'unknown'

    // Check if already voted for this venue (venueId is the Google place_id)
    const { data: existing } = await supabaseAdmin
      .from('votes')
      .select('id')
      .eq('meetup_id', meetupId)
      .eq('venue_place_id', venueId)
      .eq('voter_ip', voterIp)
      .single()

    if (existing) {
      return NextResponse.json({ error: 'Already voted for this venue' }, { status: 409 })
    }

    // Insert vote
    const { error } = await supabaseAdmin
      .from('votes')
      .insert({ meetup_id: meetupId, venue_place_id: venueId, voter_name: voterName || null, voter_ip: voterIp })

    if (error) throw error

    // Return updated vote count for this venue
    const { count } = await supabaseAdmin
      .from('votes')
      .select('*', { count: 'exact', head: true })
      .eq('meetup_id', meetupId)
      .eq('venue_place_id', venueId)

    return NextResponse.json({ success: true, voteCount: count ?? 0 })

  } catch (error) {
    console.error('Vote error:', error)
    return NextResponse.json({ error: 'Failed to record vote' }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const meetupId = searchParams.get('meetupId')

    if (!meetupId) {
      return NextResponse.json({ error: 'meetupId is required' }, { status: 400 })
    }

    const { data: votes, error } = await supabaseAdmin
      .from('votes')
      .select('venue_place_id')
      .eq('meetup_id', meetupId)

    if (error) throw error

    // Count votes per venue (keyed by place_id)
    const counts: Record<string, number> = {}
    for (const vote of votes ?? []) {
      counts[vote.venue_place_id] = (counts[vote.venue_place_id] ?? 0) + 1
    }

    return NextResponse.json({ counts })

  } catch (error) {
    console.error('Get votes error:', error)
    return NextResponse.json({ error: 'Failed to get votes' }, { status: 500 })
  }
}
