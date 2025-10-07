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
 */
function sanitize(data: any): any {
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

  if (typeof data === 'object') {
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
      } else if (typeof value === 'object') {
        sanitized[key] = sanitize(value);
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }

  return data;
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
      console.log(colors.blue, '[DEBUG]', colors.reset, ...args.map(sanitize));
    }
  },

  /**
   * Info logs - shown in production but sanitized
   */
  info: (...args: any[]) => {
    if (isProd) {
      console.info('[INFO]', ...args.map(sanitize));
    } else {
      console.log(colors.green, '[INFO]', colors.reset, ...args.map(sanitize));
    }
  },

  /**
   * Warning logs - always shown, always sanitized
   */
  warn: (...args: any[]) => {
    console.warn(colors.yellow, '[WARN]', colors.reset, ...args.map(sanitize));
  },

  /**
   * Error logs - always shown, always sanitized
   */
  error: (...args: any[]) => {
    console.error(colors.red, '[ERROR]', colors.reset, ...args.map(sanitize));
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
      details ? sanitize(details) : ''
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
