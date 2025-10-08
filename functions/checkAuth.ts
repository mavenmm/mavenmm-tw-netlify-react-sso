import type { HandlerEvent, HandlerContext, Handler } from "@netlify/functions";
import { getCorsHeaders, handlePreflight, validateOrigin } from "./middleware/cors";
import { validateDomain, getDomainValidationErrorResponse } from "./middleware/validateDomain";
import { verifyAccessToken } from "./utils/tokenManager";
import { logger } from "./utils/logger";

/**
 * CheckAuth endpoint
 *
 * Validates the access token from the Authorization header.
 * Access tokens are short-lived (15min) and stored in memory by the client.
 *
 * Note: This endpoint does NOT use cookies. The client must send:
 * Authorization: Bearer <access_token>
 */
const handler: Handler = async (event: HandlerEvent, _: HandlerContext) => {
  try {
    // Handle preflight requests
    const preflightResponse = handlePreflight(event);
    if (preflightResponse) {
      return preflightResponse;
    }

    const corsHeaders = getCorsHeaders(event);

    // Validate origin for security
    if (!validateOrigin(event)) {
      logger.security("Unauthorized origin attempted to access checkAuth", {
        origin: event.headers.origin,
      });
      return {
        statusCode: 403,
        headers: corsHeaders,
        body: JSON.stringify({
          error: "Origin not allowed",
          authenticated: false,
        }),
      };
    }

    // Validate domain key
    const domainValidation = validateDomain(event);
    if (!domainValidation.valid) {
      return getDomainValidationErrorResponse(domainValidation, corsHeaders);
    }

    // Extract access token from Authorization header
    const authHeader = event.headers.authorization || event.headers.Authorization;

    if (!authHeader) {
      logger.debug("No Authorization header in checkAuth request");
      return {
        statusCode: 401,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          error: "No authorization token provided",
          authenticated: false,
          message: "Please include Authorization: Bearer <token> header",
        }),
      };
    }

    if (!authHeader.startsWith('Bearer ')) {
      logger.debug("Invalid Authorization header format");
      return {
        statusCode: 401,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          error: "Invalid authorization format",
          authenticated: false,
          message: "Authorization header must be: Bearer <token>",
        }),
      };
    }

    const accessToken = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Validate access token
    const payload = verifyAccessToken(accessToken);

    if (!payload) {
      logger.debug("Access token validation failed");
      return {
        statusCode: 401,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          error: "Invalid or expired token",
          authenticated: false,
          message: "Token may be expired. Please refresh your token.",
        }),
      };
    }

    // Valid token
    logger.debug("CheckAuth: User authenticated successfully", {
      userId: payload.userId,
      domain: domainValidation.domain?.domain,
    });

    return {
      statusCode: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
      body: JSON.stringify({
        authenticated: true,
        userId: payload.userId,
        expiresAt: payload.exp,
      }),
    };
  } catch (error) {
    logger.error("Error in checkAuth:", error);
    return {
      statusCode: 500,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        error: "Internal Server Error",
        authenticated: false,
      }),
    };
  }
};

export { handler };
