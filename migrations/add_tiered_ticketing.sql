-- Tiered Ticketing System Schema

-- Ticket Tiers (VIP, General, Early Bird, etc.)
CREATE TABLE IF NOT EXISTS ticket_tiers (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  total_quantity INTEGER NOT NULL,
  sold_quantity INTEGER DEFAULT 0,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  sales_start TIMESTAMP,
  sales_end TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Promo Codes
CREATE TABLE IF NOT EXISTS promo_codes (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  event_id TEXT REFERENCES events(id) ON DELETE CASCADE,
  discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
  discount_value DECIMAL(10,2) NOT NULL,
  max_uses INTEGER,
  times_used INTEGER DEFAULT 0,
  valid_from TIMESTAMP,
  valid_until TIMESTAMP,
  is_active BOOLEAN DEFAULT TRUE,
  created_by TEXT NOT NULL REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Group Discounts
CREATE TABLE IF NOT EXISTS group_discounts (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  min_quantity INTEGER NOT NULL,
  discount_percentage DECIMAL(5,2) NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Update tickets table to reference tier
ALTER TABLE tickets ADD COLUMN tier_id TEXT REFERENCES ticket_tiers(id);
ALTER TABLE tickets ADD COLUMN promo_code_id TEXT REFERENCES promo_codes(id);
ALTER TABLE tickets ADD COLUMN discount_applied DECIMAL(10,2) DEFAULT 0;

-- Indexes
CREATE INDEX idx_ticket_tiers_event ON ticket_tiers(event_id);
CREATE INDEX idx_promo_codes_code ON promo_codes(code);
CREATE INDEX idx_promo_codes_event ON promo_codes(event_id);
CREATE INDEX idx_group_discounts_event ON group_discounts(event_id);
