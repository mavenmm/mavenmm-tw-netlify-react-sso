/**
 * Production-safe logger utility
 *
 * Prevents sensitive data from being logged in production while
 * maintaining helpful debug information in development.
 */

const isProd = process.env.NODE_ENV === 'production' || process.env.NETLIFY === 'true';

// ANSI color codes for console
const colors = {
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  green: '\x1b[32m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
};

/**
 * Sanitizes sensitive data from objects before logging
 * Prevents circular references and infinite recursion
 */
function sanitize(data: any, depth = 0, seen: Set<any> = new Set()): any {
  // Prevent infinite recursion
  if (depth > 10) return '[Max Depth Exceeded]';

  if (!data) return data;

  if (typeof data === 'string') {
    // Redact tokens and secrets
    if (data.length > 20 && (
      data.includes('Bearer') ||
      data.includes('token') ||
      data.match(/^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$/) // JWT pattern
    )) {
      return '[REDACTED_TOKEN]';
    }
    return data;
  }

  if (typeof data === 'object' && data !== null) {
    // Prevent circular references
    if (seen.has(data)) return '[Circular Reference]';
    seen.add(data);

    const sanitized = Array.isArray(data) ? [] : {};
    const sensitiveKeys = [
      'access_token',
      'refresh_token',
      'password',
      'secret',
      'authorization',
      'cookie',
      'jwt',
      'api_key',
      'apiKey',
    ];

    for (const [key, value] of Object.entries(data)) {
      const lowerKey = key.toLowerCase();
      const isSensitive = sensitiveKeys.some(sk => lowerKey.includes(sk));

      if (isSensitive) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = sanitize(value, depth + 1, seen);
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }

  return data;
}

/**
 * Wrapper to create a fresh sanitize call for each item
 */
function sanitizeItem(item: any): any {
  return sanitize(item, 0, new Set());
}

/**
 * Logger interface that respects production environment
 */
export const logger = {
  /**
   * Development-only debug logs
   * Completely suppressed in production
   */
  debug: (...args: any[]) => {
    if (!isProd) {
      console.log(colors.blue, '[DEBUG]', colors.reset, ...args.map(sanitizeItem));
    }
  },

  /**
   * Info logs - shown in production but sanitized
   */
  info: (...args: any[]) => {
    if (isProd) {
      console.info('[INFO]', ...args.map(sanitizeItem));
    } else {
      console.log(colors.green, '[INFO]', colors.reset, ...args.map(sanitizeItem));
    }
  },

  /**
   * Warning logs - always shown, always sanitized
   */
  warn: (...args: any[]) => {
    console.warn(colors.yellow, '[WARN]', colors.reset, ...args.map(sanitizeItem));
  },

  /**
   * Error logs - always shown, always sanitized
   */
  error: (...args: any[]) => {
    console.error(colors.red, '[ERROR]', colors.reset, ...args.map(sanitizeItem));
  },

  /**
   * Security event logging - always shown with sanitization
   */
  security: (event: string, details?: any) => {
    console.warn(
      colors.red,
      '[SECURITY]',
      colors.reset,
      event,
      details ? sanitizeItem(details) : ''
    );
  },
};

/**
 * Legacy color exports for gradual migration
 */
export const red = colors.red;
export const yellow = colors.yellow;
export const green = colors.green;
export const reset = colors.reset;
