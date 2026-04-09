'use client'

import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { MapPin, Users, Share2, Check, X } from 'lucide-react'
import { Venue, Location, Meetup } from '../../lib/types'
import { supabase } from '../../lib/supabase-client'
import AddLocationForm from '../../components/meetup/AddLocationForm'
import VenueCard from '../../components/meetup/VenueCard'
import MeetupMap from '../../components/meetup/MeetupMap'

export default function MeetupPage() {
  const params = useParams()
  const token = params?.token as string

  const [meetup, setMeetup] = useState<Meetup | null>(null)
  const [venues, setVenues] = useState<Venue[]>([])
  const [voteCounts, setVoteCounts] = useState<Record<string, number>>({})
  const [votedVenueId, setVotedVenueId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const [hasSubmitted, setHasSubmitted] = useState<boolean | null>(null)
  const [adminToken, setAdminToken] = useState<string | null>(null)
  const [removingId, setRemovingId] = useState<string | null>(null)

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
        }
      }
    } catch {
      setError('Could not load meetup')
    } finally {
      setLoading(false)
    }
  }, [token])

  // Initial load + localStorage check
  useEffect(() => {
    if (!token) return
    setHasSubmitted(localStorage.getItem(`submitted_${token}`) === 'true')
    setAdminToken(localStorage.getItem(`admin_${token}`))
    fetchMeetup()
  }, [token, fetchMeetup])

  // Realtime: re-fetch on any location change or new venue insert
  useEffect(() => {
    if (!meetup?.id) return

    const channel = supabase
      .channel(`meetup-${meetup.id}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'locations',
        filter: `meetup_id=eq.${meetup.id}`,
      }, fetchMeetup)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'venues',
        filter: `meetup_id=eq.${meetup.id}`,
      }, fetchMeetup)
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [meetup?.id, fetchMeetup])

  const handleVote = async (venue: Venue) => {
    if (!meetup || !venue.id || votedVenueId === venue.id) return
    try {
      const response = await fetch('/api/votes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ meetupId: meetup.id, venueId: venue.id }),
      })
      const data = await response.json()
      if (response.status === 409) { setVotedVenueId(venue.id); return }
      if (!response.ok) throw new Error(data.error)
      setVotedVenueId(venue.id)
      setVoteCounts(prev => ({ ...prev, [venue.id!]: data.voteCount }))
    } catch {
      console.error('Vote error')
    }
  }

  const handleShare = async () => {
    const url = window.location.href
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      prompt('Copy this link to share:', url)
    }
  }

  const handleLocationSubmitted = () => {
    localStorage.setItem(`submitted_${token}`, 'true')
    setHasSubmitted(true)
  }

  const handleRemoveLocation = async (locationId: string) => {
    if (!adminToken) return
    setRemovingId(locationId)
    try {
      const res = await fetch('/api/locations', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ locationId, adminToken }),
      })
      if (!res.ok) {
        const data = await res.json()
        console.error('Remove location error:', data.error)
      } else {
        await fetchMeetup()
      }
    } finally {
      setRemovingId(null)
    }
  }

  if (loading) {
    return (
      <div className="text-center py-16">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto" />
        <p className="mt-4 text-gray-600">Loading meetup…</p>
      </div>
    )
  }

  if (error) return <div className="text-center py-16"><p className="text-red-600">{error}</p></div>
  if (!meetup) return <div className="text-center py-16"><p className="text-gray-600">Meetup not found</p></div>

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-1">{meetup.title}</h1>
            {meetup.creator_name && (
              <p className="text-gray-600">Organized by {meetup.creator_name}</p>
            )}
          </div>
          <button
            onClick={handleShare}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors shrink-0"
          >
            {copied ? <Check size={16} className="text-green-600" /> : <Share2 size={16} />}
            {copied ? 'Copied!' : 'Share'}
          </button>
        </div>

        <div className="mt-4 space-y-2">
          <h3 className="font-medium text-gray-900 flex items-center gap-2">
            <Users size={18} />
            Who's Joining ({meetup.locations?.length ?? 0})
          </h3>
          <div className="grid gap-2">
            {meetup.locations?.map((location: Location) => (
              <div key={location.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded">
                <MapPin size={16} className="mt-1 text-gray-400 shrink-0" />
                <div className="flex-1 min-w-0">
                  {location.name && <p className="font-medium text-gray-900">{location.name}</p>}
                  <p className="text-sm text-gray-600">{location.address}</p>
                </div>
                {adminToken && (meetup.locations?.length ?? 0) > 1 && (
                  <button
                    onClick={() => handleRemoveLocation(location.id)}
                    disabled={removingId === location.id}
                    title="Remove location"
                    className="shrink-0 p-1 rounded text-gray-400 hover:text-red-500 hover:bg-red-50 disabled:opacity-50 transition-colors"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Add location form — shown to anyone who hasn't submitted yet.
          hasSubmitted=null means localStorage hasn't been read yet; don't render. */}
      {hasSubmitted === false && (
        <AddLocationForm meetupId={meetup.id} onSubmitted={handleLocationSubmitted} />
      )}

      {/* Planning state — waiting for a second person */}
      {meetup.status === 'planning' && (
        <div className="text-center py-8 bg-white rounded-lg shadow">
          <p className="text-gray-500 text-sm">
            Waiting for more people to join before suggesting venues…
          </p>
        </div>
      )}

      {/* Map + Venues — only once status is voting */}
      {meetup.status === 'voting' && (
        <div className="space-y-6">
          <MeetupMap locations={meetup.locations ?? []} venues={venues} />
          <h2 className="text-xl font-bold text-gray-900 mb-4">🎯 Suggested Meeting Spots</h2>
          {venues.length === 0 ? (
            <div className="text-center py-8 bg-white rounded-lg shadow">
              <p className="text-gray-600">Finding venues near the midpoint…</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {venues.map((venue) => (
                <VenueCard
                  key={venue.place_id}
                  venue={venue}
                  voteCount={venue.id ? (voteCounts[venue.id] ?? 0) : 0}
                  isVoted={votedVenueId === venue.id}
                  votedVenueId={votedVenueId}
                  onVote={handleVote}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
