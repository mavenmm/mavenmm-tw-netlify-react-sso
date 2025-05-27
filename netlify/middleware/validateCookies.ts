import jwt from "jsonwebtoken";
import type { JwtPayload } from "jsonwebtoken";
import cookie from "cookie";

// color red for console logs
const red = "\x1b[31m";
// color reset for console logs
const reset = "\x1b[0m";
// color green for console logs
// const green = "\x1b[32m";

export const validate = function (cookieHeader) {
  const jwt_key = process.env.JWT_KEY;

  if (!jwt_key) {
    console.error(red, "JWT_KEY is not defined in the environment", reset);
    return {
      status: "Invalid",
      code: 511,
      message: "JWT_KEY is not defined in the environment",
    };
  }

  if (!cookieHeader) {
    console.error(red, "No cookie header provided", reset);
    return { status: "Invalid", code: 401, message: "Unauthorized" };
  }

  const cookies = cookie.parse(cookieHeader);
  const jwtToken = cookies?.maven_auth_token;

  if (!jwtToken) {
    console.error(red, "JWT token not found in cookies", reset);
    return { status: "Invalid", code: 401, message: "Unauthorized" };
  }

  try {
    const payload = jwt.verify(jwtToken, jwt_key) as JwtPayload;

    if (typeof payload === "object" && "exp" in payload) {
      const current = Math.floor(Date.now() / 1000);
      const exp = payload.exp ?? 0;
      const diff = current - exp;

      if (diff > 0) {
        console.error(
          red,
          `JWT has expired. Expired ${diff} seconds ago.`,
          reset
        );
        return { status: "Invalid", code: 401, message: "JWT has expired" };
      }

      return {
        status: "Valid",
        code: 200,
        message: `Validated JWT: ${Math.abs(
          diff
        )} seconds remaining until expiry`,
        options: {
          headers: {
            teamworkUserID: payload.userId,
            Authorization: `Bearer ${payload.access_token}`,
          },
        },
      };
    } else {
      console.error(red, "JWT payload is invalid", reset);
      return {
        status: "Invalid",
        code: 401,
        message: "JWT payload is invalid",
      };
    }
  } catch (err) {
    console.error(red, `JWT validation error: ${err.message}`, reset);
    return { status: "Invalid", code: 401, message: err.message };
  }
};
