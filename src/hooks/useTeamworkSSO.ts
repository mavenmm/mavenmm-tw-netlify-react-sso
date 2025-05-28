import { useState, useEffect } from "react";
import { LoginResult, User } from "../types";

export function useTeamworkSSO() {
  console.log("🎯 [HOOK] useTeamworkSSO hook initializing...");

  const [user, setUser] = useState<User | null>(() => {
    // Try to get user from localStorage on init
    console.log("🔄 [HOOK] Initializing user state from localStorage...");
    try {
      const prevUser = localStorage.getItem("prevUser");
      const userData = prevUser ? JSON.parse(prevUser) : null;
      console.log(
        "💾 [HOOK] Initial user data:",
        userData ? "Found" : "Not found"
      );
      if (userData) {
        console.log("📦 [HOOK] Initial user:", userData);
      }
      return userData;
    } catch (error) {
      console.warn("⚠️ [HOOK] Failed to parse initial user data:", error);
      return null;
    }
  });

  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    const hasUser = !!user;
    console.log("🔐 [HOOK] Initial isAuthenticated state:", hasUser);
    return false; // Always start as false, will be set by auth check
  });

  const login = async (code: string) => {
    console.log("🚀 [LOGIN] Starting login process with code:", code);
    try {
      const options = {
        method: "POST", // Netlify handler expects POST
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ code }), // Send code in body
        credentials: "include" as RequestCredentials, // Important for cookies!
      };

      console.log("📡 [LOGIN] Request options:", options);

      // Record the code in local storage to ensure we don't reuse it after this login
      localStorage.setItem("prevCode", JSON.stringify(code));
      const res = await fetch(`/api/tw-login`, options);

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
      localStorage.setItem("prevUser", JSON.stringify(twUser));
      console.log("💾 [LOGIN] User data saved to localStorage");

      return { twUser };
    } catch (err) {
      console.error("💥 [LOGIN] Error:", err);
      throw new Error("Failed to log in");
    }
  };

  const logout = async () => {
    try {
      // Call logout endpoint
      await fetch("/api/tw-logout", {
        method: "GET",
        credentials: "include",
      });

      // Clear all user data
      setUser(null);
      setIsAuthenticated(false);

      // Clear localStorage
      localStorage.removeItem("prevUser");
      localStorage.removeItem("prevCode");

      // Clear cookies
      document.cookie =
        "tw_auth_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";

      // For non-localhost environments, also clear with configured domain
      if (window.location.hostname !== "localhost") {
        const cookieDomain = import.meta.env?.VITE_COOKIE_DOMAIN;
        if (cookieDomain) {
          document.cookie = `tw_auth_token=; path=/; domain=${cookieDomain}; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
        }
      }
    } catch (error) {
      console.error("Logout error:", error);
      // Still clear local state even if API call fails
      setUser(null);
      setIsAuthenticated(false);
      localStorage.removeItem("prevUser");
    }
  };

  useEffect(() => {
    const checkAuth = async () => {
      console.log("🔍 [AUTH_CHECK] Starting authentication check...");

      // Check if cookies exist in document.cookie
      const allCookies = document.cookie;
      console.log("🍪 [AUTH_CHECK] All cookies:", allCookies);

      const authCookie = document.cookie
        .split(";")
        .find((cookie) => cookie.trim().startsWith("tw_auth_token="));
      console.log("🔑 [AUTH_CHECK] Auth cookie found:", !!authCookie);
      if (authCookie) {
        console.log("🔑 [AUTH_CHECK] Auth cookie value:", authCookie.trim());
      }

      try {
        // Make API call to validate auth state
        console.log("📡 [AUTH_CHECK] Making request to /api/tw-check-auth");
        const response = await fetch("/api/tw-check-auth", {
          method: "GET",
          credentials: "include",
        });

        console.log("📡 [AUTH_CHECK] Response status:", response.status);
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
            setIsAuthenticated(true);

            // Check if we already have user data
            const prevUser = localStorage.getItem("prevUser");
            console.log(
              "💾 [AUTH_CHECK] Cached user data:",
              prevUser ? "Found" : "Not found"
            );

            if (prevUser) {
              const userData = JSON.parse(prevUser);
              console.log("📦 [AUTH_CHECK] Using cached user data:", userData);
              setUser(userData);
            } else {
              console.log(
                "⚠️ [AUTH_CHECK] No cached user data, creating basic user object"
              );
              // Create a basic user object since we don't have one
              const basicUser: User = {
                id: data._id || "temp-user",
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

              localStorage.setItem("prevUser", JSON.stringify(basicUser));
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
            localStorage.removeItem("prevUser");
          }
        } else {
          console.warn(
            `⚠️ [AUTH_CHECK] Auth check failed with status: ${response.status}`
          );
          const responseText = await response.text();
          console.warn("⚠️ [AUTH_CHECK] Response body:", responseText);
          setIsAuthenticated(false);
          setUser(null);
          localStorage.removeItem("prevUser");
        }
      } catch (error) {
        console.error("💥 [AUTH_CHECK] Error during auth check:", error);
        setIsAuthenticated(false);
        setUser(null);
        localStorage.removeItem("prevUser");
      } finally {
        console.log(
          "🏁 [AUTH_CHECK] Auth check completed, setting loading to false"
        );
        setLoading(false);
      }
    };

    // Also sync initial state if we have cached user data
    const syncInitialState = () => {
      console.log("🔄 [INIT] Syncing initial state...");
      const prevUser = localStorage.getItem("prevUser");
      console.log(
        "💾 [INIT] Cached user data:",
        prevUser ? "Found" : "Not found"
      );

      if (prevUser) {
        try {
          const userData = JSON.parse(prevUser);
          console.log("📦 [INIT] Restoring user from cache:", userData);
          setUser(userData);
          setIsAuthenticated(true);
          console.log("✅ [INIT] Initial state synced - user authenticated");
        } catch {
          console.warn("⚠️ [INIT] Failed to parse cached user data, removing");
          localStorage.removeItem("prevUser");
        }
      } else {
        console.log("❌ [INIT] No cached user data - user not authenticated");
      }
    };

    // Sync initial state first
    syncInitialState();

    // Then validate with server
    setTimeout(checkAuth, 100);
  }, []);

  return { user, setUser, loading, isAuthenticated, login, logout };
}
