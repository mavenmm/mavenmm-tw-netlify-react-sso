import type { HandlerEvent } from "@netlify/functions";
import { logger } from "../utils/logger";
import { getActiveDomains } from "../config/domains";

/**
 * CORS configuration for auth service
 * Uses domain registry for explicit whitelisting
 */

// Allowed origins for CORS - from domain registry
const getAllowedOrigins = (): string[] => {
  // Get all active domains from registry
  const domains = getActiveDomains();
  return domains.map(d => d.domain);
};

/**
 * Get CORS headers for a request
 */
export function getCorsHeaders(event: HandlerEvent): Record<string, string> {
  const requestOrigin = event.headers.origin || '';
  const allowedOrigins = getAllowedOrigins();

  // Check if origin is allowed
  const isAllowed = allowedOrigins.includes(requestOrigin);
  const allowedOrigin = isAllowed ? requestOrigin : allowedOrigins[0]; // Fallback to first allowed origin

  if (!isAllowed && requestOrigin) {
    logger.security('CORS: Blocked unauthorized origin', { origin: requestOrigin });
  }

  logger.debug(`CORS: Request from ${requestOrigin}, allowed: ${isAllowed}`);

  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, Cookie, code, X-Domain-Key",
    "Access-Control-Allow-Credentials": "true",
    "Cache-Control": "no-store, no-cache, must-revalidate",
    "Vary": "Origin", // Important for caching with multiple origins
  };
}

/**
 * Handle preflight OPTIONS requests
 */
export function handlePreflight(event: HandlerEvent) {
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 204,
      headers: getCorsHeaders(event),
      body: "",
    };
  }
  return null;
}

/**
 * Validate that the request origin is allowed
 */
export function validateOrigin(event: HandlerEvent): boolean {
  const requestOrigin = event.headers.origin || '';
  const allowedOrigins = getAllowedOrigins();

  // Allow requests without origin (direct API calls, Postman, etc.)
  if (!requestOrigin) {
    return true;
  }

  return allowedOrigins.includes(requestOrigin);
}