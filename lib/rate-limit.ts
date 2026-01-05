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
    console.warn('[Rate Limit] Upstash not configured, allowing request')
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
