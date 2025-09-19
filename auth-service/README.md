# Maven Centralized Authentication Service

This is the centralized authentication service for all Maven Marketing applications. It runs at `auth.mavenmm.com` and handles Teamwork SSO authentication for all `*.mavenmm.com` subdomains.

## Architecture

This service provides authentication endpoints that eliminate the need for each Maven app to implement its own auth logic:

- **Frontend Apps**: Use the npm package `@mavenmm/teamwork-netlify-react-sso`
- **Auth Service**: This centralized service handles all authentication logic

## Endpoints

### Authentication Flow
- `POST /functions/login` - Handle Teamwork OAuth callback, set domain cookies
- `GET /functions/logout` - Clear authentication cookies
- `GET /functions/checkAuth` - Validate authentication status
- `POST /functions/sso` - SSO validation for authenticated requests

### Usage Flow
1. User visits `app1.mavenmm.com`
2. App redirects to `auth.mavenmm.com` with callback URL
3. User authenticates with Teamwork
4. Auth service sets `.mavenmm.com` domain cookie
5. User redirected back to `app1.mavenmm.com` with auth cookie
6. App can now make authenticated requests

## Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Run tests
npm test

# Build for production
npm run build
```

## Environment Variables

Create `.env` file:

```env
# Teamwork OAuth credentials
VITE_CLIENT_ID=your_teamwork_client_id
VITE_CLIENT_SECRET=your_teamwork_client_secret
VITE_REDIRECT_URI=https://auth.mavenmm.com

# JWT secret for token signing
JWT_KEY=your_jwt_secret_key

# Development ID for localhost testing
DEV_ID=your_dev_id
```

## Deployment

Deploy to Netlify with domain `auth.mavenmm.com`:

1. Connect this directory to Netlify
2. Set environment variables in Netlify dashboard
3. Deploy functions will be available at `/functions/*`

## Security

- All cookies use `.mavenmm.com` domain for subdomain sharing
- HttpOnly cookies for secure token storage
- CORS configured for Maven domains and localhost
- JWT tokens with 2-week expiry