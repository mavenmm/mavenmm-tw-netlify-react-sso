import { useState, useEffect } from "react";
import { LoginResult, User } from "../types";

export interface TeamworkAuthConfig {
  authServiceUrl: string; // e.g., 'https://auth.yourcompany.com'
  cookieDomain?: string;   // e.g., '.yourcompany.com'
}

export function useTeamworkAuth(config: TeamworkAuthConfig) {
  if (!config.authServiceUrl) {
    throw new Error(
      'TeamworkAuth: authServiceUrl is required. Please provide the URL of your auth service (e.g., "https://auth.yourcompany.com")'
    );
  }

  const authServiceUrl = config.authServiceUrl;

  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

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
      if (window.location.hostname !== "localhost" && config.cookieDomain) {
        document.cookie = `maven_auth_token=; path=/; domain=${config.cookieDomain}; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
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
      } catch (error) {
        setIsAuthenticated(false);
        setUser(null);
        localStorage.removeItem("maven_sso_user");
      } finally {
        setLoading(false);
      }
    };

    // Always validate with server - httpOnly cookies are handled automatically by browser
    checkAuth();
  }, [authServiceUrl]); // Add authServiceUrl as dependency

  return { user, setUser, loading, isAuthenticated, login, logout };
}
