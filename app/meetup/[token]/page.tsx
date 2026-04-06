'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { MapPin, Star, Clock, DollarSign, Users, Share2, Check } from 'lucide-react'
import { Venue, Location, Meetup } from '../../lib/types'

export default function MeetupPage() {
  const params = useParams()
  const token = params?.token as string

  const [meetup, setMeetup] = useState<Meetup | null>(null)
  const [venues, setVenues] = useState<Venue[]>([])
  const [voteCounts, setVoteCounts] = useState<Record<string, number>>({})
  const [votedVenueId, setVotedVenueId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadingVenues, setLoadingVenues] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (token) fetchMeetup()
  }, [token])

  const fetchMeetup = async () => {
    try {
      const response = await fetch(`/api/meetups?token=${token}`)
      if (!response.ok) throw new Error('Meetup not found')
      const data = await response.json()
      setMeetup(data)
      if (data.midpoint_lat && data.midpoint_lng) {
        await searchVenues(data.midpoint_lat, data.midpoint_lng, data.id)
        await fetchVoteCounts(data.id)
      }
    } catch (error) {
      console.error('Error fetching meetup:', error)
      setError('Could not load meetup')
    } finally {
      setLoading(false)
    }
  }

  const searchVenues = async (lat: number, lng: number, meetupId: string) => {
    setLoadingVenues(true)
    try {
      const response = await fetch('/api/venues', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lat, lng, radius: 8000, meetupId })
      })
      if (!response.ok) throw new Error('Failed to search venues')
      const data = await response.json()
      setVenues(data.venues || [])
    } catch (error) {
      console.error('Error searching venues:', error)
    } finally {
      setLoadingVenues(false)
    }
  }

  const fetchVoteCounts = async (meetupId: string) => {
    try {
      const response = await fetch(`/api/votes?meetupId=${meetupId}`)
      if (!response.ok) return
      const data = await response.json()
      setVoteCounts(data.counts || {})
    } catch (error) {
      console.error('Error fetching votes:', error)
    }
  }

  const handleVote = async (venue: Venue) => {
    if (!meetup || !venue.id) return
    if (votedVenueId === venue.id) return

    try {
      const response = await fetch('/api/votes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ meetupId: meetup.id, venueId: venue.id })
      })

      const data = await response.json()

      if (response.status === 409) {
        // Already voted — still mark locally
        setVotedVenueId(venue.id)
        return
      }

      if (!response.ok) throw new Error(data.error)

      setVotedVenueId(venue.id)
      setVoteCounts(prev => ({ ...prev, [venue.id!]: data.voteCount }))
    } catch (error) {
      console.error('Vote error:', error)
    }
  }

  const handleShare = async () => {
    const url = window.location.href
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback for browsers that block clipboard
      prompt('Copy this link to share:', url)
    }
  }

  const renderPriceLevel = (level?: number) => {
    if (!level) return null
    return '$'.repeat(level)
  }

  const getVenueImage = (photoReference?: string): string | undefined => {
    if (!photoReference) return undefined
    return `/api/photos?ref=${encodeURIComponent(photoReference)}`
  }

  if (loading) {
    return (
      <div className="text-center py-16">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Loading meetup...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-16">
        <p className="text-red-600">{error}</p>
      </div>
    )
  }

  if (!meetup) {
    return (
      <div className="text-center py-16">
        <p className="text-gray-600">Meetup not found</p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
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
            Starting Points ({meetup.locations?.length ?? 0})
          </h3>
          <div className="grid gap-2">
            {meetup.locations?.map((location: Location, index: number) => (
              <div key={index} className="flex items-start gap-3 p-3 bg-gray-50 rounded">
                <MapPin size={16} className="mt-1 text-gray-400 shrink-0" />
                <div>
                  {location.name && <p className="font-medium text-gray-900">{location.name}</p>}
                  <p className="text-sm text-gray-600">{location.address}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Venues */}
      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
          🎯 Suggested Meeting Spots
          {loadingVenues && (
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary-600"></div>
          )}
        </h2>

        {venues.length === 0 && !loadingVenues ? (
          <div className="text-center py-8 bg-white rounded-lg shadow">
            <p className="text-gray-600">No venues found in this area</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {venues.map((venue) => {
              const voteCount = venue.id ? (voteCounts[venue.id] ?? 0) : 0
              const isVoted = votedVenueId === venue.id

              return (
                <div key={venue.place_id} className="bg-white rounded-lg shadow overflow-hidden">
                  {venue.photo_reference && (
                    <img
                      src={getVenueImage(venue.photo_reference)}
                      alt={venue.name}
                      className="w-full h-48 object-cover"
                    />
                  )}

                  <div className="p-4 space-y-3">
                    <div>
                      <h3 className="font-bold text-lg text-gray-900">{venue.name}</h3>
                      <p className="text-sm text-gray-600 flex items-start gap-1">
                        <MapPin size={14} className="mt-0.5 shrink-0" />
                        {venue.address}
                      </p>
                    </div>

                    <div className="flex items-center gap-4 text-sm">
                      {venue.rating && (
                        <div className="flex items-center gap-1">
                          <Star size={14} className="text-yellow-500 fill-current" />
                          <span className="font-medium">{venue.rating}</span>
                        </div>
                      )}
                      {venue.price_level && (
                        <div className="flex items-center gap-1">
                          <DollarSign size={14} className="text-green-600" />
                          <span>{renderPriceLevel(venue.price_level)}</span>
                        </div>
                      )}
                      {venue.opening_hours?.open_now !== undefined && (
                        <div className="flex items-center gap-1">
                          <Clock size={14} className={venue.opening_hours.open_now ? 'text-green-600' : 'text-red-600'} />
                          <span className={venue.opening_hours.open_now ? 'text-green-600' : 'text-red-600'}>
                            {venue.opening_hours.open_now ? 'Open' : 'Closed'}
                          </span>
                        </div>
                      )}
                    </div>

                    {venue.types && venue.types.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {venue.types.slice(0, 3).map((type) => (
                          <span key={type} className="text-xs bg-gray-100 px-2 py-1 rounded">
                            {type.replace(/_/g, ' ')}
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="flex gap-2 pt-1">
                      <a
                        href={`https://maps.google.com/?q=${encodeURIComponent(venue.name + ' ' + venue.address)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 text-center py-2 px-3 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        Directions
                      </a>
                      <button
                        onClick={() => handleVote(venue)}
                        disabled={!!votedVenueId}
                        className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
                          isVoted
                            ? 'bg-green-600 text-white cursor-default'
                            : votedVenueId
                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                            : 'bg-indigo-600 text-white hover:bg-indigo-700'
                        }`}
                      >
                        {isVoted ? <><Check size={14} /> Voted</> : 'Vote'}
                        {voteCount > 0 && (
                          <span className={`text-xs px-1.5 py-0.5 rounded-full ${isVoted ? 'bg-green-700' : 'bg-indigo-700'}`}>
                            {voteCount}
                          </span>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
