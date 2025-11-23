-- Add price_paid column to tickets table
-- This stores the price the attendee actually paid for the ticket

ALTER TABLE tickets
ADD COLUMN IF NOT EXISTS price_paid DECIMAL(10, 2) DEFAULT 0 NOT NULL;

-- Update existing tickets to have price_paid equal to the event's ticket_price
-- This ensures existing data is consistent
UPDATE tickets t
SET price_paid = e.ticket_price
FROM events e
WHERE t.event_id = e.id
AND t.price_paid = 0;
