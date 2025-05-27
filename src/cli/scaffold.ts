#!/usr/bin/env node

import { writeFileSync, mkdirSync, existsSync } from "fs";
import { join } from "path";

const templates = {
  login: `import { createLoginHandler } from "@mavenmm/teamwork-netlify-react-sso/netlify";

const config = {
  teamworkClientId: process.env.TEAMWORK_CLIENT_ID!,
  teamworkClientSecret: process.env.TEAMWORK_CLIENT_SECRET!,
  teamworkRedirectUri: process.env.TEAMWORK_REDIRECT_URI!,
  allowedOrigins: process.env.ALLOWED_ORIGINS?.split(',') || [
    "http://localhost:3000",
    "https://yourapp.netlify.app" // Update with your domain
  ],
  cookieDomain: process.env.COOKIE_DOMAIN || undefined,
  cookieMaxAge: parseInt(process.env.COOKIE_MAX_AGE || "86400")
};

export const handler = createLoginHandler(config);
`,

  logout: `import { createLogoutHandler } from "@mavenmm/teamwork-netlify-react-sso/netlify";

const config = {
  teamworkClientId: process.env.TEAMWORK_CLIENT_ID!,
  teamworkClientSecret: process.env.TEAMWORK_CLIENT_SECRET!,
  teamworkRedirectUri: process.env.TEAMWORK_REDIRECT_URI!,
  allowedOrigins: process.env.ALLOWED_ORIGINS?.split(',') || [
    "http://localhost:3000",
    "https://yourapp.netlify.app" // Update with your domain
  ],
  cookieDomain: process.env.COOKIE_DOMAIN || undefined,
  cookieMaxAge: parseInt(process.env.COOKIE_MAX_AGE || "86400")
};

export const handler = createLogoutHandler(config);
`,

  checkAuth: `import { createCheckAuthHandler } from "@mavenmm/teamwork-netlify-react-sso/netlify";

const config = {
  teamworkClientId: process.env.TEAMWORK_CLIENT_ID!,
  teamworkClientSecret: process.env.TEAMWORK_CLIENT_SECRET!,
  teamworkRedirectUri: process.env.TEAMWORK_REDIRECT_URI!,
  allowedOrigins: process.env.ALLOWED_ORIGINS?.split(',') || [
    "http://localhost:3000",
    "https://yourapp.netlify.app" // Update with your domain
  ],
  cookieDomain: process.env.COOKIE_DOMAIN || undefined,
  cookieMaxAge: parseInt(process.env.COOKIE_MAX_AGE || "86400")
};

export const handler = createCheckAuthHandler(config);
`,

  envExample: `# =============================================================================
# Teamwork SSO Package - Environment Variables
# =============================================================================
# Copy this file to .env and fill in your actual values

# REQUIRED: Teamwork OAuth Credentials (Client-side)
# Get these from your Teamwork account's OAuth app settings
VITE_TEAMWORK_CLIENT_ID=your_teamwork_client_id_here
VITE_TEAMWORK_CLIENT_SECRET=your_teamwork_client_secret_here
VITE_TEAMWORK_REDIRECT_URI=https://yourapp.netlify.app/

# REQUIRED: Teamwork OAuth Credentials (Server-side for Netlify Functions)
TEAMWORK_CLIENT_ID=your_teamwork_client_id_here
TEAMWORK_CLIENT_SECRET=your_teamwork_client_secret_here
TEAMWORK_REDIRECT_URI=https://yourapp.netlify.app/

# OPTIONAL: Cookie Domain for Subdomain Sharing
# Set to enable cookie sharing across subdomains (e.g., .mavenmm.com)
# Leave empty for localhost or single domain usage
VITE_COOKIE_DOMAIN=

# OPTIONAL: CORS Configuration (comma-separated)
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:8888,https://yourapp.netlify.app

# OPTIONAL: Cookie Configuration
COOKIE_MAX_AGE=86400

# OPTIONAL: Environment
NODE_ENV=production

# =============================================================================
# EXAMPLES FOR DIFFERENT ENVIRONMENTS
# =============================================================================

# Local Development:
# VITE_TEAMWORK_CLIENT_ID=abc123
# VITE_TEAMWORK_CLIENT_SECRET=secret123
# VITE_TEAMWORK_REDIRECT_URI=http://localhost:3000/
# TEAMWORK_CLIENT_ID=abc123
# TEAMWORK_CLIENT_SECRET=secret123
# TEAMWORK_REDIRECT_URI=http://localhost:3000/
# ALLOWED_ORIGINS=http://localhost:3000,http://localhost:8888
# NODE_ENV=development

# Production with Subdomain Sharing:
# VITE_TEAMWORK_CLIENT_ID=abc123
# VITE_TEAMWORK_CLIENT_SECRET=secret123
# VITE_TEAMWORK_REDIRECT_URI=https://app.mavenmm.com/
# VITE_COOKIE_DOMAIN=.mavenmm.com
# TEAMWORK_CLIENT_ID=abc123
# TEAMWORK_CLIENT_SECRET=secret123
# TEAMWORK_REDIRECT_URI=https://app.mavenmm.com/
# ALLOWED_ORIGINS=https://app.mavenmm.com,https://admin.mavenmm.com
# NODE_ENV=production
`,

  netlifyToml: `# Netlify configuration for Maven SSO
[build]
  functions = "netlify/functions"

[dev]
  functions = "netlify/functions"
  port = 8888

# Redirect /api/* to functions for easier frontend integration
[[redirects]]
  from = "/api/*"
  to = "/.netlify/functions/:splat"
  status = 200
`,

  readme: `# Teamwork SSO Integration

This project uses the \`@mavenmm/teamwork-netlify-react-sso\` package for Teamwork authentication.

## Setup

1. **Install dependencies:**
   \`\`\`bash
   npm install @mavenmm/teamwork-netlify-react-sso
   \`\`\`

2. **Configure environment variables:**
   \`\`\`bash
   cp .env.example .env
   # Edit .env with your Teamwork OAuth credentials
   \`\`\`

3. **Set up Teamwork OAuth:**
   - Go to your Teamwork account settings
   - Create a new OAuth application
   - Set the redirect URI to match your \`TEAMWORK_REDIRECT_URI\`
   - Copy the client ID and secret to your \`.env\` file

## Cookie Domain Configuration

For subdomain sharing (e.g., sharing auth between \`app.mavenmm.com\` and \`admin.mavenmm.com\`):

\`\`\`bash
# In your .env file
VITE_COOKIE_DOMAIN=.mavenmm.com
\`\`\`

This allows the authentication cookie to work across all \`*.mavenmm.com\` subdomains.

## Development

\`\`\`bash
# Start Netlify dev server
netlify dev

# Your functions will be available at:
# http://localhost:8888/.netlify/functions/tw-login
# http://localhost:8888/.netlify/functions/tw-logout  
# http://localhost:8888/.netlify/functions/tw-check-auth
\`\`\`

## Frontend Integration

\`\`\`jsx
import { AuthProvider, useTeamworkSSO, Login } from '@mavenmm/teamwork-netlify-react-sso';

function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/home" element={<Dashboard />} />
      </Routes>
    </AuthProvider>
  );
}

function Dashboard() {
  const { user, logout } = useTeamworkSSO();
  
  return (
    <div>
      <h1>Welcome {user?.firstName}!</h1>
      <button onClick={logout}>Logout</button>
    </div>
  );
}
\`\`\`

## Deployment

1. **Set environment variables in Netlify:**
   - Go to your Netlify site settings
   - Add all the environment variables from your \`.env\` file

2. **Deploy:**
   \`\`\`bash
   git push origin main
   \`\`\`

Your functions will be automatically deployed to:
- \`https://yoursite.netlify.app/.netlify/functions/tw-login\`
- \`https://yoursite.netlify.app/.netlify/functions/tw-logout\`
- \`https://yoursite.netlify.app/.netlify/functions/tw-check-auth\`
`,
};

function scaffoldNetlifyFunctions() {
  const functionsDir = join(process.cwd(), "netlify", "functions");

  // Create directories if they don't exist
  if (!existsSync("netlify")) {
    mkdirSync("netlify");
  }
  if (!existsSync(functionsDir)) {
    mkdirSync(functionsDir);
  }

  // Create function files
  writeFileSync(join(functionsDir, "tw-login.ts"), templates.login);
  writeFileSync(join(functionsDir, "tw-logout.ts"), templates.logout);
  writeFileSync(join(functionsDir, "tw-check-auth.ts"), templates.checkAuth);

  // Create configuration files
  if (!existsSync(".env.example")) {
    writeFileSync(".env.example", templates.envExample);
  }

  if (!existsSync("netlify.toml")) {
    writeFileSync("netlify.toml", templates.netlifyToml);
  }

  if (!existsSync("README.md")) {
    writeFileSync("README.md", templates.readme);
  }

  console.log("✅ Teamwork SSO scaffolded successfully!");
  console.log("📁 Created:");
  console.log("  - netlify/functions/tw-login.ts");
  console.log("  - netlify/functions/tw-logout.ts");
  console.log("  - netlify/functions/tw-check-auth.ts");
  console.log("  - .env.example");
  console.log("  - netlify.toml");
  console.log("  - README.md (if not exists)");
  console.log("");
  console.log("🔧 Next steps:");
  console.log("  1. cp .env.example .env");
  console.log("  2. Edit .env with your Teamwork OAuth credentials");
  console.log("  3. netlify dev");
  console.log("  4. Test at http://localhost:8888/.netlify/functions/tw-*");
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  scaffoldNetlifyFunctions();
}

export { scaffoldNetlifyFunctions };
