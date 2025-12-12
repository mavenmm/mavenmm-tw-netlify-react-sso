import type { HandlerEvent, HandlerContext, Handler } from "@netlify/functions";
import { getCorsHeaders, handlePreflight, validateOrigin } from "./middleware/cors";
import { validateDomain, getDomainValidationErrorResponse } from "./middleware/validateDomain";
import { verifyAccessToken, verifyRefreshToken, createTokenPair } from "./utils/tokenManager";
import { refreshTeamworkToken } from "./utils/teamworkTokenRefresh";
import { logger } from "./utils/logger";
import { checkRateLimit, getRateLimitHeaders } from "./middleware/rateLimit";
import axios from "axios";
import cookie from "cookie";
import type { User } from "./types";

/**
 * User endpoint - Fetch current user data from Teamwork API
 *
 * Requires valid access token in Authorization header.
 * Uses refresh token to get Teamwork API token, then fetches fresh user data.
 *
 * This allows the client to:
 * - Get fresh user data after localStorage is cleared
 * - Update user profile without re-login
 * - Sync user data changes from Teamwork
 */
const handler: Handler = async (event: HandlerEvent, context: HandlerContext) => {
  try {
    // Handle preflight requests
    const preflightResponse = handlePreflight(event);
    if (preflightResponse) {
      return preflightResponse;
    }

    const corsHeaders = getCorsHeaders(event);

    // Validate origin
    if (!validateOrigin(event)) {
      logger.security("Unauthorized origin attempted to access user endpoint", {
        origin: event.headers.origin,
      });
      return {
        statusCode: 403,
        headers: corsHeaders,
        body: JSON.stringify({
          error: "Origin not allowed",
        }),
      };
    }

    // Validate domain key
    const domainValidation = validateDomain(event);
    if (!domainValidation.valid) {
      return getDomainValidationErrorResponse(domainValidation, corsHeaders);
    }

    // Rate limiting
    const rateLimit = checkRateLimit(event, 'checkAuth'); // Reuse checkAuth limit (100/15min)
    if (!rateLimit.allowed) {
      logger.warn("Rate limit exceeded for user endpoint", {
        ip: event.headers['x-forwarded-for'] || event.headers['client-ip'],
        domain: domainValidation.domain?.domain,
      });
      return {
        statusCode: 429,
        headers: {
          ...corsHeaders,
          ...getRateLimitHeaders(rateLimit),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          error: "Too many requests",
          message: "Rate limit exceeded. Please try again later.",
        }),
      };
    }

    // Extract and verify access token
    const authHeader = event.headers.authorization || event.headers.Authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      logger.debug("No valid Authorization header in user request");
      return {
        statusCode: 401,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          error: "No authorization token provided",
          message: "Please include Authorization: Bearer <token> header",
        }),
      };
    }

    const accessToken = authHeader.substring(7); // Remove 'Bearer ' prefix
    const accessPayload = verifyAccessToken(accessToken);

    if (!accessPayload) {
      logger.debug("Invalid access token in user request");
      return {
        statusCode: 401,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          error: "Invalid or expired token",
          message: "Please refresh your token or log in again.",
        }),
      };
    }

    // Get Teamwork API token from refresh token cookie
    const cookieHeader = event.headers.cookie || event.headers.Cookie;
    if (!cookieHeader) {
      logger.debug("No cookie header in user request");
      return {
        statusCode: 401,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          error: "No refresh token found",
          message: "Please log in again.",
        }),
      };
    }

    const cookies = cookie.parse(cookieHeader);
    const refreshToken = cookies.maven_refresh_token;

    if (!refreshToken) {
      logger.debug("No refresh token cookie in user request");
      return {
        statusCode: 401,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          error: "No refresh token found",
          message: "Please log in again.",
        }),
      };
    }

    // Verify refresh token and extract Teamwork API token
    const refreshPayload = verifyRefreshToken(refreshToken);
    if (!refreshPayload || !refreshPayload.accessToken) {
      logger.debug("Invalid refresh token in user request");
      return {
        statusCode: 401,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          error: "Invalid refresh token",
          message: "Please log in again.",
        }),
      };
    }

    // Fetch fresh user data from Teamwork API
    let teamworkAccessToken = refreshPayload.accessToken;
    let teamworkRefreshToken = refreshPayload.teamworkRefreshToken;

    // Helper function to fetch user from Teamwork
    const fetchTeamworkUser = async (token: string) => {
      const response = await axios.get(
        'https://www.teamwork.com/launchpad/v1/account.json',
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );
      return response.data;
    };

    try {
      // First attempt with current token
      let data = await fetchTeamworkUser(teamworkAccessToken);

      if (!data?.user) {
        throw new Error('No user data in Teamwork API response');
      }

      const user: User = data.user;

      logger.debug("User data fetched successfully", {
        userId: user.id,
        domain: domainValidation.domain?.domain,
      });

      return {
        statusCode: 200,
        headers: {
          ...corsHeaders,
          ...getRateLimitHeaders(rateLimit),
          "Content-Type": "application/json",
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
        body: JSON.stringify({
          user,
        }),
      };
    } catch (apiError: any) {
      const status = apiError.response?.status;

      // If 401, try to refresh the Teamwork token
      if (status === 401 && teamworkRefreshToken) {
        logger.info("Teamwork access token expired, attempting refresh", {
          userId: refreshPayload.userId,
        });

        const refreshResult = await refreshTeamworkToken(teamworkRefreshToken);

        if (refreshResult.success && refreshResult.accessToken) {
          teamworkAccessToken = refreshResult.accessToken;

          // If Teamwork returned a new refresh token, use it
          if (refreshResult.refreshToken) {
            teamworkRefreshToken = refreshResult.refreshToken;
          }

          // Retry the API call with the new token
          try {
            const data = await fetchTeamworkUser(teamworkAccessToken);

            if (!data?.user) {
              throw new Error('No user data in Teamwork API response after token refresh');
            }

            const user: User = data.user;

            logger.info("User data fetched successfully after token refresh", {
              userId: user.id,
              domain: domainValidation.domain?.domain,
            });

            // Create new token pair with updated Teamwork tokens
            const newTokenPair = createTokenPair(
              refreshPayload.userId,
              teamworkAccessToken,
              refreshPayload.rotation + 1,
              teamworkRefreshToken
            );

            // Determine cookie settings
            const origin = event.headers.origin || event.headers.referer || "";
            const isLocalhost = origin.includes("localhost") || origin.includes("127.0.0.1");

            const cookieOptions: cookie.SerializeOptions = {
              httpOnly: true,
              secure: !isLocalhost,
              sameSite: "lax",
              path: "/",
              maxAge: 7 * 24 * 60 * 60, // 7 days
            };

            // Set cookie domain for production
            if (!isLocalhost && domainValidation.domain?.environment === 'production') {
              const domain = domainValidation.domain.domain;
              if (domain.includes('mavenmm.com')) {
                cookieOptions.domain = '.mavenmm.com';
              }
            }

            const newRefreshCookie = cookie.serialize(
              "maven_refresh_token",
              newTokenPair.refreshToken,
              cookieOptions
            );

            return {
              statusCode: 200,
              headers: {
                ...corsHeaders,
                ...getRateLimitHeaders(rateLimit),
                "Content-Type": "application/json",
                "Cache-Control": "no-store, no-cache, must-revalidate",
                "Set-Cookie": newRefreshCookie, // Update cookie with new Teamwork tokens
              },
              body: JSON.stringify({
                user,
                tokenRefreshed: true, // Signal to client that tokens were updated
              }),
            };
          } catch (retryError: any) {
            logger.error("Failed to fetch user after token refresh", {
              error: retryError.message,
              status: retryError.response?.status,
            });
          }
        } else {
          logger.warn("Failed to refresh Teamwork token", {
            error: refreshResult.error,
          });
        }
      }

      // No refresh token available or refresh failed
      if (status === 401) {
        logger.warn("Teamwork token expired and cannot be refreshed", {
          hasRefreshToken: !!teamworkRefreshToken,
          userId: refreshPayload.userId,
        });

        return {
          statusCode: 401,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            error: "Teamwork session expired",
            message: "Your Teamwork session has expired. Please log in again.",
            requiresReauth: true,
          }),
        };
      }

      // Other API errors
      logger.error("Failed to fetch user from Teamwork API", {
        error: apiError.message,
        status,
      });

      return {
        statusCode: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          error: "Failed to fetch user data",
          message: "Could not retrieve user information from Teamwork.",
        }),
      };
    }
  } catch (error) {
    logger.error("Error in user endpoint:", error);
    return {
      statusCode: 500,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        error: "Internal Server Error",
      }),
    };
  }
};

export { handler };
