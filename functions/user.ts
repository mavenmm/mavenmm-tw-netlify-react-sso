import type { HandlerEvent, HandlerContext, Handler } from "@netlify/functions";
import { getCorsHeaders, handlePreflight, validateOrigin } from "./middleware/cors";
import { validateDomain, getDomainValidationErrorResponse } from "./middleware/validateDomain";
import { verifyAccessToken, verifyRefreshToken } from "./utils/tokenManager";
import { logger } from "./utils/logger";
import { checkRateLimit, getRateLimitHeaders } from "./middleware/rateLimit";
import axios from "axios";
import cookie from "cookie";
import type { User } from "./types";

/**
 * User endpoint - Fetch current user data from Teamwork API
 *
 * Requires valid access token in Authorization header.
 * Uses refresh token to get Teamwork API token, then fetches fresh user data.
 *
 * This allows the client to:
 * - Get fresh user data after localStorage is cleared
 * - Update user profile without re-login
 * - Sync user data changes from Teamwork
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
      logger.security("Unauthorized origin attempted to access user endpoint", {
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

    // Rate limiting
    const rateLimit = checkRateLimit(event, 'checkAuth'); // Reuse checkAuth limit (100/15min)
    if (!rateLimit.allowed) {
      logger.warn("Rate limit exceeded for user endpoint", {
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
      logger.debug("No valid Authorization header in user request");
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
      logger.debug("Invalid access token in user request");
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
      logger.debug("No cookie header in user request");
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
      logger.debug("No refresh token cookie in user request");
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
      logger.debug("Invalid refresh token in user request");
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

    // Fetch fresh user data from Teamwork API
    try {
      const response = await axios.get(
        'https://www.teamwork.com/launchpad/v1/account.json',
        {
          headers: {
            'Authorization': `Bearer ${refreshPayload.accessToken}`,
          },
        }
      );

      if (!response.data?.user) {
        throw new Error('No user data in Teamwork API response');
      }

      const user: User = response.data.user;

      logger.debug("User data fetched successfully", {
        userId: user.id,
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
          user,
        }),
      };
    } catch (apiError: any) {
      logger.error("Failed to fetch user from Teamwork API", {
        error: apiError.message,
        status: apiError.response?.status,
      });

      return {
        statusCode: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          error: "Failed to fetch user data",
          message: "Could not retrieve user information from Teamwork.",
        }),
      };
    }
  } catch (error) {
    logger.error("Error in user endpoint:", error);
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
