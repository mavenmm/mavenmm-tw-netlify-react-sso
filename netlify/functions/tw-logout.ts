import type { Handler } from "@netlify/functions";

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

    // Clear the auth cookie
    const clearCookie =
      "maven_auth_token=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0";

    return {
      statusCode: 200,
      headers: {
        ...corsHeaders,
        "Set-Cookie": clearCookie,
      },
      body: JSON.stringify({
        success: true,
        message: "Logged out successfully",
      }),
    };
  } catch (error) {
    console.error("Logout error:", error);
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
