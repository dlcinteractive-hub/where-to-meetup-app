'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { MapPin, Star, Clock, DollarSign, Users } from 'lucide-react'

interface Venue {
  place_id: string
  name: string
  address: string
  lat: number
  lng: number
  rating?: number
  price_level?: number
  types?: string[]
  photo_reference?: string
  opening_hours?: {
    open_now: boolean
  }
}

interface Location {
  name: string
  address: string
  lat: number
  lng: number
}

interface Meetup {
  id: string
  title: string
  creator_name?: string
  status: string
  midpoint_lat: number
  midpoint_lng: number
  locations: Location[]
}

export default function MeetupPage() {
  const params = useParams()
  const token = params?.token as string
  
  const [meetup, setMeetup] = useState<Meetup | null>(null)
  const [venues, setVenues] = useState<Venue[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingVenues, setLoadingVenues] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (token) {
      fetchMeetup()
    }
  }, [token])

  const fetchMeetup = async () => {
    try {
      const response = await fetch(`/api/meetups?token=${token}`)
      if (!response.ok) throw new Error('Meetup not found')
      
      const data = await response.json()
      setMeetup(data)
      
      if (data.midpoint_lat && data.midpoint_lng) {
        await searchVenues(data.midpoint_lat, data.midpoint_lng)
      }
    } catch (error) {
      console.error('Error fetching meetup:', error)
      setError('Could not load meetup')
    } finally {
      setLoading(false)
    }
  }

  const searchVenues = async (lat: number, lng: number) => {
    setLoadingVenues(true)
    try {
      const response = await fetch('/api/venues/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ lat, lng, radius: 8000 })
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

  const renderPriceLevel = (level?: number) => {
    if (!level) return null
    return '$'.repeat(level).padEnd(4, '○')
  }

  const getVenueImage = (photoReference?: string): string | undefined => {
    if (!photoReference) return undefined
    return `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photo_reference=${photoReference}&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}`
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
      <div className="bg-white rounded-lg shadow p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          {meetup.title}
        </h1>
        {meetup.creator_name && (
          <p className="text-gray-600 mb-4">
            Organized by {meetup.creator_name}
          </p>
        )}
        
        <div className="space-y-3">
          <h3 className="font-medium text-gray-900 flex items-center gap-2">
            <Users size={18} />
            Starting Points ({meetup.locations.length})
          </h3>
          <div className="grid gap-2">
            {meetup.locations.map((location, index) => (
              <div key={index} className="flex items-start gap-3 p-3 bg-gray-50 rounded">
                <MapPin size={16} className="mt-1 text-gray-400" />
                <div>
                  {location.name && (
                    <p className="font-medium text-gray-900">{location.name}</p>
                  )}
                  <p className="text-sm text-gray-600">{location.address}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

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
            {venues.map((venue) => (
              <div key={venue.place_id} className="venue-card">
                {venue.photo_reference && (
                  <img
                    src={getVenueImage(venue.photo_reference)}
                    alt={venue.name}
                    className="w-full h-48 object-cover rounded-t-lg -m-4 mb-4"
                  />
                )}
                
                <div className="space-y-3">
                  <div>
                    <h3 className="font-bold text-lg text-gray-900">{venue.name}</h3>
                    <p className="text-sm text-gray-600 flex items-start gap-1">
                      <MapPin size={14} className="mt-0.5" />
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
                  
                  <div className="flex gap-2 pt-2">
                    <a
                      href={`https://maps.google.com/?q=${encodeURIComponent(venue.name + ' ' + venue.address)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-primary text-sm"
                    >
                      Get Directions
                    </a>
                    <button className="btn-secondary text-sm">
                      Vote for This
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}