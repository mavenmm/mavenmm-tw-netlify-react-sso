import type { HandlerEvent, HandlerContext, Handler } from "@netlify/functions";
import jwt from "jsonwebtoken";
import cookie from "cookie";
import axios from "axios";
import { User } from "../src/types/teamwork.ts";
import { Token } from "../src/types/auth.ts";
import { getCorsHeaders, handlePreflight, validateOrigin } from "./middleware/cors";

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

    // Set the cookie to expire in 2 weeks
    const twoWeeks = 14 * 24 * 60 * 60 * 1000;

    // Get the JWT secret from the environment variable
    const JWT_SECRET = process.env.JWT_KEY;
    const host = event.headers.host || "";

    // Ensure we're running on auth.mavenmm.com or localhost for development
    if (!host.includes("auth.mavenmm.com") && !host.includes("localhost")) {
      return {
        statusCode: 403,
        headers: getCorsHeaders(event),
        body: JSON.stringify({
          error: "Unauthorized host",
          details: {
            message: "Authentication must be performed via auth.mavenmm.com",
            received: host,
          },
        }),
      };
    }

    // If the JWT secret is not set, return an error
    if (!JWT_SECRET) {
      console.error("JWT_KEY environment variable is not set");
      return {
        statusCode: 500,
        headers: getCorsHeaders(event),
        body: JSON.stringify({
          error: "JWT_KEY environment variable is not set",
        }),
      };
    }
    const { code } = event.headers;
    const redirectUri = process.env.VITE_REDIRECT_URI;
    const mavenRedirectUrl = event.queryStringParameters?.maven_redirect_url;

    if (
      !redirectUri ||
      !code ||
      !process.env.VITE_CLIENT_SECRET ||
      !process.env.VITE_CLIENT_ID
    ) {
      throw new Error("Required parameters missing");
    }

    // Make request to Teamwork API
    const response = await axios.post(
      `https://www.teamwork.com/launchpad/v1/token.json`,
      {
        code,
        redirect_uri: redirectUri,
        client_id: process.env.VITE_CLIENT_ID,
        client_secret: process.env.VITE_CLIENT_SECRET,
      },
      {
        headers: {
          "Content-Type": "application/json",
          origin: redirectUri,
        },
      }
    );

    const data = response.data;

    if (!data?.access_token || !data?.user) {
      throw new Error("Invalid response from Teamwork API");
    }

    const token: Token = {
      _id: data.user.id,
      access_token: data.access_token,
    };

    // JWT token with standard 2-week expiry
    const jwtToken = jwt.sign(token, JWT_SECRET, {
      expiresIn: "2w",
    });

    const user: User = data.user;

    // Determine if we're in development (localhost)
    const isLocalhost = host.includes("localhost") ||
                       redirectUri?.includes("localhost") ||
                       mavenRedirectUrl?.includes("localhost");

    console.log(`🍪 [COOKIE] Setting cookie for ${isLocalhost ? 'localhost' : 'production'}`);
    console.log(`🍪 [COOKIE] Host: ${host}, RedirectURI: ${redirectUri}, MavenRedirectUrl: ${mavenRedirectUrl}`);

    // Base cookie settings
    const baseSettings = {
      httpOnly: true,
      path: "/",
      maxAge: twoWeeks,
      secure: !isLocalhost, // HTTPS only in production
      sameSite: isLocalhost ? "lax" : "strict", // More secure in production
    };

    const mavenCookie = cookie.serialize("maven_auth_token", jwtToken, {
      ...(baseSettings as cookie.SerializeOptions),
      domain: isLocalhost ? ".localhost" : ".mavenmm.com",
    });

    console.log(`🍪 [COOKIE] Generated cookie settings:`, {
      domain: isLocalhost ? '.localhost' : '.mavenmm.com',
      secure: !isLocalhost,
      httpOnly: true,
      sameSite: isLocalhost ? "lax" : "strict",
      maxAge: twoWeeks
    });

    // Security headers
    const securityHeaders = {
      "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
      "X-Content-Type-Options": "nosniff",
      "X-Frame-Options": "DENY",
      "X-XSS-Protection": "1; mode=block",
      "Referrer-Policy": "strict-origin-when-cross-origin",
    };

    return {
      statusCode: 200,
      headers: {
        ...getCorsHeaders(event),
        ...securityHeaders,
        "Set-Cookie": mavenCookie,
      },
      body: JSON.stringify({
        twUser: user,
        twStatus: data.status,
        redirectTo: mavenRedirectUrl,
      }),
    };
  } catch (error) {
    console.error("Error in login handler:", error);
    return {
      statusCode: 500,
      headers: getCorsHeaders(event),
      body: JSON.stringify({
        error: "Authentication failed",
        details: error instanceof Error ? error.message : "Unknown error",
      }),
    };
  }
};

export { handler };
