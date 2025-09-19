import type { HandlerEvent, HandlerContext, Handler } from "@netlify/functions";
import cookie from "cookie";
import { validate } from "./middleware/validateCookies";
import { getCorsHeaders, handlePreflight, validateOrigin } from "./middleware/cors";

/**
 * CheckAuth endpoint with enhanced cookie debugging
 *
 * This endpoint checks if the user is authenticated by validating the maven_auth_token cookie.
 * It includes detailed debugging information to help diagnose cookie issues.
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
      return {
        statusCode: 403,
        headers: getCorsHeaders(event),
        body: JSON.stringify({
          error: "Origin not allowed",
          details: { origin: event.headers.origin }
        }),
      };
    }

    const corsHeaders = getCorsHeaders(event);

    // Log all headers for debugging
    console.log("Request headers:", event.headers);

    // Check for cookie header
    const cookieHeader = event.headers.cookie;
    console.log("Cookie header:", cookieHeader);

    // If no cookie header is present
    if (!cookieHeader) {
      console.log("No cookie header present");
      return {
        statusCode: 401,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          error: "Authentication failed",
          details: {
            reason: "No cookie header present",
            authenticated: false,
            cookieData: { present: false },
          },
          authenticated: false,
        }),
      };
    }

    // Parse cookies
    const cookies = cookie.parse(cookieHeader);
    console.log("Parsed cookies:", Object.keys(cookies));

    // Check for auth token
    const authToken = cookies.maven_auth_token;
    if (!authToken) {
      console.log(
        "maven_auth_token cookie not found in:",
        Object.keys(cookies)
      );
      return {
        statusCode: 401,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          error: "Authentication failed",
          details: {
            reason: "maven_auth_token cookie not found",
            authenticated: false,
            cookieData: {
              present: true,
              keys: Object.keys(cookies),
              hasMavenAuthToken: !!cookies.maven_auth_token,
            },
          },
          authenticated: false,
        }),
      };
    }

    // Validate token
    console.log("Validating maven_auth_token...");
    const validationResult = validate(cookieHeader);
    console.log("Validation result:", validationResult);

    if (validationResult.status === "Valid" && validationResult.options) {
      // Valid token, user is authenticated
      const responseData = {
        message: "Authentication successful",
        authenticated: true,
        userId: validationResult.options.headers.teamworkUserID,
      };

      console.log("✅ [CHECKAUTH] Sending successful response:", responseData);

      return {
        statusCode: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(responseData),
      };
    } else {
      // Invalid token
      return {
        statusCode: 401,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          error: "Authentication failed",
          details: {
            reason: validationResult.message,
            status: validationResult.status,
            code: validationResult.code,
            authenticated: false,
          },
          authenticated: false,
        }),
      };
    }
  } catch (error) {
    console.error("Error in checkAuth:", error);
    return {
      statusCode: 500,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        error: "Internal Server Error",
        message: error instanceof Error ? error.message : "Unknown error",
        authenticated: false,
      }),
    };
  }
};

export { handler };
