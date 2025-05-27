import type { Handler } from "@netlify/functions";

export interface MavenSSOConfig {
  teamworkClientId: string;
  teamworkClientSecret: string;
  teamworkRedirectUri: string;
  allowedOrigins?: string[];
  cookieDomain?: string;
  cookieMaxAge?: number;
}

export function createLoginHandler(config: MavenSSOConfig): Handler {
  return async (event) => {
    try {
      const origin = event.headers.origin || "";

      // CORS headers
      const corsHeaders = {
        "Access-Control-Allow-Origin": config.allowedOrigins?.includes(origin)
          ? origin
          : "",
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
        "https://www.teamwork.com/launchpad/v1/token.json",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams({
            grant_type: "authorization_code",
            client_id: config.teamworkClientId,
            client_secret: config.teamworkClientSecret,
            code: code,
            redirect_uri: config.teamworkRedirectUri,
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
        "https://www.teamwork.com/launchpad/v1/me.json",
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

      // Set auth cookie with configurable options
      const cookieOptions = [
        `maven_auth_token=${accessToken}`,
        "Path=/",
        "HttpOnly",
        "Secure",
        "SameSite=Lax",
        `Max-Age=${config.cookieMaxAge || 86400}`,
      ];

      if (config.cookieDomain) {
        cookieOptions.push(`Domain=${config.cookieDomain}`);
      }

      return {
        statusCode: 200,
        headers: {
          ...corsHeaders,
          "Set-Cookie": cookieOptions.join("; "),
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
}

export function createLogoutHandler(config: MavenSSOConfig): Handler {
  return async (event) => {
    try {
      const origin = event.headers.origin || "";

      // CORS headers
      const corsHeaders = {
        "Access-Control-Allow-Origin": config.allowedOrigins?.includes(origin)
          ? origin
          : "",
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
      const clearCookieOptions = [
        "maven_auth_token=",
        "Path=/",
        "HttpOnly",
        "Secure",
        "SameSite=Lax",
        "Max-Age=0",
      ];

      if (config.cookieDomain) {
        clearCookieOptions.push(`Domain=${config.cookieDomain}`);
      }

      return {
        statusCode: 200,
        headers: {
          ...corsHeaders,
          "Set-Cookie": clearCookieOptions.join("; "),
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
}

export function createCheckAuthHandler(config: MavenSSOConfig): Handler {
  return async (event) => {
    try {
      const origin = event.headers.origin || "";

      // CORS headers
      const corsHeaders = {
        "Access-Control-Allow-Origin": config.allowedOrigins?.includes(origin)
          ? origin
          : "",
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
      const authTokenMatch = cookies.match(/maven_auth_token=([^;]+)/);
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
}
