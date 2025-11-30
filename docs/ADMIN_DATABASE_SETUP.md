# Admin Dashboard Database Setup

## Required Collections

The admin dashboard requires the following Firestore collections:

### 1. `users`
- **Purpose**: Store user accounts
- **Required Fields**: None specific for count aggregation
- **Used For**: Total users KPI

### 2. `events`
- **Purpose**: Store event data
- **Required Fields**:
  - `createdAt` or `created_at` (Timestamp): When the event was created
  - `startDateTime` or `start_datetime` (Timestamp): When the event starts
  - `title` (string): Event title
  - `city` (string): Event location
  - `ticketPrice` or `ticket_price` (number): Ticket price
  - `isPublished` or `is_published` (boolean): Publication status
- **Used For**: Total events KPI, Recent events queue
- **Indexes Needed**:
  - Single field: `createdAt` (desc) or `created_at` (desc)

### 3. `tickets`
- **Purpose**: Store ticket purchases
- **Required Fields**: None specific for count aggregation
- **Used For**: Total tickets count (not 7-day metrics)

### 4. `verification_requests`
- **Purpose**: Store organizer verification requests
- **Required Fields**:
  - `status` (string): 'pending', 'approved', 'rejected'
  - `createdAt` or `created_at` (Timestamp): When request was submitted
  - `userId` or `user_id` (string): User requesting verification
  - `businessName` or `business_name` (string): Business name
  - `idType` or `id_type` (string): Type of ID verification
- **Used For**: Pending verifications KPI and queue
- **Indexes Needed**:
  - Composite: `status` (asc) + `createdAt` (desc) or `created_at` (desc)

### 5. `platform_stats_daily` (Optional - for 7-day metrics)
- **Purpose**: Daily rollup statistics for scalable metrics
- **Document ID Format**: `YYYY-MM-DD` (e.g., `2025-11-29`)
- **Required Fields**:
  - `gmvConfirmed` (number): Total GMV from confirmed tickets
  - `ticketsConfirmed` (number): Count of confirmed tickets
  - `refundsCount` (number): Count of refunds
  - `updatedAt` (Timestamp): Last update timestamp
- **Used For**: 7-day GMV and tickets sold KPIs
- **Implementation**: Cloud Function to generate daily rollups

## Field Name Compatibility

The admin helper handles both naming conventions:
- **camelCase**: `createdAt`, `startDateTime`, `ticketPrice`, `isPublished`, `userId`, `businessName`, `idType`
- **snake_case**: `created_at`, `start_datetime`, `ticket_price`, `is_published`, `user_id`, `business_name`, `id_type`

Both formats are supported automatically.

## Setup Instructions

### 1. Verify Existing Collections
```bash
npm run verify-admin-db
```

### 2. Create Missing Collections
Collections will be created automatically when data is added. No manual creation needed.

### 3. Set Up Indexes

Firestore will automatically create indexes on first query, but you may see errors initially. Check:
- Firebase Console → Firestore → Indexes
- Click the error link in logs to auto-create the index

Required composite indexes:
1. Collection: `verification_requests`
   - Fields: `status` (Ascending) + `createdAt` (Descending)
   
2. Collection: `events`
   - Fields: `createdAt` (Descending) - single field index

### 4. Implement Daily Rollups (Optional)

For scalable 7-day metrics, create a Cloud Function:

```typescript
// functions/src/daily-stats-rollup.ts
export const dailyStatsRollup = functions.pubsub
  .schedule('0 0 * * *') // Run at midnight UTC
  .onRun(async (context) => {
    const today = new Date().toISOString().split('T')[0]
    const yesterday = new Date(Date.now() - 24*60*60*1000).toISOString().split('T')[0]
    
    // Get all confirmed tickets from yesterday
    const ticketsSnapshot = await admin.firestore()
      .collection('tickets')
      .where('status', '==', 'confirmed')
      .where('purchasedAt', '>=', new Date(yesterday))
      .where('purchasedAt', '<', new Date(today))
      .get()
    
    const gmvConfirmed = ticketsSnapshot.docs
      .reduce((sum, doc) => sum + (doc.data().pricePaid || 0), 0)
    
    const ticketsConfirmed = ticketsSnapshot.size
    
    // Save to platform_stats_daily
    await admin.firestore()
      .collection('platform_stats_daily')
      .doc(yesterday)
      .set({
        gmvConfirmed,
        ticketsConfirmed,
        refundsCount: 0, // TODO: Implement refunds tracking
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      })
  })
```

## Troubleshooting

### "No data showing in dashboard"
- Run `npm run verify-admin-db` to check collections exist
- Check browser console for errors
- Verify Firebase credentials are set

### "Index required" errors
- Click the error link to create the index automatically
- Or manually create in Firebase Console → Firestore → Indexes

### "7-day metrics show 0"
- This is expected if `platform_stats_daily` collection doesn't exist
- Implement the Cloud Function above to populate rollups
- Dashboard will work fine, just won't show GMV/tickets sold trends

### "Field doesn't exist" errors
- Check if your documents use camelCase or snake_case
- The helper supports both automatically
- Ensure timestamp fields are Firestore Timestamp objects, not strings
