import { Location } from '../types'

export interface MidpointResult {
  lat: number
  lng: number
  avgTravelTime: number
}

// Simple geographic midpoint calculation
export function calculateGeographicMidpoint(locations: Location[]): { lat: number; lng: number } {
  if (locations.length === 0) throw new Error('No locations provided')
  if (locations.length === 1) return { lat: locations[0].lat, lng: locations[0].lng }

  const sumLat = locations.reduce((sum, loc) => sum + loc.lat, 0)
  const sumLng = locations.reduce((sum, loc) => sum + loc.lng, 0)

  return {
    lat: sumLat / locations.length,
    lng: sumLng / locations.length
  }
}

// Calculate travel time weighted midpoint (simplified version)
export async function calculateOptimalMidpoint(locations: Location[]): Promise<MidpointResult> {
  // For MVP, use geographic midpoint
  // In production, would use Google Directions Matrix API to get actual travel times
  const geographic = calculateGeographicMidpoint(locations)
  
  return {
    ...geographic,
    avgTravelTime: 25 // Placeholder average in minutes
  }
}

// Calculate distance between two points using Haversine formula
export function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371 // Earth's radius in km
  const dLat = toRadians(lat2 - lat1)
  const dLon = toRadians(lon2 - lon1)
  
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2)
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180)
}