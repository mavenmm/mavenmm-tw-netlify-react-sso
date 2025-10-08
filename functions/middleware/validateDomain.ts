import type { HandlerEvent } from "@netlify/functions";
import { findDomainConfig, validateDomainKey } from "../config/domains";
import { logger } from "../utils/logger";
import { DomainValidationResult } from "../types/domain";

/**
 * Domain Validation Middleware
 *
 * Validates that:
 * 1. Origin is in the allowed domain registry
 * 2. X-Domain-Key header matches the registered key for that domain
 *
 * This prevents domain spoofing attacks where an attacker could:
 * - Spoof the Origin header
 * - Register a similar domain
 * - Attempt unauthorized access
 */

export function validateDomain(event: HandlerEvent): DomainValidationResult {
  const origin = event.headers.origin || event.headers.referer || '';
  const domainKey = event.headers['x-domain-key'] || '';

  // Allow requests without origin (server-to-server, curl, etc.)
  // In production, you may want to require origin for all requests
  if (!origin) {
    logger.warn('Request received without origin header', {
      path: event.path,
      ip: event.headers['x-forwarded-for'] || event.headers['x-real-ip'],
    });

    // For development, allow no-origin requests
    // For production, consider returning { valid: false, error: 'Origin required' }
    if (process.env.NODE_ENV === 'production' && process.env.NETLIFY === 'true') {
      return {
        valid: false,
        error: 'Origin header required',
      };
    }

    // Development: allow no-origin requests (for testing)
    return { valid: true };
  }

  // Normalize origin (remove trailing slash)
  const normalizedOrigin = origin.replace(/\/$/, '');

  // Check if domain is registered
  const domainConfig = findDomainConfig(normalizedOrigin);

  if (!domainConfig) {
    logger.security('Unregistered domain attempted access', {
      origin: normalizedOrigin,
      path: event.path,
      ip: event.headers['x-forwarded-for'] || event.headers['x-real-ip'],
      userAgent: event.headers['user-agent'],
    });

    return {
      valid: false,
      error: 'Domain not registered. Contact security@mavenmm.com to register your application.',
    };
  }

  // Check if domain is active
  if (!domainConfig.active) {
    logger.security('Inactive domain attempted access', {
      origin: normalizedOrigin,
      domain: domainConfig.domain,
      environment: domainConfig.environment,
    });

    return {
      valid: false,
      error: 'Domain access has been disabled. Contact security@mavenmm.com.',
    };
  }

  // Validate domain key
  if (!domainKey) {
    logger.security('Request missing X-Domain-Key header', {
      origin: normalizedOrigin,
      domain: domainConfig.domain,
      environment: domainConfig.environment,
      ip: event.headers['x-forwarded-for'] || event.headers['x-real-ip'],
    });

    return {
      valid: false,
      error: 'X-Domain-Key header required. Add to your application environment variables.',
    };
  }

  // Validate key matches domain
  const keyValid = validateDomainKey(normalizedOrigin, domainKey);

  if (!keyValid) {
    logger.security('Invalid domain key provided', {
      origin: normalizedOrigin,
      domain: domainConfig.domain,
      environment: domainConfig.environment,
      providedKeyPrefix: domainKey.substring(0, 8) + '...',
      ip: event.headers['x-forwarded-for'] || event.headers['x-real-ip'],
    });

    return {
      valid: false,
      error: 'Invalid domain key. Check your X_DOMAIN_KEY environment variable.',
    };
  }

  // Success - domain and key are valid
  logger.debug('Domain validation successful', {
    domain: domainConfig.domain,
    environment: domainConfig.environment,
    description: domainConfig.description,
  });

  return {
    valid: true,
    domain: domainConfig,
  };
}

/**
 * Get validation error response
 */
export function getDomainValidationErrorResponse(
  validation: DomainValidationResult,
  corsHeaders: Record<string, string>
) {
  return {
    statusCode: 403,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      error: 'Domain validation failed',
      message: validation.error,
      documentation: 'https://github.com/mavenmm/auth-service/blob/main/INTEGRATION.md',
    }),
  };
}
