-- Migration: Add organizer settings table
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS organizer_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organizer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  
  -- Payment settings
  stripe_account_id TEXT,
  stripe_connected BOOLEAN DEFAULT FALSE,
  moncash_phone TEXT,
  moncash_enabled BOOLEAN DEFAULT FALSE,
  
  -- Payout settings
  payout_method TEXT DEFAULT 'stripe', -- 'stripe', 'moncash', 'bank_transfer'
  bank_account_name TEXT,
  bank_account_number TEXT,
  bank_name TEXT,
  
  -- Notification preferences
  email_notifications BOOLEAN DEFAULT TRUE,
  whatsapp_notifications BOOLEAN DEFAULT FALSE,
  whatsapp_phone TEXT,
  
  -- Business info
  business_name TEXT,
  business_address TEXT,
  business_tax_id TEXT,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_organizer_settings_organizer_id ON organizer_settings(organizer_id);

-- Enable Row Level Security
ALTER TABLE organizer_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Organizers can view their own settings"
  ON organizer_settings FOR SELECT
  USING (auth.uid() = organizer_id);

CREATE POLICY "Organizers can insert their own settings"
  ON organizer_settings FOR INSERT
  WITH CHECK (auth.uid() = organizer_id);

CREATE POLICY "Organizers can update their own settings"
  ON organizer_settings FOR UPDATE
  USING (auth.uid() = organizer_id);

-- Add trigger to update updated_at
CREATE OR REPLACE FUNCTION update_organizer_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_organizer_settings_timestamp
  BEFORE UPDATE ON organizer_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_organizer_settings_updated_at();

-- Add comment
COMMENT ON TABLE organizer_settings IS 'Payment and notification settings for event organizers';
