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

    // Get the authorization code from headers
    const code = event.headers.code;

    if (!code) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: "Authorization code is required" }),
      };
    }

    // Exchange code for access token with Teamwork
    const tokenResponse = await fetch(
      `https://${process.env.TEAMWORK_BASE_URL}/launchpad/v1/token.json`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          client_id: process.env.TEAMWORK_CLIENT_ID!,
          client_secret: process.env.TEAMWORK_CLIENT_SECRET!,
          code: code,
          redirect_uri: process.env.TEAMWORK_REDIRECT_URI!,
        }),
      }
    );

    if (!tokenResponse.ok) {
      const error = await tokenResponse.text();
      console.error("Token exchange failed:", error);
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: "Failed to exchange code for token" }),
      };
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    // Get user info from Teamwork
    const userResponse = await fetch(
      `https://${process.env.TEAMWORK_BASE_URL}/launchpad/v1/me.json`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!userResponse.ok) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: "Failed to get user info" }),
      };
    }

    const userData = await userResponse.json();

    // Transform to your User format
    const twUser = {
      id: userData.person.id,
      firstName: userData.person.firstName,
      lastName: userData.person.lastName,
      email: userData.person.emailAddress,
      avatar: userData.person.avatar || "",
      company: {
        id: userData.account.id,
        name: userData.account.name,
        logo: userData.account.logo || "",
      },
    };

    // Set auth cookie
    const cookieValue = `maven_auth_token=${accessToken}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=86400`;

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
