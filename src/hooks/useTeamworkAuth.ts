import { useState, useEffect } from "react";
import { LoginResult, User } from "../types";

export interface TeamworkAuthConfig {
  authServiceUrl?: string; // e.g., 'https://auth.mavenmm.com'
  cookieDomain?: string;   // e.g., '.mavenmm.com'
}

export function useTeamworkAuth(config: TeamworkAuthConfig = {}) {
  const authServiceUrl = config.authServiceUrl || 'https://auth.mavenmm.com';
  console.log("🎯 [HOOK] useTeamworkAuth hook initializing with auth service:", authServiceUrl);

  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const login = async (code: string) => {
    console.log("🚀 [LOGIN] Starting login process with code:", code);
    try {
      const options = {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "code": code, // Send code in header as expected by auth service
        },
        credentials: "include" as RequestCredentials, // Important for cookies!
      };

      console.log("📡 [LOGIN] Request options:", options);

      // Record the code in local storage to ensure we don't reuse it after this login
      localStorage.setItem("maven_sso_code", JSON.stringify(code));
      const res = await fetch(`${authServiceUrl}/.netlify/functions/login`, options);

      console.log("📡 [LOGIN] Response status:", res.status);
      console.log(
        "📡 [LOGIN] Response headers:",
        Object.fromEntries(res.headers.entries())
      );

      if (!res.ok) {
        // Try to get the error details from the response
        let errorDetails;
        try {
          errorDetails = await res.json();
        } catch {
          errorDetails = await res.text();
        }
        console.error("❌ [LOGIN] Failed with details:", errorDetails);
        throw new Error(
          `Login failed with status: ${res.status} - ${JSON.stringify(
            errorDetails
          )}`
        );
      }

      const data = await res.json();
      console.log("✅ [LOGIN] Success! Response data:", data);

      const { twUser } = data;

      setUser(twUser);
      setIsAuthenticated(true);

      // Record the user in local storage to ensure we don't reuse it after this login
      localStorage.setItem("maven_sso_user", JSON.stringify(twUser));
      console.log("💾 [LOGIN] User data saved to localStorage");

      // Clean up URL by removing OAuth code parameter
      cleanUpUrl();

      return { twUser };
    } catch (err) {
      console.error("💥 [LOGIN] Error:", err);
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
        console.log("🧹 [CLEANUP] Removing OAuth parameters from URL");

        // Remove all OAuth parameters
        oauthParams.forEach(param => {
          url.searchParams.delete(param);
        });

        // Update URL without page reload
        window.history.replaceState({}, document.title, url.toString());
        console.log("✅ [CLEANUP] URL cleaned:", url.toString());
      }
    } catch (error) {
      console.warn("⚠️ [CLEANUP] Failed to clean up URL:", error);
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
      if (window.location.hostname !== "localhost") {
        const cookieDomain = config.cookieDomain || '.mavenmm.com';
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
    console.log("🎬 [USEEFFECT] Auth check useEffect triggered with authServiceUrl:", authServiceUrl);

    const checkAuth = async () => {
      console.log("🔍 [AUTH_CHECK] Starting authentication check...");
      console.log("🍪 [AUTH_CHECK] Note: httpOnly cookies are not visible to JavaScript");

      try {
        // Make API call to validate auth state with external auth service
        console.log("📡 [AUTH_CHECK] Making request to external auth service:", `${authServiceUrl}/.netlify/functions/checkAuth`);
        const response = await fetch(`${authServiceUrl}/.netlify/functions/checkAuth`, {
          method: "GET",
          credentials: "include",
        });

        console.log("📡 [AUTH_CHECK] Response status:", response.status);
        console.log("📡 [AUTH_CHECK] Response ok:", response.ok);
        console.log(
          "📡 [AUTH_CHECK] Response headers:",
          Object.fromEntries(response.headers.entries())
        );

        if (response.ok) {
          const contentType = response.headers.get("content-type");
          console.log("📄 [AUTH_CHECK] Content-Type:", contentType);

          if (!contentType || !contentType.includes("application/json")) {
            console.warn(
              "⚠️ [AUTH_CHECK] Non-JSON response, assuming not authenticated"
            );
            setIsAuthenticated(false);
            setUser(null);
            localStorage.removeItem("prevUser");
            return;
          }

          const data = await response.json();
          console.log("📡 [AUTH_CHECK] Response data:", data);

          if (data.authenticated === true) {
            console.log("✅ [AUTH_CHECK] User is authenticated!");
            console.log("🔄 [AUTH_CHECK] Setting isAuthenticated to true...");
            setIsAuthenticated(true);
            console.log("✅ [AUTH_CHECK] State updated - isAuthenticated should now be true");

            // Clean up URL since we're authenticated via cookie
            cleanUpUrl();

            // Check if we already have user data in localStorage
            const prevUser = localStorage.getItem("maven_sso_user");
            console.log(
              "💾 [AUTH_CHECK] Cached user data:",
              prevUser ? "Found" : "Not found"
            );

            if (prevUser) {
              try {
                const userData = JSON.parse(prevUser);
                console.log("📦 [AUTH_CHECK] Using cached user data:", userData);
                setUser(userData);
              } catch (error) {
                console.warn("⚠️ [AUTH_CHECK] Failed to parse cached user data:", error);
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
                console.log("💾 [AUTH_CHECK] Created fallback user:", basicUser);
              }
            } else {
              console.log(
                "⚠️ [AUTH_CHECK] No cached user data, creating basic user object"
              );
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
              console.log(
                "💾 [AUTH_CHECK] Created and saved basic user:",
                basicUser
              );
            }
          } else {
            console.log("❌ [AUTH_CHECK] User is not authenticated");
            console.log("🧹 [AUTH_CHECK] Clearing user state and localStorage");
            setIsAuthenticated(false);
            setUser(null);
            localStorage.removeItem("maven_sso_user");
          }
        } else {
          console.warn(
            `⚠️ [AUTH_CHECK] Auth check failed with status: ${response.status}`
          );
          const responseText = await response.text();
          console.warn("⚠️ [AUTH_CHECK] Response body:", responseText);
          setIsAuthenticated(false);
          setUser(null);
          localStorage.removeItem("maven_sso_user");
        }
      } catch (error) {
        console.error("💥 [AUTH_CHECK] Error during auth check:", error);
        setIsAuthenticated(false);
        setUser(null);
        localStorage.removeItem("maven_sso_user");
      } finally {
        console.log(
          "🏁 [AUTH_CHECK] Auth check completed, setting loading to false"
        );
        setLoading(false);
      }
    };

    // Always validate with server - httpOnly cookies are handled automatically by browser
    console.log("⏰ [USEEFFECT] Starting checkAuth immediately...");
    checkAuth();
  }, [authServiceUrl]); // Add authServiceUrl as dependency

  return { user, setUser, loading, isAuthenticated, login, logout };
}
