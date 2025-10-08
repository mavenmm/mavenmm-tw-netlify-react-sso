/**
 * Domain Registry Types
 *
 * Defines the structure for allowed domains and their authentication keys.
 * This prevents domain spoofing and enables per-app access control.
 */

export interface DomainConfig {
  /** Full domain URL (e.g., 'https://app1.mavenmm.com') */
  domain: string;

  /** Unique domain key for authentication (e.g., 'dmk_a1b2c3d4e5f6') */
  domainKey: string;

  /** Environment classification */
  environment: 'production' | 'staging' | 'development';

  /** Whether this domain is currently active */
  active: boolean;

  /** Optional description for documentation */
  description?: string;

  /** When this domain was registered */
  registeredAt: string;

  /** Last time this domain was used */
  lastUsedAt?: string;
}

export interface DomainValidationResult {
  valid: boolean;
  domain?: DomainConfig;
  error?: string;
}

export interface DomainKeyHeader {
  /** Header name for domain key */
  headerName: 'x-domain-key';

  /** Domain key value */
  value: string;
}
