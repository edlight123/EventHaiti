# Date Serialization Fixes Summary

## Problem
Production was experiencing errors: **"Only plain objects can be passed to Client Components from Server Components"** (digest: 2483997317)

This occurred because Next.js cannot serialize JavaScript Date objects or Firestore Timestamp objects when passing data from Server Components to Client Components.

## Root Cause
Multiple server-side functions were returning Date objects directly instead of converting them to ISO string format. When these objects were passed to Client Components, Next.js failed to serialize them, causing the application to crash.

## Files Fixed

### 1. User Profile System
**Files:**
- `lib/firestore/user-profile.ts`
- `lib/firestore/user-profile-server.ts`
- `lib/firestore/user-profile-admin.ts`

**Changes:**
- Updated `UserProfile` interface: `createdAt` and `updatedAt` changed from `Date` to `string`
- Modified `getUserProfile()` to serialize timestamps: `.toDate().toISOString()`
- Modified `getUserProfileServer()` to serialize timestamps
- Modified `getUserProfileAdmin()` to serialize timestamps

### 2. Notifications System
**Files:**
- `types/notifications.ts`
- `lib/notifications.ts`
- `lib/notifications/helpers.ts`
- `components/NotificationsClient.tsx`

**Changes:**
- Updated `Notification` interface: all date fields now use `string` type
- Updated `FCMToken` interface: `createdAt` and `updatedAt` as strings
- Modified `getUserNotifications()` to serialize all timestamps
- Modified `getUserNotificationsServer()` to serialize all timestamps
- Fixed `NotificationsClient` to handle ISO string dates and wrap in `new Date()` for display

### 3. Verification System
**Files:**
- `lib/verification.ts`

**Changes:**
- Updated `VerificationRequest` interface: all date fields use `string` type
- Modified `getVerificationRequest()` to serialize `createdAt`, `updatedAt`, and `submittedAt`

### 4. Admin Dashboard System
**Files:**
- `lib/firestore/admin.ts`

**Changes:**
- Fixed `getPendingVerifications()`: serialized all timestamp fields (lines 181-191)
- Fixed `getRecentEvents()`: serialized `startDateTime` and `createdAt` (lines 134-147)
- Fixed `globalSearch()`: replaced spread operators with explicit field mapping to prevent timestamp leakage (lines 234-252)

### 5. Audit Log System
**Files:**
- `lib/admin/audit-log.ts`

**Changes:**
- Fixed `getRecentAdminActivities()`: serialize `timestamp` field using `.toISOString()`
- Fixed `logAdminAction()`: store `timestamp` and `createdAt` as ISO strings instead of Date objects

## Pattern Applied

All fixes followed this pattern:

```typescript
// ❌ BEFORE (causes error)
timestamp: data.timestamp?.toDate()

// ✅ AFTER (works correctly)
timestamp: data.timestamp?.toDate().toISOString()
```

## Verification

### Build Success
- Local build completed successfully with `pnpm build`
- No type errors or compilation issues
- All routes compiled without serialization errors

### Expected Dynamic Routes
The following routes show "Dynamic server usage" warnings during build, which is **expected and correct** because they use authentication (`cookies()`):
- All `/admin/*` routes
- All `/organizer/*` routes
- `/profile`, `/settings`, `/notifications`, `/favorites`
- Other authenticated pages

These warnings are NOT errors - they simply indicate the routes cannot be statically pre-rendered, which is appropriate for authenticated content.

## Files Without Issues

The following files were checked and found to be already properly serialized:
- `lib/firestore/payout.ts` - All payout functions already return ISO strings
- All API routes - Using `NextResponse.json()` which handles serialization
- `lib/firestore/user-profile-server.ts` - Write operations (using `new Date()` for Firestore writes is fine)

## Prevention Guidelines

To prevent future serialization issues:

1. **Never return Date objects from server functions**
   - Always use `.toISOString()` for timestamps
   
2. **Never spread Firestore document data**
   - Bad: `{ id: doc.id, ...doc.data() }`
   - Good: Explicitly map each field
   
3. **Update TypeScript interfaces**
   - All timestamp fields should be `string` type, not `Date`
   
4. **Test in production build**
   - Run `pnpm build` locally before deploying
   - Development mode doesn't always catch serialization issues

## Deployment Status

All fixes have been:
- ✅ Committed to git
- ✅ Pushed to main branch
- ✅ Build verified locally
- ✅ Ready for production deployment

The fixes will automatically deploy to Vercel upon push to main branch.

## Monitoring

After deployment, monitor for:
- No more "Only plain objects" errors in production logs
- Admin dashboard loads correctly with recent activities
- User profiles display properly
- Notifications system works without errors
- Verification system functions correctly

## Related Issues Fixed

1. Translation keys showing on mobile (separate issue, also resolved)
   - Fixed `app/events/[id]/MobileAccordions.tsx` namespace issues
   - All translation keys now properly namespaced under `events.*`

---

**Last Updated:** 2025-06-XX  
**Status:** All serialization issues resolved ✅
