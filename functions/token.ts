import type { HandlerEvent, HandlerContext, Handler } from "@netlify/functions";
import { getCorsHeaders, handlePreflight, validateOrigin } from "./middleware/cors";
import { validateDomain, getDomainValidationErrorResponse } from "./middleware/validateDomain";
import { verifyAccessToken, verifyRefreshToken } from "./utils/tokenManager";
import { logger } from "./utils/logger";
import { checkRateLimit, getRateLimitHeaders } from "./middleware/rateLimit";
import cookie from "cookie";

/**
 * Token endpoint - Returns Teamwork API access token for third-party integrations
 *
 * This allows authenticated apps (e.g., GraphQL servers) to retrieve the
 * Teamwork API token to make API calls on behalf of the logged-in user.
 *
 * Security:
 * - Requires valid access token in Authorization header
 * - Requires valid refresh token cookie
 * - Validates domain key to prevent unauthorized access
 * - Rate limited to prevent abuse
 *
 * Use cases:
 * - GraphQL servers that need to query Teamwork API
 * - Serverless functions that need Teamwork data
 * - Backend services that integrate with Teamwork
 */
const handler: Handler = async (event: HandlerEvent, context: HandlerContext) => {
  try {
    // Handle preflight requests
    const preflightResponse = handlePreflight(event);
    if (preflightResponse) {
      return preflightResponse;
    }

    const corsHeaders = getCorsHeaders(event);

    // Validate origin
    if (!validateOrigin(event)) {
      logger.security("Unauthorized origin attempted to access token endpoint", {
        origin: event.headers.origin,
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

    // Rate limiting (same as /user endpoint)
    const rateLimit = checkRateLimit(event, 'checkAuth'); // 100 requests per 15 minutes
    if (!rateLimit.allowed) {
      logger.warn("Rate limit exceeded for token endpoint", {
        ip: event.headers['x-forwarded-for'] || event.headers['client-ip'],
        domain: domainValidation.domain?.domain,
      });
      return {
        statusCode: 429,
        headers: {
          ...corsHeaders,
          ...getRateLimitHeaders(rateLimit),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          error: "Too many requests",
          message: "Rate limit exceeded. Please try again later.",
        }),
      };
    }

    // Extract and verify access token
    const authHeader = event.headers.authorization || event.headers.Authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      logger.debug("No valid Authorization header in token request");
      return {
        statusCode: 401,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          error: "No authorization token provided",
          message: "Please include Authorization: Bearer <token> header",
        }),
      };
    }

    const accessToken = authHeader.substring(7); // Remove 'Bearer ' prefix
    const accessPayload = verifyAccessToken(accessToken);

    if (!accessPayload) {
      logger.debug("Invalid access token in token request");
      return {
        statusCode: 401,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          error: "Invalid or expired token",
          message: "Please refresh your token or log in again.",
        }),
      };
    }

    // Get Teamwork API token from refresh token cookie
    const cookieHeader = event.headers.cookie || event.headers.Cookie;
    if (!cookieHeader) {
      logger.debug("No cookie header in token request");
      return {
        statusCode: 401,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          error: "No refresh token found",
          message: "Please log in again.",
        }),
      };
    }

    const cookies = cookie.parse(cookieHeader);
    const refreshToken = cookies.maven_refresh_token;

    if (!refreshToken) {
      logger.debug("No refresh token cookie in token request");
      return {
        statusCode: 401,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          error: "No refresh token found",
          message: "Please log in again.",
        }),
      };
    }

    // Verify refresh token and extract Teamwork API token
    const refreshPayload = verifyRefreshToken(refreshToken);
    if (!refreshPayload || !refreshPayload.accessToken) {
      logger.debug("Invalid refresh token in token request");
      return {
        statusCode: 401,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          error: "Invalid refresh token",
          message: "Please log in again.",
        }),
      };
    }

    logger.debug("Teamwork token retrieved successfully", {
      userId: accessPayload.userId,
      domain: domainValidation.domain?.domain,
    });

    return {
      statusCode: 200,
      headers: {
        ...corsHeaders,
        ...getRateLimitHeaders(rateLimit),
        "Content-Type": "application/json",
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
      body: JSON.stringify({
        accessToken: refreshPayload.accessToken,
        userId: accessPayload.userId,
      }),
    };
  } catch (error) {
    logger.error("Error in token endpoint:", error);
    return {
      statusCode: 500,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        error: "Internal Server Error",
      }),
    };
  }
};

export { handler };
