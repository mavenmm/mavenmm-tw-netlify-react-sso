# Test App for Maven Teamwork Auth

This test app allows you to test the centralized authentication system in both local and production environments.

## NPM Scripts

### 🏠 Local Development Mode
```bash
npm run dev
```
- Uses local auth service at `http://localhost:9100`
- Cookie domain: `undefined` (localhost only)
- **Requirement**: Make sure local auth service is running:
  ```bash
  cd auth-service && npm run dev
  ```

### 🌐 Production Testing Mode
```bash
npm run dev:prod
```
- Uses production auth service at `https://auth.mavenmm.com`
- Cookie domain: `.mavenmm.com` (cross-subdomain)
- **Requirement**: Production auth service must be deployed

## Environment Files

The test app requires environment variables from:
- `.env` - Local development configuration
- Inherits from parent `auth-service/.env` for Teamwork OAuth credentials

Required variables:
- `VITE_CLIENT_ID` - Teamwork OAuth Client ID
- `VITE_CLIENT_SECRET` - Teamwork OAuth Client Secret
- `VITE_REDIRECT_URI` - OAuth redirect URI
- `JWT_KEY` - JWT signing secret
- `DEV_ID` - Development identifier

## Testing Flow

1. **Start the appropriate auth service**:
   - Local: `cd auth-service && npm run dev`
   - Production: Already deployed at auth.mavenmm.com

2. **Run test app in desired mode**:
   - Local: `npm run dev`
   - Production: `npm run dev:prod`

3. **Test authentication**:
   - Visit `http://localhost:3000`
   - Click "Sign In" button
   - Complete Teamwork OAuth flow
   - Verify authentication persistence after page refresh

## Visual Indicators

The app displays the current mode with color-coded indicators:
- 🏠 **Blue border**: Local dev mode
- 🌐 **Green border**: Production mode

## Troubleshooting

- **CORS errors**: Check that origins are properly configured in auth service
- **Environment variables**: Verify all required variables are loaded
- **OAuth redirect**: Ensure redirect URI matches configured environment