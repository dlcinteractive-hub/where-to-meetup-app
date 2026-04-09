'use client'

import { MapPin, Star, Clock, DollarSign, Check } from 'lucide-react'
import { Venue } from '../../lib/types'

interface Props {
  id?: string
  venue: Venue
  voteCount: number
  isVoted: boolean
  votedVenueId: string | null
  onVote: (venue: Venue) => void
}

function getVenueImage(photoReference?: string): string | undefined {
  if (!photoReference) return undefined
  return `/api/photos?ref=${encodeURIComponent(photoReference)}`
}

function renderPriceLevel(level?: number): string | null {
  if (!level) return null
  return '$'.repeat(level)
}

export default function VenueCard({ id, venue, voteCount, isVoted, votedVenueId, onVote }: Props) {
  return (
    <div id={id} className="bg-white rounded-2xl shadow-sm border border-brand-border overflow-hidden">
      {venue.photo_reference && (
        <img
          src={getVenueImage(venue.photo_reference)}
          alt={venue.name}
          className="w-full h-48 object-cover"
        />
      )}
      <div className="p-4 space-y-3">
        <div>
          <h3 className="font-heading font-bold text-lg text-brand-dark">{venue.name}</h3>
          <p className="text-sm text-brand-muted flex items-start gap-1">
            <MapPin size={14} className="mt-0.5 shrink-0" />
            {venue.address}
          </p>
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
              <Clock
                size={14}
                className={venue.opening_hours.open_now ? 'text-primary-500' : 'text-brand-muted'}
              />
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

        <div className="flex gap-2 pt-1">
          <a
            href={`https://maps.google.com/?q=${encodeURIComponent(venue.name + ' ' + venue.address)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-secondary flex-1 text-center text-sm"
          >
            Directions
          </a>
          <button
            onClick={() => onVote(venue)}
            disabled={!!votedVenueId}
            className={`flex-1 py-2 px-3 rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
              isVoted
                ? 'bg-primary-500 text-white cursor-default'
                : votedVenueId
                ? 'bg-brand-light text-brand-muted cursor-not-allowed'
                : 'bg-primary-500 text-white hover:bg-primary-600'
            }`}
          >
            {isVoted ? <><Check size={14} /> Voted</> : 'Vote'}
            {voteCount > 0 && (
              <span
                className={`text-xs px-1.5 py-0.5 rounded-full ${
                  isVoted ? 'bg-primary-700' : 'bg-primary-700'
                }`}
              >
                {voteCount}
              </span>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
