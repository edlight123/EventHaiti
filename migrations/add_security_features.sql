-- Add security and fraud prevention features

-- Ticket transfer history tracking
CREATE TABLE IF NOT EXISTS ticket_transfers (
  id TEXT PRIMARY KEY,
  ticket_id TEXT NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  from_user_id TEXT NOT NULL REFERENCES users(id),
  to_user_id TEXT NOT NULL REFERENCES users(id),
  transferred_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  transfer_reason TEXT,
  ip_address TEXT,
  UNIQUE(ticket_id, transferred_at)
);

-- Purchase rate limiting and fraud detection
CREATE TABLE IF NOT EXISTS purchase_attempts (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  ip_address TEXT NOT NULL,
  attempted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  success BOOLEAN DEFAULT FALSE,
  quantity INTEGER NOT NULL,
  fingerprint TEXT -- Browser fingerprint for additional tracking
);

-- Blacklist for fraudulent users and IPs
CREATE TABLE IF NOT EXISTS security_blacklist (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('user', 'ip', 'email')),
  value TEXT NOT NULL,
  reason TEXT NOT NULL,
  blacklisted_by TEXT REFERENCES users(id),
  blacklisted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP, -- NULL means permanent
  notes TEXT,
  UNIQUE(type, value)
);

-- Suspicious activity log
CREATE TABLE IF NOT EXISTS suspicious_activities (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  activity_type TEXT NOT NULL CHECK (activity_type IN ('rapid_purchases', 'duplicate_tickets', 'unusual_location', 'bot_behavior', 'chargeback', 'multiple_accounts')),
  description TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  ip_address TEXT,
  metadata TEXT, -- JSON string with additional context
  detected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  reviewed BOOLEAN DEFAULT FALSE,
  reviewed_by TEXT REFERENCES users(id),
  reviewed_at TIMESTAMP,
  action_taken TEXT
);

-- Add security fields to tickets table
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS scanned_count INTEGER DEFAULT 0;
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS last_scanned_at TIMESTAMP;
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS last_scanned_by TEXT;
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS transfer_count INTEGER DEFAULT 0;
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS is_flagged BOOLEAN DEFAULT FALSE;
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS flag_reason TEXT;

-- Add security fields to events table for per-event limits
ALTER TABLE events ADD COLUMN IF NOT EXISTS max_tickets_per_user INTEGER DEFAULT 10;
ALTER TABLE events ADD COLUMN IF NOT EXISTS require_verification BOOLEAN DEFAULT FALSE;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_transfers_ticket ON ticket_transfers(ticket_id);
CREATE INDEX IF NOT EXISTS idx_transfers_from_user ON ticket_transfers(from_user_id);
CREATE INDEX IF NOT EXISTS idx_transfers_to_user ON ticket_transfers(to_user_id);

CREATE INDEX IF NOT EXISTS idx_purchase_attempts_user ON purchase_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_purchase_attempts_event ON purchase_attempts(event_id);
CREATE INDEX IF NOT EXISTS idx_purchase_attempts_ip ON purchase_attempts(ip_address);
CREATE INDEX IF NOT EXISTS idx_purchase_attempts_time ON purchase_attempts(attempted_at);

CREATE INDEX IF NOT EXISTS idx_blacklist_type_value ON security_blacklist(type, value);
CREATE INDEX IF NOT EXISTS idx_blacklist_expires ON security_blacklist(expires_at);

CREATE INDEX IF NOT EXISTS idx_suspicious_user ON suspicious_activities(user_id);
CREATE INDEX IF NOT EXISTS idx_suspicious_reviewed ON suspicious_activities(reviewed);
CREATE INDEX IF NOT EXISTS idx_suspicious_severity ON suspicious_activities(severity);
CREATE INDEX IF NOT EXISTS idx_suspicious_type ON suspicious_activities(activity_type);
