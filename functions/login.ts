import type { HandlerEvent, HandlerContext, Handler } from "@netlify/functions";
import cookie from "cookie";
import axios from "axios";
import { User } from "../teamwork-auth/src/types/index";
import { createTokenPair } from "./utils/tokenManager";
import { getCorsHeaders, handlePreflight, validateOrigin } from "./middleware/cors";
import { validateDomain, getDomainValidationErrorResponse } from "./middleware/validateDomain";
import { checkRateLimit, getRateLimitErrorResponse, getRateLimitHeaders } from "./middleware/rateLimit";
import { logger } from "./utils/logger";

const handler: Handler = async (event: HandlerEvent, _: HandlerContext) => {
  try {
    // Handle preflight requests
    const preflightResponse = handlePreflight(event);
    if (preflightResponse) {
      return preflightResponse;
    }

    const corsHeaders = getCorsHeaders(event);

    // Check rate limit
    const rateLimit = checkRateLimit(event);
    if (!rateLimit.allowed) {
      return getRateLimitErrorResponse(rateLimit, corsHeaders);
    }

    // Validate origin for security
    if (!validateOrigin(event)) {
      return {
        statusCode: 403,
        headers: corsHeaders,
        body: JSON.stringify({
          error: "Origin not allowed",
          details: { origin: event.headers.origin }
        }),
      };
    }

    // Validate domain key
    const domainValidation = validateDomain(event);
    if (!domainValidation.valid) {
      return getDomainValidationErrorResponse(domainValidation, corsHeaders);
    }

    const host = event.headers.host || "";

    // Ensure we're running on auth.mavenmm.com or localhost for development
    if (!host.includes("auth.mavenmm.com") && !host.includes("localhost")) {
      return {
        statusCode: 403,
        headers: corsHeaders,
        body: JSON.stringify({
          error: "Unauthorized host",
          details: {
            message: "Authentication must be performed via auth.mavenmm.com",
            received: host,
          },
        }),
      };
    }
    const { code } = event.headers;

    // Use the origin from the request (where the user actually is)
    // This allows the same auth service to handle multiple domains
    const redirectUri = event.headers.origin || event.headers.referer?.split('?')[0];

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

    const user: User = data.user;
    const teamworkAccessToken = data.access_token;

    // Create access token (15min) and refresh token (7 days)
    const tokenPair = createTokenPair(user.id, teamworkAccessToken);

    // Determine if we're in development (localhost) by checking origin/redirect
    const requestOrigin = event.headers.origin || event.headers.referer || "";
    const isLocalhost = redirectUri?.includes("localhost") ||
                       mavenRedirectUrl?.includes("localhost") ||
                       requestOrigin.includes("localhost");

    logger.debug(`Setting authentication cookie for ${isLocalhost ? 'localhost' : 'production'}`, {
      origin: requestOrigin,
      redirectUri,
      mavenRedirectUrl
    });

    // Cookie options for refresh token (refresh token stored as httpOnly cookie)
    const cookieOptions: cookie.SerializeOptions = {
      httpOnly: true,
      path: "/",
      maxAge: 7 * 24 * 60 * 60, // 7 days
      secure: !isLocalhost, // HTTPS only in production
      sameSite: "lax", // Lax required for cross-subdomain SSO navigation
    };

    // Set cookie domain for cross-port/subdomain sharing
    // Note: For localhost, we don't set domain - let the browser handle it
    // Setting domain="localhost" explicitly can cause issues in some browsers
    if (!isLocalhost && domainValidation.domain?.environment === 'production') {
      const domain = domainValidation.domain.domain;
      if (domain.includes('mavenmm.com')) {
        cookieOptions.domain = ".mavenmm.com";
      }
    }

    const refreshCookie = cookie.serialize("maven_refresh_token", tokenPair.refreshToken, cookieOptions);

    // Import security headers
    const { getSecurityHeaders } = await import("./utils/securityHeaders");
    const securityHeaders = getSecurityHeaders(true);

    logger.info("Login successful", {
      userId: user.id,
      domain: domainValidation.domain?.domain,
      environment: domainValidation.domain?.environment,
    });

    return {
      statusCode: 200,
      headers: {
        ...corsHeaders,
        ...securityHeaders,
        ...getRateLimitHeaders(rateLimit),
        "Content-Type": "application/json",
        "Set-Cookie": refreshCookie,
      },
      body: JSON.stringify({
        // Return access token in response body (NOT httpOnly cookie)
        accessToken: tokenPair.accessToken,
        expiresIn: tokenPair.expiresIn,
        tokenType: "Bearer",
        // User data for client
        user: user,
        // Redirect URL if provided
        redirectTo: mavenRedirectUrl,
      }),
    };
  } catch (error) {
    logger.error("Error in login handler:", error);
    return {
      statusCode: 500,
      headers: {
        ...getCorsHeaders(event),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        error: "Authentication failed",
        message: "An internal error occurred during login",
      }),
    };
  }
};

export { handler };
