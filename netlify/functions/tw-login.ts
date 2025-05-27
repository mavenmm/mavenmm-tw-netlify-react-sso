import type { Handler } from "@netlify/functions";

const handler: Handler = async (event) => {
  try {
    const origin = event.headers.origin || "";

    // CORS headers
    const corsHeaders = {
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, code",
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

    // Only allow POST method
    if (event.httpMethod !== "POST") {
      return {
        statusCode: 405,
        headers: corsHeaders,
        body: JSON.stringify({ error: "Method not allowed" }),
      };
    }

    // Get the authorization code from request body
    let requestBody;
    try {
      requestBody = JSON.parse(event.body || "{}");
    } catch (error) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: "Invalid JSON in request body" }),
      };
    }

    const code = requestBody.code;

    if (!code) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: "Authorization code is required" }),
      };
    }

    // Exchange code for access token with Teamwork
    const tokenResponse = await fetch(
      "https://www.teamwork.com/launchpad/v1/token.json",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Origin: origin, // Required if app has allowed origins
        },
        body: JSON.stringify({
          code: code,
          client_id: process.env.VITE_TEAMWORK_CLIENT_ID!,
          client_secret: process.env.VITE_TEAMWORK_CLIENT_SECRET!,
          redirect_uri: process.env.VITE_TEAMWORK_REDIRECT_URI!,
        }),
      }
    );

    if (!tokenResponse.ok) {
      let errorText;
      let errorJson;

      try {
        errorText = await tokenResponse.text();
        errorJson = JSON.parse(errorText);
      } catch (e) {
        errorJson = null;
      }

      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({
          error: "Failed to exchange code for token",
          details: {
            status: tokenResponse.status,
            statusText: tokenResponse.statusText,
            response: errorText,
            parsedError: errorJson,
          },
        }),
      };
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    // Transform user data from token response to your User format
    const twUser = {
      id: tokenData.user.id,
      firstName: tokenData.user.firstName,
      lastName: tokenData.user.lastName,
      email: tokenData.user.email,
      avatar: tokenData.user.avatar || "",
      company: {
        id: tokenData.user.company.id,
        name: tokenData.user.company.name,
        logo: tokenData.user.company.logo || "",
      },
    };

    // Set auth cookie - make Secure flag conditional for development
    const isProduction =
      process.env.NODE_ENV === "production" || !origin.includes("localhost");
    const secureFlag = isProduction ? "Secure; " : "";

    // Determine cookie domain for subdomain sharing
    let domainFlag = "";
    if (origin.includes("localhost")) {
      // For localhost, don't set domain (allows any localhost port)
      domainFlag = "";
    } else if (process.env.VITE_COOKIE_DOMAIN) {
      // For production/staging, use configured domain for subdomain sharing
      domainFlag = `Domain=${process.env.VITE_COOKIE_DOMAIN}; `;
    }

    const cookieValue = `tw_auth_token=${accessToken}; Path=/; HttpOnly; ${secureFlag}${domainFlag}SameSite=Lax; Max-Age=86400`;

    return {
      statusCode: 200,
      headers: {
        ...corsHeaders,
        "Set-Cookie": cookieValue,
      },
      body: JSON.stringify({ twUser }),
    };
  } catch (error) {
    console.error("Login error:", error);
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
