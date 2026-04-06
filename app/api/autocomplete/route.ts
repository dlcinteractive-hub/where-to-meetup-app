import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const input = searchParams.get('q')

  if (!input || input.length < 2) {
    return NextResponse.json({ predictions: [] })
  }

  const apiKey = process.env.GOOGLE_MAPS_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'Maps API not configured' }, { status: 500 })
  }

  try {
    const lat = searchParams.get('lat')
    const lng = searchParams.get('lng')
    const bias = lat && lng ? `&location=${lat},${lng}&radius=50000` : ''

    const url =
      `https://maps.googleapis.com/maps/api/place/autocomplete/json` +
      `?input=${encodeURIComponent(input)}&types=geocode${bias}&key=${apiKey}`

    const response = await fetch(url)
    const data = await response.json()

    if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
      return NextResponse.json({ predictions: [] })
    }

    const predictions = (data.predictions ?? []).slice(0, 5).map((p: any) => ({
      description: p.description,
      place_id: p.place_id,
    }))

    return NextResponse.json({ predictions })
  } catch (error) {
    console.error('Autocomplete error:', error)
    return NextResponse.json({ predictions: [] })
  }
}
