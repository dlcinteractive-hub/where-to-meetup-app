'use client'

import { useEffect, useRef, useState } from 'react'
import { Loader } from '@googlemaps/js-api-loader'
import { Location, Venue } from '../../lib/types'

interface Props {
  locations: Location[]
  venues: Venue[]
}

const loader = new Loader({
  apiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? '',
  version: 'weekly',
})

function priceLabel(level?: number): string {
  return level ? '$'.repeat(level) : ''
}

function infoContent(v: Venue): string {
  const rating = v.rating ? `<span>⭐ ${v.rating}</span>` : ''
  const price = v.price_level ? `<span>${priceLabel(v.price_level)}</span>` : ''
  const sep = rating && price ? ' · ' : ''
  const meta = (rating || price) ? `<div>${rating}${sep}${price}</div>` : ''
  const addr = v.address
    ? `<div style="color:#666;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${v.address}</div>`
    : ''
  return `<div style="font-size:13px;max-width:200px"><strong>${v.name}</strong>${meta}${addr}</div>`
}

export default function MeetupMap({ locations, venues }: Props) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstance = useRef<google.maps.Map | null>(null)
  const markersRef = useRef<google.maps.Marker[]>([])
  const infoRef = useRef<google.maps.InfoWindow | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    loader.importLibrary('maps').then(() => setReady(true)).catch(() => {})
  }, [])

  useEffect(() => {
    if (!ready || !mapRef.current) return

    if (!mapInstance.current) {
      mapInstance.current = new google.maps.Map(mapRef.current, {
        zoom: 12,
        disableDefaultUI: true,
        zoomControl: true,
        mapId: 'meetup-map',
      })
    }

    if (!infoRef.current) {
      infoRef.current = new google.maps.InfoWindow()
    }

    const map = mapInstance.current
    const info = infoRef.current

    // Clear existing markers
    markersRef.current.forEach(m => m.setMap(null))
    markersRef.current = []

    const bounds = new google.maps.LatLngBounds()

    // Blue pins — participant locations
    locations.forEach(loc => {
      const pos = { lat: Number(loc.lat), lng: Number(loc.lng) }
      bounds.extend(pos)
      const marker = new google.maps.Marker({
        position: pos,
        map,
        title: loc.name || loc.address,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 8,
          fillColor: '#4F46E5',
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 2,
        },
      })
      markersRef.current.push(marker)
    })

    // Red pins — venues (with hover + click)
    venues.forEach(v => {
      const pos = { lat: Number(v.lat), lng: Number(v.lng) }
      bounds.extend(pos)
      const marker = new google.maps.Marker({
        position: pos,
        map,
        title: v.name,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 8,
          fillColor: '#DC2626',
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 2,
        },
      })

      marker.addListener('mouseover', () => {
        info.setContent(infoContent(v))
        info.open(map, marker)
      })

      marker.addListener('mouseout', () => {
        info.close()
      })

      marker.addListener('click', () => {
        const el = document.getElementById(`venue-${v.place_id}`)
        if (el) {
          const top = el.getBoundingClientRect().top + window.scrollY - 20
          window.scrollTo({ top, behavior: 'smooth' })
        }
      })

      markersRef.current.push(marker)
    })

    if (locations.length + venues.length > 0) {
      map.fitBounds(bounds, 40)
    }
  }, [ready, locations, venues])

  if (!ready) {
    return (
      <div className="w-full h-[300px] bg-gray-100 rounded-lg flex items-center justify-center">
        <p className="text-sm text-gray-500">Loading map…</p>
      </div>
    )
  }

  return <div ref={mapRef} className="w-full h-[300px] rounded-lg shadow" />
}
