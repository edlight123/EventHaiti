-- Migration: Add pending_transactions table for MonCash/Stripe async payments
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS pending_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id TEXT NOT NULL UNIQUE,
  order_id TEXT NOT NULL UNIQUE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  ticket_id UUID REFERENCES tickets(id) ON DELETE SET NULL,
  
  -- Transaction details
  quantity INTEGER NOT NULL DEFAULT 1,
  amount DECIMAL(10, 2) NOT NULL,
  payment_method TEXT NOT NULL CHECK (payment_method IN ('stripe', 'moncash')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'cancelled')),
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_pending_transactions_user_id ON pending_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_pending_transactions_event_id ON pending_transactions(event_id);
CREATE INDEX IF NOT EXISTS idx_pending_transactions_status ON pending_transactions(status);
CREATE INDEX IF NOT EXISTS idx_pending_transactions_transaction_id ON pending_transactions(transaction_id);

-- Enable Row Level Security
ALTER TABLE pending_transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own pending transactions"
  ON pending_transactions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert pending transactions"
  ON pending_transactions FOR INSERT
  WITH CHECK (TRUE); -- Controlled by API

CREATE POLICY "System can update pending transactions"
  ON pending_transactions FOR UPDATE
  USING (TRUE); -- Controlled by API

-- Add trigger to update updated_at
CREATE OR REPLACE FUNCTION update_pending_transactions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    NEW.completed_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_pending_transactions_timestamp
  BEFORE UPDATE ON pending_transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_pending_transactions_updated_at();

-- Add comment
COMMENT ON TABLE pending_transactions IS 'Tracks pending payment transactions before ticket creation';
