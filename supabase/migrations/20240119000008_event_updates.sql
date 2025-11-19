-- Event Updates/Announcements System
-- Allows organizers to post updates that notify all ticket holders

-- Table: event_updates
CREATE TABLE event_updates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  organizer_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title text NOT NULL,
  message text NOT NULL,
  send_email boolean NOT NULL DEFAULT true,
  send_sms boolean NOT NULL DEFAULT false,
  email_sent_at timestamptz,
  sms_sent_at timestamptz,
  recipient_count integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_event_updates_event_id ON event_updates(event_id);
CREATE INDEX idx_event_updates_organizer_id ON event_updates(organizer_id);
CREATE INDEX idx_event_updates_created_at ON event_updates(created_at DESC);

-- RLS Policies
ALTER TABLE event_updates ENABLE ROW LEVEL SECURITY;

-- Anyone can view updates for events they have tickets to
CREATE POLICY "Users can view updates for their events"
  ON event_updates
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM tickets
      WHERE tickets.event_id = event_updates.event_id
      AND tickets.attendee_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM events
      WHERE events.id = event_updates.event_id
      AND events.organizer_id = auth.uid()
    )
  );

-- Organizers can create updates for their events
CREATE POLICY "Organizers can create updates"
  ON event_updates
  FOR INSERT
  WITH CHECK (
    auth.uid() = organizer_id
    AND EXISTS (
      SELECT 1 FROM events
      WHERE events.id = event_id
      AND events.organizer_id = auth.uid()
    )
  );

-- Organizers can update their own updates (before sending)
CREATE POLICY "Organizers can update their updates"
  ON event_updates
  FOR UPDATE
  USING (
    auth.uid() = organizer_id
    AND email_sent_at IS NULL
    AND sms_sent_at IS NULL
  )
  WITH CHECK (auth.uid() = organizer_id);

-- Organizers can delete their updates (before sending)
CREATE POLICY "Organizers can delete unsent updates"
  ON event_updates
  FOR DELETE
  USING (
    auth.uid() = organizer_id
    AND email_sent_at IS NULL
    AND sms_sent_at IS NULL
  );

-- Update timestamp trigger
CREATE TRIGGER update_event_updates_updated_at
  BEFORE UPDATE ON event_updates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Function to get all attendee emails for an event
CREATE OR REPLACE FUNCTION get_event_attendee_contacts(event_uuid uuid)
RETURNS TABLE (
  email text,
  phone text,
  full_name text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT
    u.email,
    u.phone,
    u.full_name
  FROM tickets t
  JOIN users u ON u.id = t.attendee_id
  WHERE t.event_id = event_uuid
  AND t.status = 'active'
  AND NOT t.checked_in; -- Only notify attendees who haven't attended yet
END;
$$;

COMMENT ON FUNCTION get_event_attendee_contacts(uuid) IS 'Get contact information for all active attendees of an event';
