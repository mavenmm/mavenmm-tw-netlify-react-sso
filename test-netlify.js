#!/usr/bin/env node

/**
 * Test script for Maven SSO Netlify Functions
 *
 * This script tests the handlers locally without needing to deploy
 */

import {
  createLoginHandler,
  createLogoutHandler,
  createCheckAuthHandler,
} from "./dist/netlify/createHandlers.js";

// Test configuration
const testConfig = {
  teamworkClientId: "test_client_id",
  teamworkClientSecret: "test_client_secret",
  teamworkRedirectUri: "http://localhost:3000/",
  allowedOrigins: ["http://localhost:3000", "http://localhost:8888"],
  cookieMaxAge: 86400,
};

// Create handlers
const loginHandler = createLoginHandler(testConfig);
const logoutHandler = createLogoutHandler(testConfig);
const checkAuthHandler = createCheckAuthHandler(testConfig);

// Mock Netlify event object
function createMockEvent(method = "GET", headers = {}, body = null) {
  return {
    httpMethod: method,
    headers: {
      origin: "http://localhost:3000",
      ...headers,
    },
    body: body,
    path: "/.netlify/functions/test",
    queryStringParameters: {},
    multiValueQueryStringParameters: {},
    pathParameters: {},
    stageVariables: {},
    requestContext: {
      requestId: "test-request-id",
      stage: "test",
      httpMethod: method,
      path: "/.netlify/functions/test",
      protocol: "HTTP/1.1",
      resourcePath: "/.netlify/functions/test",
      requestTime: new Date().toISOString(),
      requestTimeEpoch: Date.now(),
      identity: {
        sourceIp: "127.0.0.1",
      },
    },
    isBase64Encoded: false,
  };
}

// Test functions
async function testCORS() {
  console.log("🧪 Testing CORS (OPTIONS requests)...");

  const event = createMockEvent("OPTIONS");

  const loginResult = await loginHandler(event);
  const logoutResult = await logoutHandler(event);
  const checkAuthResult = await checkAuthHandler(event);

  console.log(
    "✅ Login CORS:",
    loginResult.statusCode === 204 ? "PASS" : "FAIL"
  );
  console.log(
    "✅ Logout CORS:",
    logoutResult.statusCode === 204 ? "PASS" : "FAIL"
  );
  console.log(
    "✅ CheckAuth CORS:",
    checkAuthResult.statusCode === 204 ? "PASS" : "FAIL"
  );
  console.log("");
}

async function testMethodValidation() {
  console.log("🧪 Testing HTTP method validation...");

  // Test wrong methods
  const getLoginEvent = createMockEvent("GET");
  const postLogoutEvent = createMockEvent("POST");
  const postCheckAuthEvent = createMockEvent("POST");

  const loginResult = await loginHandler(getLoginEvent);
  const logoutResult = await logoutHandler(postLogoutEvent);
  const checkAuthResult = await checkAuthHandler(postCheckAuthEvent);

  console.log(
    "✅ Login rejects GET:",
    loginResult.statusCode === 405 ? "PASS" : "FAIL"
  );
  console.log(
    "✅ Logout rejects POST:",
    logoutResult.statusCode === 405 ? "PASS" : "FAIL"
  );
  console.log(
    "✅ CheckAuth rejects POST:",
    checkAuthResult.statusCode === 405 ? "PASS" : "FAIL"
  );
  console.log("");
}

async function testLoginValidation() {
  console.log("🧪 Testing login validation...");

  // Test missing code
  const noCodeEvent = createMockEvent("POST");
  const result = await loginHandler(noCodeEvent);

  console.log(
    "✅ Login rejects missing code:",
    result.statusCode === 400 ? "PASS" : "FAIL"
  );

  // Test with code (will fail token exchange but should get past validation)
  const withCodeEvent = createMockEvent("POST", { code: "test_code" });
  const resultWithCode = await loginHandler(withCodeEvent);

  console.log(
    "✅ Login accepts code:",
    resultWithCode.statusCode === 400 &&
      JSON.parse(resultWithCode.body).error.includes("exchange")
      ? "PASS"
      : "FAIL"
  );
  console.log("");
}

async function testCheckAuthWithoutToken() {
  console.log("🧪 Testing check auth without token...");

  const event = createMockEvent("GET");
  const result = await checkAuthHandler(event);
  const body = JSON.parse(result.body);

  console.log(
    "✅ CheckAuth without token:",
    result.statusCode === 200 && body.authenticated === false ? "PASS" : "FAIL"
  );
  console.log("");
}

async function testLogout() {
  console.log("🧪 Testing logout...");

  const event = createMockEvent("GET");
  const result = await logoutHandler(event);
  const body = JSON.parse(result.body);

  console.log(
    "✅ Logout success:",
    result.statusCode === 200 && body.success === true ? "PASS" : "FAIL"
  );
  console.log(
    "✅ Logout clears cookie:",
    result.headers["Set-Cookie"].includes("Max-Age=0") ? "PASS" : "FAIL"
  );
  console.log("");
}

async function testOriginValidation() {
  console.log("🧪 Testing origin validation...");

  // Test disallowed origin
  const badOriginEvent = createMockEvent("GET", { origin: "https://evil.com" });
  const result = await logoutHandler(badOriginEvent);

  console.log(
    "✅ Rejects bad origin:",
    result.headers["Access-Control-Allow-Origin"] === "" ? "PASS" : "FAIL"
  );

  // Test allowed origin
  const goodOriginEvent = createMockEvent("GET", {
    origin: "http://localhost:3000",
  });
  const goodResult = await logoutHandler(goodOriginEvent);

  console.log(
    "✅ Accepts good origin:",
    goodResult.headers["Access-Control-Allow-Origin"] ===
      "http://localhost:3000"
      ? "PASS"
      : "FAIL"
  );
  console.log("");
}

// Run all tests
async function runTests() {
  console.log("🚀 Starting Maven SSO Netlify Functions Tests\n");

  await testCORS();
  await testMethodValidation();
  await testLoginValidation();
  await testCheckAuthWithoutToken();
  await testLogout();
  await testOriginValidation();

  console.log("✨ Tests completed! Check the results above.");
  console.log("");
  console.log("💡 To test with real Teamwork integration:");
  console.log("   1. Set up real TEAMWORK_* environment variables");
  console.log("   2. Run: netlify dev");
  console.log("   3. Test at http://localhost:8888/.netlify/functions/tw-*");
}

runTests().catch(console.error);
