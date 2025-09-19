# 🔐 Security Documentation

Comprehensive security guide for Maven Marketing's centralized authentication system.

## Security Overview

This authentication system is designed with security-first principles to protect Maven Marketing's permanent Teamwork API tokens and user data across all applications.

### Security Architecture

```
┌─────────────────┐    HTTPS/WSS    ┌──────────────────┐    Teamwork API    ┌─────────────┐
│   Maven Apps    │ ◄──────────────► │   Auth Service   │ ◄─────────────────► │  Teamwork   │
│ (app1.mavenmm)  │   JWT Cookies    │ (auth.mavenmm)   │   Permanent Tokens  │             │
└─────────────────┘                  └──────────────────┘                     └─────────────┘
```

**Key Security Principles:**
- **Token Isolation**: Permanent Teamwork tokens never leave auth service
- **Zero Trust**: Every request validated with JWT tokens
- **Defense in Depth**: Multiple security layers (CORS, cookies, headers)
- **Least Privilege**: Apps only receive necessary user data

## Current Security Issues (CRITICAL - NEEDS FIXING)

### 🚨 HIGH PRIORITY FIXES REQUIRED

#### 1. Token Exposure in Logs
**File**: `auth-service/functions/middleware/validateCookies.ts:54`
```typescript
// 🚨 SECURITY ISSUE: Exposes access tokens in logs
console.log("Token: ", payload.access_token);
```

**Risk**: Permanent Teamwork API tokens logged to Netlify console
**Impact**: Critical - could lead to account compromise
**Fix**: Remove or redact token logging

#### 2. CORS Vulnerabilities
**File**: `auth-service/functions/checkAuth.ts:15-16`
```typescript
// 🚨 SECURITY ISSUE: Reflects any origin
const origin = event.headers.origin || "";
"Access-Control-Allow-Origin": origin,
```

**Risk**: Any website can make authenticated requests
**Impact**: High - enables CSRF and data exfiltration
**Fix**: Use explicit allowlist of Maven domains

#### 3. Insecure Cookie Configuration
**File**: `auth-service/functions/login.ts:96`
```typescript
// 🚨 SECURITY ISSUE: Insecure cookie settings
secure: false, // Should be true in production
sameSite: "lax", // Should be "strict" for CSRF protection
```

**Risk**: Cookie interception and CSRF attacks
**Impact**: Medium - session hijacking possible
**Fix**: Environment-based cookie security settings

#### 4. Environment Variable Exposure
**File**: `test-app/src/App.tsx:15-25`
```typescript
// 🚨 SECURITY ISSUE: Logs sensitive environment variables
console.log('VITE_CLIENT_SECRET:', import.meta.env.VITE_CLIENT_SECRET);
```

**Risk**: OAuth secrets exposed in browser console
**Impact**: High - enables OAuth app impersonation
**Fix**: Remove debug logging and move secrets server-side

## Security Best Practices Implementation

### 1. Token Security

#### Current Implementation
```typescript
// ✅ GOOD: JWT tokens with expiration
const jwtToken = jwt.sign(token, JWT_SECRET, {
  expiresIn: "2w",
});

// ✅ GOOD: HttpOnly cookies prevent XSS
httpOnly: true,
```

#### Required Improvements
```typescript
// 🔧 IMPROVE: Add token rotation
interface TokenPayload {
  _id: string;
  access_token: string;
  issued_at: number;      // Add timestamp
  refresh_token?: string; // Add refresh capability
}

// 🔧 IMPROVE: Shorter token lifespan
expiresIn: "1h",  // Instead of 2 weeks
```

### 2. Cookie Security

#### Production Cookie Configuration
```typescript
// 🔧 SECURE: Environment-based cookie settings
const cookieSettings = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production', // HTTPS only in prod
  sameSite: 'strict' as const,                   // CSRF protection
  domain: process.env.NODE_ENV === 'production'
    ? '.mavenmm.com'
    : undefined,
  path: '/',
  maxAge: 1 * 60 * 60 * 1000, // 1 hour instead of 2 weeks
};
```

### 3. CORS Security

#### Secure CORS Configuration
```typescript
// 🔧 SECURE: Explicit allowlist instead of reflection
const ALLOWED_ORIGINS = [
  'https://app1.mavenmm.com',
  'https://admin.mavenmm.com',
  'https://dashboard.mavenmm.com',
  // Add new Maven apps here
];

const origin = event.headers.origin || "";
const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : null;

if (!allowedOrigin) {
  return {
    statusCode: 403,
    body: JSON.stringify({ error: 'Origin not allowed' })
  };
}

// Use allowedOrigin instead of reflecting any origin
```

### 4. Environment Security

#### Secure Environment Variable Management
```bash
# 🔧 SECURE: Separate client and server variables

# Server-side only (auth-service/.env)
VITE_CLIENT_SECRET=secret_value          # Server only
JWT_KEY=super_secure_jwt_secret          # Server only
TEAMWORK_API_KEY=permanent_token         # Server only

# Client-safe variables (can be in frontend)
VITE_CLIENT_ID=public_client_id          # Public OAuth client ID
VITE_REDIRECT_URI=https://app.maven.com  # Public redirect URI
```

#### Frontend Configuration (No Secrets)
```typescript
// ✅ SECURE: No secrets in frontend config
const authConfig = {
  authServiceUrl: 'https://auth.mavenmm.com', // Public URL
  cookieDomain: '.mavenmm.com'                // Public domain
  // No client secrets or API keys!
};
```

## Security Headers Implementation

### Required Security Headers
```typescript
// 🔧 IMPLEMENT: Comprehensive security headers
const securityHeaders = {
  // HTTPS enforcement
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains; preload",

  // Content security
  "Content-Security-Policy": [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' https://*.teamwork.com",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https://*.teamwork.com",
    "connect-src 'self' https://*.mavenmm.com https://*.teamwork.com",
    "frame-ancestors 'none'"
  ].join("; "),

  // XSS protection
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "X-XSS-Protection": "1; mode=block",

  // Privacy
  "Referrer-Policy": "strict-origin-when-cross-origin",

  // Cache control for sensitive endpoints
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
  "Pragma": "no-cache",
  "Expires": "0"
};
```

## Input Validation & Sanitization

### Required Validations
```typescript
// 🔧 IMPLEMENT: Input validation for all endpoints
import joi from 'joi';

const loginSchema = joi.object({
  code: joi.string().alphanum().min(10).max(200).required(),
  maven_redirect_url: joi.string().uri().optional()
});

const validateInput = (data: any, schema: joi.ObjectSchema) => {
  const { error, value } = schema.validate(data);
  if (error) {
    throw new Error(`Invalid input: ${error.details[0].message}`);
  }
  return value;
};
```

### Sanitization
```typescript
// 🔧 IMPLEMENT: Sanitize all outputs
const sanitizeOutput = (data: any) => {
  if (typeof data === 'string') {
    return data.replace(/[<>\"'&]/g, (match) => {
      const entityMap = {
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
        '&': '&amp;'
      };
      return entityMap[match] || match;
    });
  }
  return data;
};
```

## Rate Limiting & DDoS Protection

### Implement Rate Limiting
```typescript
// 🔧 IMPLEMENT: Rate limiting by IP and user
const rateLimitMap = new Map<string, { count: number; lastReset: number }>();

const rateLimit = (identifier: string, limit: number, windowMs: number) => {
  const now = Date.now();
  const record = rateLimitMap.get(identifier) || { count: 0, lastReset: now };

  if (now - record.lastReset > windowMs) {
    record.count = 0;
    record.lastReset = now;
  }

  record.count++;
  rateLimitMap.set(identifier, record);

  if (record.count > limit) {
    throw new Error('Rate limit exceeded');
  }
};

// Usage in auth functions
const clientIP = event.headers['x-forwarded-for'] || event.headers['x-real-ip'];
rateLimit(clientIP, 10, 60000); // 10 requests per minute
```

## Audit Logging & Monitoring

### Security Event Logging
```typescript
// 🔧 IMPLEMENT: Security audit logging
interface SecurityEvent {
  timestamp: number;
  event: 'login' | 'logout' | 'auth_failure' | 'suspicious_activity';
  userId?: string;
  ip?: string;
  userAgent?: string;
  details?: any;
}

const logSecurityEvent = (event: SecurityEvent) => {
  // Log to external service (not console.log)
  // Consider: Datadog, CloudWatch, or security-focused logging service
  console.info('SECURITY_EVENT', JSON.stringify({
    ...event,
    timestamp: new Date(event.timestamp).toISOString()
  }));
};

// Usage
logSecurityEvent({
  timestamp: Date.now(),
  event: 'login',
  userId: user.id,
  ip: event.headers['x-forwarded-for'],
  userAgent: event.headers['user-agent']
});
```

### Monitoring Alerts
```typescript
// 🔧 IMPLEMENT: Security monitoring
const securityAlerts = {
  // Multiple failed login attempts
  FAILED_LOGIN_THRESHOLD: 5,

  // Unusual access patterns
  MULTIPLE_IPS_THRESHOLD: 3,

  // Token abuse
  TOKEN_REUSE_THRESHOLD: 10
};
```

## Incident Response

### Security Incident Procedures

#### 1. Token Compromise Response
```bash
# If Teamwork API tokens are compromised:

# Immediate actions:
1. Rotate JWT_KEY in auth service environment
2. Revoke compromised Teamwork API tokens
3. Generate new Teamwork OAuth credentials
4. Deploy updated auth service with new secrets
5. Force logout all users (invalidates all JWT tokens)

# Recovery actions:
1. Audit access logs for suspicious activity
2. Review all Maven apps for unauthorized access
3. Update security monitoring rules
4. Document incident and lessons learned
```

#### 2. Data Breach Response
```bash
# If user data is exposed:

# Immediate actions:
1. Identify scope of data exposure
2. Secure the vulnerability
3. Notify affected users
4. Document all actions taken

# Legal requirements:
1. GDPR notification (if EU users affected)
2. State breach notification laws (if US users)
3. Customer/partner notifications
```

### Emergency Contacts
```yaml
Security Team:
  - Primary: security@mavenmm.com
  - Secondary: cto@mavenmm.com

External Resources:
  - Teamwork Security: security@teamwork.com
  - Netlify Security: security@netlify.com
```

## Security Testing

### Automated Security Testing
```bash
# 🔧 IMPLEMENT: Security testing pipeline

# Dependency vulnerability scanning
npm audit --audit-level moderate

# SAST (Static Application Security Testing)
npx eslint-plugin-security

# Container security (if using Docker)
docker scan auth-service-image

# DAST (Dynamic testing) - run against deployed service
npm run security:test
```

### Manual Security Testing Checklist

#### Authentication Testing
- [ ] **SQL Injection**: Test all inputs with SQL injection payloads
- [ ] **XSS**: Test outputs for script injection
- [ ] **CSRF**: Verify CSRF tokens/headers required
- [ ] **Session Management**: Test logout, timeout, concurrent sessions
- [ ] **Authorization**: Test access control and privilege escalation

#### Infrastructure Testing
- [ ] **TLS Configuration**: Verify strong cipher suites, HSTS
- [ ] **DNS Security**: Test for subdomain takeover vulnerabilities
- [ ] **Endpoint Enumeration**: Scan for hidden/unprotected endpoints
- [ ] **Rate Limiting**: Verify rate limits work properly
- [ ] **Error Handling**: Ensure errors don't leak sensitive info

### Penetration Testing
```bash
# 🔧 SCHEDULE: Regular penetration testing

Frequency: Quarterly
Scope: All Maven authentication infrastructure
Requirements:
- Test from external perspective (no inside knowledge)
- Include social engineering components
- Test both technical and process vulnerabilities
- Provide detailed remediation recommendations
```

## Compliance & Regulations

### Data Protection
- **GDPR**: User consent, data portability, right to deletion
- **CCPA**: California user data protection requirements
- **SOX**: If handling financial data

### Industry Standards
- **OWASP Top 10**: Regular assessment against current threats
- **NIST Cybersecurity Framework**: Risk assessment and management
- **ISO 27001**: Information security management systems

## Security Checklist for Deployment

### Pre-Deployment Security Review
- [ ] All security issues from this document fixed
- [ ] No secrets in source code or logs
- [ ] CORS properly configured with allowlists
- [ ] Security headers implemented
- [ ] Rate limiting active
- [ ] Input validation on all endpoints
- [ ] Error messages don't leak information
- [ ] Audit logging configured
- [ ] Security monitoring alerts set up

### Post-Deployment Security Verification
- [ ] Penetration test passed
- [ ] Security headers verified (securityheaders.com)
- [ ] SSL configuration tested (ssllabs.com)
- [ ] Vulnerability scan clean
- [ ] Monitoring alerts functional
- [ ] Incident response procedures tested

## Ongoing Security Maintenance

### Monthly Tasks
- [ ] Review audit logs for anomalies
- [ ] Update dependencies with security patches
- [ ] Rotate JWT secrets
- [ ] Review access control lists

### Quarterly Tasks
- [ ] Security vulnerability assessment
- [ ] Penetration testing
- [ ] Security training for team
- [ ] Review and update security policies

### Annual Tasks
- [ ] Comprehensive security audit
- [ ] Business continuity testing
- [ ] Security incident response training
- [ ] Compliance certification renewals

## Contact Information

**Security Issues**: security@mavenmm.com
**Emergency Response**: +1-XXX-XXX-XXXX
**Documentation Updates**: Update this file with any security changes

---

**⚠️ IMPORTANT**: This is a living document. Update it whenever security changes are made to the authentication system.