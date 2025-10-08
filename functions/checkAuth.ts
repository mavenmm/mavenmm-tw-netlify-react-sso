import type { HandlerEvent, HandlerContext, Handler } from "@netlify/functions";
import cookie from "cookie";
import { validate } from "./middleware/validateCookies";
import { getCorsHeaders, handlePreflight, validateOrigin } from "./middleware/cors";
import { logger } from "./utils/logger";

/**
 * CheckAuth endpoint
 *
 * This endpoint checks if the user is authenticated by validating the maven_auth_token cookie.
 */
const handler: Handler = async (event: HandlerEvent, _: HandlerContext) => {
  try {
    // Handle preflight requests
    const preflightResponse = handlePreflight(event);
    if (preflightResponse) {
      return preflightResponse;
    }

    // Validate origin for security
    if (!validateOrigin(event)) {
      logger.security("Unauthorized origin attempted to access checkAuth", {
        origin: event.headers.origin,
      });
      return {
        statusCode: 403,
        headers: getCorsHeaders(event),
        body: JSON.stringify({
          error: "Origin not allowed",
          authenticated: false,
        }),
      };
    }

    const corsHeaders = getCorsHeaders(event);
    const cookieHeader = event.headers.cookie;

    // If no cookie header is present
    if (!cookieHeader) {
      logger.debug("No cookie header present in checkAuth request");
      return {
        statusCode: 401,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          error: "Authentication failed",
          authenticated: false,
        }),
      };
    }

    // Parse cookies and check for auth token
    const cookies = cookie.parse(cookieHeader);
    const authToken = cookies.maven_auth_token;

    if (!authToken) {
      logger.debug("maven_auth_token cookie not found");
      return {
        statusCode: 401,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          error: "Authentication failed",
          authenticated: false,
        }),
      };
    }

    // Validate token
    const validationResult = validate(cookieHeader);

    if (validationResult.status === "Valid" && validationResult.options) {
      // Valid token, user is authenticated
      logger.debug("CheckAuth: User authenticated successfully");

      return {
        statusCode: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: "Authentication successful",
          authenticated: true,
          userId: validationResult.options.headers.teamworkUserID,
        }),
      };
    } else {
      // Invalid token
      logger.debug("CheckAuth: Token validation failed", {
        reason: validationResult.message,
      });

      return {
        statusCode: 401,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          error: "Authentication failed",
          authenticated: false,
        }),
      };
    }
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
