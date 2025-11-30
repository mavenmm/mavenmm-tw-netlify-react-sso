import {
  Handler,
  HandlerContext,
  HandlerEvent,
} from "@netlify/functions";
import cookie from "cookie";
import { getCorsHeaders, handlePreflight, validateOrigin } from "./middleware/cors";
import { validateDomain, getDomainValidationErrorResponse } from "./middleware/validateDomain";
import { verifyAccessToken, verifyRefreshToken, blacklistToken } from "./utils/tokenManager";
import { logger } from "./utils/logger";

const handler: Handler = async (
  event: HandlerEvent,
  _: HandlerContext
) => {
  try {
    // Handle preflight requests
    const preflightResponse = handlePreflight(event);
    if (preflightResponse) {
      return preflightResponse;
    }

    const corsHeaders = getCorsHeaders(event);

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

    const origin = event.headers.origin || "";
    const isLocalhost = origin.includes("localhost") || origin.includes("127.0.0.1");

    // Extract tokens for blacklisting
    let accessTokenJti: string | undefined;
    let refreshTokenJti: string | undefined;
    let userId: string | undefined;

    // Try to get access token from Authorization header
    const authHeader = event.headers.authorization || event.headers.Authorization;
    if (authHeader?.startsWith('Bearer ')) {
      const accessToken = authHeader.substring(7);
      const accessPayload = verifyAccessToken(accessToken);
      if (accessPayload) {
        accessTokenJti = accessPayload.jti;
        userId = accessPayload.userId;
      }
    }

    // Try to get refresh token from cookie
    const cookieHeader = event.headers.cookie;
    if (cookieHeader) {
      const cookies = cookie.parse(cookieHeader);
      const refreshToken = cookies.maven_refresh_token;
      if (refreshToken) {
        const refreshPayload = verifyRefreshToken(refreshToken);
        if (refreshPayload) {
          refreshTokenJti = refreshPayload.jti;
          userId = userId || refreshPayload.userId;
        }
      }
    }

    // Blacklist both tokens
    if (accessTokenJti) {
      blacklistToken(accessTokenJti, 'logout', userId);
      logger.debug('Access token blacklisted on logout', { jti: accessTokenJti, userId });
    }

    if (refreshTokenJti) {
      blacklistToken(refreshTokenJti, 'logout', userId);
      logger.debug('Refresh token blacklisted on logout', { jti: refreshTokenJti, userId });
    }

    // Clear refresh token cookie
    const cookieOptions: cookie.SerializeOptions = {
      httpOnly: true,
      secure: !isLocalhost,
      sameSite: isLocalhost ? "lax" : "strict",
      path: "/",
      expires: new Date(0), // Expire immediately
    };

    // Set cookie domain for cross-port/subdomain sharing
    if (isLocalhost) {
      // localhost needs explicit domain to share cookies across ports
      cookieOptions.domain = "localhost";
    } else if (domainValidation.domain?.environment === 'production') {
      const domain = domainValidation.domain.domain;
      if (domain.includes('mavenmm.com')) {
        cookieOptions.domain = ".mavenmm.com";
      }
    }

    const clearCookie = cookie.serialize("maven_refresh_token", "", cookieOptions);

    logger.info("User logged out successfully", {
      userId,
      domain: domainValidation.domain?.domain,
      tokensBlacklisted: [accessTokenJti, refreshTokenJti].filter(Boolean).length,
    });

    return {
      statusCode: 200,
      headers: {
        ...corsHeaders,
        "Set-Cookie": clearCookie,
        "Content-Type": "application/json",
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
      body: JSON.stringify({
        success: true,
        message: "Successfully logged out",
      }),
    };
  } catch (error) {
    logger.error("Error in logout function:", error);
    return {
      statusCode: 500,
      headers: {
        ...getCorsHeaders(event),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        error: "An error occurred during logout",
      }),
    };
  }
};

export { handler };
