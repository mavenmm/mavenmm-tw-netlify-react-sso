// ===== netlify/functions/tw-login.ts in your new project =====
import { createLoginHandler } from "mavenmm-tw-netlify-react-sso/netlify";

const config = {
  teamworkClientId: process.env.TEAMWORK_CLIENT_ID!,
  teamworkClientSecret: process.env.TEAMWORK_CLIENT_SECRET!,
  teamworkRedirectUri: process.env.TEAMWORK_REDIRECT_URI!,
  allowedOrigins: ["http://localhost:3000", "https://yourapp.netlify.app"],
  cookieDomain:
    process.env.NODE_ENV === "production" ? ".yourdomain.com" : undefined,
  cookieMaxAge: 86400, // 24 hours
};

export const handler = createLoginHandler(config);

// ===== netlify/functions/tw-logout.ts in your new project =====
// import { createLogoutHandler } from "mavenmm-tw-netlify-react-sso/netlify";
// export const handler = createLogoutHandler(config);

// ===== netlify/functions/tw-check-auth.ts in your new project =====
// import { createCheckAuthHandler } from "mavenmm-tw-netlify-react-sso/netlify";
// export const handler = createCheckAuthHandler(config);
