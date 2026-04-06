'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { MapPin, Plus, X } from 'lucide-react'

interface Location {
  name: string
  address: string
  lat?: number
  lng?: number
}

export default function HomePage() {
  const [title, setTitle] = useState('')
  const [creatorName, setCreatorName] = useState('')
  const [locations, setLocations] = useState<Location[]>([
    { name: '', address: '' },
    { name: '', address: '' }
  ])
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const addLocation = () => {
    setLocations([...locations, { name: '', address: '' }])
  }

  const removeLocation = (index: number) => {
    if (locations.length > 2) {
      setLocations(locations.filter((_, i) => i !== index))
    }
  }

  const updateLocation = (index: number, field: 'name' | 'address', value: string) => {
    const updated = locations.map((loc, i) => 
      i === index ? { ...loc, [field]: value } : loc
    )
    setLocations(updated)
  }

  const geocodeAddress = async (address: string): Promise<{ lat: number; lng: number } | null> => {
    try {
      const response = await fetch('/api/geocode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address })
      })
      if (!response.ok) return null
      return await response.json()
    } catch (error) {
      console.error('Geocoding error:', error)
      return null
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // Geocode all addresses
      const geocodedLocations = await Promise.all(
        locations.map(async (loc) => {
          if (!loc.address.trim()) return null
          
          const coords = await geocodeAddress(loc.address)
          if (!coords) return null

          return {
            name: loc.name || loc.address,
            address: loc.address,
            lat: coords.lat,
            lng: coords.lng
          }
        })
      )

      const validLocations = geocodedLocations.filter(Boolean)

      if (validLocations.length < 2) {
        alert('Please provide at least 2 valid addresses')
        setLoading(false)
        return
      }

      // Create meetup
      const response = await fetch('/api/meetups', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: title || 'Meetup',
          creatorName: creatorName || 'Anonymous',
          locations: validLocations
        })
      })

      if (!response.ok) throw new Error('Failed to create meetup')

      const result = await response.json()
      router.push(`/meetup/${result.shareToken}`)

    } catch (error) {
      console.error('Error creating meetup:', error)
      alert('Failed to create meetup. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h2 className="text-3xl font-bold text-gray-900 mb-4">
          Plan the Perfect Meetup
        </h2>
        <p className="text-lg text-gray-600">
          Add everyone's locations and we'll find the best place to meet
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 bg-white rounded-lg shadow p-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Meetup Title (optional)
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Weekend lunch, Team meetup, etc."
            className="input-field w-full"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Your Name (optional)
          </label>
          <input
            type="text"
            value={creatorName}
            onChange={(e) => setCreatorName(e.target.value)}
            placeholder="Who's organizing this?"
            className="input-field w-full"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-4">
            📍 Starting Locations
          </label>
          <div className="space-y-4">
            {locations.map((location, index) => (
              <div key={index} className="flex gap-3 items-start">
                <div className="flex-1 space-y-2">
                  <input
                    type="text"
                    value={location.name}
                    onChange={(e) => updateLocation(index, 'name', e.target.value)}
                    placeholder={`Person ${index + 1} name (optional)`}
                    className="input-field w-full"
                  />
                  <input
                    type="text"
                    value={location.address}
                    onChange={(e) => updateLocation(index, 'address', e.target.value)}
                    placeholder="Address, city, or landmark"
                    className="input-field w-full"
                    required
                  />
                </div>
                {locations.length > 2 && (
                  <button
                    type="button"
                    onClick={() => removeLocation(index)}
                    className="mt-1 p-2 text-red-500 hover:bg-red-50 rounded"
                  >
                    <X size={20} />
                  </button>
                )}
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={addLocation}
            className="mt-4 flex items-center gap-2 text-primary-600 hover:text-primary-700"
          >
            <Plus size={20} />
            Add another location
          </button>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="btn-primary w-full py-3 text-lg font-medium disabled:opacity-50"
        >
          {loading ? 'Finding the perfect spot...' : '🎯 Find Meeting Spots'}
        </button>
      </form>
    </div>
  )
}