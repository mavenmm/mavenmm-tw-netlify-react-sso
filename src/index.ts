// Main exports for Maven SSO package
export { useMavenSSO } from "./hooks/useMavenSSO";
export { Login } from "./components/Login";

// Auth Provider (React Context)
export {
  default as AuthProvider,
  useAuthContext,
} from "./providers/AuthProvider";

// Types
export type {
  User,
  MavenSSOConfig,
  AuthContextType,
  LoginResult,
  NetlifyFunctionEvent,
  NetlifyFunctionResponse,
} from "./types";

// Utility functions (you can add these later)
// export { handleLogin } from './utils/handleLogin';
// export { createSSOHandler } from './netlify/ssoHandler';

// Note: AuthProvider should be imported from your app's providers folder
// export { AuthProvider, useAuthContext } from './providers/AuthProvider';

// Netlify Functions are available in the netlify/functions/ directory:
// - tw-login.ts - Handles Teamwork OAuth callback
// - tw-logout.ts - Handles logout and cookie clearing
// - tw-check-auth.ts - Validates authentication status

// Server-side middleware is available at:
// import { validate } from 'mavenmm-tw-netlify-react-sso/server'
