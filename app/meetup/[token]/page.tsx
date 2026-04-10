'use client'

import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { MapPin, Users, Share2, Check, X, Trophy } from 'lucide-react'
import { Venue, Location, Meetup } from '../../lib/types'
import AddLocationForm from '../../components/meetup/AddLocationForm'
import VenueCard from '../../components/meetup/VenueCard'
import MeetupMap from '../../components/meetup/MeetupMap'

export default function MeetupPage() {
  const params = useParams()
  const token = params?.token as string

  const [meetup, setMeetup] = useState<Meetup | null>(null)
  const [venues, setVenues] = useState<Venue[]>([])
  const [voteCounts, setVoteCounts] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const [hasSubmittedLocation, setHasSubmittedLocation] = useState<boolean | null>(null)
  const [adminToken, setAdminToken] = useState<string | null>(null)
  const [removingId, setRemovingId] = useState<string | null>(null)
  const [priceLevels, setPriceLevels] = useState<Set<number>>(new Set([1, 2, 3, 4]))

  // Voting state
  const [selectedVenueIds, setSelectedVenueIds] = useState<Set<string>>(new Set())
  const [hasSubmittedVotes, setHasSubmittedVotes] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [votingEndsAt, setVotingEndsAt] = useState<Date | null>(null)
  const [timeRemaining, setTimeRemaining] = useState<string | null>(null)

  const fetchMeetup = useCallback(async () => {
    try {
      const response = await fetch(`/api/meetups?token=${token}`)
      if (!response.ok) throw new Error('Meetup not found')
      const data = await response.json()
      setMeetup(data)
      setVenues(data.venues || [])
      if (data.id) {
        const votesRes = await fetch(`/api/votes?meetupId=${data.id}`)
        if (votesRes.ok) {
          const votesData = await votesRes.json()
          setVoteCounts(votesData.counts || {})
          if (votesData.votingEndsAt) setVotingEndsAt(new Date(votesData.votingEndsAt))
        }
      }
    } catch {
      setError('Could not load meetup')
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    if (!token) return
    setHasSubmittedLocation(localStorage.getItem(`submitted_${token}`) === 'true')
    setHasSubmittedVotes(localStorage.getItem(`voted_${token}`) === 'true')
    setAdminToken(localStorage.getItem(`admin_${token}`))
    fetchMeetup()
  }, [token, fetchMeetup])

  // Polling
  useEffect(() => {
    const interval = setInterval(fetchMeetup, 5000)
    return () => clearInterval(interval)
  }, [fetchMeetup])

  // Countdown timer
  useEffect(() => {
    if (!votingEndsAt || meetup?.status === 'decided') { setTimeRemaining(null); return }
    const tick = () => {
      const diff = votingEndsAt.getTime() - Date.now()
      if (diff <= 0) { setTimeRemaining('0:00'); fetchMeetup(); return }
      const mins = Math.floor(diff / 60000)
      const secs = Math.floor((diff % 60000) / 1000)
      setTimeRemaining(`${mins}:${secs.toString().padStart(2, '0')}`)
    }
    tick()
    const interval = setInterval(tick, 1000)
    return () => clearInterval(interval)
  }, [votingEndsAt, meetup?.status, fetchMeetup])

  const toggleVenue = (placeId: string) => {
    if (hasSubmittedVotes) return
    setSelectedVenueIds(prev => {
      const next = new Set(prev)
      if (next.has(placeId)) next.delete(placeId); else next.add(placeId)
      return next
    })
  }

  const submitVotes = async (isGoodWithAnything: boolean) => {
    if (!meetup || submitting) return
    setSubmitting(true)
    try {
      const res = await fetch('/api/votes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          meetupId: meetup.id,
          venuePlaceIds: isGoodWithAnything ? [] : Array.from(selectedVenueIds),
          isGoodWithAnything,
        }),
      })
      if (res.status === 409) { setHasSubmittedVotes(true); localStorage.setItem(`voted_${token}`, 'true'); return }
      if (!res.ok) return
      setHasSubmittedVotes(true)
      localStorage.setItem(`voted_${token}`, 'true')
      await fetchMeetup()
    } finally {
      setSubmitting(false)
    }
  }

  const handleShare = async () => {
    const url = window.location.href
    try { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 2000) }
    catch { prompt('Copy this link to share:', url) }
  }

  const handleLocationSubmitted = () => { localStorage.setItem(`submitted_${token}`, 'true'); setHasSubmittedLocation(true) }

  const handleRemoveLocation = async (locationId: string) => {
    if (!adminToken) return
    setRemovingId(locationId)
    try {
      const res = await fetch('/api/locations', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ locationId, adminToken }) })
      if (res.ok) await fetchMeetup()
    } finally { setRemovingId(null) }
  }

  if (loading) return (
    <div className="text-center py-16">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto" />
      <p className="mt-4 text-gray-600">Loading meetup…</p>
    </div>
  )
  if (error) return <div className="text-center py-16"><p className="text-red-600">{error}</p></div>
  if (!meetup) return <div className="text-center py-16"><p className="text-gray-600">Meetup not found</p></div>

  const winner = meetup.status === 'decided' ? meetup.selected_venue_data : null

  return (
    <div className="space-y-6">
      {/* Winner banner */}
      {winner && (
        <div className="card text-center space-y-4">
          <Trophy size={32} className="mx-auto text-accent-500" />
          <h2 className="font-heading text-2xl font-bold text-brand-dark">Winner: {winner.name}</h2>
          <p className="text-brand-muted">{winner.address}</p>
          <div className="flex gap-3 justify-center">
            <a href={`https://maps.google.com/?q=${encodeURIComponent(winner.name + ' ' + winner.address)}`} target="_blank" rel="noopener noreferrer" className="btn-primary">
              Get Directions
            </a>
            <a href="/" className="btn-secondary">Plan Another Meetup</a>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-1">{meetup.title}</h1>
            {meetup.creator_name && <p className="text-gray-600">Organized by {meetup.creator_name}</p>}
          </div>
          {meetup.status !== 'decided' && (
            <button onClick={handleShare} className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors shrink-0">
              {copied ? <Check size={16} className="text-green-600" /> : <Share2 size={16} />}
              {copied ? 'Link copied!' : 'Invite'}
            </button>
          )}
        </div>
        <div className="mt-4 space-y-2">
          <h3 className="font-medium text-gray-900 flex items-center gap-2"><Users size={18} />Who's Joining ({meetup.locations?.length ?? 0})</h3>
          <div className="grid gap-2">
            {meetup.locations?.map((location: Location) => (
              <div key={location.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded">
                <MapPin size={16} className="mt-1 text-gray-400 shrink-0" />
                <div className="flex-1 min-w-0">
                  {location.name && <p className="font-medium text-gray-900">{location.name}</p>}
                  <p className="text-sm text-gray-600">{location.address}</p>
                </div>
                {adminToken && meetup.status === 'planning' && (meetup.locations?.length ?? 0) > 1 && (
                  <button onClick={() => handleRemoveLocation(location.id)} disabled={removingId === location.id} title="Remove location" className="shrink-0 p-1 rounded text-gray-400 hover:text-red-500 hover:bg-red-50 disabled:opacity-50 transition-colors">
                    <X size={14} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Add location form */}
      {hasSubmittedLocation === false && meetup.status !== 'decided' && (
        <AddLocationForm meetupId={meetup.id} onSubmitted={handleLocationSubmitted} />
      )}

      {/* Planning state */}
      {meetup.status === 'planning' && (
        <div className="text-center py-8 bg-white rounded-lg shadow">
          <p className="text-gray-500 text-sm">Waiting for more people to join before suggesting venues…</p>
        </div>
      )}

      {/* Voting / Decided venue display */}
      {(meetup.status === 'voting' || meetup.status === 'decided') && (() => {
        const filtered = venues.filter(v => !v.price_level || priceLevels.has(v.price_level))
        return (
          <div className="space-y-6">
            <MeetupMap locations={meetup.locations ?? []} venues={filtered} />

            {meetup.status === 'voting' && (
              <div className="flex items-center justify-between flex-wrap gap-3">
                <h2 className="text-xl font-bold text-gray-900">🎯 Pick your favorites</h2>
                <div className="flex items-center gap-3">
                  {timeRemaining && (
                    <span className="text-sm font-medium text-brand-muted">Voting closes in {timeRemaining}</span>
                  )}
                  <div className="flex gap-1">
                    {[1, 2, 3, 4].map(level => (
                      <button key={level} type="button" onClick={() => setPriceLevels(prev => { const n = new Set(prev); if (n.has(level)) n.delete(level); else n.add(level); return n })} className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${priceLevels.has(level) ? 'bg-primary-500 text-white' : 'bg-white text-brand-muted border border-brand-border'}`}>
                        {'$'.repeat(level)}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {meetup.status === 'decided' && (
              <h2 className="text-xl font-bold text-gray-900">🎯 All Venues</h2>
            )}

            {filtered.length === 0 ? (
              <div className="text-center py-8 bg-white rounded-lg shadow">
                <p className="text-gray-600">{venues.length === 0 ? 'Finding venues near the midpoint…' : 'No venues match the selected price filters.'}</p>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {filtered.map((venue) => (
                  <VenueCard
                    key={venue.place_id}
                    id={`venue-${venue.place_id}`}
                    venue={venue}
                    isSelected={selectedVenueIds.has(venue.place_id)}
                    hasSubmitted={hasSubmittedVotes || meetup.status === 'decided'}
                    isWinner={winner?.place_id === venue.place_id}
                    voteCount={voteCounts[venue.place_id] ?? 0}
                    onToggle={toggleVenue}
                  />
                ))}
              </div>
            )}

            {/* Voting controls */}
            {meetup.status === 'voting' && !hasSubmittedVotes && (
              <div className="card space-y-3">
                <button onClick={() => submitVotes(false)} disabled={submitting || selectedVenueIds.size === 0} className="btn-primary w-full py-3 text-base">
                  {submitting ? 'Submitting…' : `Done Voting (${selectedVenueIds.size} selected)`}
                </button>
                <button onClick={() => submitVotes(true)} disabled={submitting} className="btn-secondary w-full py-3 text-base">
                  {submitting ? 'Submitting…' : "I'm good with anything"}
                </button>
              </div>
            )}

            {meetup.status === 'voting' && hasSubmittedVotes && (
              <div className="text-center py-6 bg-white rounded-lg shadow">
                <Check size={24} className="mx-auto text-primary-500 mb-2" />
                <p className="text-brand-dark font-medium">Your votes are in!</p>
                <p className="text-sm text-brand-muted mt-1">Waiting for others…</p>
              </div>
            )}
          </div>
        )
      })()}
    </div>
  )
}
