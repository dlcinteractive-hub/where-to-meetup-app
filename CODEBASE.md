# where-to-meetup — CODEBASE.md

## ⚡ START HERE (Read This First)

| Field | Value |
|-------|-------|
| **Current Phase** | Phase 3 — Filters, Preferences & Polish (in progress) |
| **Last Verified Good State** | AI venue ranking working, chains excluded, voting fixed, category and price filters live. f7f152ad fix: AI ranking now excludes chains and fast food |
| **Open Issues** | Rotate Google Maps + Supabase keys. |
| **Version** | 0.1.5 |
| **Branch** | main |

**Before starting any Claude Code session:** Read this block + the current phase section below. Do not proceed if Open Issues lists an unresolved blocker.

---

## 🔒 Process Rules (Non-Negotiable)

1. All external API calls are server-side only. Google Maps API calls happen exclusively in app/api/ route handlers. No NEXT_PUBLIC_GOOGLE prefix anywhere in source.
2. Two Supabase clients, two files, never mixed. supabase-client.ts (anon key, safe for components). supabase-server.ts (service role key, API routes only).
3. App Router only. All API routes use app/api/[route]/route.ts exporting named GET/POST functions using Request/Response.
4. Components are Server Components by default. Add 'use client' only when required for interactivity or browser APIs.
5. No business logic in components. Midpoint calculation, venue scoring, Supabase reads/writes live in lib/. Components render only.
6. One client-side state system. useState only. No Zustand, Redux, or Context for MVP.
7. File line limits: components 200 lines max, API routes 150 lines max, lib utilities 100 lines max.

---

## 📁 Folder Structure

app/
  api/
    geocode/route.ts        # POST: geocode address server-side
    locations/route.ts      # POST: add invitee location (Phase 2)
    meetups/route.ts        # GET + POST: create and fetch meetups
    photos/route.ts         # GET: proxy Google photo references
    venues/route.ts         # POST: search and persist venues
    votes/route.ts          # GET + POST: cast and count votes
  meetup/[token]/
    page.tsx                # Results + invitee + voting page
  layout.tsx
  page.tsx                  # Home: organizer location input
components/
  ui/                       # Generic: Button, Card, Input, Spinner
  meetup/                   # Feature: LocationInput, VenueCard, VotePanel
lib/
  midpoint.ts               # Geographic midpoint + Haversine distance
  supabase-client.ts        # Anon key — safe for client components
  supabase-server.ts        # Service role key — server/API only
  types.ts                  # Shared TypeScript interfaces
prompts/
  phase-0-remediation.md
  phase-1-start.md
  phase-2-start.md

---

## 🔑 Environment Variables

GOOGLE_MAPS_API_KEY=          # Server-side only, no NEXT_PUBLIC_ prefix
NEXT_PUBLIC_SUPABASE_URL=     # Safe for browser
NEXT_PUBLIC_SUPABASE_ANON_KEY= # Safe for browser
SUPABASE_SERVICE_ROLE_KEY=    # Server only, never expose to browser
NEXT_PUBLIC_BASE_URL=         # App base URL

---

## 🗄️ Database (Supabase)

meetups — id, title, creator_name, share_token, status ('planning'|'voting'|'decided'), midpoint_lat, midpoint_lng, selected_venue_data, created_at, updated_at
locations — id, meetup_id, name, address, lat, lng, created_at
venues — id, meetup_id, place_id, name, address, lat, lng, rating, price_level, types, photo_reference, opening_hours, distance_from_midpoint, avg_travel_time, created_at
votes — id, meetup_id, venue_id, voter_name, voter_ip, created_at. Unique constraint on (meetup_id, venue_id, voter_ip).

---

## Phase 0 — Remediation ✅ COMPLETE
All API routes converted to App Router. API key moved server-side. Supabase clients split. types.ts created.

## Phase 1 — Core Flow ✅ COMPLETE
Voting wired to database. Share link added. Venues persisted to Supabase on first load.

## Phase 2 — Invitee Experience (IN PROGRESS)
See plan below — awaiting Claude Code proposal before any code is written.

## Phase 3 — Filters, Preferences & Polish
Not yet started.

**Known limitation: organizer admin token stored in localStorage only. Remove buttons unavailable if organizer opens meetup on a different device. Future fix: email magic link or token recovery UI.**

**Known improvement — autocomplete location bias:**
Currently defaults to LA (34.0522, -118.2437) when geolocation is unavailable.
Better approach: pass the meetup's midpoint_lat/midpoint_lng (or organizer's
location from the locations table) as the bias when an invitee opens a shared
link. The meetupId is available on the meetup page — fetch the organizer's
coordinates from /api/meetups and pass them as props to AddressAutocomplete.
This makes the app work correctly for any city without code changes.
