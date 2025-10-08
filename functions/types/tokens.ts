/**
 * Token Types
 *
 * Defines the dual-token authentication strategy:
 * - Access tokens: Short-lived (15min), returned to client, used for API calls
 * - Refresh tokens: Long-lived (7 days), httpOnly cookie, used to get new access tokens
 */

export interface AccessTokenPayload {
  /** User ID from Teamwork */
  userId: string;

  /** Token type identifier */
  type: 'access';

  /** When the token was issued (Unix timestamp) */
  iat: number;

  /** When the token expires (Unix timestamp) */
  exp: number;

  /** JWT ID for tracking and revocation */
  jti: string;
}

export interface RefreshTokenPayload {
  /** User ID from Teamwork */
  userId: string;

  /** Teamwork permanent API token (encrypted) */
  accessToken: string;

  /** Token type identifier */
  type: 'refresh';

  /** When the token was issued (Unix timestamp) */
  iat: number;

  /** When the token expires (Unix timestamp) */
  exp: number;

  /** JWT ID for tracking and revocation */
  jti: string;

  /** Rotation counter - increments each time token is refreshed */
  rotation: number;
}

export interface TokenPair {
  /** Short-lived access token (returned to client) */
  accessToken: string;

  /** Access token expiry in seconds from now */
  expiresIn: number;

  /** Long-lived refresh token (set as httpOnly cookie) */
  refreshToken: string;
}

export interface TokenValidationResult {
  valid: boolean;
  payload?: AccessTokenPayload | RefreshTokenPayload;
  error?: string;
}

/**
 * Token blacklist entry
 * Used to revoke compromised tokens before expiry
 */
export interface BlacklistedToken {
  /** JWT ID */
  jti: string;

  /** When the token was blacklisted */
  blacklistedAt: number;

  /** When the token would naturally expire (for cleanup) */
  expiresAt: number;

  /** Reason for blacklisting */
  reason: 'logout' | 'security' | 'rotation' | 'admin';

  /** User ID associated with the token */
  userId?: string;
}
