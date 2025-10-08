import { useState, useEffect, useRef, useCallback } from "react";
import { LoginResult, User } from "../types";

export interface TeamworkAuthConfig {
  authServiceUrl?: string; // Optional - auto-detects if not provided
  domainKey?: string;      // Optional - domain authentication key (required for production)
}

/**
 * Auto-detect the auth service URL based on environment
 */
function detectAuthServiceUrl(): string {
  const hostname = window.location.hostname;

  // Production: *.mavenmm.com domains use centralized auth service
  if (hostname.endsWith('.mavenmm.com') || hostname === 'mavenmm.com') {
    return 'https://auth.mavenmm.com';
  }

  // Development: localhost uses local auth service on port 9100
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return 'http://localhost:9100';
  }

  // Fallback for unknown environments
  console.warn(
    `TeamworkAuth: Unknown hostname "${hostname}". Defaulting to localhost:9100. ` +
    'Please provide authServiceUrl explicitly if this is incorrect.'
  );
  return 'http://localhost:9100';
}

/**
 * Get domain key from environment or config
 */
function getDomainKey(config?: string): string | undefined {
  // Priority: explicit config > environment variable
  if (config) return config;

  // Check for environment variable (Vite uses VITE_ prefix)
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    return import.meta.env.VITE_DOMAIN_KEY || import.meta.env.DOMAIN_KEY;
  }

  // Check for process.env (other build tools)
  if (typeof process !== 'undefined' && process.env) {
    return process.env.VITE_DOMAIN_KEY || process.env.DOMAIN_KEY;
  }

  return undefined;
}

export function useTeamworkAuth(config: TeamworkAuthConfig = {}) {
  // Auto-detect auth service URL if not provided
  const authServiceUrl = config.authServiceUrl || detectAuthServiceUrl();
  const domainKey = getDomainKey(config.domainKey);

  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Access token management (stored in memory)
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [tokenExpiry, setTokenExpiry] = useState<number>(0);
  const refreshTimerRef = useRef<NodeJS.Timeout | null>(null);

  const login = async (code: string) => {
    try {
      const options = {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "code": code,
        },
        credentials: "include" as RequestCredentials,
      };

      // Record the code to prevent reuse
      localStorage.setItem("maven_sso_code", JSON.stringify(code));
      const res = await fetch(`${authServiceUrl}/.netlify/functions/login`, options);

      if (!res.ok) {
        let errorDetails;
        try {
          errorDetails = await res.json();
        } catch {
          errorDetails = await res.text();
        }
        throw new Error(
          `Login failed with status: ${res.status}`
        );
      }

      const data = await res.json();
      const { twUser } = data;

      setUser(twUser);
      setIsAuthenticated(true);

      // Save user data to localStorage
      localStorage.setItem("maven_sso_user", JSON.stringify(twUser));

      // Clean up URL by removing OAuth code parameter
      cleanUpUrl();

      return { twUser };
    } catch (err) {
      throw new Error("Failed to log in");
    }
  };

  const cleanUpUrl = () => {
    try {
      const url = new URL(window.location.href);

      // OAuth parameters that should be cleaned up after successful auth
      const oauthParams = ['code', 'state', 'client_id', 'redirect_uri', 'scope', 'response_type'];
      let hasOAuthParams = false;

      // Check if any OAuth params exist
      oauthParams.forEach(param => {
        if (url.searchParams.has(param)) {
          hasOAuthParams = true;
        }
      });

      if (hasOAuthParams) {
        // Remove all OAuth parameters
        oauthParams.forEach(param => {
          url.searchParams.delete(param);
        });

        // Update URL without page reload
        window.history.replaceState({}, document.title, url.toString());
      }
    } catch (error) {
      // Silently fail - URL cleanup is not critical
    }
  };

  const logout = async () => {
    try {
      // Call external auth service logout endpoint
      await fetch(`${authServiceUrl}/.netlify/functions/logout`, {
        method: "GET",
        credentials: "include",
      });

      // Clear all user data
      setUser(null);
      setIsAuthenticated(false);

      // Clear localStorage
      localStorage.removeItem("maven_sso_user");
      localStorage.removeItem("maven_sso_code");

      // Clear cookies - the auth service handles domain cookies
      document.cookie =
        "maven_auth_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";

      // For non-localhost environments, also clear with configured domain
      if (window.location.hostname !== "localhost" && cookieDomain) {
        document.cookie = `maven_auth_token=; path=/; domain=${cookieDomain}; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
      }
    } catch (error) {
      console.error("Logout error:", error);
      // Still clear local state even if API call fails
      setUser(null);
      setIsAuthenticated(false);
      localStorage.removeItem("maven_sso_user");
    }
  };

  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Make API call to validate auth state with external auth service
        const response = await fetch(`${authServiceUrl}/.netlify/functions/checkAuth`, {
          method: "GET",
          credentials: "include",
        });

        if (response.ok) {
          const contentType = response.headers.get("content-type");

          if (!contentType || !contentType.includes("application/json")) {
            setIsAuthenticated(false);
            setUser(null);
            localStorage.removeItem("maven_sso_user");
            return;
          }

          const data = await response.json();

          if (data.authenticated === true) {
            setIsAuthenticated(true);

            // Clean up URL since we're authenticated via cookie
            cleanUpUrl();

            // Check if we already have user data in localStorage
            const prevUser = localStorage.getItem("maven_sso_user");

            if (prevUser) {
              try {
                const userData = JSON.parse(prevUser);
                setUser(userData);
              } catch (error) {
                localStorage.removeItem("maven_sso_user");
                // Create basic user as fallback
                const basicUser: User = {
                  id: data.userId || data._id || "temp-user",
                  firstName: "Teamwork",
                  lastName: "User",
                  email: "user@teamwork.example",
                  avatar: "",
                  company: {
                    id: 1,
                    name: "Teamwork",
                    logo: "",
                  },
                };
                localStorage.setItem("maven_sso_user", JSON.stringify(basicUser));
                setUser(basicUser);
              }
            } else {
              // Create a basic user object since we don't have one
              const basicUser: User = {
                id: data.userId || data._id || "temp-user",
                firstName: "Teamwork",
                lastName: "User",
                email: "user@teamwork.example",
                avatar: "",
                company: {
                  id: 1,
                  name: "Teamwork",
                  logo: "",
                },
              };

              localStorage.setItem("maven_sso_user", JSON.stringify(basicUser));
              setUser(basicUser);
            }
          } else {
            setIsAuthenticated(false);
            setUser(null);
            localStorage.removeItem("maven_sso_user");
          }
        } else {
          setIsAuthenticated(false);
          setUser(null);
          localStorage.removeItem("maven_sso_user");
        }
      } catch (err) {
        setIsAuthenticated(false);
        setUser(null);
        localStorage.removeItem("maven_sso_user");

        // Check if this is a connection error (auth service not reachable)
        const isConnectionError = err instanceof TypeError && err.message.includes('fetch');

        if (isConnectionError && authServiceUrl.includes('localhost:9100')) {
          const errorMessage =
            '⚠️ Auth service not running on localhost:9100\n\n' +
            'To start the auth service:\n' +
            '  cd auth-service/\n' +
            '  npm run dev\n\n' +
            'Or provide a custom authServiceUrl in the config.';

          setError(errorMessage);
          console.error(errorMessage);
        } else if (isConnectionError) {
          const errorMessage = `⚠️ Cannot connect to auth service at ${authServiceUrl}`;
          setError(errorMessage);
          console.error(errorMessage);
        }
      } finally {
        setLoading(false);
      }
    };

    // Always validate with server - httpOnly cookies are handled automatically by browser
    checkAuth();
  }, [authServiceUrl]); // Add authServiceUrl as dependency

  return { user, setUser, loading, isAuthenticated, login, logout, error, authServiceUrl };
}
