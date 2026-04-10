import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '../../lib/supabase-server'

async function decide(meetupId: string) {
  const { data: votes } = await supabaseAdmin
    .from('votes')
    .select('venue_place_id')
    .eq('meetup_id', meetupId)

  if (!votes || votes.length === 0) return null

  // Count votes per venue
  const counts: Record<string, number> = {}
  for (const v of votes) {
    counts[v.venue_place_id] = (counts[v.venue_place_id] ?? 0) + 1
  }

  // Find max vote count
  const maxVotes = Math.max(...Object.values(counts))
  const tied = Object.keys(counts).filter(id => counts[id] === maxVotes)
  const winnerPlaceId = tied[Math.floor(Math.random() * tied.length)]

  // Fetch the winning venue record
  const { data: winner } = await supabaseAdmin
    .from('venues')
    .select('*')
    .eq('meetup_id', meetupId)
    .eq('place_id', winnerPlaceId)
    .single()

  if (!winner) return null

  await supabaseAdmin
    .from('meetups')
    .update({ status: 'decided', selected_venue_data: winner })
    .eq('id', meetupId)

  return winner
}

export async function POST(req: NextRequest) {
  try {
    const { meetupId, venuePlaceIds, isGoodWithAnything } = await req.json()

    if (!meetupId) {
      return NextResponse.json({ error: 'meetupId is required' }, { status: 400 })
    }

    const forwarded = req.headers.get('x-forwarded-for')
    const voterIp = forwarded ? forwarded.split(',')[0].trim() : 'unknown'

    // Check if already submitted
    const { data: existing } = await supabaseAdmin
      .from('participant_votes')
      .select('id')
      .eq('meetup_id', meetupId)
      .eq('voter_ip', voterIp)
      .single()

    if (existing) {
      return NextResponse.json({ error: 'Already submitted votes' }, { status: 409 })
    }

    // Resolve venue list
    let placeIds: string[] = venuePlaceIds ?? []
    if (isGoodWithAnything) {
      const { data: allVenues } = await supabaseAdmin
        .from('venues')
        .select('place_id')
        .eq('meetup_id', meetupId)
      placeIds = (allVenues ?? []).map(v => v.place_id)
    }

    if (placeIds.length > 0) {
      const rows = placeIds.map(pid => ({
        meetup_id: meetupId,
        venue_place_id: pid,
        voter_ip: voterIp,
      }))
      // upsert to skip duplicates gracefully
      await supabaseAdmin.from('votes').upsert(rows, { onConflict: 'meetup_id,venue_place_id,voter_ip', ignoreDuplicates: true })
    }

    // Record participant submission
    await supabaseAdmin
      .from('participant_votes')
      .insert({ meetup_id: meetupId, voter_ip: voterIp })

    // Check if all participants have voted or timer expired
    const { count: totalParticipants } = await supabaseAdmin
      .from('locations')
      .select('id', { count: 'exact', head: true })
      .eq('meetup_id', meetupId)

    const { count: submittedCount } = await supabaseAdmin
      .from('participant_votes')
      .select('id', { count: 'exact', head: true })
      .eq('meetup_id', meetupId)

    const { data: meetup } = await supabaseAdmin
      .from('meetups')
      .select('voting_ends_at, status')
      .eq('id', meetupId)
      .single()

    let decided = false
    let winner = null
    const timerExpired = meetup?.voting_ends_at && new Date(meetup.voting_ends_at) <= new Date()
    const allVoted = (submittedCount ?? 0) >= (totalParticipants ?? 1)

    if (meetup?.status !== 'decided' && (allVoted || timerExpired)) {
      winner = await decide(meetupId)
      decided = !!winner
    }

    return NextResponse.json({ success: true, decided, winner })

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

    const counts: Record<string, number> = {}
    for (const vote of votes ?? []) {
      counts[vote.venue_place_id] = (counts[vote.venue_place_id] ?? 0) + 1
    }

    // Voting metadata
    const { data: meetup } = await supabaseAdmin
      .from('meetups')
      .select('voting_ends_at, status')
      .eq('id', meetupId)
      .single()

    const { count: totalParticipants } = await supabaseAdmin
      .from('locations')
      .select('id', { count: 'exact', head: true })
      .eq('meetup_id', meetupId)

    const { count: submittedCount } = await supabaseAdmin
      .from('participant_votes')
      .select('id', { count: 'exact', head: true })
      .eq('meetup_id', meetupId)

    // Auto-decide if timer expired and not yet decided
    let decided = meetup?.status === 'decided'
    if (!decided && meetup?.voting_ends_at && new Date(meetup.voting_ends_at) <= new Date()) {
      const winner = await decide(meetupId)
      decided = !!winner
    }

    return NextResponse.json({
      counts,
      votingEndsAt: meetup?.voting_ends_at ?? null,
      totalParticipants: totalParticipants ?? 0,
      submittedCount: submittedCount ?? 0,
      decided,
    })

  } catch (error) {
    console.error('Get votes error:', error)
    return NextResponse.json({ error: 'Failed to get votes' }, { status: 500 })
  }
}
