import { supabaseAdmin } from './supabase-server'

export async function fetchAndSaveVenues(
  lat: number,
  lng: number,
  meetupId: string,
  { radius = 5000, type = 'restaurant' }: { radius?: number; type?: string } = {}
): Promise<any[]> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY
  if (!apiKey) throw new Error('Maps API not configured')

  const url =
    `https://maps.googleapis.com/maps/api/place/nearbysearch/json` +
    `?location=${lat},${lng}&radius=${radius}&type=${type}&key=${apiKey}`

  const response = await fetch(url)
  const data = await response.json()

  if (data.status !== 'OK') {
    throw new Error(`Places API error: ${data.status}`)
  }

  const rows = data.results.slice(0, 10).map((place: any) => ({
    meetup_id: meetupId,
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

  const { data: saved, error } = await supabaseAdmin
    .from('venues')
    .insert(rows)
    .select()

  if (error) throw error
  return saved ?? []
}
