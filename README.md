# Teamwork SSO Package 🚀

A simple React package for Teamwork authentication using Vite+React+Netlify Functions with subdomain cookie sharing support.

## Installation

```bash
npm install @mavenmm/teamwork-netlify-react-sso @teamwork/login-button react-router-dom
```

## Available Exports

```tsx
// React Components & Hooks
import { AuthProvider, useAuthContext, useTeamworkSSO, Login } from '@mavenmm/teamwork-netlify-react-sso';

// Middleware (for custom Netlify Functions)
import { validate } from '@mavenmm/teamwork-netlify-react-sso';

// Netlify Function Creators
import { createLoginHandler, createLogoutHandler, createCheckAuthHandler } from '@mavenmm/teamwork-netlify-react-sso/netlify';
```

**Requirements:**
- React Router DOM v6+ (peer dependency)
- For Vite projects: Make sure you have Vite installed as a dev dependency

```bash
npm install --save-dev vite  # For Vite projects
```

## Quick Start

### 1. React Components (Frontend)

**Option A: Using AuthProvider (Recommended)**
```tsx
import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider, useAuthContext } from '@mavenmm/teamwork-netlify-react-sso';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/*" element={<AuthenticatedApp />} />
      </Routes>
    </BrowserRouter>
  );
}

// AuthProvider must be inside Router context (inside a Route element)
function AuthenticatedApp() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/home" element={<Dashboard />} />
        <Route path="/profile" element={<Profile />} />
        {/* Your other routes */}
      </Routes>
    </AuthProvider>
  );
}

function Dashboard() {
  const { user, loading, isAuthenticated, logout } = useAuthContext();

  if (loading) {
    return <div>Loading...</div>;
  }

  // AuthProvider handles login flow automatically
  // When not authenticated, it shows <Login /> component
  // When authenticated, it shows your children components

  return (
    <div>
      <h1>Welcome, {user?.firstName}!</h1>
      <button onClick={logout}>Logout</button>
    </div>
  );
}
```

**Option B: Using the hook directly**
```tsx
import React from 'react';
import { useTeamworkSSO, Login } from '@mavenmm/teamwork-netlify-react-sso';

function App() {
  const { user, loading, isAuthenticated, logout } = useTeamworkSSO();

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!isAuthenticated) {
    return <Login />;
  }

  return (
    <div>
      <h1>Welcome, {user?.firstName}!</h1>
      <button onClick={logout}>Logout</button>
    </div>
  );
}
```

### 2. Netlify Functions (Backend)

Copy the functions from `node_modules/@mavenmm/teamwork-netlify-react-sso/netlify/functions/` to your `netlify/functions/` directory:

```bash
# Copy the functions to your project
cp -r node_modules/@mavenmm/teamwork-netlify-react-sso/netlify/functions/* netlify/functions/
```

Or create them manually:
- `tw-login.ts` - Handles Teamwork OAuth callback
- `tw-logout.ts` - Handles logout and cookie clearing  
- `tw-check-auth.ts` - Validates authentication status

### 3. Environment Variables

```env
# Teamwork OAuth credentials (Server-side for Netlify Functions)
TEAMWORK_CLIENT_ID=your_teamwork_client_id
TEAMWORK_CLIENT_SECRET=your_teamwork_client_secret
TEAMWORK_REDIRECT_URI=https://yourapp.netlify.app/

# For React app (Client-side with Vite)
VITE_TEAMWORK_CLIENT_ID=your_teamwork_client_id
VITE_TEAMWORK_CLIENT_SECRET=your_teamwork_client_secret
VITE_TEAMWORK_REDIRECT_URI=https://yourapp.netlify.app/

# Optional: Cookie domain for subdomain sharing
VITE_COOKIE_DOMAIN=.mavenmm.com
```

## Cookie Domain Configuration 🍪

For subdomain sharing (e.g., sharing auth between `app.mavenmm.com` and `admin.mavenmm.com`):

```bash
# In your .env file
VITE_COOKIE_DOMAIN=.mavenmm.com
```

This allows the authentication cookie to work across all `*.mavenmm.com` subdomains.

**Behavior:**
- **Localhost**: No domain set (works with any localhost port)
- **Production with VITE_COOKIE_DOMAIN**: Cookie shared across subdomains
- **Production without VITE_COOKIE_DOMAIN**: Cookie only works on exact domain

## Features

- 🔐 **Teamwork OAuth** - Uses official Teamwork login button
- 🍪 **Cookie-based Auth** - Secure authentication with HttpOnly cookies
- 🌐 **Subdomain Support** - Configurable cookie sharing across subdomains
- 🔄 **Auto-redirect** - Smart redirect handling between apps
- 📱 **TypeScript** - Full type safety
- ⚡ **Netlify Functions** - Ready-to-use serverless auth handlers
- 🎯 **Vite Optimized** - Built specifically for Vite+React+Netlify stack

## Important Notes 📝

**Router Requirement**: The `AuthProvider` uses React Router hooks (`useNavigate`, `useLocation`) and must be placed inside a Router context. Specifically, it should be inside a Route element, not as a direct child of `<Router>`.

**Environment Variables**: You need both client-side (`VITE_*`) and server-side variables. The client-side variables are for React components, and server-side variables are for Netlify Functions.

## API Reference

### React Components

#### `useTeamworkSSO()`

```tsx
const {
  user,           // User | null
  setUser,        // (user: User | null) => void
  loading,        // boolean
  isAuthenticated, // boolean
  login,          // (code: string) => Promise<{twUser: User}>
  logout          // () => Promise<void>
} = useTeamworkSSO();
```

#### `<Login>`

```tsx
<Login />  // Uses environment variables for configuration
```

### Netlify Functions

#### `POST /api/tw-login`
- **Headers**: `code` (OAuth authorization code)
- **Response**: `{ twUser: User }`
- **Sets**: `tw_auth_token` cookie

#### `GET /api/tw-logout`
- **Response**: `{ success: true }`
- **Clears**: `tw_auth_token` cookie

#### `GET /api/tw-check-auth`
- **Response**: `{ authenticated: boolean, _id?: string }`
- **Validates**: `tw_auth_token` cookie

### Types

```tsx
interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  avatar: string;
  company: {
    id: number;
    name: string;
    logo: string;
  };
}
```

## Development

This package is designed to work with your existing Maven SSO infrastructure. Make sure you have:

1. Teamwork OAuth app configured
2. Netlify Functions deployed
3. Proper CORS and cookie settings
4. Environment variables set

## Example Project Structure

```
your-app/
├── netlify/
│   └── functions/
│       ├── tw-login.ts      # From this package
│       ├── tw-logout.ts     # From this package
│       └── tw-check-auth.ts # From this package
├── src/
│   ├── providers/
│   │   └── AuthProvider.tsx # Your custom provider
│   └── App.tsx
└── .env
```

---

Made with ❤️ by Maven Marketing 