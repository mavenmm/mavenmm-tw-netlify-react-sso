# 🔗 Integration Guide

Step-by-step guide for adding centralized authentication to any new Maven Marketing app.

## Overview

This guide shows how to integrate the `@mavenmm/teamwork-auth` package into any new Maven app (e.g., `app1.mavenmm.com`, `admin.mavenmm.com`, `dashboard.mavenmm.com`).

**What you get:**
- ✅ Complete authentication with zero backend code
- ✅ Automatic cross-subdomain SSO
- ✅ Secure token handling via `auth.mavenmm.com`
- ✅ User data from Teamwork API
- ✅ Session persistence and logout

## Prerequisites

- [x] **React App** (16.8+ with hooks)
- [x] **React Router DOM** (v6+)
- [x] **Subdomain** on `*.mavenmm.com`
- [x] **Auth Service** deployed at `auth.mavenmm.com`

## Step 1: Installation

```bash
# Install the authentication package
npm install @mavenmm/teamwork-auth

# Peer dependencies (if not already installed)
npm install react-router-dom
```

## Step 2: Basic Setup

### 2.1 Simple Hook Integration (Recommended)

```tsx
// src/App.tsx
import React from 'react';
import { useTeamworkAuth, Login } from '@mavenmm/teamwork-auth';

// Configuration for your app
const authConfig = {
  authServiceUrl: 'https://auth.mavenmm.com',  // Centralized auth service
  cookieDomain: '.mavenmm.com'                 // Enables SSO across subdomains
};

function App() {
  const { user, loading, isAuthenticated, logout } = useTeamworkAuth(authConfig);

  // Show loading spinner while checking authentication
  if (loading) {
    return <div>Loading...</div>;
  }

  // Show login screen if not authenticated
  if (!isAuthenticated) {
    return (
      <div>
        <h1>Welcome to {window.location.hostname}</h1>
        <Login />
      </div>
    );
  }

  // Show authenticated app
  return (
    <div>
      <header>
        <h1>Welcome, {user?.firstName}!</h1>
        <button onClick={logout}>Logout</button>
      </header>

      {/* Your app content here */}
      <main>
        <h2>Your App Content</h2>
        <p>User: {user?.email}</p>
        <p>Company: {user?.company?.name}</p>
      </main>
    </div>
  );
}

export default App;
```

### 2.2 Provider Pattern (Alternative)

If you prefer React Context pattern:

```tsx
// src/App.tsx
import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from '@mavenmm/teamwork-auth';
import Dashboard from './components/Dashboard';
import Profile from './components/Profile';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/*" element={<AuthenticatedApp />} />
      </Routes>
    </BrowserRouter>
  );
}

// AuthProvider must be inside Router context
function AuthenticatedApp() {
  return (
    <AuthProvider
      authServiceUrl="https://auth.mavenmm.com"
      cookieDomain=".mavenmm.com"
    >
      <Routes>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/profile" element={<Profile />} />
      </Routes>
    </AuthProvider>
  );
}
```

```tsx
// src/components/Dashboard.tsx
import React from 'react';
import { useAuthContext, Login } from '@mavenmm/teamwork-auth';

function Dashboard() {
  const { user, loading, isAuthenticated, logout } = useAuthContext();

  if (loading) return <div>Loading...</div>;

  if (!isAuthenticated) return <Login />;

  return (
    <div>
      <h1>Dashboard</h1>
      <p>Welcome, {user?.firstName}!</p>
      <button onClick={logout}>Logout</button>
    </div>
  );
}
```

## Step 3: TypeScript Integration

### 3.1 Type Definitions

```tsx
// src/types/auth.ts (optional - types are exported from package)
import type { User, TeamworkAuthConfig } from '@mavenmm/teamwork-auth';

// Use the built-in types
interface AppUser extends User {
  // Add any app-specific user properties here
}

interface AppConfig extends TeamworkAuthConfig {
  // Add any app-specific config here
  appName?: string;
}
```

### 3.2 Typed Component

```tsx
// src/App.tsx
import React from 'react';
import { useTeamworkAuth, type User } from '@mavenmm/teamwork-auth';

const authConfig = {
  authServiceUrl: 'https://auth.mavenmm.com',
  cookieDomain: '.mavenmm.com'
} as const;

function App(): JSX.Element {
  const {
    user,
    loading,
    isAuthenticated,
    logout
  } = useTeamworkAuth(authConfig);

  // TypeScript knows user is User | null
  const handleUserAction = (userData: User) => {
    console.log(`Action for user: ${userData.firstName}`);
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!isAuthenticated || !user) {
    return <Login />;
  }

  return (
    <div>
      <h1>Welcome, {user.firstName}!</h1>
      <button onClick={() => handleUserAction(user)}>
        Profile Action
      </button>
      <button onClick={logout}>Logout</button>
    </div>
  );
}
```

## Step 4: Advanced Patterns

### 4.1 Protected Route Component

```tsx
// src/components/ProtectedRoute.tsx
import React from 'react';
import { useTeamworkAuth, Login } from '@mavenmm/teamwork-auth';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: string;
}

const authConfig = {
  authServiceUrl: 'https://auth.mavenmm.com',
  cookieDomain: '.mavenmm.com'
};

export function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const { user, loading, isAuthenticated } = useTeamworkAuth(authConfig);

  if (loading) {
    return <div className="loading">Checking authentication...</div>;
  }

  if (!isAuthenticated) {
    return <Login />;
  }

  // Optional: Role-based access control
  if (requiredRole && user?.company?.name !== requiredRole) {
    return <div>Access denied. Required role: {requiredRole}</div>;
  }

  return <>{children}</>;
}
```

Usage:
```tsx
// src/App.tsx
import { ProtectedRoute } from './components/ProtectedRoute';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/public" element={<PublicPage />} />
        <Route
          path="/admin"
          element={
            <ProtectedRoute requiredRole="Admin">
              <AdminDashboard />
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
```

### 4.2 Auth Status Component

```tsx
// src/components/AuthStatus.tsx
import React from 'react';
import { useTeamworkAuth } from '@mavenmm/teamwork-auth';

const authConfig = {
  authServiceUrl: 'https://auth.mavenmm.com',
  cookieDomain: '.mavenmm.com'
};

export function AuthStatus() {
  const { user, isAuthenticated, logout } = useTeamworkAuth(authConfig);

  if (!isAuthenticated) {
    return null; // Don't show anything if not authenticated
  }

  return (
    <div className="auth-status">
      <img src={user?.avatar} alt="Avatar" className="avatar" />
      <span>{user?.firstName} {user?.lastName}</span>
      <span className="company">{user?.company?.name}</span>
      <button onClick={logout} className="logout-btn">
        Logout
      </button>
    </div>
  );
}
```

## Step 5: Environment Configuration

### 5.1 Development Environment

```bash
# .env.local (for local development)
VITE_AUTH_SERVICE_URL=http://localhost:9100
VITE_COOKIE_DOMAIN=undefined
```

### 5.2 Production Environment

```bash
# .env.production (for production builds)
VITE_AUTH_SERVICE_URL=https://auth.mavenmm.com
VITE_COOKIE_DOMAIN=.mavenmm.com
```

### 5.3 Environment-based Configuration

```tsx
// src/config/auth.ts
import type { TeamworkAuthConfig } from '@mavenmm/teamwork-auth';

const isDevelopment = import.meta.env.DEV;

export const authConfig: TeamworkAuthConfig = {
  authServiceUrl: isDevelopment
    ? 'http://localhost:9100'
    : 'https://auth.mavenmm.com',
  cookieDomain: isDevelopment
    ? undefined
    : '.mavenmm.com'
};
```

## Step 6: Deployment Configuration

### 6.1 Netlify Configuration

```toml
# netlify.toml
[build]
  publish = "dist"
  command = "npm run build"

[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options = "DENY"
    X-Content-Type-Options = "nosniff"
    Referrer-Policy = "strict-origin-when-cross-origin"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

### 6.2 Vercel Configuration

```json
// vercel.json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ],
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "X-Frame-Options", "value": "DENY" },
        { "key": "X-Content-Type-Options", "value": "nosniff" }
      ]
    }
  ]
}
```

## Step 7: Testing Your Integration

### 7.1 Local Testing

```bash
# 1. Start auth service (in separate terminal)
cd path/to/auth-service
npm run dev  # Runs on localhost:9100

# 2. Start your app
npm run dev  # Usually runs on localhost:3000 or localhost:5173

# 3. Test authentication flow
# - Visit your local app
# - Should see login button
# - Click login → redirects to Teamwork
# - After OAuth, should return to app with user data
```

### 7.2 Production Testing Checklist

Deploy your app and test:

- [ ] **Login Flow**: Click login → Teamwork OAuth → return with user data
- [ ] **User Data**: Name, email, company info display correctly
- [ ] **Session Persistence**: Refresh page maintains authentication
- [ ] **Cross-Subdomain SSO**: Login on one subdomain, visit another → automatically authenticated
- [ ] **Logout**: Logout clears authentication across all subdomains
- [ ] **Error Handling**: Network errors gracefully handled

## Step 8: Common Integration Patterns

### 8.1 API Calls with Authentication

```tsx
// src/hooks/useAuthenticatedFetch.ts
import { useTeamworkAuth } from '@mavenmm/teamwork-auth';

const authConfig = {
  authServiceUrl: 'https://auth.mavenmm.com',
  cookieDomain: '.mavenmm.com'
};

export function useAuthenticatedFetch() {
  const { isAuthenticated } = useTeamworkAuth(authConfig);

  const authenticatedFetch = async (url: string, options: RequestInit = {}) => {
    if (!isAuthenticated) {
      throw new Error('User not authenticated');
    }

    // Cookies are automatically sent with credentials: 'include'
    return fetch(url, {
      ...options,
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });
  };

  return { authenticatedFetch };
}
```

### 8.2 Conditional Rendering

```tsx
// src/components/ConditionalFeature.tsx
import React from 'react';
import { useTeamworkAuth } from '@mavenmm/teamwork-auth';

const authConfig = {
  authServiceUrl: 'https://auth.mavenmm.com',
  cookieDomain: '.mavenmm.com'
};

export function ConditionalFeature() {
  const { user, isAuthenticated } = useTeamworkAuth(authConfig);

  return (
    <div>
      {/* Public content - always visible */}
      <h1>Public Content</h1>

      {/* Authenticated content */}
      {isAuthenticated && (
        <div>
          <h2>Welcome back, {user?.firstName}!</h2>
          <p>Your company: {user?.company?.name}</p>
        </div>
      )}

      {/* Admin-only content */}
      {isAuthenticated && user?.company?.name === 'Maven Marketing' && (
        <div>
          <h2>Admin Features</h2>
          <button>Manage Users</button>
        </div>
      )}
    </div>
  );
}
```

## Troubleshooting

### Common Issues

**1. "User not authenticated" but should be logged in**
```bash
# Check cookie domain configuration
# Ensure app is on *.mavenmm.com subdomain
# Verify auth service is accessible
```

**2. Login button doesn't work**
```bash
# Check network tab for CORS errors
# Verify authServiceUrl is correct
# Ensure auth service is deployed and accessible
```

**3. Cross-subdomain SSO not working**
```bash
# Verify cookieDomain is set to '.mavenmm.com'
# Check that all apps are on proper subdomains
# Confirm cookie is being set with correct domain
```

**4. TypeScript errors**
```bash
npm install @types/react @types/react-dom @types/react-router-dom
```

## Next Steps

Once integrated:

1. **Customize UI**: Style the login/logout components to match your app
2. **Add Error Handling**: Implement proper error boundaries and fallbacks
3. **Performance**: Add loading states and optimize re-renders
4. **Analytics**: Track authentication events for monitoring
5. **Security**: Review and test security best practices

## Support

**If you encounter integration issues:**

1. Check the browser network tab for auth service requests
2. Verify your app is on a `*.mavenmm.com` subdomain
3. Ensure auth service is deployed and accessible
4. Review CORS configuration in auth service
5. Check browser console for JavaScript errors

**Package Documentation:**
- Main README: Usage examples and API reference
- SECURITY.md: Security best practices
- DEPLOYMENT.md: Auth service deployment guide