-- Ticket Transfer System
-- Allows attendees to transfer tickets to other users with approval workflow

-- Table: ticket_transfers
CREATE TABLE ticket_transfers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  from_user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  to_email text NOT NULL,
  to_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  status text NOT NULL CHECK (status IN ('pending', 'accepted', 'rejected', 'cancelled', 'expired')),
  message text,
  transfer_token text UNIQUE NOT NULL DEFAULT gen_random_uuid()::text,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  accepted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_ticket_transfers_ticket_id ON ticket_transfers(ticket_id);
CREATE INDEX idx_ticket_transfers_from_user_id ON ticket_transfers(from_user_id);
CREATE INDEX idx_ticket_transfers_to_user_id ON ticket_transfers(to_user_id);
CREATE INDEX idx_ticket_transfers_to_email ON ticket_transfers(to_email);
CREATE INDEX idx_ticket_transfers_status ON ticket_transfers(status);
CREATE INDEX idx_ticket_transfers_token ON ticket_transfers(transfer_token);

-- RLS Policies
ALTER TABLE ticket_transfers ENABLE ROW LEVEL SECURITY;

-- Users can view transfers they've sent
CREATE POLICY "Users can view their sent transfers"
  ON ticket_transfers
  FOR SELECT
  USING (auth.uid() = from_user_id);

-- Users can view transfers sent to them (by email)
CREATE POLICY "Users can view transfers to their email"
  ON ticket_transfers
  FOR SELECT
  USING (auth.jwt() ->> 'email' = to_email OR auth.uid() = to_user_id);

-- Users can create transfers for their own tickets
CREATE POLICY "Users can create transfers"
  ON ticket_transfers
  FOR INSERT
  WITH CHECK (
    auth.uid() = from_user_id
    AND EXISTS (
      SELECT 1 FROM tickets
      WHERE tickets.id = ticket_id
      AND tickets.attendee_id = auth.uid()
      AND tickets.status = 'active'
    )
  );

-- Users can cancel their own pending transfers
CREATE POLICY "Users can cancel their transfers"
  ON ticket_transfers
  FOR UPDATE
  USING (auth.uid() = from_user_id AND status = 'pending')
  WITH CHECK (status IN ('pending', 'cancelled'));

-- Recipients can accept/reject transfers
CREATE POLICY "Recipients can respond to transfers"
  ON ticket_transfers
  FOR UPDATE
  USING (
    (auth.jwt() ->> 'email' = to_email OR auth.uid() = to_user_id)
    AND status = 'pending'
  )
  WITH CHECK (status IN ('accepted', 'rejected'));

-- Update timestamp trigger
CREATE TRIGGER update_ticket_transfers_updated_at
  BEFORE UPDATE ON ticket_transfers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Function to automatically expire old transfers
CREATE OR REPLACE FUNCTION expire_old_transfers()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE ticket_transfers
  SET status = 'expired', updated_at = now()
  WHERE status = 'pending'
  AND expires_at < now();
END;
$$;

-- Run expiration check periodically (could be triggered by cron or application logic)
COMMENT ON FUNCTION expire_old_transfers() IS 'Marks transfers as expired when they pass their expiration date';
