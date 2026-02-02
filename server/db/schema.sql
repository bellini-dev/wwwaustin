-- Users (for auth and RSVPs)
CREATE TABLE IF NOT EXISTS users (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email      TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name       TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Events: where, what, datetime, free food/drinks
CREATE TABLE IF NOT EXISTS events (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  what        TEXT NOT NULL,
  "where"     TEXT NOT NULL,
  datetime    TIMESTAMPTZ NOT NULL,
  free_food   BOOLEAN DEFAULT FALSE,
  free_drinks BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Add columns for existing DBs (no-op if already present)
ALTER TABLE events ADD COLUMN IF NOT EXISTS free_food BOOLEAN DEFAULT FALSE;
ALTER TABLE events ADD COLUMN IF NOT EXISTS free_drinks BOOLEAN DEFAULT FALSE;

-- RSVPs: yes or maybe per user per event
CREATE TABLE IF NOT EXISTS rsvps (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  event_id   UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  status     TEXT NOT NULL CHECK (status IN ('yes', 'maybe')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, event_id)
);

CREATE INDEX IF NOT EXISTS idx_rsvps_event_id ON rsvps(event_id);
CREATE INDEX IF NOT EXISTS idx_rsvps_user_id ON rsvps(user_id);
CREATE INDEX IF NOT EXISTS idx_events_datetime ON events(datetime);

-- Admin users: no API to create; use scripts/create-admin.js only
CREATE TABLE IF NOT EXISTS admin_users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);
