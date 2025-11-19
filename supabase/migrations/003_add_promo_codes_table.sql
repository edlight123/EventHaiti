-- Migration: Add promo codes table
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS promo_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organizer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  event_id UUID REFERENCES events(id) ON DELETE CASCADE, -- NULL means valid for all organizer's events
  
  -- Code details
  code TEXT NOT NULL,
  description TEXT,
  
  -- Discount settings
  discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage', 'fixed_amount')),
  discount_value DECIMAL(10, 2) NOT NULL,
  
  -- Usage limits
  max_uses INTEGER, -- NULL means unlimited
  uses_count INTEGER DEFAULT 0,
  max_uses_per_user INTEGER DEFAULT 1,
  
  -- Validity period
  valid_from TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  valid_until TIMESTAMP WITH TIME ZONE,
  
  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(code, organizer_id),
  CHECK (discount_value > 0),
  CHECK (max_uses IS NULL OR max_uses > 0),
  CHECK (max_uses_per_user > 0)
);

-- Add indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_promo_codes_organizer_id ON promo_codes(organizer_id);
CREATE INDEX IF NOT EXISTS idx_promo_codes_event_id ON promo_codes(event_id);
CREATE INDEX IF NOT EXISTS idx_promo_codes_code ON promo_codes(code);
CREATE INDEX IF NOT EXISTS idx_promo_codes_active ON promo_codes(is_active) WHERE is_active = TRUE;

-- Promo code usage tracking
CREATE TABLE IF NOT EXISTS promo_code_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  promo_code_id UUID NOT NULL REFERENCES promo_codes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  discount_applied DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(promo_code_id, ticket_id)
);

CREATE INDEX IF NOT EXISTS idx_promo_code_usage_promo_code_id ON promo_code_usage(promo_code_id);
CREATE INDEX IF NOT EXISTS idx_promo_code_usage_user_id ON promo_code_usage(user_id);

-- Enable Row Level Security
ALTER TABLE promo_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE promo_code_usage ENABLE ROW LEVEL SECURITY;

-- RLS Policies for promo_codes
CREATE POLICY "Organizers can view their own promo codes"
  ON promo_codes FOR SELECT
  USING (auth.uid() = organizer_id);

CREATE POLICY "Organizers can create promo codes"
  ON promo_codes FOR INSERT
  WITH CHECK (auth.uid() = organizer_id);

CREATE POLICY "Organizers can update their own promo codes"
  ON promo_codes FOR UPDATE
  USING (auth.uid() = organizer_id);

CREATE POLICY "Organizers can delete their own promo codes"
  ON promo_codes FOR DELETE
  USING (auth.uid() = organizer_id);

CREATE POLICY "Users can view active promo codes"
  ON promo_codes FOR SELECT
  USING (is_active = TRUE AND (valid_until IS NULL OR valid_until > NOW()));

-- RLS Policies for promo_code_usage
CREATE POLICY "Users can view their own promo code usage"
  ON promo_code_usage FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert promo code usage"
  ON promo_code_usage FOR INSERT
  WITH CHECK (TRUE); -- Controlled by application logic

-- Add trigger to update updated_at
CREATE OR REPLACE FUNCTION update_promo_codes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_promo_codes_timestamp
  BEFORE UPDATE ON promo_codes
  FOR EACH ROW
  EXECUTE FUNCTION update_promo_codes_updated_at();

-- Add trigger to increment uses_count
CREATE OR REPLACE FUNCTION increment_promo_code_uses()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE promo_codes
  SET uses_count = uses_count + 1
  WHERE id = NEW.promo_code_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER increment_uses_on_usage
  AFTER INSERT ON promo_code_usage
  FOR EACH ROW
  EXECUTE FUNCTION increment_promo_code_uses();

-- Add comments
COMMENT ON TABLE promo_codes IS 'Promotional discount codes for events';
COMMENT ON TABLE promo_code_usage IS 'Tracking of promo code redemptions';
