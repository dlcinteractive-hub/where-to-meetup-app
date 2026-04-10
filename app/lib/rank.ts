interface RankableVenue {
  place_id: string
  name: string
  rating?: number | null
  price_level?: number | null
  types?: string[]
}

export async function rankVenuesWithAI<T extends RankableVenue>(venues: T[]): Promise<T[]> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey || venues.length === 0) return venues

  try {
    console.log(`AI ranking: starting with ${venues.length} venues`)

    const summary = venues.map(v => ({
      place_id: v.place_id,
      name: v.name,
      rating: v.rating ?? null,
      price_level: v.price_level ?? null,
      types: v.types ?? [],
    }))

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1024,
        messages: [{
          role: 'user',
          content: `You are filtering venues for a group meetup. From the list below, REMOVE any chain fast food (McDonald's, Subway, Burger King, Wendy's, Taco Bell, Panda Express, Chick-fil-A, Jack in the Box, Carl's Jr, KFC, Popeyes, etc.), convenience stores (7-Eleven, Circle K, etc.), gas stations, and any venue not suitable for a group gathering. Return ONLY the place_ids of venues worth meeting at, ranked from best to worst. If fewer than 3 quality venues remain, include the best available options to reach at least 3. Return ONLY a JSON array of place_ids, no other text.\n\n${JSON.stringify(summary)}`,
        }],
      }),
    })

    if (!res.ok) {
      const body = await res.text()
      console.error(`AI ranking: API returned ${res.status}`, body)
      return venues
    }

    const data = await res.json()
    const text: string = data.content?.[0]?.text ?? ''
    const match = text.match(/\[[\s\S]*\]/)
    if (!match) {
      console.error('AI ranking: failed to parse response', text)
      return venues
    }

    const ranked: string[] = JSON.parse(match[0])
    const byId = new Map(venues.map(v => [v.place_id, v]))
    // Only include venues Claude explicitly kept — omitted ones are excluded
    const ordered = ranked.filter(id => byId.has(id)).map(id => byId.get(id)!)
    console.log(`AI ranking: success, ${venues.length} in → ${ordered.length} out`)
    return ordered
  } catch (err) {
    console.error('AI ranking: unexpected error', err)
    return venues
  }
}
