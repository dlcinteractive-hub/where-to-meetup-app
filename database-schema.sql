-- Create meetups table
CREATE TABLE meetups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  creator_name TEXT,
  share_token TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(16), 'hex'),
  status TEXT NOT NULL DEFAULT 'planning' CHECK (status IN ('planning', 'voting', 'decided')),
  midpoint_lat DECIMAL,
  midpoint_lng DECIMAL,
  selected_venue_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create locations table
CREATE TABLE locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meetup_id UUID REFERENCES meetups(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  lat DECIMAL NOT NULL,
  lng DECIMAL NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create venues table (discovered venues for each meetup)
CREATE TABLE venues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meetup_id UUID REFERENCES meetups(id) ON DELETE CASCADE,
  place_id TEXT NOT NULL,
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  lat DECIMAL NOT NULL,
  lng DECIMAL NOT NULL,
  rating DECIMAL,
  price_level INTEGER,
  types TEXT[],
  photo_reference TEXT,
  opening_hours JSONB,
  distance_from_midpoint DECIMAL,
  avg_travel_time DECIMAL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create votes table
CREATE TABLE votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meetup_id UUID REFERENCES meetups(id) ON DELETE CASCADE,
  venue_id UUID REFERENCES venues(id) ON DELETE CASCADE,
  voter_name TEXT,
  voter_ip TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(meetup_id, venue_id, voter_ip)
);

-- Create indexes
CREATE INDEX idx_meetups_share_token ON meetups(share_token);
CREATE INDEX idx_locations_meetup_id ON locations(meetup_id);
CREATE INDEX idx_venues_meetup_id ON venues(meetup_id);
CREATE INDEX idx_votes_meetup_id ON votes(meetup_id);
CREATE INDEX idx_votes_venue_id ON votes(venue_id);

-- Row Level Security
ALTER TABLE meetups ENABLE ROW LEVEL SECURITY;
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE venues ENABLE ROW LEVEL SECURITY;
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;

-- Policies (allow all for now, can tighten later)
CREATE POLICY "Allow all on meetups" ON meetups FOR ALL USING (true);
CREATE POLICY "Allow all on locations" ON locations FOR ALL USING (true);
CREATE POLICY "Allow all on venues" ON venues FOR ALL USING (true);
CREATE POLICY "Allow all on votes" ON votes FOR ALL USING (true);