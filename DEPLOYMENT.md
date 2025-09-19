# 🚀 Deployment Guide

Complete guide for deploying the Maven Marketing centralized authentication system.

## Overview

This deployment consists of two components:
1. **Auth Service** (`auth-service/`) → Deploy to `auth.mavenmm.com`
2. **NPM Package** (`src/`) → Publish to npm as `@mavenmm/teamwork-auth`

## Prerequisites

- [x] **Netlify Account** with domain access
- [x] **Teamwork OAuth App** configured
- [x] **npm Account** with publish rights to `@mavenmm` scope
- [x] **DNS Control** for `mavenmm.com` domain

## Phase 1: Auth Service Deployment

### 1.1 Netlify Site Setup

```bash
# 1. Connect repository to Netlify
# - Go to Netlify Dashboard
# - Click "New site from Git"
# - Connect this repository
# - Set build directory to: auth-service/
```

### 1.2 Netlify Configuration

Create `netlify.toml` in auth-service directory:

```toml
[build]
  publish = "functions"
  functions = "functions"

[functions]
  node_bundler = "esbuild"

[[headers]]
  for = "/.netlify/functions/*"
  [headers.values]
    Access-Control-Allow-Origin = "https://*.mavenmm.com"
    Access-Control-Allow-Methods = "GET, POST, OPTIONS"
    Access-Control-Allow-Headers = "Content-Type, Authorization, code"
    Access-Control-Allow-Credentials = "true"
```

### 1.3 Environment Variables Setup

**In Netlify Dashboard → Site Settings → Environment Variables:**

```bash
# Teamwork OAuth Credentials (from developer.teamwork.com)
VITE_CLIENT_ID=your_production_teamwork_client_id
VITE_CLIENT_SECRET=your_production_teamwork_client_secret
VITE_REDIRECT_URI=https://app1.mavenmm.com  # Your main app URL

# JWT Secret (generate secure random string)
JWT_KEY=super_secure_jwt_secret_minimum_32_chars

# Production ID
PROD_ID=auth_mavenmm_production

# CORS Origins (comma-separated list of allowed origins)
ALLOWED_ORIGINS=https://app1.mavenmm.com,https://admin.mavenmm.com,https://dashboard.mavenmm.com
```

**⚠️ SECURITY NOTE**: Never commit these to git. Use Netlify's environment variable interface.

### 1.4 Domain Configuration

**In Netlify Dashboard → Domain management:**

1. **Custom Domain**: Add `auth.mavenmm.com`
2. **DNS Configuration**:
   ```
   CNAME auth.mavenmm.com -> your-site-name.netlify.app
   ```
3. **SSL Certificate**: Netlify auto-provisions Let's Encrypt certificate

### 1.5 Teamwork OAuth App Configuration

**In Teamwork Developer Portal:**

```bash
# Update OAuth app settings:
Redirect URIs:
- https://app1.mavenmm.com
- https://admin.mavenmm.com
- https://dashboard.mavenmm.com
# (Add all your Maven app domains)

Allowed Origins:
- https://*.mavenmm.com
```

### 1.6 Deploy Auth Service

```bash
# Push to main branch triggers automatic deployment
git add auth-service/
git commit -m "Deploy auth service to production"
git push origin main
```

**Verify deployment:**
- Visit `https://auth.mavenmm.com/.netlify/functions/checkAuth`
- Should return authentication error (expected - no auth token)
- Check Netlify deploy logs for any errors

## Phase 2: NPM Package Publication

### 2.1 Prepare Package for Publication

```bash
# 1. Update version in package.json
npm version patch  # or minor/major

# 2. Build package
npm run build

# 3. Run tests
npm test
npm run type-check

# 4. Test with local app
npm run test:local
```

### 2.2 Publish to npm

```bash
# Login to npm (one-time setup)
npm login

# Publish package
npm publish

# Verify publication
npm info @mavenmm/teamwork-auth
```

### 2.3 Update Package Documentation

Update README.md with production URLs:

```markdown
const authConfig = {
  authServiceUrl: 'https://auth.mavenmm.com',  // Production URL
  cookieDomain: '.mavenmm.com'
};
```

## Phase 3: Integration Testing

### 3.1 Test Authentication Flow

**Manual Testing Checklist:**

1. **Deploy Test App**:
   ```bash
   # Deploy test-app to test.mavenmm.com (or similar)
   cd test-app/
   # Update authServiceUrl to https://auth.mavenmm.com
   npm run build
   # Deploy to Netlify or similar
   ```

2. **Test OAuth Flow**:
   - [ ] Visit test app
   - [ ] Click login button
   - [ ] Redirected to Teamwork OAuth
   - [ ] Successful OAuth callback
   - [ ] User data displayed correctly
   - [ ] Logout clears authentication
   - [ ] Page refresh maintains auth state

3. **Test Cross-Subdomain Auth**:
   - [ ] Login on one subdomain (e.g., app1.mavenmm.com)
   - [ ] Visit another subdomain (e.g., admin.mavenmm.com)
   - [ ] Should be automatically authenticated
   - [ ] Logout from one clears auth on all

### 3.2 Security Verification

**Security Checklist:**

- [ ] **HTTPS Only**: All communications over HTTPS
- [ ] **Secure Cookies**: `secure=true` for production
- [ ] **HttpOnly Cookies**: Prevents XSS access
- [ ] **SameSite Cookies**: CSRF protection enabled
- [ ] **CORS Restricted**: Only allowed origins accepted
- [ ] **Token Expiry**: JWT tokens have 2-week expiry
- [ ] **No Token Exposure**: No tokens in browser console/logs

### 3.3 Performance Testing

```bash
# Test auth service performance
curl -w "@curl-format.txt" -s -o /dev/null \
  "https://auth.mavenmm.com/.netlify/functions/checkAuth"

# Expected: Response time < 500ms
```

## Phase 4: Production Integration

### 4.1 Update Existing Maven Apps

**For each Maven app (app1.mavenmm.com, admin.mavenmm.com, etc.):**

```bash
# 1. Install latest package
npm install @mavenmm/teamwork-auth@latest

# 2. Update auth configuration
const authConfig = {
  authServiceUrl: 'https://auth.mavenmm.com',
  cookieDomain: '.mavenmm.com'
};

# 3. Remove old auth code (if any)
# Delete old Netlify functions, auth middleware, etc.

# 4. Deploy updated app
npm run build
# Deploy to production
```

### 4.2 DNS and Certificate Verification

**Verify all Maven subdomains:**

```bash
# Check DNS resolution
dig auth.mavenmm.com
dig app1.mavenmm.com
dig admin.mavenmm.com

# Check SSL certificates
openssl s_client -connect auth.mavenmm.com:443 -servername auth.mavenmm.com
```

### 4.3 Monitor Deployment

**Post-deployment monitoring:**

1. **Netlify Analytics**: Monitor auth service usage
2. **Error Tracking**: Check Netlify function logs
3. **Performance**: Monitor response times
4. **Security**: Regular security audits

## Phase 5: Rollback Plan

**If deployment fails:**

### 5.1 Auth Service Rollback

```bash
# Revert to previous Netlify deployment
# In Netlify Dashboard → Deploys → Click previous deploy → "Publish deploy"
```

### 5.2 Package Rollback

```bash
# Unpublish problematic version (within 72 hours)
npm unpublish @mavenmm/teamwork-auth@2.0.0

# Or deprecate version
npm deprecate @mavenmm/teamwork-auth@2.0.0 "Use previous version due to issues"
```

### 5.3 App Rollback

```bash
# In each Maven app, revert to previous auth implementation
npm install @mavenmm/teamwork-auth@1.x.x
# Redeploy with old configuration
```

## Phase 6: Post-Deployment Tasks

### 6.1 Documentation Updates

- [ ] Update all Maven app READMEs with new auth instructions
- [ ] Create internal team documentation for new auth flow
- [ ] Update deployment procedures for new apps

### 6.2 Monitoring Setup

- [ ] Set up Netlify notifications for auth service downtime
- [ ] Configure error alerts for failed authentications
- [ ] Monitor usage patterns and performance metrics

### 6.3 Security Maintenance

- [ ] Schedule regular security audits (quarterly)
- [ ] Set up automated dependency updates
- [ ] Plan JWT secret rotation procedure

## Troubleshooting

### Common Deployment Issues

**1. CORS Errors**
```bash
# Check ALLOWED_ORIGINS environment variable
# Verify domain matches exactly (https://app1.mavenmm.com not app1.mavenmm.com)
```

**2. Authentication Failures**
```bash
# Check Teamwork OAuth app configuration
# Verify VITE_CLIENT_ID and VITE_CLIENT_SECRET are correct
# Confirm JWT_KEY is set and secure
```

**3. Cookie Issues**
```bash
# Verify cookie domain is set to .mavenmm.com
# Check that all apps are on *.mavenmm.com subdomains
# Confirm HTTPS is working on all domains
```

**4. Environment Variables Not Loading**
```bash
# In Netlify Dashboard, verify all env vars are set
# Check for typos in variable names
# Redeploy after env var changes
```

## Success Criteria

Deployment is successful when:

- [ ] Auth service responds at `https://auth.mavenmm.com`
- [ ] NPM package published successfully
- [ ] All Maven apps can authenticate through centralized service
- [ ] Cross-subdomain authentication works
- [ ] No security vulnerabilities detected
- [ ] Performance meets requirements (< 500ms auth checks)
- [ ] Error rates < 0.1%
- [ ] All existing functionality preserved

## Support

**If you encounter deployment issues:**

1. Check Netlify function logs first
2. Verify environment variables are correct
3. Test with curl commands to isolate issues
4. Review security checklist for common misconfigurations