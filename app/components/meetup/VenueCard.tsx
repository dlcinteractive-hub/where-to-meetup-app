'use client'

import { MapPin, Star, Clock, DollarSign, Check } from 'lucide-react'
import { Venue } from '../../lib/types'

interface Props {
  id?: string
  venue: Venue
  isSelected: boolean
  hasSubmitted: boolean
  isWinner: boolean
  voteCount: number
  onToggle: (placeId: string) => void
}

function getVenueImage(photoReference?: string): string | undefined {
  if (!photoReference) return undefined
  return `/api/photos?ref=${encodeURIComponent(photoReference)}`
}

function renderPriceLevel(level?: number): string | null {
  if (!level) return null
  return '$'.repeat(level)
}

export default function VenueCard({ id, venue, isSelected, hasSubmitted, isWinner, voteCount, onToggle }: Props) {
  const locked = hasSubmitted
  const borderClass = isWinner
    ? 'border-2 border-accent-400 ring-2 ring-accent-300'
    : isSelected
    ? 'border-2 border-primary-500'
    : 'border border-brand-border'

  return (
    <div
      id={id}
      onClick={() => !locked && onToggle(venue.place_id)}
      className={`bg-white rounded-2xl shadow-sm overflow-hidden transition-all ${borderClass} ${
        locked ? 'cursor-default' : 'cursor-pointer hover:shadow-md'
      }`}
    >
      {venue.photo_reference && (
        <img
          src={getVenueImage(venue.photo_reference)}
          alt={venue.name}
          className="w-full h-48 object-cover"
        />
      )}
      <div className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="font-heading font-bold text-lg text-brand-dark">{venue.name}</h3>
            <p className="text-sm text-brand-muted flex items-start gap-1">
              <MapPin size={14} className="mt-0.5 shrink-0" />
              {venue.address}
            </p>
          </div>
          {!locked && (
            <div className={`shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
              isSelected ? 'bg-primary-500 border-primary-500' : 'border-brand-border'
            }`}>
              {isSelected && <Check size={14} className="text-white" />}
            </div>
          )}
          {locked && voteCount > 0 && (
            <span className="shrink-0 bg-primary-100 text-primary-700 text-sm font-semibold px-2.5 py-0.5 rounded-full">
              {voteCount} {voteCount === 1 ? 'vote' : 'votes'}
            </span>
          )}
        </div>

        <div className="flex items-center gap-4 text-sm">
          {venue.rating && (
            <div className="flex items-center gap-1">
              <Star size={14} className="text-accent-500 fill-current" />
              <span className="font-medium text-brand-dark">{venue.rating}</span>
            </div>
          )}
          {venue.price_level && (
            <div className="flex items-center gap-1">
              <DollarSign size={14} className="text-accent-500" />
              <span className="text-brand-dark">{renderPriceLevel(venue.price_level)}</span>
            </div>
          )}
          {venue.opening_hours?.open_now !== undefined && (
            <div className="flex items-center gap-1">
              <Clock size={14} className={venue.opening_hours.open_now ? 'text-primary-500' : 'text-brand-muted'} />
              <span className={venue.opening_hours.open_now ? 'text-primary-500' : 'text-brand-muted'}>
                {venue.opening_hours.open_now ? 'Open' : 'Closed'}
              </span>
            </div>
          )}
        </div>

        {venue.types && venue.types.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {venue.types.slice(0, 3).map((type) => (
              <span key={type} className="text-xs bg-brand-light text-brand-medium px-2 py-1 rounded-lg">
                {type.replace(/_/g, ' ')}
              </span>
            ))}
          </div>
        )}

        {isWinner && (
          <a
            href={`https://maps.google.com/?q=${encodeURIComponent(venue.name + ' ' + venue.address)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary w-full text-center text-sm block"
          >
            Get Directions
          </a>
        )}
      </div>
    </div>
  )
}
