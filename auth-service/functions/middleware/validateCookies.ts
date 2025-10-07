import jwt from "jsonwebtoken";
import type { JwtPayload } from "jsonwebtoken";
import cookie from "cookie";
import { logger } from "../utils/logger";

export const validate = function (cookieHeader) {
  const jwt_key = process.env.JWT_KEY;

  if (!jwt_key) {
    logger.error("JWT_KEY is not defined in the environment");
    return {
      status: "Invalid",
      code: 511,
      message: "JWT_KEY is not defined in the environment",
    };
  }

  if (!cookieHeader) {
    logger.debug("No cookie header provided");
    return { status: "Invalid", code: 401, message: "Unauthorized" };
  }

  const cookies = cookie.parse(cookieHeader);
  const jwtToken = cookies?.maven_auth_token;

  if (!jwtToken) {
    logger.debug("JWT token not found in cookies");
    return { status: "Invalid", code: 401, message: "Unauthorized" };
  }

  try {
    const payload = jwt.verify(jwtToken, jwt_key) as JwtPayload;

    if (typeof payload === "object" && "exp" in payload) {
      const current = Math.floor(Date.now() / 1000);
      const exp = payload.exp ?? 0;
      const diff = current - exp;

      if (diff > 0) {
        logger.debug(`JWT has expired. Expired ${diff} seconds ago.`);
        return { status: "Invalid", code: 401, message: "JWT has expired" };
      }

      // SECURITY: Never log tokens - sanitizer will redact them anyway
      logger.debug("JWT validated successfully", {
        userId: payload._id,
        timeRemaining: Math.abs(diff),
      });

      return {
        status: "Valid",
        code: 200,
        message: `Validated JWT: ${Math.abs(
          diff
        )} seconds remaining until expiry`,
        options: {
          headers: {
            teamworkUserID: payload._id,
            Authorization: `Bearer ${payload.access_token}`,
          },
        },
      };
    } else {
      logger.error("JWT payload is invalid");
      return {
        status: "Invalid",
        code: 401,
        message: "JWT payload is invalid",
      };
    }
  } catch (err) {
    logger.error("JWT validation error:", err.message);
    return { status: "Invalid", code: 401, message: err.message };
  }
};
