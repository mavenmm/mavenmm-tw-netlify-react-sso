// Server-side exports for Maven SSO package
// These should only be imported in Node.js environments (Netlify Functions, etc.)

export { validate } from "./middleware/validateCookies";

// Types that are useful for server-side code
export type {
  ValidationResult,
  NetlifyFunctionEvent,
  NetlifyFunctionResponse,
} from "./types";
