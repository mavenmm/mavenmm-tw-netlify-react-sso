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

  // Default registry for development/staging
  // In production, this should come from environment variables or database
  const defaultRegistry: DomainConfig[] = [
    // Production domains (*.mavenmm.com)
    {
      domain: 'https://app1.mavenmm.com',
      domainKey: process.env.DOMAIN_KEY_APP1 || 'dmk_dev_app1_replace_in_prod',
      environment: 'production',
      active: true,
      description: 'Main application',
      registeredAt: new Date().toISOString(),
    },
    {
      domain: 'https://admin.mavenmm.com',
      domainKey: process.env.DOMAIN_KEY_ADMIN || 'dmk_dev_admin_replace_in_prod',
      environment: 'production',
      active: true,
      description: 'Admin dashboard',
      registeredAt: new Date().toISOString(),
    },
    {
      domain: 'https://dashboard.mavenmm.com',
      domainKey: process.env.DOMAIN_KEY_DASHBOARD || 'dmk_dev_dashboard_replace_in_prod',
      environment: 'production',
      active: true,
      description: 'Analytics dashboard',
      registeredAt: new Date().toISOString(),
    },
    {
      domain: 'https://home.mavenmm.com',
      domainKey: process.env.DOMAIN_KEY_HOME || 'dmk_dev_home_replace_in_prod',
      environment: 'production',
      active: true,
      description: 'Home/Landing page',
      registeredAt: new Date().toISOString(),
    },

    // Staging domains (*.netlify.app)
    {
      domain: 'https://maven-home.netlify.app',
      domainKey: process.env.DOMAIN_KEY_MAVEN_HOME_STAGING || 'dmk_staging_maven_home',
      environment: 'staging',
      active: true,
      description: 'Maven Home - Netlify staging/preview',
      registeredAt: new Date().toISOString(),
    },

    // Development domains (localhost)
    {
      domain: 'http://localhost:3000',
      domainKey: process.env.DEV_KEY || 'dev_localhost_3000',
      environment: 'development',
      active: true,
      description: 'Local development - port 3000',
      registeredAt: new Date().toISOString(),
    },
    {
      domain: 'http://localhost:5173',
      domainKey: process.env.DEV_KEY || 'dev_localhost_5173',
      environment: 'development',
      active: true,
      description: 'Local development - port 5173 (Vite)',
      registeredAt: new Date().toISOString(),
    },
    {
      domain: 'http://localhost:5174',
      domainKey: process.env.DEV_KEY || 'dev_localhost_5174',
      environment: 'development',
      active: true,
      description: 'Local development - port 5174',
      registeredAt: new Date().toISOString(),
    },
    {
      domain: 'http://localhost:8080',
      domainKey: process.env.DEV_KEY || 'dev_localhost_8080',
      environment: 'development',
      active: true,
      description: 'Local development - port 8080',
      registeredAt: new Date().toISOString(),
    },
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
