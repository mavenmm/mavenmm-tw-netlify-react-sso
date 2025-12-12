import type { HandlerEvent, HandlerContext, Handler } from "@netlify/functions";
import cookie from "cookie";
import { rotateRefreshToken } from "./utils/tokenManager";
import { getCorsHeaders, handlePreflight, validateOrigin } from "./middleware/cors";
import { validateDomain, getDomainValidationErrorResponse } from "./middleware/validateDomain";
import { checkRateLimit, getRateLimitErrorResponse, getRateLimitHeaders } from "./middleware/rateLimit";
import { logger } from "./utils/logger";

/**
 * Refresh endpoint
 *
 * Validates refresh token from httpOnly cookie and issues new access token.
 * Implements token rotation for security: each refresh token is single-use.
 *
 * Flow:
 * 1. Validate origin and domain key
 * 2. Extract refresh token from httpOnly cookie
 * 3. Validate refresh token
 * 4. Blacklist old refresh token
 * 5. Issue new access token + new refresh token
 * 6. Return access token in response body
 * 7. Set new refresh token as httpOnly cookie
 */
const handler: Handler = async (event: HandlerEvent, _: HandlerContext) => {
  try {
    // Handle preflight requests
    const preflightResponse = handlePreflight(event);
    if (preflightResponse) {
      return preflightResponse;
    }

    const corsHeaders = getCorsHeaders(event);

    // Check rate limit
    const rateLimit = checkRateLimit(event);
    if (!rateLimit.allowed) {
      return getRateLimitErrorResponse(rateLimit, corsHeaders);
    }

    // Validate origin
    if (!validateOrigin(event)) {
      logger.security("Unauthorized origin attempted refresh", {
        origin: event.headers.origin,
        ip: event.headers['x-forwarded-for'] || event.headers['x-real-ip'],
      });

      return {
        statusCode: 403,
        headers: corsHeaders,
        body: JSON.stringify({
          error: "Origin not allowed",
        }),
      };
    }

    // Validate domain key
    const domainValidation = validateDomain(event);
    if (!domainValidation.valid) {
      return getDomainValidationErrorResponse(domainValidation, corsHeaders);
    }

    // Extract refresh token from cookie
    const cookieHeader = event.headers.cookie;

    if (!cookieHeader) {
      logger.debug("No cookie header in refresh request");
      return {
        statusCode: 401,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          error: "No refresh token provided",
          message: "Please log in again",
        }),
      };
    }

    const cookies = cookie.parse(cookieHeader);
    const refreshToken = cookies.maven_refresh_token;

    if (!refreshToken) {
      logger.debug("maven_refresh_token cookie not found");
      return {
        statusCode: 401,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          error: "No refresh token provided",
          message: "Please log in again",
        }),
      };
    }

    // Rotate refresh token (validates, blacklists old, creates new pair)
    const newTokenPair = rotateRefreshToken(refreshToken);

    if (!newTokenPair) {
      logger.warn("Refresh token rotation failed");
      return {
        statusCode: 401,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          error: "Invalid or expired refresh token",
          message: "Please log in again",
        }),
      };
    }

    // Determine cookie settings based on environment
    const origin = event.headers.origin || event.headers.referer || "";
    const isLocalhost = origin.includes("localhost") || origin.includes("127.0.0.1");

    // Cookie options for refresh token
    const cookieOptions: cookie.SerializeOptions = {
      httpOnly: true,
      secure: !isLocalhost,
      sameSite: "lax", // Lax required for cross-subdomain SSO navigation
      path: "/",
      maxAge: 7 * 24 * 60 * 60, // 7 days
    };

    // Set cookie domain for cross-port/subdomain sharing
    // Note: For localhost, we don't set domain - let the browser handle it
    // Setting domain="localhost" explicitly can cause issues in some browsers
    if (!isLocalhost && domainValidation.domain?.environment === 'production') {
      const domain = domainValidation.domain.domain;
      if (domain.includes('mavenmm.com')) {
        cookieOptions.domain = '.mavenmm.com';
      }
    }

    const refreshCookie = cookie.serialize(
      "maven_refresh_token",
      newTokenPair.refreshToken,
      cookieOptions
    );

    // Security headers
    const securityHeaders = {
      "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
      "X-Content-Type-Options": "nosniff",
      "X-Frame-Options": "DENY",
      "X-XSS-Protection": "1; mode=block",
      "Referrer-Policy": "strict-origin-when-cross-origin",
      "Cache-Control": "no-store, no-cache, must-revalidate",
    };

    logger.info("Token refresh successful", {
      domain: domainValidation.domain?.domain,
      environment: domainValidation.domain?.environment,
    });

    // Return new access token in response body
    return {
      statusCode: 200,
      headers: {
        ...corsHeaders,
        ...securityHeaders,
        ...getRateLimitHeaders(rateLimit),
        "Content-Type": "application/json",
        "Set-Cookie": refreshCookie,
      },
      body: JSON.stringify({
        accessToken: newTokenPair.accessToken,
        expiresIn: newTokenPair.expiresIn,
        tokenType: "Bearer",
      }),
    };
  } catch (error) {
    logger.error("Error in refresh handler:", error);
    return {
      statusCode: 500,
      headers: {
        ...getCorsHeaders(event),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        error: "Token refresh failed",
        message: "An internal error occurred",
      }),
    };
  }
};

export { handler };
