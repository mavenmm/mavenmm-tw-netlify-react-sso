import type { HandlerEvent } from "@netlify/functions";
import { logger } from "../utils/logger";

/**
 * CORS configuration for auth service
 * Handles both local development and production environments
 */

// Allowed origins for CORS
const getAllowedOrigins = (): string[] => {
  const env = process.env.NODE_ENV || 'development';
  const isProduction = env === 'production' || process.env.NETLIFY === 'true';

  if (!isProduction) {
    // Local development - allow common localhost ports
    return [
      'http://localhost:3000',
      'http://localhost:5173',
      'http://localhost:5174',
      'http://localhost:8080',
      'http://localhost:8888',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:5173',
    ];
  }

  // Production - explicit allowlist from environment variable
  const envOrigins = process.env.ALLOWED_ORIGINS?.split(',').map(o => o.trim()).filter(Boolean) || [];

  if (envOrigins.length === 0) {
    // Fallback to default Maven domains if no environment variable set
    logger.warn('ALLOWED_ORIGINS environment variable not set, using defaults');
    return [
      'https://app.mavenmm.com',
      'https://app1.mavenmm.com',
      'https://admin.mavenmm.com',
      'https://dashboard.mavenmm.com',
      'https://auth.mavenmm.com',
    ];
  }

  return envOrigins;
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
    "Access-Control-Allow-Headers": "Content-Type, Authorization, Cookie, code",
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