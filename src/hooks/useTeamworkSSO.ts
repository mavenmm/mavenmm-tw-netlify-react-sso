import { useState, useEffect } from "react";
import { LoginResult, User } from "../types";

export function useTeamworkSSO() {
  const [user, setUser] = useState<User | null>(() => {
    // Try to get user from localStorage on init
    try {
      const prevUser = localStorage.getItem("prevUser");
      return prevUser ? JSON.parse(prevUser) : null;
    } catch {
      return null;
    }
  });

  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const login = async (code: string) => {
    try {
      const options = {
        method: "POST", // Netlify handler expects POST
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ code }), // Send code in body
        credentials: "include" as RequestCredentials, // Important for cookies!
      };

      // Record the code in local storage to ensure we don't reuse it after this login
      localStorage.setItem("prevCode", JSON.stringify(code));
      const res = await fetch(`/api/tw-login`, options);

      if (!res.ok) {
        // Try to get the error details from the response
        let errorDetails;
        try {
          errorDetails = await res.json();
        } catch {
          errorDetails = await res.text();
        }
        throw new Error(
          `Login failed with status: ${res.status} - ${JSON.stringify(
            errorDetails
          )}`
        );
      }

      const data = await res.json();

      const { twUser } = data;

      setUser(twUser);
      setIsAuthenticated(true);

      // Record the user in local storage to ensure we don't reuse it after this login
      localStorage.setItem("prevUser", JSON.stringify(twUser));

      return { twUser };
    } catch (err) {
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
      try {
        // Make API call to validate auth state
        const response = await fetch("/api/tw-check-auth", {
          method: "GET",
          credentials: "include",
        });

        if (response.ok) {
          const contentType = response.headers.get("content-type");
          if (!contentType || !contentType.includes("application/json")) {
            setIsAuthenticated(false);
            setUser(null);
            localStorage.removeItem("prevUser");
            return;
          }

          const data = await response.json();

          if (data.authenticated === true) {
            setIsAuthenticated(true);

            // Check if we already have user data
            const prevUser = localStorage.getItem("prevUser");
            if (prevUser) {
              setUser(JSON.parse(prevUser));
            } else {
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
            }
          } else {
            setIsAuthenticated(false);
            setUser(null);
            localStorage.removeItem("prevUser");
          }
        } else {
          setIsAuthenticated(false);
          setUser(null);
          localStorage.removeItem("prevUser");
        }
      } catch (error) {
        setIsAuthenticated(false);
        setUser(null);
        localStorage.removeItem("prevUser");
      } finally {
        setLoading(false);
      }
    };

    // Also sync initial state if we have cached user data
    const syncInitialState = () => {
      const prevUser = localStorage.getItem("prevUser");
      if (prevUser) {
        try {
          const userData = JSON.parse(prevUser);
          setUser(userData);
          setIsAuthenticated(true);
        } catch {
          localStorage.removeItem("prevUser");
        }
      }
    };

    // Sync initial state first
    syncInitialState();

    // Then validate with server
    setTimeout(checkAuth, 100);
  }, []);

  return { user, setUser, loading, isAuthenticated, login, logout };
}
