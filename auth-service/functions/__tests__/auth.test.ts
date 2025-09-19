/// <reference types="jest" />

import {
  describe,
  expect,
  it,
  jest,
  beforeEach,
  afterAll,
} from "@jest/globals";
import { handler as loginHandler } from "../login";
import { handler as ssoHandler } from "../sso";
import { handler as logoutHandler } from "../logout";
import type {
  HandlerEvent,
  HandlerContext,
  HandlerResponse,
} from "@netlify/functions";
import axios from "axios";

// Mock axios
jest.mock("axios");
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Mock context
const mockContext: HandlerContext = {
  callbackWaitsForEmptyEventLoop: true,
  functionName: "test",
  functionVersion: "0",
  invokedFunctionArn: "test:arn",
  memoryLimitInMB: "128",
  awsRequestId: "123",
  logGroupName: "test-group",
  logStreamName: "test-stream",
  identity: undefined,
  clientContext: undefined,
  getRemainingTimeInMillis: () => 1000,
  done: () => {},
  fail: () => {},
  succeed: () => {},
};

// Mock environment variables
const originalEnv = process.env;

describe("Authentication Flow Tests", () => {
  beforeEach(() => {
    // Reset environment variables before each test
    process.env = {
      ...originalEnv,
      JWT_KEY: "test_jwt_key",
      ALLOWED_ORIGINS: "https://app.mavenmm.com,*.mavenmm.com,localhost",
      DEV_ID: "test_dev_id",
      VITE_REDIRECT_URI: "http://localhost:3000/callback",
      VITE_CLIENT_ID: "test_client_id",
      VITE_CLIENT_SECRET: "test_client_secret",
    };

    // Clear all mocks
    jest.clearAllMocks();
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe("Login Handler", () => {
    it("should handle successful login for mavenmm.com domain", async () => {
      // Mock Teamwork API response - just return a token
      mockedAxios.post.mockResolvedValueOnce({
        data: {
          access_token: "test_access_token",
          status: "ok",
        },
      });

      const event: Partial<HandlerEvent> = {
        headers: {
          origin: "https://app.mavenmm.com",
          code: "test_auth_code",
        },
        queryStringParameters: {
          returnUrl: "/",
        },
      };

      const response = await loginHandler(event as HandlerEvent, mockContext);
      expect(response).toBeDefined();
      const typedResponse = response as HandlerResponse;
      expect(typedResponse.statusCode).toBe(200);
      expect(typedResponse.headers?.["Set-Cookie"]).toContain(
        "maven_auth_token"
      );
      expect(typedResponse.headers?.["Set-Cookie"]).toContain(
        "Domain=.mavenmm.com"
      );
      expect(typedResponse.headers?.["Set-Cookie"]).toContain("Secure");
    });

    it("should handle successful login for localhost with DEV_ID", async () => {
      mockedAxios.post.mockResolvedValueOnce({
        data: {
          access_token: "test_access_token",
          status: "ok",
        },
      });

      const event: Partial<HandlerEvent> = {
        headers: {
          origin: "http://localhost:3000",
          "x-dev-id": "test_dev_id",
        },
        queryStringParameters: {
          code: "test_auth_code",
          returnUrl: "/",
        },
      };

      const response = await loginHandler(event as HandlerEvent, mockContext);
      expect(response).toBeDefined();
      const typedResponse = response as HandlerResponse;
      expect(typedResponse.statusCode).toBe(200);
      expect(typedResponse.headers?.["Set-Cookie"]).toContain(
        "maven_auth_token"
      );
      expect(typedResponse.headers?.["Set-Cookie"]).not.toContain(
        "Domain=.mavenmm.com"
      );
      expect(typedResponse.headers?.["Set-Cookie"]).toContain("SameSite=lax");
    });

    it("should reject invalid origins", async () => {
      const event: Partial<HandlerEvent> = {
        headers: {
          origin: "https://malicious-site.com",
          code: "test_auth_code",
        },
      };

      const response = await loginHandler(event as HandlerEvent, mockContext);
      expect(response).toBeDefined();
      const typedResponse = response as HandlerResponse;
      expect(typedResponse.statusCode).toBe(403);
    });
  });

  describe("SSO Handler", () => {
    it("should validate localhost requests with correct DEV_ID", async () => {
      const event: Partial<HandlerEvent> = {
        headers: {
          origin: "http://localhost:3000",
          "x-dev-id": "test_dev_id",
          cookie: "maven_auth_token=valid_token",
        },
        httpMethod: "POST",
      };

      const response = await ssoHandler(event as HandlerEvent, mockContext);
      expect(response).toBeDefined();
      const typedResponse = response as HandlerResponse;
      expect(typedResponse.statusCode).toBe(200);
    });

    it("should reject localhost requests with invalid DEV_ID", async () => {
      const event: Partial<HandlerEvent> = {
        headers: {
          origin: "http://localhost:3000",
          "x-dev-id": "wrong_dev_id",
        },
        httpMethod: "POST",
      };

      const response = await ssoHandler(event as HandlerEvent, mockContext);
      expect(response).toBeDefined();
      const typedResponse = response as HandlerResponse;
      expect(typedResponse.statusCode).toBe(403);
    });

    it("should allow mavenmm.com domains without DEV_ID", async () => {
      const event: Partial<HandlerEvent> = {
        headers: {
          origin: "https://app.mavenmm.com",
          cookie: "maven_auth_token=valid_token",
        },
        httpMethod: "POST",
      };

      const response = await ssoHandler(event as HandlerEvent, mockContext);
      expect(response).toBeDefined();
      const typedResponse = response as HandlerResponse;
      expect(typedResponse.statusCode).toBe(200);
    });
  });

  describe("Logout Handler", () => {
    it("should clear cookies for mavenmm.com domain", async () => {
      const event: Partial<HandlerEvent> = {
        headers: {
          origin: "https://app.mavenmm.com",
        },
      };

      const response = await logoutHandler(event as HandlerEvent, mockContext);
      expect(response).toBeDefined();
      const typedResponse = response as HandlerResponse;
      expect(typedResponse.statusCode).toBe(200);
      expect(typedResponse.headers?.["Set-Cookie"]).toContain(
        "maven_auth_token"
      );
      expect(typedResponse.headers?.["Set-Cookie"]).toContain(
        "Domain=.mavenmm.com"
      );
      expect(typedResponse.headers?.["Set-Cookie"]).toContain("Expires=");
    });

    it("should clear cookies for localhost", async () => {
      const event: Partial<HandlerEvent> = {
        headers: {
          origin: "http://localhost:3000",
        },
      };

      const response = await logoutHandler(event as HandlerEvent, mockContext);
      expect(response).toBeDefined();
      const typedResponse = response as HandlerResponse;
      expect(typedResponse.statusCode).toBe(200);
      expect(typedResponse.headers?.["Set-Cookie"]).toContain(
        "maven_auth_token"
      );
      expect(typedResponse.headers?.["Set-Cookie"]).not.toContain(
        ".mavenmm.com"
      );
    });
  });
});
