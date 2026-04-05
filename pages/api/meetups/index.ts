import { NextApiRequest, NextApiResponse } from 'next'
import { supabaseAdmin } from '../../../app/lib/supabase'
import { calculateOptimalMidpoint } from '../../../app/lib/midpoint'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    return createMeetup(req, res)
  } else if (req.method === 'GET') {
    return getMeetup(req, res)
  }
  
  res.setHeader('Allow', ['POST', 'GET'])
  res.status(405).json({ error: 'Method not allowed' })
}

async function createMeetup(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { title, creatorName, locations } = req.body

    if (!title || !locations || locations.length < 2) {
      return res.status(400).json({ 
        error: 'Title and at least 2 locations are required' 
      })
    }

    // Create meetup
    const { data: meetup, error: meetupError } = await supabaseAdmin
      .from('meetups')
      .insert({
        title,
        creator_name: creatorName,
      })
      .select()
      .single()

    if (meetupError) throw meetupError

    // Insert locations
    const locationsWithMeetupId = locations.map((loc: any) => ({
      ...loc,
      meetup_id: meetup.id
    }))

    const { error: locationsError } = await supabaseAdmin
      .from('locations')
      .insert(locationsWithMeetupId)

    if (locationsError) throw locationsError

    // Calculate midpoint
    const midpoint = await calculateOptimalMidpoint(locations)
    
    // Update meetup with midpoint
    const { error: updateError } = await supabaseAdmin
      .from('meetups')
      .update({
        midpoint_lat: midpoint.lat,
        midpoint_lng: midpoint.lng
      })
      .eq('id', meetup.id)

    if (updateError) throw updateError

    res.status(201).json({
      id: meetup.id,
      shareToken: meetup.share_token,
      midpoint
    })

  } catch (error) {
    console.error('Error creating meetup:', error)
    res.status(500).json({ error: 'Failed to create meetup' })
  }
}

async function getMeetup(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { token } = req.query

    if (!token) {
      return res.status(400).json({ error: 'Share token required' })
    }

    // Get meetup with locations
    const { data: meetup, error: meetupError } = await supabaseAdmin
      .from('meetups')
      .select(`
        *,
        locations (*)
      `)
      .eq('share_token', token)
      .single()

    if (meetupError || !meetup) {
      return res.status(404).json({ error: 'Meetup not found' })
    }

    res.json(meetup)

  } catch (error) {
    console.error('Error getting meetup:', error)
    res.status(500).json({ error: 'Failed to get meetup' })
  }
}