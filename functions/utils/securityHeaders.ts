/**
 * Security Headers Utility
 *
 * Provides comprehensive security headers including CSP for all auth endpoints.
 */

/**
 * Get Content Security Policy header
 * Protects against XSS attacks by restricting resource loading
 */
export function getCSPHeader(): string {
  const policies = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' https://*.teamwork.com",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https://*.teamwork.com https://*.mavenmm.com",
    "connect-src 'self' https://*.mavenmm.com https://*.teamwork.com",
    "font-src 'self' data:",
    "object-src 'none'",
    "media-src 'self'",
    "frame-src 'none'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "upgrade-insecure-requests",
  ];

  return policies.join("; ");
}

/**
 * Get all security headers for auth endpoints
 */
export function getSecurityHeaders(includeCache: boolean = true): Record<string, string> {
  const headers: Record<string, string> = {
    // HTTPS enforcement
    "Strict-Transport-Security": "max-age=31536000; includeSubDomains; preload",

    // Content security
    "Content-Security-Policy": getCSPHeader(),

    // XSS protection
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "X-XSS-Protection": "1; mode=block",

    // Privacy
    "Referrer-Policy": "strict-origin-when-cross-origin",

    // Permissions policy (limit browser features)
    "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=()",
  };

  // Add cache control for sensitive endpoints
  if (includeCache) {
    headers["Cache-Control"] = "no-store, no-cache, must-revalidate, proxy-revalidate";
    headers["Pragma"] = "no-cache";
    headers["Expires"] = "0";
  }

  return headers;
}

/**
 * Get security headers for public endpoints (less restrictive CSP)
 */
export function getPublicSecurityHeaders(): Record<string, string> {
  return {
    "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "SAMEORIGIN",
    "Referrer-Policy": "strict-origin-when-cross-origin",
  };
}
