// Ensure polyfills are loaded for browser compatibility
import "./utils/polyfills";

// Main exports for Teamwork Auth package - Centralized Auth Service
export { useTeamworkAuth, type TeamworkAuthConfig } from "./hooks/useTeamworkAuth";
export { Login } from "./components/Login";

// Auth Provider (React Context)
export {
  default as AuthProvider,
  useAuthContext,
} from "./providers/AuthProvider";

// Types
export type {
  User,
  AuthContextType,
  LoginResult,
} from "./types";

// Note: This package works with external auth service at auth.mavenmm.com
// No backend code needed in individual apps!
//
// Usage:
// import { useTeamworkAuth, AuthProvider } from '@mavenmm/teamwork-auth';
//
// const config = {
//   authServiceUrl: 'https://auth.mavenmm.com',
//   cookieDomain: '.mavenmm.com'
// };
//
// const auth = useTeamworkAuth(config);
