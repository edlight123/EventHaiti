# Timestamp Serialization Fixes

## Problem
Error: `Only plain objects, and a few built-ins, can be passed to Client Components from Server Components`
- Digest: `2483997317`
- Root Cause: Firestore Timestamp objects cannot be serialized when passing from Server to Client components in Next.js

## Solution Pattern
**NEVER** use spread operators on raw Firestore data:
```typescript
// ❌ BAD - Leaks Timestamps
const event = { id: doc.id, ...doc.data() }

// ✅ GOOD - Explicit mapping with serialization
const eventData = doc.data()
const event = {
  id: doc.id,
  title: eventData.title,
  start_datetime: eventData.start_datetime?.toDate?.()?.toISOString() || eventData.start_datetime,
  // ... map all fields explicitly
}
```

## Files Fixed

### Data Layer (lib/)
1. **lib/data/events.ts** - Removed spread operators from:
   - `getEventById()`
   - `getDiscoverEvents()`
   - `getOrganizerEvents()`
   - `getAdminEvents()`
   - `getOrganizerEventsClient()`

2. **lib/firestore/admin.ts** - Serialized timestamps in:
   - `getPendingVerifications()`
   - `getRecentEvents()`
   - `globalSearch()`

3. **lib/admin/audit-log.ts** - Serialized timestamps in:
   - `getRecentAdminActivities()`
   - `logAdminAction()`

4. **lib/firestore/user-profile.ts** - UserProfile interface uses strings
5. **lib/firestore/user-profile-server.ts** - Serializes getUserProfileServer
6. **lib/firestore/user-profile-admin.ts** - Serializes getUserProfileAdmin
7. **lib/notifications.ts** - Serializes getUserNotifications
8. **lib/notifications/helpers.ts** - Serializes getUserNotificationsServer
9. **lib/verification.ts** - Serializes VerificationRequest

### Pages (app/)
10. **app/page.tsx** - Changed home page featured events:
    - Changed: `date: new Date(e.start_datetime)` → `date: e.start_datetime`
    - Client component handles Date conversion

11. **app/events/[id]/page.tsx** - Event details page:
    - Removed spread operator from event object
    - Explicitly mapped all event fields
    - Serialized review timestamps

12. **app/organizer/scan/[eventId]/page.tsx** - Door mode scanner:
    - Removed spread from event object
    - Removed spread from attendee objects
    - Removed spread from ticket objects

13. **app/organizer/events/[id]/attendees/page.tsx** - Attendees manager:
    - Removed spread from event object
    - Removed spread from attendee objects
    - Removed spread from ticket objects

14. **app/tickets/transfer/[token]/page.tsx** - Ticket transfer:
    - Removed spread from transfer object
    - Explicitly mapped all transfer fields

### Components
15. **components/FeaturedCarousel.tsx** - Wraps string date in `new Date()` for formatting
16. **components/NotificationsClient.tsx** - Uses ISO string dates

## Deployment History
- Commit `5618c51`: Removed spread operators from events.ts
- Commit `6879613`: Added missing status field to Event type
- Commit `a344afe`: Bust cache attempt
- Commit `2dd1b5f`: Removed unstable_cache
- Commit `56a7e28`: Fixed home page Date creation
- Commit `e1c34b1`: Fixed event details page
- Commit `d7896d7`: Fixed organizer pages

## Remaining Work
Check these pages if errors persist:
- `/admin/payouts/page.tsx` - Has spread operators (line 43)
- `/admin/debug-db/page.tsx` - Has spread operators (client page)
- `/organizer/settings/security/page.tsx` - Has spread (line 19)
- `/organizer/settings/team/page.tsx` - Has spread (line 29)

## Prevention
1. Always explicitly map Firestore document fields
2. Use `.toDate?.()?.toISOString()` for all timestamp fields
3. Never pass Date objects from server to client components
4. Let client components create Date objects from ISO strings when needed
5. Consider adding ESLint rule to prevent spread on doc.data()
