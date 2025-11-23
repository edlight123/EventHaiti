-- Waitlist System Schema

CREATE TABLE IF NOT EXISTS event_waitlist (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  position INTEGER NOT NULL,
  notified BOOLEAN DEFAULT FALSE,
  converted_to_ticket BOOLEAN DEFAULT FALSE,
  ticket_id TEXT REFERENCES tickets(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  notified_at TIMESTAMP,
  UNIQUE(event_id, user_id)
);

CREATE INDEX idx_waitlist_event ON event_waitlist(event_id);
CREATE INDEX idx_waitlist_user ON event_waitlist(user_id);
CREATE INDEX idx_waitlist_position ON event_waitlist(event_id, position);
