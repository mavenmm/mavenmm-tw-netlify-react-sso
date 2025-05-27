import type { Handler } from "@netlify/functions";

/**
 * CheckAuth endpoint with enhanced cookie debugging
 *
 * This endpoint checks if the user is authenticated by validating the maven_auth_token cookie.
 * It includes detailed debugging information to help diagnose cookie issues.
 */
const handler: Handler = async (event) => {
  try {
    const origin = event.headers.origin || "";

    // CORS headers
    const corsHeaders = {
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Allow-Credentials": "true",
    };

    // Handle OPTIONS request
    if (event.httpMethod === "OPTIONS") {
      return {
        statusCode: 204,
        headers: corsHeaders,
        body: "",
      };
    }

    // Only allow GET method
    if (event.httpMethod !== "GET") {
      return {
        statusCode: 405,
        headers: corsHeaders,
        body: JSON.stringify({ error: "Method not allowed" }),
      };
    }

    // Get the auth token from cookies
    const cookies = event.headers.cookie || "";
    const authTokenMatch = cookies.match(/tw_auth_token=([^;]+)/);
    const authToken = authTokenMatch ? authTokenMatch[1] : null;

    if (!authToken) {
      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({
          authenticated: false,
          message: "No auth token found",
        }),
      };
    }

    // Validate token with Teamwork API
    try {
      const userResponse = await fetch(
        "https://www.teamwork.com/launchpad/v1/me.json",
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        }
      );

      if (userResponse.ok) {
        const userData = await userResponse.json();

        return {
          statusCode: 200,
          headers: corsHeaders,
          body: JSON.stringify({
            authenticated: true,
            _id: userData.person.id,
            authorization: authToken,
          }),
        };
      } else {
        // Token is invalid
        return {
          statusCode: 200,
          headers: corsHeaders,
          body: JSON.stringify({
            authenticated: false,
            message: "Invalid token",
          }),
        };
      }
    } catch (tokenError) {
      console.error("Token validation error:", tokenError);
      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({
          authenticated: false,
          message: "Token validation failed",
        }),
      };
    }
  } catch (error) {
    console.error("Check auth error:", error);
    return {
      statusCode: 500,
      headers: {
        "Access-Control-Allow-Origin": event.headers.origin || "",
        "Access-Control-Allow-Credentials": "true",
      },
      body: JSON.stringify({ error: "Internal server error" }),
    };
  }
};

export { handler };
