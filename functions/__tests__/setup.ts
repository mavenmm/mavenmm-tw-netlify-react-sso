import { jest } from "@jest/globals";
import type { JwtPayload } from "jsonwebtoken";

interface CookieOptions {
  domain?: string;
  secure?: boolean;
  sameSite?: "Strict" | "Lax" | "None";
  expires?: Date;
  path?: string;
  httpOnly?: boolean;
}

// Mock jwt module
jest.mock("jsonwebtoken", () => ({
  sign: jest.fn().mockReturnValue("mocked_jwt_token"),
  verify: jest.fn().mockReturnValue({
    userId: "test_user_id",
    access_token: "test_access_token",
    exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
  } as JwtPayload),
}));

// Mock cookie module
jest.mock("cookie", () => ({
  parse: jest.fn().mockReturnValue({
    maven_auth_token: "valid_token",
  }),
  serialize: (
    jest.fn() as jest.MockedFunction<
      (name: string, value: string, options?: CookieOptions) => string
    >
  ).mockImplementation((name, value, options) => {
    const domain = options?.domain ? `; Domain=${options.domain}` : "";
    const secure = options?.secure ? "; Secure" : "";
    const sameSite = options?.sameSite ? `; SameSite=${options.sameSite}` : "";
    const expires = options?.expires
      ? `; Expires=${options.expires.toUTCString()}`
      : "";
    return `${name}=${value}; Path=/; HttpOnly${domain}${secure}${sameSite}${expires}`;
  }),
}));

// Global test environment setup
process.env = {
  ...process.env,
  JWT_KEY: "test_jwt_key",
  ALLOWED_ORIGINS: "https://app.mavenmm.com,*.mavenmm.com,localhost",
  DEV_ID: "test_dev_id",
  VITE_REDIRECT_URI: "http://localhost:3000/callback",
  VITE_CLIENT_ID: "test_client_id",
  VITE_CLIENT_SECRET: "test_client_secret",
};
