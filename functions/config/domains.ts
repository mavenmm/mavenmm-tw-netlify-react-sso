import { DomainConfig } from '../types/domain';

/**
 * Domain Registry
 *
 * Explicit whitelist of all allowed domains with their authentication keys.
 * Each domain must be registered here to access the auth service.
 *
 * SECURITY NOTES:
 * - Domain keys should be stored in environment variables in production
 * - Keys should be rotated regularly (quarterly recommended)
 * - Never commit production keys to source control
 * - Each app stores its own key in .env (X_DOMAIN_KEY)
 */

/**
 * Get domain registry from environment or fallback to defaults
 *
 * Environment variable format:
 * DOMAIN_REGISTRY='[
 *   {"domain":"https://app1.mavenmm.com","domainKey":"dmk_prod_abc","environment":"production","active":true}
 * ]'
 */
export function getDomainRegistry(): DomainConfig[] {
  const envRegistry = process.env.DOMAIN_REGISTRY;

  if (envRegistry) {
    try {
      return JSON.parse(envRegistry);
    } catch (error) {
      console.error('Failed to parse DOMAIN_REGISTRY environment variable:', error);
      // Fall through to default registry
    }
  }

  // Helper to create domain config
  const createDomain = (
    domain: string,
    envKey: string,
    fallback: string,
    environment: 'production' | 'staging' | 'development',
    description: string
  ): DomainConfig => ({
    domain,
    domainKey: process.env[envKey] || fallback,
    environment,
    active: true,
    description,
    registeredAt: new Date().toISOString(),
  });

  // Default registry organized by environment
  const defaultRegistry: DomainConfig[] = [
    // ===== Production (*.mavenmm.com) =====
    createDomain('https://app1.mavenmm.com', 'DOMAIN_KEY_APP1', 'dmk_dev_app1_replace_in_prod', 'production', 'Main application'),
    createDomain('https://admin.mavenmm.com', 'DOMAIN_KEY_ADMIN', 'dmk_dev_admin_replace_in_prod', 'production', 'Admin dashboard'),
    createDomain('https://dashboard.mavenmm.com', 'DOMAIN_KEY_DASHBOARD', 'dmk_dev_dashboard_replace_in_prod', 'production', 'Analytics dashboard'),
    createDomain('https://home.mavenmm.com', 'DOMAIN_KEY_HOME', 'dmk_dev_home_replace_in_prod', 'production', 'Home/Landing page'),

    // ===== Staging (*.netlify.app) =====
    createDomain('https://maven-home.netlify.app', 'DOMAIN_KEY_MAVEN_HOME', 'dmk_staging_maven_home', 'staging', 'Maven Home - Netlify staging'),
    createDomain('https://teamfeedback.netlify.app', 'DOMAIN_KEY_TEAMFEEDBACK', 'dmk_staging_teamfeedback', 'staging', 'Team Feedback - Netlify staging'),
    createDomain('https://daily-pulse-check.netlify.app', 'DOMAIN_KEY_DAILY_PULSE', 'dmk_staging_daily_pulse', 'staging', 'Daily Pulse Check - Netlify staging'),

    // ===== Development (localhost) =====
    // All localhost ports share the same key for simplicity
    createDomain('http://localhost:3000', 'DEV_KEY', 'dev_localhost_shared', 'development', 'Local development - port 3000'),
    createDomain('http://localhost:5173', 'DEV_KEY', 'dev_localhost_shared', 'development', 'Local development - port 5173 (Vite)'),
    createDomain('http://localhost:5174', 'DEV_KEY', 'dev_localhost_shared', 'development', 'Local development - port 5174'),
    createDomain('http://localhost:8080', 'DEV_KEY', 'dev_localhost_shared', 'development', 'Local development - port 8080'),
  ];

  return defaultRegistry;
}

/**
 * Get active domains only
 */
export function getActiveDomains(): DomainConfig[] {
  return getDomainRegistry().filter(d => d.active);
}

/**
 * Get domains by environment
 */
export function getDomainsByEnvironment(env: 'production' | 'staging' | 'development'): DomainConfig[] {
  return getActiveDomains().filter(d => d.environment === env);
}

/**
 * Find domain config by URL
 */
export function findDomainConfig(domainUrl: string): DomainConfig | null {
  const domains = getActiveDomains();
  return domains.find(d => d.domain === domainUrl) || null;
}

/**
 * Validate domain and key combination
 */
export function validateDomainKey(domainUrl: string, providedKey: string): boolean {
  const config = findDomainConfig(domainUrl);

  if (!config) {
    return false;
  }

  // Constant-time comparison to prevent timing attacks
  return timingSafeEqual(config.domainKey, providedKey);
}

/**
 * Timing-safe string comparison
 * Prevents timing attacks by always comparing full strings
 */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }

  return result === 0;
}
