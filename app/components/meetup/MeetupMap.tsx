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

export default function MeetupMap({ locations, venues }: Props) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstance = useRef<google.maps.Map | null>(null)
  const markersRef = useRef<google.maps.Marker[]>([])
  const [ready, setReady] = useState(false)

  // Load the Maps library once
  useEffect(() => {
    loader.importLibrary('maps').then(() => setReady(true)).catch(() => {})
  }, [])

  // Initialize map + update markers when data or ready state changes
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

    const map = mapInstance.current

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

    // Red pins — venues
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
