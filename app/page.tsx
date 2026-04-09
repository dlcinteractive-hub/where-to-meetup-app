'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { MapPin } from 'lucide-react'
import AddressAutocomplete from './components/ui/AddressAutocomplete'

export default function HomePage() {
  const [title, setTitle] = useState('')
  const [creatorName, setCreatorName] = useState('')
  const [name, setName] = useState('')
  const [address, setAddress] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const geocodeAddress = async (addr: string): Promise<{ lat: number; lng: number } | null> => {
    try {
      const response = await fetch('/api/geocode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: addr }),
      })
      if (!response.ok) return null
      return await response.json()
    } catch {
      return null
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!address.trim()) return
    setLoading(true)

    try {
      const coords = await geocodeAddress(address)
      if (!coords) {
        alert('Could not find that address. Please try again.')
        setLoading(false)
        return
      }

      const response = await fetch('/api/meetups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title || 'Meetup',
          creatorName: creatorName || 'Anonymous',
          locations: [{ name: name || address, address, lat: coords.lat, lng: coords.lng }],
        }),
      })

      if (!response.ok) throw new Error('Failed to create meetup')
      const result = await response.json()
      // Store admin token so organizer can remove locations on this device
      if (result.adminToken) {
        localStorage.setItem(`admin_${result.shareToken}`, result.adminToken)
      }
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
        <h2 className="font-heading text-4xl font-bold mb-4 text-brand-medium">
          Find the{' '}
          <span className="bg-gradient-to-r from-primary-400 to-accent-400 bg-clip-text text-transparent">
            perfect meeting spot
          </span>
        </h2>
        <p className="text-lg text-brand-muted">
          Enter your starting location, share the link — everyone else adds theirs
        </p>
      </div>

      <form onSubmit={handleSubmit} className="card space-y-6">
        <div>
          <label className="block text-sm font-medium text-brand-dark mb-2">
            Meetup Title (optional)
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Weekend lunch, Team meetup, etc."
            className="input-field"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-brand-dark mb-2">
            Your Name (optional)
          </label>
          <input
            type="text"
            value={creatorName}
            onChange={(e) => setCreatorName(e.target.value)}
            placeholder="Who's organizing this?"
            className="input-field"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-brand-dark mb-4">
            <MapPin size={16} className="inline mr-1" />
            Your Starting Location
          </label>
          <div className="space-y-2">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name for this location (optional)"
              className="input-field"
            />
            <AddressAutocomplete
              value={address}
              onChange={setAddress}
              placeholder="Address, city, or landmark"
              className="input-field"
              required
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading || !address.trim()}
          className="btn-primary w-full py-3 text-lg"
        >
          {loading ? 'Creating meetup…' : '🎯 Create Meetup & Share'}
        </button>
      </form>
    </div>
  )
}
