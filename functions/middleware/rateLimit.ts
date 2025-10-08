import type { HandlerEvent } from "@netlify/functions";
import { logger } from "../utils/logger";

/**
 * Rate Limiting Middleware
 *
 * Protects against brute force attacks and DDoS.
 * Uses in-memory storage (in production, use Redis or database).
 */

interface RateLimitEntry {
  count: number;
  firstRequest: number;
  lastRequest: number;
}

// In-memory rate limit storage
const rateLimitMap = new Map<string, RateLimitEntry>();

// Rate limit configuration
const RATE_LIMITS = {
  // Login endpoint: 10 attempts per 15 minutes per IP
  login: { maxRequests: 10, windowMs: 15 * 60 * 1000 },

  // Refresh endpoint: 30 attempts per 15 minutes per IP
  refresh: { maxRequests: 30, windowMs: 15 * 60 * 1000 },

  // CheckAuth endpoint: 100 attempts per 15 minutes per IP
  checkAuth: { maxRequests: 100, windowMs: 15 * 60 * 1000 },

  // Default: 50 attempts per 15 minutes per IP
  default: { maxRequests: 50, windowMs: 15 * 60 * 1000 },
};

/**
 * Get client identifier (IP address)
 */
function getClientIdentifier(event: HandlerEvent): string {
  // Try multiple headers in order of preference
  const ip =
    event.headers['x-forwarded-for']?.split(',')[0].trim() ||
    event.headers['x-real-ip'] ||
    event.headers['cf-connecting-ip'] || // Cloudflare
    'unknown';

  return ip;
}

/**
 * Get rate limit config for endpoint
 */
function getRateLimitConfig(path: string) {
  if (path.includes('/login')) {
    return RATE_LIMITS.login;
  } else if (path.includes('/refresh')) {
    return RATE_LIMITS.refresh;
  } else if (path.includes('/checkAuth')) {
    return RATE_LIMITS.checkAuth;
  }
  return RATE_LIMITS.default;
}

/**
 * Check if request should be rate limited
 */
export function checkRateLimit(event: HandlerEvent): {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetTime: number;
} {
  const clientId = getClientIdentifier(event);
  const path = event.path || '';
  const config = getRateLimitConfig(path);
  const now = Date.now();

  // Create key for rate limit entry
  const key = `${clientId}:${path}`;

  // Get existing entry or create new one
  let entry = rateLimitMap.get(key);

  if (!entry) {
    // First request from this client
    entry = {
      count: 1,
      firstRequest: now,
      lastRequest: now,
    };
    rateLimitMap.set(key, entry);

    return {
      allowed: true,
      limit: config.maxRequests,
      remaining: config.maxRequests - 1,
      resetTime: now + config.windowMs,
    };
  }

  // Check if window has expired
  const windowExpired = now - entry.firstRequest > config.windowMs;

  if (windowExpired) {
    // Reset counter for new window
    entry.count = 1;
    entry.firstRequest = now;
    entry.lastRequest = now;
    rateLimitMap.set(key, entry);

    return {
      allowed: true,
      limit: config.maxRequests,
      remaining: config.maxRequests - 1,
      resetTime: now + config.windowMs,
    };
  }

  // Increment counter
  entry.count++;
  entry.lastRequest = now;
  rateLimitMap.set(key, entry);

  // Check if limit exceeded
  if (entry.count > config.maxRequests) {
    logger.security('Rate limit exceeded', {
      clientId,
      path,
      count: entry.count,
      limit: config.maxRequests,
      windowMs: config.windowMs,
    });

    return {
      allowed: false,
      limit: config.maxRequests,
      remaining: 0,
      resetTime: entry.firstRequest + config.windowMs,
    };
  }

  return {
    allowed: true,
    limit: config.maxRequests,
    remaining: config.maxRequests - entry.count,
    resetTime: entry.firstRequest + config.windowMs,
  };
}

/**
 * Get rate limit response headers
 */
export function getRateLimitHeaders(rateLimit: ReturnType<typeof checkRateLimit>): Record<string, string> {
  return {
    'X-RateLimit-Limit': rateLimit.limit.toString(),
    'X-RateLimit-Remaining': rateLimit.remaining.toString(),
    'X-RateLimit-Reset': new Date(rateLimit.resetTime).toISOString(),
  };
}

/**
 * Get rate limited error response
 */
export function getRateLimitErrorResponse(
  rateLimit: ReturnType<typeof checkRateLimit>,
  corsHeaders: Record<string, string>
) {
  const retryAfter = Math.ceil((rateLimit.resetTime - Date.now()) / 1000);

  return {
    statusCode: 429,
    headers: {
      ...corsHeaders,
      ...getRateLimitHeaders(rateLimit),
      'Content-Type': 'application/json',
      'Retry-After': retryAfter.toString(),
    },
    body: JSON.stringify({
      error: 'Rate limit exceeded',
      message: `Too many requests. Please try again in ${retryAfter} seconds.`,
      limit: rateLimit.limit,
      resetTime: new Date(rateLimit.resetTime).toISOString(),
    }),
  };
}

/**
 * Clean up expired rate limit entries (run periodically)
 */
export function cleanupRateLimits(): void {
  const now = Date.now();
  let cleaned = 0;

  for (const [key, entry] of rateLimitMap.entries()) {
    // Remove entries older than 1 hour
    if (now - entry.lastRequest > 60 * 60 * 1000) {
      rateLimitMap.delete(key);
      cleaned++;
    }
  }

  if (cleaned > 0) {
    logger.info('Rate limit cleanup complete', {
      entriesRemoved: cleaned,
      remainingEntries: rateLimitMap.size,
    });
  }
}

/**
 * Get rate limit statistics
 */
export function getRateLimitStats() {
  return {
    totalEntries: rateLimitMap.size,
    entries: Array.from(rateLimitMap.entries()).map(([key, entry]) => ({
      key,
      count: entry.count,
      age: Date.now() - entry.firstRequest,
    })),
  };
}

// Run cleanup every 15 minutes
if (process.env.NODE_ENV !== 'test') {
  setInterval(cleanupRateLimits, 15 * 60 * 1000);
}
