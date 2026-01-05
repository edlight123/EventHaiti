# Rate Limiting Implementation Guide

## Overview
Add rate limiting to verification endpoints to prevent spam submissions and protect against abuse.

---

## Recommended Solution: Upstash Redis + @upstash/ratelimit

**Why Upstash?**
- ✅ Serverless-first (perfect for Vercel/Next.js)
- ✅ Global edge network (low latency)
- ✅ Free tier available (10K requests/day)
- ✅ Simple SDK with multiple algorithms
- ✅ No infrastructure management

---

## Step 1: Setup Upstash

### Create Upstash Account & Database

1. Go to [https://upstash.com](https://upstash.com)
2. Sign up (free tier)
3. Create a new Redis database:
   - Choose region closest to your Vercel deployment
   - Select "Global" for multi-region apps
4. Copy connection details:
   - `UPSTASH_REDIS_REST_URL`
   - `UPSTASH_REDIS_REST_TOKEN`

### Add Environment Variables

```bash
# .env.local
UPSTASH_REDIS_REST_URL=https://your-db.upstash.io
UPSTASH_REDIS_REST_TOKEN=your_token_here
```

### Add to Vercel

```bash
vercel env add UPSTASH_REDIS_REST_URL
vercel env add UPSTASH_REDIS_REST_TOKEN
```

---

## Step 2: Install Dependencies

```bash
npm install @upstash/ratelimit @upstash/redis
```

Or with pnpm:

```bash
pnpm add @upstash/ratelimit @upstash/redis
```

---

## Step 3: Create Rate Limiter Module

Create `lib/rate-limit.ts`:

```typescript
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

// Check if rate limiting is enabled (requires Upstash env vars)
const RATE_LIMIT_ENABLED = Boolean(
  process.env.UPSTASH_REDIS_REST_URL && 
  process.env.UPSTASH_REDIS_REST_TOKEN
)

// Initialize Redis client (only if enabled)
const redis = RATE_LIMIT_ENABLED
  ? new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    })
  : null

/**
 * Rate limiter for verification submissions
 * - 3 attempts per hour per user
 * - Prevents spam and abuse
 */
export const verificationRateLimit = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(3, '60 m'), // 3 attempts per hour
      analytics: true,
      prefix: 'ratelimit:verification',
    })
  : null

/**
 * Rate limiter for phone verification code sending
 * - 5 codes per hour per user
 * - Prevents SMS spam
 */
export const phoneCodeRateLimit = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(5, '60 m'), // 5 codes per hour
      analytics: true,
      prefix: 'ratelimit:phone_code',
    })
  : null

/**
 * Rate limiter for phone code verification attempts
 * - 10 attempts per 15 minutes per user
 * - Prevents brute force attacks
 */
export const phoneCodeVerifyRateLimit = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(10, '15 m'), // 10 attempts per 15 min
      analytics: true,
      prefix: 'ratelimit:phone_verify',
    })
  : null

/**
 * Helper function to check rate limit and return appropriate response
 */
export async function checkRateLimit(
  limiter: Ratelimit | null,
  identifier: string
): Promise<{ success: boolean; limit?: number; remaining?: number; reset?: number }> {
  // If rate limiting is not enabled, allow all requests
  if (!limiter) {
    return { success: true }
  }

  const { success, limit, remaining, reset } = await limiter.limit(identifier)

  return {
    success,
    limit,
    remaining,
    reset,
  }
}
```

---

## Step 4: Apply Rate Limiting to Endpoints

### Example 1: Bank Verification Submission

Update `app/api/organizer/submit-bank-verification/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { checkRateLimit, verificationRateLimit } from '@/lib/rate-limit'
// ... other imports

export async function POST(request: NextRequest) {
  try {
    const { user, error } = await requireAuth('organizer')
    if (error || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const organizerId = user.id

    // ✅ CHECK RATE LIMIT
    const rateLimitResult = await checkRateLimit(verificationRateLimit, organizerId)
    if (!rateLimitResult.success) {
      return NextResponse.json(
        {
          error: 'Rate limit exceeded',
          message: `You can only submit ${rateLimitResult.limit} verification documents per hour. Try again in ${Math.ceil((rateLimitResult.reset! - Date.now()) / 1000 / 60)} minutes.`,
          retryAfter: rateLimitResult.reset,
        },
        { 
          status: 429,
          headers: {
            'X-RateLimit-Limit': String(rateLimitResult.limit),
            'X-RateLimit-Remaining': String(rateLimitResult.remaining),
            'X-RateLimit-Reset': String(rateLimitResult.reset),
          }
        }
      )
    }

    // ... rest of endpoint logic
  } catch (error: any) {
    // ... error handling
  }
}
```

### Example 2: Phone Code Sending

Update `app/api/organizer/send-phone-verification-code/route.ts`:

```typescript
import { checkRateLimit, phoneCodeRateLimit } from '@/lib/rate-limit'

export async function POST(request: NextRequest) {
  try {
    const { user, error } = await requireAuth('organizer')
    if (error || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // ✅ CHECK RATE LIMIT
    const rateLimitResult = await checkRateLimit(phoneCodeRateLimit, user.id)
    if (!rateLimitResult.success) {
      return NextResponse.json(
        {
          error: 'Rate limit exceeded',
          message: 'Too many verification code requests. Please try again later.',
          retryAfter: rateLimitResult.reset,
        },
        { status: 429 }
      )
    }

    // ... send SMS code logic
  }
}
```

### Example 3: Phone Code Verification

Update `app/api/organizer/submit-phone-verification/route.ts`:

```typescript
import { checkRateLimit, phoneCodeVerifyRateLimit } from '@/lib/rate-limit'

export async function POST(request: NextRequest) {
  try {
    const { user, error } = await requireAuth('organizer')
    if (error || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // ✅ CHECK RATE LIMIT (prevent brute force)
    const rateLimitResult = await checkRateLimit(phoneCodeVerifyRateLimit, user.id)
    if (!rateLimitResult.success) {
      return NextResponse.json(
        {
          error: 'Too many attempts',
          message: 'You have made too many verification attempts. Please try again later.',
        },
        { status: 429 }
      )
    }

    // ... verify code logic
  }
}
```

---

## Step 5: Handle Rate Limit in Mobile App

Update mobile verification screens to handle 429 responses:

```typescript
// mobile/screens/organizer/OrganizerPayoutSettingsScreenV2.tsx

const handleSubmitVerification = useCallback(async () => {
  setSubmittingVerification(true)
  try {
    const form = new FormData()
    // ... prepare form data

    const res = await backendFetch('/api/organizer/submit-bank-verification', {
      method: 'POST',
      body: form as any,
      headers: {},
    })

    const data = await res.json()

    if (res.status === 429) {
      // ✅ Handle rate limit
      const retryAfter = data.retryAfter
      const minutesLeft = retryAfter 
        ? Math.ceil((retryAfter - Date.now()) / 1000 / 60)
        : 60
        
      Alert.alert(
        'Too Many Attempts',
        `You've submitted too many verification documents recently. Please try again in ${minutesLeft} minute${minutesLeft !== 1 ? 's' : ''}.`,
        [{ text: 'OK' }]
      )
      return
    }

    if (!res.ok) {
      throw new Error(data?.error || data?.message || 'Failed to submit verification')
    }

    Alert.alert('Verification Submitted', data.message || 'Your document is under review.')
    // ... success handling
  } catch (e: any) {
    Alert.alert('Error', e?.message || 'Failed to submit verification')
  } finally {
    setSubmittingVerification(false)
  }
}, [/* deps */])
```

---

## Rate Limit Configuration Reference

### Sliding Window vs Fixed Window

**Sliding Window** (Recommended):
```typescript
Ratelimit.slidingWindow(3, '60 m') // 3 requests per 60 minutes, sliding
```
- Smoother distribution of requests
- Prevents burst at window boundaries
- More fair to users

**Fixed Window**:
```typescript
Ratelimit.fixedWindow(3, '60 m') // 3 requests per 60 minutes, resets at hour mark
```
- Simpler logic
- Can allow bursts at window boundaries
- May be unfair if user hits limit just before reset

### Recommended Limits

| Endpoint | Limit | Window | Reason |
|----------|-------|--------|--------|
| Bank verification submission | 3 | 1 hour | Prevent spam, reasonable for legitimate use |
| Identity verification submission | 3 | 1 hour | Same as bank |
| Phone code sending | 5 | 1 hour | Prevent SMS abuse, enough for typos |
| Phone code verification | 10 | 15 min | Prevent brute force, allow fat-finger errors |
| Payout withdrawal | 5 | 24 hours | Prevent abuse, reasonable for operations |

---

## Alternative: In-Memory Rate Limiting (Development)

For development without Upstash, use in-memory rate limiting:

```typescript
// lib/rate-limit-memory.ts
const memory: Map<string, { count: number; reset: number }> = new Map()

export function checkRateLimitMemory(
  key: string,
  limit: number,
  windowMs: number
): { success: boolean; remaining: number; reset: number } {
  const now = Date.now()
  const entry = memory.get(key)

  if (!entry || entry.reset < now) {
    // First request or expired window
    memory.set(key, { count: 1, reset: now + windowMs })
    return { success: true, remaining: limit - 1, reset: now + windowMs }
  }

  if (entry.count >= limit) {
    // Rate limit exceeded
    return { success: false, remaining: 0, reset: entry.reset }
  }

  // Increment counter
  entry.count++
  memory.set(key, entry)
  return { success: true, remaining: limit - entry.count, reset: entry.reset }
}

// Use in endpoints:
const result = checkRateLimitMemory(`verification:${userId}`, 3, 60 * 60 * 1000) // 3 per hour
```

⚠️ **Note**: In-memory rate limiting:
- ❌ Doesn't work across multiple serverless instances
- ❌ Resets on deployment
- ❌ Not suitable for production
- ✅ Good for local development
- ✅ Good for testing

---

## Testing Rate Limits

### Unit Test Example

```typescript
// __tests__/rate-limit.test.ts
import { checkRateLimitMemory } from '@/lib/rate-limit-memory'

describe('Rate Limiting', () => {
  it('should allow requests within limit', () => {
    const result1 = checkRateLimitMemory('user:123', 3, 60000)
    expect(result1.success).toBe(true)
    expect(result1.remaining).toBe(2)

    const result2 = checkRateLimitMemory('user:123', 3, 60000)
    expect(result2.success).toBe(true)
    expect(result2.remaining).toBe(1)

    const result3 = checkRateLimitMemory('user:123', 3, 60000)
    expect(result3.success).toBe(true)
    expect(result3.remaining).toBe(0)
  })

  it('should block requests over limit', () => {
    checkRateLimitMemory('user:456', 2, 60000)
    checkRateLimitMemory('user:456', 2, 60000)
    
    const blocked = checkRateLimitMemory('user:456', 2, 60000)
    expect(blocked.success).toBe(false)
    expect(blocked.remaining).toBe(0)
  })

  it('should reset after window expires', async () => {
    checkRateLimitMemory('user:789', 1, 100) // 100ms window
    
    const blocked = checkRateLimitMemory('user:789', 1, 100)
    expect(blocked.success).toBe(false)

    await new Promise(resolve => setTimeout(resolve, 150))

    const allowed = checkRateLimitMemory('user:789', 1, 100)
    expect(allowed.success).toBe(true)
  })
})
```

### Integration Test (with Upstash)

```typescript
// __tests__/verification-rate-limit.integration.test.ts
import { verificationRateLimit } from '@/lib/rate-limit'

describe('Verification Rate Limiting (Integration)', () => {
  it('should enforce rate limits on verification endpoint', async () => {
    const userId = `test-user-${Date.now()}`
    
    // First 3 requests should succeed
    for (let i = 0; i < 3; i++) {
      const result = await verificationRateLimit?.limit(userId)
      expect(result?.success).toBe(true)
    }

    // 4th request should be blocked
    const blocked = await verificationRateLimit?.limit(userId)
    expect(blocked?.success).toBe(false)
  })
})
```

---

## Monitoring & Analytics

Upstash provides built-in analytics when `analytics: true` is set:

```typescript
const ratelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(3, '60 m'),
  analytics: true, // ✅ Enable analytics
  prefix: 'ratelimit:verification',
})
```

View analytics in Upstash dashboard:
- Total requests
- Blocked requests
- Top rate-limited users
- Request distribution over time

---

## Cost Estimation

### Upstash Free Tier
- 10,000 requests/day
- Suitable for small to medium apps
- Upgrade if you exceed

### Calculation Example
- 100 active organizers per day
- Each submits 2 verification attempts
- Total: 200 rate limit checks/day
- **Well within free tier** ✅

### Paid Tier
- $0.20 per 100K requests
- Very affordable even at scale
- Example: 1M requests/month = $2/month

---

## Next Steps

1. ✅ Sign up for Upstash
2. ✅ Add environment variables
3. ✅ Install dependencies (`@upstash/ratelimit`, `@upstash/redis`)
4. ✅ Create `lib/rate-limit.ts` module
5. ✅ Apply to verification endpoints
6. ✅ Update mobile error handling
7. ✅ Test locally with in-memory fallback
8. ✅ Deploy and monitor

---

## References

- [Upstash Documentation](https://upstash.com/docs/redis/overall/getstarted)
- [Ratelimit SDK](https://upstash.com/docs/redis/sdks/ratelimit-ts/overview)
- [Vercel Integration](https://vercel.com/integrations/upstash)
- [Next.js Rate Limiting Guide](https://nextjs.org/docs/app/building-your-application/routing/middleware#rate-limiting)
