# Migration Guide: v1 → v2 (High Security Architecture)

## Overview

Version 2.0 introduces a **high-security dual-token architecture** with explicit domain whitelisting and authentication keys. This migration is **required** for production deployment.

### Key Changes

1. **Dual-token strategy**: 15-minute access tokens + 7-day refresh tokens
2. **Domain authentication keys**: Each domain requires a unique secret key
3. **Explicit whitelisting**: Both `*.mavenmm.com` and `*.netlify.app` domains must be registered
4. **Token rotation**: Refresh tokens are single-use
5. **Rate limiting**: Protection against brute force attacks
6. **Enhanced security headers**: Including CSP

---

## Breaking Changes

### 1. Response Format Changed

**v1 (Old):**
```json
{
  "twUser": {...},
  "twStatus": "...",
  "redirectTo": "..."
}
```

**v2 (New):**
```json
{
  "accessToken": "eyJhbG...",  // NEW: 15-minute token
  "expiresIn": 900,
  "tokenType": "Bearer",
  "user": {...},
  "redirectTo": "..."
}
```

### 2. Authentication Method Changed

**v1:** HttpOnly cookie only
**v2:** Access token in Authorization header + refresh token in httpOnly cookie

**Old way:**
```javascript
fetch('/api/data', {
  credentials: 'include' // Cookie sent automatically
})
```

**New way:**
```javascript
const { getAccessToken } = useTeamworkAuth();

fetch('/api/data', {
  headers: {
    'Authorization': `Bearer ${getAccessToken()}`,
  },
  credentials: 'include' // Still needed for refresh token
})
```

### 3. Domain Key Required

All requests must include `X-Domain-Key` header:

```javascript
// Old - no key needed
fetch(authUrl, {
  headers: { 'Content-Type': 'application/json' }
})

// New - key required
fetch(authUrl, {
  headers: {
    'Content-Type': 'application/json',
    'X-Domain-Key': process.env.VITE_DOMAIN_KEY
  }
})
```

---

## Migration Steps

### Step 1: Register Your Domain

Add your domain to [functions/config/domains.ts](functions/config/domains.ts):

```typescript
{
  domain: 'https://your-app.mavenmm.com',
  domainKey: process.env.DOMAIN_KEY_YOUR_APP || 'dmk_dev_your_app',
  environment: 'production',
  active: true,
  description: 'Your application description',
  registeredAt: new Date().toISOString(),
}
```

### Step 2: Generate Domain Key

```bash
# Generate a secure random key
node -e "console.log('dmk_' + require('crypto').randomBytes(32).toString('hex'))"

# Example output:
# dmk_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6
```

### Step 3: Update Environment Variables

**Auth Service** (`auth-service/.env`):
```bash
# Add domain keys for each registered domain
DOMAIN_KEY_APP1=dmk_production_app1_key_here
DOMAIN_KEY_ADMIN=dmk_production_admin_key_here
DOMAIN_KEY_DASHBOARD=dmk_production_dashboard_key_here

# Optional: JWT refresh secret (separate from JWT_KEY)
JWT_REFRESH_KEY=your_separate_refresh_secret_here
```

**Your Application** (`.env`):
```bash
# Add your domain-specific key
VITE_DOMAIN_KEY=dmk_production_app1_key_here
```

### Step 4: Update Frontend Code

**Old code:**
```typescript
const { user, isAuthenticated, logout } = useTeamworkAuth();
```

**New code:**
```typescript
const { user, isAuthenticated, logout, getAccessToken } = useTeamworkAuth({
  domainKey: import.meta.env.VITE_DOMAIN_KEY
});

// Use access token for API calls
const makeAPICall = async () => {
  const token = getAccessToken();
  const response = await fetch('https://api.example.com/data', {
    headers: {
      'Authorization': `Bearer ${token}`,
      'X-Domain-Key': import.meta.env.VITE_DOMAIN_KEY,
    },
    credentials: 'include', // For refresh token cookie
  });
};
```

### Step 5: Handle Token Refresh

The `useTeamworkAuth` hook now **automatically refreshes** tokens 1 minute before expiry. No manual intervention needed!

However, if you make API calls outside the hook, handle 401 responses:

```typescript
const makeAPICall = async (url: string) => {
  let token = getAccessToken();

  const response = await fetch(url, {
    headers: { 'Authorization': `Bearer ${token}` },
    credentials: 'include',
  });

  // If token expired, hook will auto-refresh
  if (response.status === 401) {
    // Wait a moment for auto-refresh to complete
    await new Promise(resolve => setTimeout(resolve, 1000));
    token = getAccessToken();

    // Retry with new token
    return fetch(url, {
      headers: { 'Authorization': `Bearer ${token}` },
      credentials: 'include',
    });
  }

  return response;
};
```

---

## Testing Your Migration

### 1. Test Domain Registration

```bash
curl -X POST https://auth.mavenmm.com/.netlify/functions/login \
  -H "Origin: https://your-app.mavenmm.com" \
  -H "X-Domain-Key: your_domain_key" \
  -H "code: test_oauth_code"

# Should return 403 if domain not registered
# Should return 403 if domain key invalid
# Should return access token if successful
```

### 2. Test Token Refresh

```bash
# After login, test refresh endpoint
curl -X POST https://auth.mavenmm.com/.netlify/functions/refresh \
  -H "Origin: https://your-app.mavenmm.com" \
  -H "X-Domain-Key: your_domain_key" \
  -H "Cookie: maven_refresh_token=your_refresh_token" \
  --cookie-jar cookies.txt

# Should return new access token
```

### 3. Test CheckAuth

```bash
curl https://auth.mavenmm.com/.netlify/functions/checkAuth \
  -H "Origin: https://your-app.mavenmm.com" \
  -H "X-Domain-Key: your_domain_key" \
  -H "Authorization: Bearer your_access_token"

# Should return { authenticated: true, userId: "...", expiresAt: ... }
```

### 4. Test Rate Limiting

```bash
# Rapid fire 20 login attempts
for i in {1..20}; do
  curl -X POST https://auth.mavenmm.com/.netlify/functions/login \
    -H "Origin: https://your-app.mavenmm.com" \
    -H "X-Domain-Key: your_domain_key" \
    -H "code: test_$i"
done

# After 10 attempts, should return 429 Too Many Requests
```

---

## Environment-Specific Configuration

### Development (localhost)

```bash
# .env.local
VITE_DOMAIN_KEY=dev_localhost_3000
```

The domain key for localhost is less critical since it's not exposed publicly. Use the same key across all developers.

### Staging (*.netlify.app)

Each Netlify preview URL needs to be registered:

```typescript
// functions/config/domains.ts
{
  domain: 'https://staging-abc123.netlify.app',
  domainKey: process.env.DOMAIN_KEY_STAGING || 'dmk_staging_default',
  environment: 'staging',
  active: true,
}
```

**Problem**: Netlify generates random URLs for each deploy.

**Solution**: Use a shared staging key for all `*.netlify.app` domains:

```typescript
// In validateDomain.ts, add fallback:
if (hostname.endsWith('.netlify.app') && !domainConfig) {
  // Check for wildcard staging key
  const stagingKey = process.env.DOMAIN_KEY_NETLIFY_STAGING;
  if (stagingKey && providedKey === stagingKey) {
    return { valid: true };
  }
}
```

### Production (*.mavenmm.com)

Each production subdomain requires a unique key:

```bash
# auth-service/.env (production)
DOMAIN_KEY_APP1=dmk_prod_a1b2c3...
DOMAIN_KEY_ADMIN=dmk_prod_d4e5f6...
DOMAIN_KEY_DASHBOARD=dmk_prod_g7h8i9...
```

---

## Security Checklist

Before deploying to production:

- [ ] All production domains registered in `domains.ts`
- [ ] Unique domain keys generated for each production domain
- [ ] Domain keys stored in environment variables (NOT in code)
- [ ] `JWT_REFRESH_KEY` set (separate from `JWT_KEY`)
- [ ] Rate limiting tested
- [ ] CSP headers verified (check browser console)
- [ ] CORS working for all registered domains
- [ ] Token rotation working (check logs)
- [ ] Logout blacklisting tokens (check logs)

---

## Rollback Plan

If you need to rollback to v1:

1. Restore old hook: `mv teamwork-auth/src/hooks/useTeamworkAuth.old.ts teamwork-auth/src/hooks/useTeamworkAuth.ts`
2. Deploy old functions (backup before migration!)
3. Clear all user sessions: Users must re-login

**Note**: v1 and v2 tokens are **not compatible**. All users must re-authenticate after migration or rollback.

---

## Performance Impact

### Token Sizes

- **v1**: Single JWT (~500 bytes in cookie)
- **v2**: Access token (~300 bytes in memory) + refresh token (~600 bytes in cookie)

**Impact**: Minimal - access token not sent with every request.

### Request Overhead

- **v1**: No extra headers
- **v2**: +1 header (`X-Domain-Key`: ~50 bytes)

**Impact**: Negligible - ~50 bytes per request.

### Auto-Refresh

- **v1**: No refresh (token valid for 2 weeks)
- **v2**: Auto-refresh every 14 minutes

**Impact**: +1 request per 14 minutes per user. For 1000 concurrent users = ~1 req/sec to refresh endpoint.

---

## FAQ

### Q: Can I use the same domain key for multiple domains?

**A: No.** Each domain must have a unique key for security. Sharing keys defeats the purpose of domain authentication.

### Q: What happens if my domain key leaks?

**A:**
1. Generate a new key immediately
2. Update environment variables in auth service and your app
3. Deploy both services
4. Old key becomes invalid immediately
5. Users must re-login

### Q: How do I handle mobile apps?

**A:** Mobile apps should:
1. Use a dedicated domain key (e.g., `dmk_mobile_ios`)
2. Register their app identifier as "domain" (e.g., `app://com.mavenmm.ios`)
3. Store access token securely (iOS Keychain, Android Keystore)
4. Handle token refresh in background

### Q: Can I increase access token lifetime?

**A:** Yes, but not recommended. Edit `functions/utils/tokenManager.ts`:

```typescript
const ACCESS_TOKEN_EXPIRY = 60 * 60; // 1 hour instead of 15 minutes
```

**Trade-off**: Longer lifetime = more time for attacker if token compromised.

### Q: Do I need Redis for production?

**A:** Not required, but **strongly recommended** for:
- Token blacklist (currently in-memory, lost on restart)
- Rate limiting (currently in-memory, per-instance)

With Redis:
- Blacklisted tokens persist across restarts
- Rate limits work across multiple Netlify instances

---

## Support

If you encounter issues during migration:

1. Check auth service logs: `netlify dev` locally or Netlify dashboard for production
2. Check browser console for frontend errors
3. Verify environment variables are loaded: `console.log(import.meta.env.VITE_DOMAIN_KEY)`
4. Test with curl commands (see Testing section above)

**Security issues**: security@mavenmm.com

---

## Next Steps

After successful migration:

1. **Monitor**: Watch auth service logs for security events
2. **Rotate keys**: Schedule quarterly domain key rotation
3. **Audit**: Review registered domains monthly
4. **Implement Redis**: For production-grade token blacklist and rate limiting
5. **Set up alerts**: Monitor for rate limit violations and suspicious activity
