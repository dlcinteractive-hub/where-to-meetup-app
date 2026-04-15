import { supabaseAdmin } from './supabase-server'
import { rankVenuesWithAI } from './rank'
import { calculateDistance } from './midpoint'

interface VenueRow {
  meetup_id: string
  place_id: string
  name: string
  address: string
  lat: number
  lng: number
  rating: number | null
  price_level: number | null
  types: string[]
  photo_reference: string | null
  opening_hours: any
  distance_from_midpoint: number | null
  avg_travel_time: number | null
}

async function fetchPlacesByType(lat: number, lng: number, type: string, radius: number, apiKey: string): Promise<Omit<VenueRow, 'distance_from_midpoint' | 'avg_travel_time'>[]> {
  const url =
    `https://maps.googleapis.com/maps/api/place/nearbysearch/json` +
    `?location=${lat},${lng}&radius=${radius}&type=${type}&key=${apiKey}`
  const response = await fetch(url)
  const data = await response.json()
  if (data.status !== 'OK') return []
  return data.results.slice(0, 20).map((place: any) => ({
    meetup_id: '',
    place_id: place.place_id,
    name: place.name,
    address: place.formatted_address ?? place.vicinity,
    lat: place.geometry.location.lat,
    lng: place.geometry.location.lng,
    rating: place.rating ?? null,
    price_level: place.price_level ?? null,
    types: place.types ?? [],
    photo_reference: place.photos?.[0]?.photo_reference ?? null,
    opening_hours: place.opening_hours ?? null,
  }))
}

export async function fetchAndSaveVenues(
  lat: number,
  lng: number,
  meetupId: string,
  { radius = 5000, types = ['restaurant'] }: { radius?: number; types?: string[] } = {}
): Promise<any[]> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY
  if (!apiKey) throw new Error('Maps API not configured')

  const results = await Promise.all(
    types.map(t => fetchPlacesByType(lat, lng, t, radius, apiKey))
  )
  const seen = new Set<string>()
  const merged: VenueRow[] = []
  for (const batch of results) {
    for (const v of batch) {
      if (!seen.has(v.place_id)) {
        seen.add(v.place_id)
        const distKm = calculateDistance(lat, lng, v.lat, v.lng)
        const distMiles = Math.round(distKm * 0.621371 * 10) / 10
        const driveMinutes = Math.round((distMiles / 25) * 60)
        merged.push({
          ...v,
          meetup_id: meetupId,
          distance_from_midpoint: distMiles,
          avg_travel_time: driveMinutes,
        })
      }
    }
  }

  const ranked = await rankVenuesWithAI(merged)

  const { data: saved, error } = await supabaseAdmin
    .from('venues')
    .insert(ranked)
    .select()

  if (error) throw error
  return saved ?? []
}
