-- Users (for auth and RSVPs)
CREATE TABLE IF NOT EXISTS users (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email      TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name       TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Events: where, what, when (display text), datetime (for sorting), free food/drinks/entry, optional event link
CREATE TABLE IF NOT EXISTS events (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  what        TEXT NOT NULL,
  "where"     TEXT NOT NULL,
  "when"      TEXT,
  datetime    TIMESTAMPTZ NOT NULL,
  free_food   BOOLEAN DEFAULT FALSE,
  free_drinks BOOLEAN DEFAULT FALSE,
  free_entry  BOOLEAN DEFAULT FALSE,
  event_link  TEXT,
  image_url   TEXT,
  description TEXT,
  category    TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Add columns for existing DBs (no-op if already present)
ALTER TABLE events ADD COLUMN IF NOT EXISTS free_food BOOLEAN DEFAULT FALSE;
ALTER TABLE events ADD COLUMN IF NOT EXISTS free_drinks BOOLEAN DEFAULT FALSE;
ALTER TABLE events ADD COLUMN IF NOT EXISTS free_entry BOOLEAN DEFAULT FALSE;
ALTER TABLE events ADD COLUMN IF NOT EXISTS event_link TEXT;
ALTER TABLE events ADD COLUMN IF NOT EXISTS "when" TEXT;
ALTER TABLE events ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE events ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE events ADD COLUMN IF NOT EXISTS category TEXT;

-- RSVPs: interested per user per event
CREATE TABLE IF NOT EXISTS rsvps (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  event_id   UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  status     TEXT NOT NULL CHECK (status IN ('interested')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, event_id)
);

CREATE INDEX IF NOT EXISTS idx_rsvps_event_id ON rsvps(event_id);
CREATE INDEX IF NOT EXISTS idx_rsvps_user_id ON rsvps(user_id);
CREATE INDEX IF NOT EXISTS idx_events_datetime ON events(datetime);

-- Profile pictures: one per user, binary up to 2 MB
CREATE TABLE IF NOT EXISTS profile_pics (
  user_id     UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  data        BYTEA NOT NULL,
  content_type TEXT NOT NULL DEFAULT 'image/jpeg',
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Admin users: no API to create; use scripts/create-admin.js only
CREATE TABLE IF NOT EXISTS admin_users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);
