import { NextApiRequest, NextApiResponse } from 'next'

const GOOGLE_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY

interface PlaceSearchResult {
  place_id: string
  name: string
  formatted_address: string
  geometry: {
    location: {
      lat: number
      lng: number
    }
  }
  rating?: number
  price_level?: number
  types: string[]
  photos?: Array<{
    photo_reference: string
  }>
  opening_hours?: {
    open_now: boolean
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST'])
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { lat, lng, radius = 5000, type = 'restaurant' } = req.body

    if (!lat || !lng) {
      return res.status(400).json({ error: 'Lat and lng are required' })
    }

    // Search for venues near the midpoint
    const searchUrl = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?` +
      `location=${lat},${lng}&` +
      `radius=${radius}&` +
      `type=${type}&` +
      `key=${GOOGLE_API_KEY}`

    const response = await fetch(searchUrl)
    const data = await response.json()

    if (data.status !== 'OK') {
      throw new Error(`Google Places API error: ${data.status}`)
    }

    // Transform results
    const venues = data.results.slice(0, 10).map((place: PlaceSearchResult) => ({
      place_id: place.place_id,
      name: place.name,
      address: place.formatted_address,
      lat: place.geometry.location.lat,
      lng: place.geometry.location.lng,
      rating: place.rating,
      price_level: place.price_level,
      types: place.types,
      photo_reference: place.photos?.[0]?.photo_reference,
      opening_hours: place.opening_hours
    }))

    res.json({ venues })

  } catch (error) {
    console.error('Error searching venues:', error)
    res.status(500).json({ error: 'Failed to search venues' })
  }
}