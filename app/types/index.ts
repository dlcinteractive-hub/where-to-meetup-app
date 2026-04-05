export interface Location {
  id?: string
  name: string
  address: string
  lat: number
  lng: number
  created_at?: string
}

export interface Venue {
  place_id: string
  name: string
  address: string
  lat: number
  lng: number
  rating?: number
  price_level?: number
  types?: string[]
  photo_reference?: string
  opening_hours?: {
    open_now: boolean
  }
}

export interface Meetup {
  id: string
  title: string
  creator_name?: string
  share_token: string
  status: 'planning' | 'voting' | 'decided'
  selected_venue?: Venue
  created_at: string
  updated_at: string
  locations: Location[]
  venues?: Venue[]
  midpoint?: {
    lat: number
    lng: number
  }
}

export interface Vote {
  id: string
  meetup_id: string
  venue_place_id: string
  voter_name?: string
  created_at: string
}