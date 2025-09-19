# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This repository contains TWO main components for Maven Marketing's centralized SSO system:

1. **NPM Package** (`src/`): Frontend-only React package for consuming apps
2. **Auth Service** (`auth-service/`): Centralized authentication service deployed at `auth.mavenmm.com`

### Architecture (v2.0) - Centralized SSO
- **External Auth Service**: All authentication logic centralized at `auth.mavenmm.com`
- **Frontend Package**: React components/hooks that communicate with external auth service
- **Zero Backend Code**: Individual Maven apps only need frontend React components
- **Multi-Site Support**: Works across all `*.mavenmm.com` subdomains with shared cookie domain
- **Single Point of Security**: All Teamwork API tokens and JWT secrets managed centrally

## Development Commands

### NPM Package Development
```bash
npm run build           # Build frontend package only
npm run build:watch     # Build in watch mode
npm run dev             # Alias for build:watch
npm run test            # Run Jest unit tests
npm run type-check      # TypeScript type checking
```

### Auth Service Development
```bash
cd auth-service/
npm install            # Install auth service dependencies
npm run dev            # Start auth service with Netlify dev
npm run build          # Build auth service for deployment
npm run test           # Test auth service functions
```

## Architecture

### Simplified Build System (v2.0)
The package now uses a single Rollup build target:
- **Main package** (`src/index.ts` → `dist/index.esm.js`) - Frontend React components and hooks only

### Package Exports Structure
The package provides a single entry point:
- Main export: React components (`useTeamworkAuth`, `Login`, `AuthProvider`, `TeamworkAuthConfig`)

### Frontend Components (NPM Package)
- **useTeamworkAuth**: Core authentication hook that communicates with external auth service
- **AuthProvider**: React context provider for auth state management (requires React Router context)
- **Login**: Pre-built login component using `@teamwork/login-button`
- **TeamworkAuthConfig**: TypeScript interface for configuring auth service URL and cookie domain

### Auth Service Components (`auth-service/`)
- **Netlify Functions**: Complete auth handlers (`login.ts`, `logout.ts`, `checkAuth.ts`, `sso.ts`)
- **Middleware**: Cookie validation and JWT handling
- **Types**: Teamwork API interfaces and auth types

### Configuration
- **NPM Package**: Only needs `authServiceUrl` and optional `cookieDomain` in React components
- **Auth Service**: Environment variables for Teamwork OAuth credentials and JWT secrets

### TypeScript Types
Comprehensive type definitions in `src/types/index.ts` covering:
- User and authentication interfaces
- Netlify Function event/response types
- Configuration interfaces for different deployment scenarios
- Maven SSO specific types

## Testing Strategy

The project uses Jest with TypeScript for testing:
- Unit tests for React components and hooks
- Integration tests for Netlify Functions (`test:netlify` command)
- JSDOM environment for React component testing
- Coverage collection excluding type definitions and main index file

## Important Development Notes

- **Router Dependency**: `AuthProvider` must be placed inside React Router context (within a Route element)
- **Peer Dependencies**: React, React DOM, and React Router DOM are peer dependencies
- **Browser Compatibility**: Includes polyfills for buffer and process in browser environments
- **Security**: Uses HttpOnly cookies for authentication tokens
- **Subdomain Support**: Configurable cookie domain for cross-subdomain authentication

## Local Testing

### Current Status (IN PROGRESS)
✅ **Auth Service Working**: Functions accessible at `localhost:8888` with all environment variables loaded
✅ **Test App Working**: React app running at `localhost:3000` with proper TypeScript types
⚠️ **Environment Issue**: `@teamwork/login-button` component not loading Teamwork OAuth credentials from .env

### Local Testing Setup
```bash
# Terminal 1 - Auth Service
cd auth-service/
npm run dev

# Terminal 2 - Test App
cd test-app/
npm run dev
```

### Environment Configuration
- **Auth Service**: `.env` file in `auth-service/` (also copied to parent directory for Netlify dev)
- **Test App**: `.env` file copied to `test-app/` directory
- **Required vars**: `VITE_CLIENT_ID`, `VITE_CLIENT_SECRET`, `VITE_REDIRECT_URI`, `JWT_KEY`, `DEV_ID`

### Known Issues (NEEDS FIXING)
1. **Login Button Not Working**: The `@teamwork/login-button` component is not reading environment variables
2. **OAuth Flow Incomplete**: Cannot test full authentication flow until Login button works
3. **Environment Variable Loading**: May need to pass env vars as props to Login component

### Testing Progress
- ✅ Auth service functions load correctly (checkAuth, login, logout, sso, dashboardPersonById)
- ✅ CORS working between test app (3000) and auth service (8888)
- ✅ Environment variables loaded in auth service
- ✅ TypeScript errors resolved in test app
- ❌ Login button environment variables not working

### Next Steps
1. Debug why `@teamwork/login-button` isn't reading `VITE_CLIENT_ID` and `VITE_REDIRECT_URI`
2. Test complete OAuth flow once Login button works
3. Verify authentication state management and logout functionality

## Multi-Site Integration

### Adding Auth to New Maven Apps

For any new Maven app (e.g., `app1.mavenmm.com`, `admin.mavenmm.com`):

```tsx
// In your Maven app - just install and configure
import { useTeamworkAuth } from '@mavenmm/teamwork-auth';

const authConfig = {
  authServiceUrl: 'https://auth.mavenmm.com',
  cookieDomain: '.mavenmm.com'  // Enables cross-subdomain auth
};

function App() {
  const { user, isAuthenticated, logout } = useTeamworkAuth(authConfig);
  // No backend code needed!
}
```

### Benefits of Centralized Approach
- **Security**: Teamwork API tokens never leave `auth.mavenmm.com`
- **Maintenance**: Update auth logic in one place for all apps
- **Simplicity**: New apps need zero backend auth code
- **Consistency**: Same user experience across all Maven properties

## Security Architecture

### ⚠️ CRITICAL SECURITY NOTES

**Teamwork API Token Protection**:
- Permanent Teamwork API tokens are stored ONLY in `auth-service/.env`
- Tokens never transmitted to frontend applications
- JWT tokens used for client-server communication (2-week expiry)
- HttpOnly cookies prevent XSS access to authentication tokens

**Current Security Issues (NEEDS FIXING)**:
1. **Token Exposure**: Console.log statements in middleware expose access tokens
2. **CORS Vulnerabilities**: Automatic origin reflection allows any domain
3. **Insecure Cookies**: Missing secure/sameSite settings for production
4. **Environment Exposure**: Frontend debug logs expose environment variables

**Security Best Practices**:
- Use `secure: true` for cookies in production
- Implement `sameSite: 'strict'` for CSRF protection
- Remove all token logging from production code
- Use explicit CORS allowlist instead of reflecting origins
- Regular security audits of authentication flow

## CLI Tool

The package includes a scaffold CLI (`mavenmm-scaffold`) that generates:
- Netlify Functions template files
- Environment configuration examples
- Basic project setup for SSO integration