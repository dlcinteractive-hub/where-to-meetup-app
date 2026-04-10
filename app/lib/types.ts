export interface Location {
  id: string
  meetup_id?: string
  name: string
  address: string
  lat: number
  lng: number
}

export interface Meetup {
  id: string
  title: string
  creator_name: string
  share_token: string
  status: 'planning' | 'voting' | 'decided'
  midpoint_lat: number | null
  midpoint_lng: number | null
  venue_types?: string[]
  selected_venue_data: Venue | null
  created_at: string
  updated_at: string
  locations?: Location[]
  venues?: Venue[]
}

export interface Venue {
  id?: string
  meetup_id?: string
  place_id: string
  name: string
  address: string
  lat: number
  lng: number
  rating?: number
  price_level?: number
  types?: string[]
  photo_reference?: string
  opening_hours?: { open_now: boolean }
  distance_from_midpoint?: number
  avg_travel_time?: number
}

export interface Vote {
  id: string
  meetup_id: string
  venue_id: string
  voter_name?: string
  created_at: string
}
