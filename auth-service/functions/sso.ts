import type { Handler } from "@netlify/functions";
import { validate } from "./middleware/validateCookies";

// Define the validation result type
interface ValidationResult {
  status: string;
  code: number;
  message: string;
  options?: {
    headers: {
      teamworkUserID?: string;
      Authorization: string;
    };
  } | null;
}

const handler: Handler = async (event) => {
  try {
    const origin = event.headers.origin || "";
    const host = event.headers.host || "";

    // Enhanced debug logging at entry point
    console.log("🚀 Incoming request:", {
      origin,
      host,
      method: event.httpMethod,
      path: event.path,
      headers: event.headers,
      rawUrl: event.rawUrl,
    });

    // Define security headers
    const securityHeaders = {
      "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
      "X-Content-Type-Options": "nosniff",
      "X-Frame-Options": "DENY",
      "X-XSS-Protection": "1; mode=block",
      "Referrer-Policy": "strict-origin-when-cross-origin",
    };

    // Validate origin
    const allowedOrigins = [
      /^https?:\/\/localhost:(3000|5173|8888)$/,
      /^https:\/\/.*\.mavenmm\.com$/,
    ];

    const isAllowedOrigin = allowedOrigins.some((pattern) =>
      pattern.test(origin || "")
    );

    console.log("🔒 Origin validation:", {
      origin,
      isAllowedOrigin,
      matchedPattern: allowedOrigins
        .find((pattern) => pattern.test(origin || ""))
        ?.toString(),
    });

    // CORS headers - now more permissive during preflight
    const corsHeaders = {
      "Access-Control-Allow-Origin": isAllowedOrigin ? origin : "",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers":
        "Content-Type, x-maven-auth-token, x-dev-id, Cookie",
      "Access-Control-Allow-Credentials": "true",
      "Access-Control-Max-Age": "3600",
    };

    // Handle OPTIONS request (preflight)
    if (event.httpMethod === "OPTIONS") {
      console.log("👉 Handling OPTIONS preflight request");
      return {
        statusCode: 204,
        headers: {
          ...corsHeaders,
          ...securityHeaders,
        },
        body: "",
      };
    }

    // Only allow POST method
    if (event.httpMethod !== "POST") {
      console.log("❌ Method not allowed:", event.httpMethod);
      return {
        statusCode: 405,
        headers: {
          ...corsHeaders,
          ...securityHeaders,
        },
        body: JSON.stringify({
          error: "Method not allowed - SSO endpoint requires POST",
          isAuthenticated: false,
        }),
      };
    }

    // Check if request is from localhost
    const isLocalhost =
      origin?.includes("localhost") || host?.includes("localhost");

    // For localhost, check cookie first, then fallback to x-maven-auth-token header
    if (isLocalhost) {
      // First try to validate using cookie (may come from the proxy)
      let cookieValidation: ValidationResult = {
        status: "Invalid",
        code: 401,
        message: "No cookie",
        options: null,
      };

      if (event?.headers?.cookie) {
        cookieValidation = validate(event.headers.cookie) as ValidationResult;
      }

      // If cookie validation succeeded
      if (cookieValidation.status === "Valid" && cookieValidation.options) {
        return {
          statusCode: 200,
          headers: {
            ...corsHeaders,
            ...securityHeaders,
            "Cache-Control": "no-store, no-cache, must-revalidate",
          },
          body: JSON.stringify({
            _id: cookieValidation.options.headers.teamworkUserID,
            authorization:
              cookieValidation.options.headers.Authorization.split(" ")[1],
            isAuthenticated: true,
            environment: "development",
          }),
        };
      }

      // Fallback to header token validation
      const headerToken = event.headers["x-maven-auth-token"];
      const devId = event.headers["x-dev-id"];
      const expectedDevId = process.env.DEV_ID;

      // Only check dev ID if one is provided and expected
      if (devId && expectedDevId && devId !== expectedDevId) {
        return {
          statusCode: 403,
          headers: {
            ...corsHeaders,
            ...securityHeaders,
          },
          body: JSON.stringify({
            error: "Development credentials required",
            details: {
              message: "Valid x-dev-id header is required",
              help: "Add x-dev-id header matching your environment's DEV_ID",
            },
            isAuthenticated: false,
          }),
        };
      }

      // If header token exists, validate it
      if (headerToken) {
        const headerValidation = validate(
          `maven_auth_token=${headerToken}`
        ) as ValidationResult;

        if (headerValidation.status === "Valid" && headerValidation.options) {
          return {
            statusCode: 200,
            headers: {
              ...corsHeaders,
              ...securityHeaders,
              "Cache-Control": "no-store, no-cache, must-revalidate",
            },
            body: JSON.stringify({
              _id: headerValidation.options.headers.teamworkUserID,
              authorization:
                headerValidation.options.headers.Authorization.split(" ")[1],
              isAuthenticated: true,
              environment: "development",
            }),
          };
        }
      }

      // If both cookie and header token validation failed
      return {
        statusCode: 401,
        headers: {
          ...corsHeaders,
          ...securityHeaders,
        },
        body: JSON.stringify({
          error: "Authentication failed",
          details: {
            reason: "Both cookie and header token validation failed",
            cookieStatus: cookieValidation.status,
            cookieMessage: cookieValidation.message,
            hasHeaderToken: !!headerToken,
          },
          isAuthenticated: false,
        }),
      };
    }

    // For all other origins, validate using cookie
    const cookieValidation = validate(
      event?.headers?.cookie
    ) as ValidationResult;

    if (cookieValidation.status !== "Valid" || !cookieValidation.options) {
      return {
        statusCode: 401,
        headers: {
          ...corsHeaders,
          ...securityHeaders,
        },
        body: JSON.stringify({
          error: "Authentication failed",
          details: {
            reason: "Cookie validation failed",
            status: cookieValidation.status,
            code: cookieValidation.code,
            message: cookieValidation.message,
            hasCookie: !!event?.headers?.cookie,
          },
          isAuthenticated: false,
        }),
      };
    }

    return {
      statusCode: 200,
      headers: {
        ...corsHeaders,
        ...securityHeaders,
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
      body: JSON.stringify({
        _id: cookieValidation.options.headers.teamworkUserID,
        authorization:
          cookieValidation.options.headers.Authorization.split(" ")[1],
        isAuthenticated: true,
        environment: "production",
      }),
    };
  } catch (error) {
    const err = error as Error;
    console.error("❌ Internal error:", err);
    return {
      statusCode: 500,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "*",
        "Access-Control-Allow-Credentials": "true",
        "Access-Control-Max-Age": "3600",
      },
      body: JSON.stringify({
        error: "Internal server error",
        details: {
          reason: "Error processing request",
          message: err.message,
          type: err.name,
        },
      }),
    };
  }
};

export { handler };
