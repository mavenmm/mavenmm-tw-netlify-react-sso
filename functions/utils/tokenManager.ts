import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { AccessTokenPayload, RefreshTokenPayload, TokenPair, BlacklistedToken } from '../types/tokens';
import { logger } from './logger';

/**
 * Token Manager
 *
 * Handles creation, validation, and rotation of access and refresh tokens.
 * Implements security best practices:
 * - Short-lived access tokens (15min)
 * - Long-lived refresh tokens (7 days)
 * - Token rotation on refresh
 * - Token blacklisting for revocation
 */

// Token expiry durations
const ACCESS_TOKEN_EXPIRY = 15 * 60; // 15 minutes in seconds
const REFRESH_TOKEN_EXPIRY = 7 * 24 * 60 * 60; // 7 days in seconds

// In-memory blacklist (in production, use Redis or database)
const tokenBlacklist = new Map<string, BlacklistedToken>();

/**
 * Generate a unique JWT ID
 */
function generateJti(): string {
  return crypto.randomBytes(16).toString('hex');
}

/**
 * Create a pair of access and refresh tokens
 */
export function createTokenPair(userId: string, teamworkAccessToken: string, rotation: number = 0): TokenPair {
  const JWT_SECRET = process.env.JWT_KEY;
  const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_KEY || JWT_SECRET; // Separate secret for refresh tokens

  if (!JWT_SECRET) {
    throw new Error('JWT_KEY environment variable not set');
  }

  const now = Math.floor(Date.now() / 1000);
  const accessJti = generateJti();
  const refreshJti = generateJti();

  // Access token payload (minimal data)
  const accessPayload: Omit<AccessTokenPayload, 'iat' | 'exp'> = {
    userId,
    type: 'access',
    jti: accessJti,
  };

  // Refresh token payload (includes Teamwork token)
  const refreshPayload: Omit<RefreshTokenPayload, 'iat' | 'exp'> = {
    userId,
    accessToken: teamworkAccessToken, // Encrypted in JWT
    type: 'refresh',
    jti: refreshJti,
    rotation,
  };

  // Create access token (15 minutes)
  const accessToken = jwt.sign(accessPayload, JWT_SECRET, {
    expiresIn: ACCESS_TOKEN_EXPIRY,
  });

  // Create refresh token (7 days)
  const refreshToken = jwt.sign(refreshPayload, JWT_REFRESH_SECRET, {
    expiresIn: REFRESH_TOKEN_EXPIRY,
  });

  logger.debug('Created token pair', {
    userId,
    accessJti,
    refreshJti,
    rotation,
    accessExpiry: new Date((now + ACCESS_TOKEN_EXPIRY) * 1000).toISOString(),
    refreshExpiry: new Date((now + REFRESH_TOKEN_EXPIRY) * 1000).toISOString(),
  });

  return {
    accessToken,
    expiresIn: ACCESS_TOKEN_EXPIRY,
    refreshToken,
  };
}

/**
 * Verify and decode an access token
 */
export function verifyAccessToken(token: string): AccessTokenPayload | null {
  const JWT_SECRET = process.env.JWT_KEY;

  if (!JWT_SECRET) {
    logger.error('JWT_KEY not configured');
    return null;
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET) as AccessTokenPayload;

    // Verify token type
    if (payload.type !== 'access') {
      logger.warn('Invalid token type', { expected: 'access', received: payload.type });
      return null;
    }

    // Check if token is blacklisted
    if (isTokenBlacklisted(payload.jti)) {
      logger.security('Attempted use of blacklisted access token', {
        jti: payload.jti,
        userId: payload.userId,
      });
      return null;
    }

    return payload;
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      logger.debug('Access token expired');
    } else if (error.name === 'JsonWebTokenError') {
      logger.warn('Invalid access token', { error: error.message });
    } else {
      logger.error('Error verifying access token', error);
    }
    return null;
  }
}

/**
 * Verify and decode a refresh token
 */
export function verifyRefreshToken(token: string): RefreshTokenPayload | null {
  const JWT_SECRET = process.env.JWT_KEY;
  const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_KEY || JWT_SECRET;

  if (!JWT_REFRESH_SECRET) {
    logger.error('JWT_REFRESH_KEY not configured');
    return null;
  }

  try {
    const payload = jwt.verify(token, JWT_REFRESH_SECRET) as RefreshTokenPayload;

    // Verify token type
    if (payload.type !== 'refresh') {
      logger.warn('Invalid token type', { expected: 'refresh', received: payload.type });
      return null;
    }

    // Check if token is blacklisted
    if (isTokenBlacklisted(payload.jti)) {
      logger.security('Attempted use of blacklisted refresh token', {
        jti: payload.jti,
        userId: payload.userId,
      });
      return null;
    }

    return payload;
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      logger.debug('Refresh token expired');
    } else if (error.name === 'JsonWebTokenError') {
      logger.warn('Invalid refresh token', { error: error.message });
    } else {
      logger.error('Error verifying refresh token', error);
    }
    return null;
  }
}

/**
 * Rotate refresh token (create new token pair, blacklist old refresh token)
 */
export function rotateRefreshToken(oldRefreshToken: string): TokenPair | null {
  const payload = verifyRefreshToken(oldRefreshToken);

  if (!payload) {
    logger.warn('Cannot rotate invalid refresh token');
    return null;
  }

  // Blacklist the old refresh token
  blacklistToken(payload.jti, 'rotation', payload.userId, payload.exp);

  // Create new token pair with incremented rotation counter
  const newTokenPair = createTokenPair(
    payload.userId,
    payload.accessToken,
    payload.rotation + 1
  );

  logger.info('Refresh token rotated', {
    userId: payload.userId,
    oldRotation: payload.rotation,
    newRotation: payload.rotation + 1,
    oldJti: payload.jti,
  });

  return newTokenPair;
}

/**
 * Blacklist a token (for logout or security)
 */
export function blacklistToken(
  jti: string,
  reason: BlacklistedToken['reason'],
  userId?: string,
  expiresAt?: number
): void {
  const blacklistedToken: BlacklistedToken = {
    jti,
    blacklistedAt: Date.now(),
    expiresAt: expiresAt || Date.now() + REFRESH_TOKEN_EXPIRY * 1000,
    reason,
    userId,
  };

  tokenBlacklist.set(jti, blacklistedToken);

  logger.security('Token blacklisted', {
    jti,
    reason,
    userId,
    expiresAt: new Date(blacklistedToken.expiresAt * 1000).toISOString(),
  });
}

/**
 * Check if a token is blacklisted
 */
export function isTokenBlacklisted(jti: string): boolean {
  return tokenBlacklist.has(jti);
}

/**
 * Clean up expired blacklisted tokens (should run periodically)
 */
export function cleanupBlacklist(): void {
  const now = Date.now();
  let cleaned = 0;

  for (const [jti, entry] of tokenBlacklist.entries()) {
    if (entry.expiresAt < now) {
      tokenBlacklist.delete(jti);
      cleaned++;
    }
  }

  if (cleaned > 0) {
    logger.info('Blacklist cleanup complete', {
      tokensRemoved: cleaned,
      remainingTokens: tokenBlacklist.size,
    });
  }
}

/**
 * Get blacklist statistics
 */
export function getBlacklistStats() {
  return {
    totalBlacklisted: tokenBlacklist.size,
    byReason: Array.from(tokenBlacklist.values()).reduce((acc, token) => {
      acc[token.reason] = (acc[token.reason] || 0) + 1;
      return acc;
    }, {} as Record<string, number>),
  };
}

// Run cleanup every hour
if (process.env.NODE_ENV !== 'test') {
  setInterval(cleanupBlacklist, 60 * 60 * 1000); // 1 hour
}
