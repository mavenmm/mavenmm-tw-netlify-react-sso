# @mavenmm/teamwork-auth - AI Assistant Guide

This file provides guidance for AI assistants (like Claude Code) when helping developers use this package.

## Package Overview

**@mavenmm/teamwork-auth** is a React authentication package for Maven Marketing's centralized SSO system. It provides zero-configuration authentication with automatic environment detection.

## Quick Start

```tsx
import { useTeamworkAuth, Login } from '@mavenmm/teamwork-auth';

function App() {
  const { user, isAuthenticated, loading, logout } = useTeamworkAuth();

  if (loading) return <div>Loading...</div>;

  if (!isAuthenticated) {
    return <Login
      clientID={import.meta.env.VITE_CLIENT_ID}
      redirectURI={window.location.origin}
    />;
  }

  return (
    <div>
      <h1>Welcome {user?.firstName}!</h1>
      <button onClick={logout}>Logout</button>
    </div>
  );
}
```

## Environment Detection (Zero Config!)

The package automatically detects the environment:
- `localhost` → uses `http://localhost:9100` (local auth service)
- `*.mavenmm.com` → uses `https://auth.mavenmm.com` (production)
- `*.netlify.app` → uses `https://auth.mavenmm.com` (staging)

**No manual configuration needed!**

## Required Environment Variables

### For Development (Local Auth Service)
```bash
# In your app's .env file:
VITE_CLIENT_ID=<teamwork_oauth_client_id>
VITE_REDIRECT_URI=http://localhost:3000  # Or your port (5173, 8080, etc.)
VITE_DOMAIN_KEY=dev_localhost_shared  # Shared key for ALL localhost ports
```

**Important:** All localhost ports (3000, 5173, 5174, 8080) use the same `dev_localhost_shared` key.

### For Production
```bash
# In your deployed app's environment:
VITE_CLIENT_ID=<teamwork_oauth_client_id>
VITE_REDIRECT_URI=https://your-app.mavenmm.com
VITE_DOMAIN_KEY=<unique_key_for_your_app>  # Provided by auth.mavenmm.com admin
```

## Core API

### `useTeamworkAuth(config?): AuthState`

Main authentication hook.

**Parameters:**
- `config` (optional): `TeamworkAuthConfig`
  - `authServiceUrl`: Override auto-detected auth service URL (rarely needed)
  - `domainKey`: Domain authentication key (auto-loaded from env)

**Returns:** `AuthState`
- `user`: User object or null
- `isAuthenticated`: boolean
- `loading`: boolean
- `error`: string or null
- `authServiceUrl`: Current auth service URL
- `login(code: string)`: Function to complete OAuth login
- `logout()`: Function to logout
- `getAccessToken()`: Function to get current access token

**Example:**
```tsx
const { user, isAuthenticated, getAccessToken } = useTeamworkAuth();

// Optional: override config
const { user } = useTeamworkAuth({
  domainKey: import.meta.env.VITE_DOMAIN_KEY,
});
```

### `<Login />` Component

Pre-built Teamwork login button.

**Props:**
- `clientID` (required): Teamwork OAuth client ID
- `redirectURI` (required): OAuth redirect URI (usually `window.location.origin`)
- `clientSecret` (optional): Not needed in production (handled by auth service)

**Example:**
```tsx
<Login
  clientID={import.meta.env.VITE_CLIENT_ID}
  redirectURI={import.meta.env.VITE_REDIRECT_URI}
/>
```

### `<AuthProvider />` Component

Context provider for auth state. **Usually not needed** - `useTeamworkAuth` hook handles this internally.

**Important:** Must be placed inside React Router's Router context if used directly.

```tsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from '@mavenmm/teamwork-auth';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<Home />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
```

## TypeScript Types

```tsx
import type {
  User,
  TeamworkAuthConfig,
  AuthState
} from '@mavenmm/teamwork-auth';
```

### User Type
```typescript
interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  avatar?: string;
  company?: {
    id: string;
    name: string;
  };
}
```

### TeamworkAuthConfig Type
```typescript
interface TeamworkAuthConfig {
  authServiceUrl?: string;  // Override auto-detection (rarely needed)
  domainKey?: string;        // Domain authentication key (auto-loaded from env)
}
```

## Development Workflow

### Setup for Developers

1. **Install the package:**
```bash
npm install @mavenmm/teamwork-auth
```

2. **Set up environment variables:**
Create `.env` file:
```bash
VITE_CLIENT_ID=<your_teamwork_client_id>
VITE_REDIRECT_URI=http://localhost:3000  # Or your dev port
VITE_DOMAIN_KEY=dev_localhost_shared
```

3. **Start local auth service:**
Clone the auth service repo and run:
```bash
git clone <auth-service-repo>
cd <auth-service-repo>
netlify dev --port 9100
```

4. **Use in your app:**
```tsx
import { useTeamworkAuth, Login } from '@mavenmm/teamwork-auth';
// Zero config - auto-detects localhost:9100!
```

### Common Issues & Solutions

**Issue: "Auth service unreachable"**
- Make sure local auth service is running on port 9100
- Run: `netlify dev --port 9100` in the auth service directory
- Check if port 9100 is available (not used by another process)

**Issue: "Invalid domain key"**
- Verify `VITE_DOMAIN_KEY` in your app matches `DEV_KEY` in auth service
- For localhost: Both should be `dev_localhost_shared` (all ports use same key)
- For production: Use unique key provided by auth.mavenmm.com admin

**Issue: "CORS errors"**
- Ensure your app's origin is registered in auth service's domain registry
- Check auth service logs for CORS-related errors
- For localhost, origin should be `http://localhost:3000` (or your port)

**Issue: "401 Unauthorized on refresh"**
- Normal on first load (no refresh token yet)
- If persists after login, check browser cookies for `maven_refresh_token`
- Ensure cookies are enabled in your browser

**Issue: "Cookies not working"**
- Development: Both app and auth service must be on localhost
- Production: Both must be on HTTPS
- Cannot test auth.mavenmm.com from localhost (browser security)

**Issue: "User data is null even when authenticated"**
- Normal on first load after localStorage is cleared
- Hook automatically fetches user data from server (v2.0.4+)
- Check browser console for "Failed to fetch user data" errors
- Verify auth service /user endpoint is deployed and working

**Issue: "Cookies not being set/validated" (Migration)**
- Ensure `VITE_DOMAIN_KEY` matches the expected key in auth service domain registry
- For localhost: Use `dev_localhost_shared` (not port-specific keys)
- Clear browser cookies and localStorage, then login again
- Check auth service logs for "Invalid domain key" or "Domain validation failed"
- Verify your app's origin is registered in `functions/config/domains.ts`

**Issue: "User info not loading after login" (Migration)**
- The hook automatically fetches user data if localStorage is empty (v2.0.4+)
- If migrating from old auth system, clear localStorage completely
- Ensure auth service `/user` endpoint is deployed (check Network tab)
- Verify refresh token cookie exists (Application → Cookies → `maven_refresh_token`)
- Check console for "Failed to fetch user data" - may indicate token/permission issue

## User Data Management

### Automatic User Data Fetching (v2.0.4+)

The hook automatically manages user data:

1. **On login**: User data is returned from auth service and stored in localStorage
2. **On page load**: User data is loaded from localStorage (fast)
3. **If localStorage is empty**: Automatically fetches fresh user data from auth service

**This means:**
- ✅ User data survives localStorage being cleared
- ✅ User data is always available when authenticated
- ✅ Fresh user data fetched from Teamwork when needed
- ✅ No manual user data fetching required

**Example:**
```tsx
const { user, isAuthenticated } = useTeamworkAuth();

// User data is automatically available when authenticated
if (isAuthenticated) {
  console.log(user?.firstName); // Always available
}
```

### Manual User Data Refresh

If you need to refresh user data manually (e.g., after profile update):

```tsx
// Clear localStorage and refresh page to trigger re-fetch
localStorage.removeItem('maven_sso_user');
window.location.reload();
```

Or wait for the next page load - the hook will automatically fetch fresh data.

## Architecture Notes

### Token Strategy (v2.0)
- **Access tokens**: 15 minutes, stored in memory (not localStorage)
- **Refresh tokens**: 7 days, stored in httpOnly cookies
- **Auto-refresh**: Tokens refresh 1 minute before expiry
- **Token rotation**: Refresh tokens are single-use and blacklisted after use

### User Data Strategy (v2.0.4+)
- **On login**: Fetched from Teamwork and stored in localStorage
- **On page load**: Loaded from localStorage first (fast)
- **Fallback**: If localStorage empty, fetched from auth service
- **Auth service**: Fetches fresh data from Teamwork API using refresh token
- **Always current**: User data stays in sync with Teamwork

### Security Features
- HttpOnly cookies prevent XSS attacks
- Domain authentication keys prevent domain spoofing
- Rate limiting on all endpoints (including /user)
- Automatic token rotation and blacklisting
- Content Security Policy headers
- Timing-safe key comparison to prevent timing attacks
- User data fetched server-side (Teamwork API token never exposed)

### Cookie Behavior
- **localhost**: Cookies work (same domain)
- **Production (*.mavenmm.com)**: Cookies work (shared domain `.mavenmm.com`)
- **Staging (*.netlify.app)**: Cookies work (HTTPS cross-site with CORS)
- **localhost ↔ auth.mavenmm.com**: Won't work (use local auth service instead)

## Advanced Usage

### Getting Access Token for API Calls
```tsx
const { getAccessToken } = useTeamworkAuth();

async function callAPI() {
  const token = getAccessToken();
  if (!token) {
    console.error('No access token available');
    return;
  }

  const response = await fetch('https://api.example.com/data', {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });
  return response.json();
}
```

### Manual Auth Service Override (Rare)
```tsx
// Only needed for custom deployments
const { user } = useTeamworkAuth({
  authServiceUrl: 'https://custom-auth.example.com',
  domainKey: 'custom_domain_key',
});
```

### Handling OAuth Callback
The hook automatically handles OAuth callbacks. No manual intervention needed.

The OAuth flow:
1. User clicks Login button → redirected to Teamwork
2. User authenticates with Teamwork
3. Teamwork redirects back to your app with `?code=xxx`
4. useTeamworkAuth automatically detects the code and logs in
5. URL is cleaned up (code parameter removed)

## Environment-Specific Behavior

### Development (localhost)
```
Your App (localhost:3000)
    ↓
Local Auth Service (localhost:9100)
    ↓
Teamwork API
```
- Cookies: Same domain, work perfectly
- No CORS issues (same origin)
- Fast development iteration

### Production (*.mavenmm.com)
```
Your App (home.mavenmm.com)
    ↓
Auth Service (auth.mavenmm.com)
    ↓
Teamwork API
```
- Cookies: Shared domain `.mavenmm.com`, work perfectly
- CORS: Configured in auth service
- Single auth service for all Maven apps

### Staging (*.netlify.app)
```
Your App (preview.netlify.app)
    ↓
Auth Service (auth.mavenmm.com)
    ↓
Teamwork API
```
- Cookies: Cross-site HTTPS, work with CORS
- Each preview needs to be registered in auth service
- Useful for testing before production deploy

## Package Exports

```typescript
// Main exports
export { useTeamworkAuth } from './hooks/useTeamworkAuth';
export { Login } from './components/Login';
export { AuthProvider } from './components/AuthProvider';

// Type exports
export type { User, TeamworkAuthConfig } from './types';
```

## Dependencies

### Peer Dependencies (Required)
```json
{
  "react": ">=16.8.0",
  "react-dom": ">=16.8.0",
  "react-router-dom": ">=6.0.0"
}
```

Your app must have these installed.

### Package Dependencies
- `@teamwork/login-button`: Official Teamwork login component
- `buffer`: Browser polyfill
- `process`: Browser polyfill

## Version Compatibility

- **v2.0.x**: Latest, with dual-token architecture and domain authentication
- **v1.x**: Legacy, deprecated

Always use the latest v2.x version for new projects.

## When NOT to Use This Package

This package is specifically for Maven Marketing apps that:
1. Use Teamwork for authentication
2. Are part of the Maven ecosystem (*.mavenmm.com)
3. Need centralized SSO across multiple apps

**Don't use this if:**
- You need a different OAuth provider
- You want standalone authentication (not centralized)
- Your app isn't part of Maven Marketing

## Support & Troubleshooting

### Debugging Steps

1. **Check auth service logs:**
   ```bash
   # Local development
   # Logs appear in terminal where you ran: netlify dev --port 9100
   ```

2. **Check browser console:**
   - Look for error messages
   - Check Network tab for failed requests
   - Verify cookies in Application → Cookies

3. **Verify environment variables:**
   ```bash
   console.log(import.meta.env.VITE_CLIENT_ID);
   console.log(import.meta.env.VITE_DOMAIN_KEY);
   ```

4. **Check auth service URL:**
   ```tsx
   const { authServiceUrl } = useTeamworkAuth();
   console.log('Using auth service:', authServiceUrl);
   ```

### Getting Help

For issues with the package:
1. Check this CLAUDE.md file
2. Check README.md for general usage
3. Check auth service logs for backend errors
4. Verify environment variables are correct
5. Contact Maven DevOps team for domain key issues

## Example Implementation

```tsx
import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useTeamworkAuth, Login } from '@mavenmm/teamwork-auth';

function ProtectedApp() {
  const { user, isAuthenticated, loading, logout } = useTeamworkAuth();

  if (loading) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <h2>Loading...</h2>
        <p>Checking authentication status...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <h1>Welcome to Maven App</h1>
        <p>Please sign in with your Teamwork account:</p>
        <Login
          clientID={import.meta.env.VITE_CLIENT_ID}
          redirectURI={import.meta.env.VITE_REDIRECT_URI}
        />
      </div>
    );
  }

  return (
    <div>
      <header>
        <h1>Welcome, {user?.firstName}!</h1>
        <button onClick={logout}>Logout</button>
      </header>
      <main>
        {/* Your app content here */}
      </main>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/*" element={<ProtectedApp />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
```

## Migrating Existing Apps to v2.0

### Quick Migration Checklist

If you're migrating an existing Maven app to use this centralized auth:

**1. Install Package**
```bash
npm install @mavenmm/teamwork-auth
```

**2. Add Environment Variables**
```bash
# For localhost development:
VITE_CLIENT_ID=<your_teamwork_client_id>
VITE_REDIRECT_URI=http://localhost:3000  # Match your dev port
VITE_DOMAIN_KEY=dev_localhost_shared

# For production (get from DevOps):
VITE_DOMAIN_KEY=<unique_production_key>
```

**3. Register Your Domain** (Production Only)
Contact DevOps to add your domain to `functions/config/domains.ts`:
- Production: `https://your-app.mavenmm.com`
- Staging: `https://your-app.netlify.app`

**4. Update Your App Code**
```tsx
import { useTeamworkAuth, Login } from '@mavenmm/teamwork-auth';

function App() {
  const { user, isAuthenticated, loading, logout } = useTeamworkAuth();

  if (loading) return <div>Loading...</div>;

  if (!isAuthenticated) {
    return <Login
      clientID={import.meta.env.VITE_CLIENT_ID}
      redirectURI={window.location.origin}
    />;
  }

  return <div>Welcome {user?.firstName}! <button onClick={logout}>Logout</button></div>;
}
```

**5. Start Local Auth Service** (Development Only)
```bash
# Clone auth service repo
git clone <auth-service-repo>
cd <auth-service-repo>

# Set up .env with DEV_KEY=dev_localhost_shared
netlify dev --port 9100
```

**6. Test Authentication Flow**
- Clear browser cookies and localStorage
- Start your app (should auto-detect `localhost:9100`)
- Click login, authenticate with Teamwork
- Verify user data loads correctly
- Test logout and re-login

**7. Common Migration Issues**

| Problem | Solution |
|---------|----------|
| "Invalid domain key" | Use `dev_localhost_shared` for localhost, not port-specific keys |
| Cookies not persisting | Clear all cookies/localStorage and login fresh |
| User data is null | Hook auto-fetches from `/user` endpoint (v2.0.4+) - verify it's deployed |
| "Auth service unreachable" | Start local auth service on port 9100 |
| CORS errors | Verify your origin is in `functions/config/domains.ts` |
| 401 on Teamwork OAuth | Ensure `VITE_REDIRECT_URI` is registered in Teamwork OAuth app settings |

**8. Verify Production Deployment**
Before deploying to production:
- ✅ Domain registered in auth service
- ✅ `VITE_DOMAIN_KEY` env var set (production value)
- ✅ `VITE_CLIENT_ID` env var set
- ✅ `VITE_REDIRECT_URI` set to production URL
- ✅ Auth service `/user` endpoint deployed
- ✅ Test login/logout flow in staging first

### Migration from v1.x

If migrating from v1.x to v2.x:

1. **Update package:**
   ```bash
   npm install @mavenmm/teamwork-auth@latest
   ```

2. **Add required environment variables:**
   - Add `VITE_DOMAIN_KEY` (required in v2.0)
   - For localhost: `dev_localhost_shared`
   - For production: Get from DevOps

3. **Remove manual authServiceUrl config:**
   - v2.0 auto-detects environment (localhost/production/staging)
   - No need to manually specify auth service URL

4. **Clear old auth data:**
   ```tsx
   // In your migration code or manually in browser console:
   localStorage.clear();
   // Also clear cookies in browser DevTools
   ```

5. **Update auth service:**
   - Must use v2.0 auth service with domain authentication
   - Contact DevOps to register your domain

6. **Test thoroughly:**
   - Test localhost development flow
   - Test staging deployment
   - Test production deployment
   - Verify user data persistence across page refreshes

See MIGRATION_V2.md in the auth service repo for detailed migration guide.

---

**Last Updated:** v2.0.4
**Package:** @mavenmm/teamwork-auth
**Auth Service:** auth.mavenmm.com (v2.0)

## Changelog

### v2.0.4 (Latest)
- ✅ Added `/user` endpoint to fetch user data from auth service
- ✅ Automatic user data fetching when localStorage is empty
- ✅ User data survives localStorage being cleared
- ✅ Fresh user data from Teamwork API on demand

### v2.0.3
- Added CLAUDE.md for AI assistant discoverability
- Bug fixes for duplicate login prevention
- Improved user data handling

### v2.0.0-2.0.2
- Dual-token architecture (access + refresh tokens)
- Domain authentication keys
- Token rotation and blacklisting
- Auto-refresh before expiry
- Zero-config environment detection
