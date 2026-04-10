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
          content: `Reorder these venues from most to least suitable as a group meeting spot. Deprioritize chains (Subway, McDonald's, Starbucks, fast food, gas stations, convenience stores) and low-rated venues. Return ONLY a JSON array of place_ids in ranked order, no other text.\n\n${JSON.stringify(summary)}`,
        }],
      }),
    })

    if (!res.ok) return venues

    const data = await res.json()
    const text: string = data.content?.[0]?.text ?? ''
    const match = text.match(/\[[\s\S]*\]/)
    if (!match) return venues

    const ranked: string[] = JSON.parse(match[0])
    const byId = new Map(venues.map(v => [v.place_id, v]))
    const ordered = ranked.filter(id => byId.has(id)).map(id => byId.get(id)!)
    // Append any venues Claude missed
    const seen = new Set(ranked)
    for (const v of venues) {
      if (!seen.has(v.place_id)) ordered.push(v)
    }
    return ordered
  } catch {
    return venues
  }
}
