'use client'

import { useState } from 'react'
import { MapPin } from 'lucide-react'
import AddressAutocomplete from '../ui/AddressAutocomplete'

interface Props {
  meetupId: string
  onSubmitted: () => void
}

export default function AddLocationForm({ meetupId, onSubmitted }: Props) {
  const [name, setName] = useState('')
  const [address, setAddress] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!address.trim()) return
    setLoading(true)
    setError('')

    try {
      const geoRes = await fetch('/api/geocode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: address.trim() }),
      })
      if (!geoRes.ok) {
        setError('Could not find that address. Please try again.')
        return
      }
      const { lat, lng } = await geoRes.json()

      const locRes = await fetch('/api/locations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          meetupId,
          name: name.trim() || address.trim(),
          address: address.trim(),
          lat,
          lng,
        }),
      })
      if (!locRes.ok) {
        const data = await locRes.json()
        setError(data.error || 'Failed to add your location.')
        return
      }

      onSubmitted()
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="card">
      <h3 className="font-heading font-semibold text-brand-dark mb-4 flex items-center gap-2">
        <MapPin size={18} />
        Add Your Starting Location
      </h3>
      <form onSubmit={handleSubmit} className="space-y-3">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your name (optional)"
          className="input-field"
        />
        <AddressAutocomplete
          value={address}
          onChange={setAddress}
          placeholder="Your address, city, or landmark"
          className="input-field"
          required
        />
        {error && <p className="text-sm text-primary-600">{error}</p>}
        <button
          type="submit"
          disabled={loading || !address.trim()}
          className="btn-primary w-full"
        >
          {loading ? 'Adding your location…' : "I'm joining from here"}
        </button>
      </form>
    </div>
  )
}
