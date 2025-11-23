# Database Migrations

## How to Run Migrations

### Option 1: Firebase Console (Firestore)
Since we're using Firebase Firestore, structural changes are handled automatically. However, for the `price_paid` field on tickets:

1. The field will be automatically created when new tickets are purchased
2. For existing tickets, you can run a one-time update script

### Option 2: Run the Update Script

If you have existing tickets in your database, run this query in your Firebase console or via the Admin SDK:

```javascript
// This updates all existing tickets to have a price_paid field
const admin = require('firebase-admin');
const db = admin.firestore();

async function updateTickets() {
  const ticketsSnapshot = await db.collection('tickets').get();
  const batch = db.batch();
  
  for (const ticketDoc of ticketsSnapshot.docs) {
    const ticket = ticketDoc.data();
    if (!ticket.price_paid) {
      // Get the event to find the ticket price
      const eventDoc = await db.collection('events').doc(ticket.event_id).get();
      const event = eventDoc.data();
      
      batch.update(ticketDoc.ref, {
        price_paid: event.ticket_price || 0
      });
    }
  }
  
  await batch.commit();
  console.log('Updated all tickets with price_paid');
}

updateTickets();
```

## Database Schema Updates

### Added Fields:
- **tickets.price_paid** (number): The actual price paid for the ticket (may differ from current event price due to price changes)

### Existing Fields Verified:
- **users**: All fields connected ✓
- **events**: All fields connected ✓
- **tickets**: All fields connected ✓
- **verification_requests**: All fields connected ✓
- **ticket_scans**: All fields connected ✓

## Field Mapping Reference

### Events
- `ticket_price` - The price per ticket (NOT `price`)
- `venue_name`, `city`, `commune`, `address` - Location details (NOT single `location` field)
- `tags` - Array of event tags
- `is_verified` - Organizer verification status displayed on events

### Tickets
- `price_paid` - Price attendee paid (may differ from current ticket_price)
- `status` - Ticket status: 'active', 'used', 'cancelled'

### Users
- `is_verified` - Whether organizer is verified
- `verification_status` - 'none', 'pending', 'approved', 'rejected'
