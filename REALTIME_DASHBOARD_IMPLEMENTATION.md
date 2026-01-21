# Real-Time Dashboard Integration

## Overview
Implemented a polling-based real-time data system for the admin dashboard to replace mock data with live updates. This provides administrators with up-to-the-second visibility into platform metrics, activities, and system health.

## Why Polling Instead of WebSockets?
Next.js App Router (v14+) doesn't support WebSocket upgrades in Edge Runtime API routes. We implemented a polling-based approach as a robust alternative that provides:
- ✅ Real-time updates every 10 seconds
- ✅ Automatic reconnection with exponential backoff
- ✅ Visibility-aware polling (pauses when tab is inactive)
- ✅ Clean state management via React Context
- ✅ Type-safe hooks for consuming real-time data

## Architecture

### Backend: Polling API
**File:** `app/api/admin/realtime/route.ts`
- **GET Endpoint:** Returns current platform state
  - Platform counts (users, events, verifications)
  - 7-day metrics (tickets, GMV, refunds)
  - Recent activities from Firestore
  - System health status
- **POST Endpoint:** Broadcasts admin actions to activity feed
- **Security:** Protected by `requireAdmin()` middleware
- **Performance:** Aggregates multiple Firestore queries in parallel

### Frontend: Real-Time Provider
**File:** `lib/realtime/AdminRealtimeProvider.tsx`

#### Context API
Provides centralized state management for all real-time data:
```typescript
interface AdminRealtimeContextValue {
  isConnected: boolean
  connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error'
  data: RealtimeData | null
  metrics: AdminMetricsUpdate | null
  activities: AdminActivity[]
  systemStatus: SystemStatus | null
  lastUpdate: Date | null
  refresh: () => Promise<void>
  addActivity: (activity) => Promise<void>
}
```

#### Custom Hooks
- `useAdminRealtime()` - Full context access
- `useAdminMetrics()` - Metrics only
- `useAdminActivities()` - Activities only
- `useSystemStatus()` - System health + connection state

#### Features
- **Smart Polling:** 10-second intervals (configurable)
- **Visibility Detection:** Pauses polling when tab is hidden
- **Retry Logic:** Exponential backoff with max 3 retries
- **Race Condition Protection:** Prevents duplicate fetches
- **Graceful Degradation:** Falls back to props if real-time unavailable

## Components Enhanced

### 1. RealTimeMetrics
**File:** `components/admin/RealTimeMetrics.tsx`
- Displays 6 KPI cards (Users, Events, Tickets, GMV, Refunds, Pending)
- Integrated `useAdminMetrics()` for live updates
- Shows system status indicators (Online/Degraded/Offline)
- Falls back to props if real-time disconnected
- Auto-refresh visual indicator

### 2. AdminActivityFeed
**File:** `components/admin/AdminActivityFeed.tsx`
- Live activity stream with filtering
- Integrated `useAdminActivities()` hook
- Merges real-time activities with prop activities (deduplication)
- Shows activity types: verification, payment, event, security, user_action, system
- Urgency indicators for high-priority activities
- Connection status awareness

### 3. RealtimeConnectionStatus
**File:** `components/admin/RealtimeConnectionStatus.tsx`
- Visual connection indicator (green dot = live, gray = offline)
- Animated pulse effect when connected
- "Last updated" timestamp with human-readable format
- Displays: "Live · Updated 5s ago"

## Integration

### Admin Layout
**File:** `app/admin/layout.tsx`
```tsx
<AdminRealtimeProvider>
  <div className="min-h-screen bg-gray-50">
    {/* Navbar, Sidebar, Content */}
  </div>
</AdminRealtimeProvider>
```

### Dashboard Client
**File:** `app/admin/AdminDashboardClient.tsx`
- Added `<RealtimeConnectionStatus />` to header
- All dashboard components automatically receive real-time data via context
- Props serve as initial server-rendered data for instant page load

## Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    Admin Dashboard Page                      │
│                  (Server Component)                          │
│                                                              │
│  1. Fetches initial data from Firestore                     │
│  2. Passes to AdminDashboardClient as props                 │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│               AdminRealtimeProvider                          │
│                (Client Component)                            │
│                                                              │
│  - Polls /api/admin/realtime every 10s                      │
│  - Updates context with fresh data                          │
│  - Pauses when tab hidden                                   │
│  - Retries on errors                                        │
└───────────────────────────┬─────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
        ▼                   ▼                   ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│RealTimeMetrics│  │ActivityFeed  │  │ConnectionStatus│
│              │  │              │  │              │
│ Uses:        │  │ Uses:        │  │ Uses:        │
│ useMetrics() │  │ useActivities│  │ useSystemStatus│
└──────────────┘  └──────────────┘  └──────────────┘
```

## Performance Considerations

### Optimizations
- **Parallel Queries:** All Firestore queries run via `Promise.all()`
- **Request Deduplication:** Prevents overlapping fetches with `isFetchingRef`
- **Visibility Detection:** Pauses polling when tab is inactive (saves bandwidth)
- **Conditional Rendering:** Components only re-render when their subscribed data changes
- **Type Safety:** Full TypeScript types prevent runtime errors

### Bandwidth Usage
- **Polling Frequency:** 10 seconds = 6 requests/minute = 360 requests/hour
- **Payload Size:** ~2-5 KB per response (compressed)
- **Idle Savings:** 0 requests when tab is hidden

## Future Enhancements

### Option 1: True WebSocket Support
```typescript
// Requires custom Next.js server
import { Server } from 'socket.io'

const io = new Server(httpServer)
io.on('connection', (socket) => {
  socket.emit('metrics', metrics)
  socket.on('subscribe', (channel) => {
    socket.join(channel)
  })
})
```

### Option 2: Server-Sent Events (SSE)
```typescript
export async function GET() {
  const encoder = new TextEncoder()
  const stream = new TransformStream()
  const writer = stream.writable.getWriter()

  setInterval(async () => {
    const data = await getMetrics()
    writer.write(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
  }, 5000)

  return new Response(stream.readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
    }
  })
}
```

### Option 3: Firestore Real-Time Listeners
```typescript
// Direct Firestore subscriptions in client
const unsubscribe = onSnapshot(
  query(collection(db, 'admin_activities'), 
  limit(10)), 
  (snapshot) => {
    const activities = snapshot.docs.map(doc => doc.data())
    setActivities(activities)
  }
)
```

## Testing

### Build Verification
```bash
npm run build
# ✓ Compiled successfully
# 182 pages generated
```

### Manual Testing Checklist
- [ ] Dashboard shows "Live" indicator when connected
- [ ] Metrics update every 10 seconds
- [ ] Activity feed shows new activities in real-time
- [ ] Connection indicator shows "Updated Xs ago"
- [ ] Polling pauses when switching tabs
- [ ] Polling resumes when returning to tab
- [ ] Graceful fallback to props if API fails
- [ ] No console errors
- [ ] No duplicate API calls

### Browser Console Debug
```javascript
// Check context state
window.__ADMIN_REALTIME_DEBUG__ = true

// Monitor polling
console.log('Polling interval:', 10000)
console.log('Is connected:', useAdminRealtime().isConnected)
console.log('Last update:', useAdminRealtime().lastUpdate)
```

## Files Created/Modified

### Created
- `lib/realtime/AdminRealtimeProvider.tsx` (232 lines)
- `app/api/admin/realtime/route.ts` (158 lines)
- `components/admin/RealtimeConnectionStatus.tsx` (45 lines)
- `lib/websocket/AdminWebSocketProvider.tsx` (placeholder, 150 lines)
- `app/api/admin/ws/route.ts` (placeholder, 40 lines)

### Modified
- `app/admin/layout.tsx` - Wrapped with AdminRealtimeProvider
- `app/admin/AdminDashboardClient.tsx` - Added RealtimeConnectionStatus
- `components/admin/RealTimeMetrics.tsx` - Integrated useAdminMetrics hook
- `components/admin/AdminActivityFeed.tsx` - Integrated useAdminActivities hook

## Security

### Authentication
All endpoints protected by `requireAdmin()` middleware:
```typescript
const { user, error } = await requireAdmin()
if (error || !user) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}
```

### Rate Limiting
Consider adding rate limiting for production:
```typescript
import rateLimit from 'express-rate-limit'

const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 20 // 20 requests per minute
})
```

## Monitoring

### Recommended Metrics
- Average polling latency
- Failed poll attempts
- Connection duration
- Active admin sessions
- Real-time data freshness

### Error Logging
Current errors logged to console:
```typescript
console.error('Error fetching realtime data:', error)
```

**Production:** Send to error tracking service (Sentry, etc.)

## Documentation References
- [Next.js Data Fetching](https://nextjs.org/docs/app/building-your-application/data-fetching)
- [React Context API](https://react.dev/reference/react/createContext)
- [Firestore Queries](https://firebase.google.com/docs/firestore/query-data/queries)
- [WebSocket Alternatives](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events)
