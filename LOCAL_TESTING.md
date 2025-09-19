# 🧪 Local Testing Guide

This guide helps you test the Teamwork Auth package locally before deployment.

## 🚀 Quick Start

**TL;DR - Get testing in 3 commands:**
```bash
# 1. Set up auth service
cd auth-service && cp .env.example .env
# Edit .env with your Teamwork credentials, then:

# 2. Install dependencies and start everything
cd .. && npm install && npm run test:local

# 3. Visit http://localhost:3000 and test!
```

## 📋 Prerequisites

1. **Teamwork OAuth App**: You need Teamwork OAuth credentials
2. **Node.js**: Version 16+
3. **Single Terminal**: New script runs both services

## 🔧 Step 1: Configure Auth Service

### 1.1 Set up environment variables
```bash
cd auth-service/
cp .env.example .env
```

### 1.2 Edit `.env` file with your Teamwork credentials:
```bash
# Get these from https://developer.teamwork.com/
VITE_CLIENT_ID=your_actual_teamwork_client_id
VITE_CLIENT_SECRET=your_actual_teamwork_client_secret
VITE_REDIRECT_URI=http://localhost:3000

# Generate a random string for JWT secret
JWT_KEY=some_random_secret_string_for_jwt

# Optional - for development
DEV_ID=local_testing
```

### 1.3 Configure Teamwork OAuth App:
In your Teamwork OAuth app settings:
- **Redirect URI**: `http://localhost:3000`
- This should point to your frontend app, NOT the auth service

### 1.4 Install dependencies and start auth service
```bash
npm install
npm run dev
```

✅ **Auth service should be running at: `http://localhost:8888`**

## 🚀 Step 2: Start Everything with One Command

### Option A: Start Both Services at Once (Recommended)
```bash
# Install concurrently dependency first
npm install

# Start both auth service and test app
npm run test:local
```

This will:
1. Build the package
2. Start auth service at `localhost:8888`
3. Start test app at `localhost:3000`

### Option B: Manual Setup (Alternative)
If you prefer to run them separately:

```bash
# Terminal 1: Auth Service
cd auth-service/
npm install && npm run dev

# Terminal 2: Test App
npm run build
cd test-app/
npm install && npm run dev
```

✅ **Both services should be running:**
- **Auth service**: `http://localhost:8888`
- **Test app**: `http://localhost:3000`

## 🎯 Step 3: Test Authentication Flow

1. **Visit test app**: Go to `http://localhost:3000`
2. **See login screen**: Should show "Please log in with your Teamwork account"
3. **Click login button**: Uses `@teamwork/login-button` component
4. **Teamwork OAuth**: You'll be redirected to Teamwork for authentication
5. **OAuth callback**: After login, Teamwork redirects back to `localhost:3000?code=...`
6. **Frontend processes code**: Test app detects the code and sends it to auth service
7. **See success screen**: Should show your user info and company details
8. **Test logout**: Click logout button to clear auth

### 🔄 OAuth Flow Details:
1. **Frontend** → Click login → Teamwork OAuth
2. **Teamwork** → Redirect to `localhost:3000?code=ABC123`
3. **Frontend** → Extract code from URL → Send to auth service at `localhost:8888/functions/login`
4. **Auth Service** → Exchange code for token → Set cookie → Return user data
5. **Frontend** → Receive user data → Show authenticated state

## 🔍 Step 4: Verify Integration

### What to check:
- ✅ Login button appears correctly
- ✅ Redirects to Teamwork for authentication
- ✅ Returns to app after successful login
- ✅ User data displays correctly (name, email, company)
- ✅ Logout clears authentication
- ✅ Refresh page maintains auth state

### Browser Network Tab:
- ✅ Calls to `localhost:8888/functions/login`
- ✅ Calls to `localhost:8888/functions/checkAuth`
- ✅ Calls to `localhost:8888/functions/logout`

## 🐛 Troubleshooting

### Auth Service Issues:
```bash
# Check auth service logs
cd auth-service/
npm run dev
# Look for CORS, environment, or Teamwork API errors
```

### Common Problems:

**1. CORS Errors:**
- Check that test app runs on `localhost:3000`
- Auth service should allow localhost origins

**2. Environment Variables:**
- Verify `.env` file exists in `auth-service/`
- Check Teamwork OAuth credentials are correct
- Ensure `VITE_REDIRECT_URI=http://localhost:3000` (points to frontend, not auth service)
- Verify Teamwork OAuth app redirect URI is set to `http://localhost:3000`

**3. Login Not Working:**
- Check browser console for errors
- Verify Teamwork OAuth app is configured correctly
- Ensure redirect URI in Teamwork matches `.env` file

**4. Authentication Check Fails:**
- Check cookies in browser dev tools
- Look for `maven_auth_token` cookie
- Verify JWT_KEY is set in auth service

## ✅ Success Criteria

Before deploying, verify:
- [ ] Auth service starts without errors
- [ ] Test app can connect to auth service
- [ ] Login flow completes successfully
- [ ] User data displays correctly
- [ ] Logout works and clears state
- [ ] Page refresh maintains authentication
- [ ] No console errors in browser

## 🚀 Ready for Deployment?

Once local testing passes:
1. Deploy auth service to Netlify with domain `auth.mavenmm.com`
2. Update Teamwork OAuth redirect URI to production URL
3. Publish npm package `@mavenmm/teamwork-auth` v2.0.0
4. Update your apps to use the new package

## 📞 Need Help?

If you encounter issues:
1. Check browser console for errors
2. Check auth service logs
3. Verify environment variables
4. Test Teamwork OAuth credentials separately