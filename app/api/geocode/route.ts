import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { address } = await req.json()

    if (!address) {
      return NextResponse.json({ error: 'Address is required' }, { status: 400 })
    }

    const apiKey = process.env.GOOGLE_MAPS_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'Maps API not configured' }, { status: 500 })
    }

    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${apiKey}`
    const response = await fetch(url)
    const data = await response.json()

    if (data.status !== 'OK' || !data.results[0]) {
      return NextResponse.json({ error: 'Address not found' }, { status: 404 })
    }

    const location = data.results[0].geometry.location
    return NextResponse.json({ lat: location.lat, lng: location.lng })

  } catch (error) {
    console.error('Geocode error:', error)
    return NextResponse.json({ error: 'Geocoding failed' }, { status: 500 })
  }
}
