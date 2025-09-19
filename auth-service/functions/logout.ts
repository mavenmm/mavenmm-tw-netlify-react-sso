import {
  Handler,
  //HandlerContext,
  HandlerEvent,
} from "@netlify/functions";
import { getCorsHeaders, handlePreflight, validateOrigin } from "./middleware/cors";

const handler: Handler = async (
  event: HandlerEvent
  // context: HandlerContext
) => {
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

    const origin = event.headers.origin || "";
    const host = event.headers.host || "";

    // Determine if request is from localhost
    const isLocalhost =
      origin?.includes("localhost") || host?.includes("localhost");

    // Set the primary cookie that should work for most cases
    let primaryCookie =
      "maven_auth_token=deleted; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";

    // For production (non-localhost), add domain
    if (!isLocalhost) {
      primaryCookie += "; Domain=.mavenmm.com";
    }

    return {
      statusCode: 200,
      headers: {
        ...getCorsHeaders(event),
        "Set-Cookie": primaryCookie,
        "Content-Type": "application/json",
        "Pragma": "no-cache",
        "Expires": "0",
      },
      body: JSON.stringify({
        success: true,
        message: "Successfully logged out",
      }),
    };
  } catch (error) {
    console.error("❌ Error in logout function:", error);
    return {
      statusCode: 500,
      headers: getCorsHeaders(event),
      body: JSON.stringify({
        error: "An error occurred during logout",
        details: error instanceof Error ? error.message : "Unknown error",
      }),
    };
  }
};

export { handler };
