import { useEffect, createContext, useContext, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Login } from "../components/Login";
import { useMavenSSO } from "../hooks/useMavenSSO";
import { isDev } from "../utils/env";
import type { User, AuthContextType } from "../types";

export const AuthContext = createContext({} as AuthContextType);

// Hook to use the auth context
export function useAuthContext() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuthContext must be used within an AuthProvider");
  }
  return context;
}

export default function AuthProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const navigate = useNavigate();
  const { user, setUser, logout, loading, isAuthenticated, login } =
    useMavenSSO();

  // Get the code from the URL for the teamwork login flow
  const location = useLocation();
  const params = location.search;
  const code = new URLSearchParams(params).get("code");

  const value = { user, logout, loading, isAuthenticated };

  // Use refs to prevent infinite loops
  const hasNavigatedRef = useRef(false);
  const lastCodeRef = useRef<string | null>(null);

  // Initial login process: teamwork auth flow
  useEffect(() => {
    // Skip if still loading
    if (loading) return;

    const usedCode = localStorage.getItem("prevCode");

    const handleLogin = async (code: string) => {
      console.log("Calling login function...");
      try {
        const result = await login(code);
        console.log("Login result:", result);
        console.log("Navigating to /home");

        // Navigate to home after successful login
        navigate("/home", { replace: true });
        hasNavigatedRef.current = true;
      } catch (err: any) {
        console.error("Error caught in AuthProvider.tsx:", err);
        navigate("/");
        hasNavigatedRef.current = true;
      }
    };

    // Scenarios:
    // 1. User is not logged in and we have a code
    if (!user && code && !hasNavigatedRef.current) {
      console.log("User is not logged in and we have a code");
      if (isDev()) {
        console.log("Development mode");
        // React.StrictMode is causing this provider to render twice on load, teamwork will return an error on the second login call
        // Add a prevCode check here to make sure we don't double request /api/login with the same code
        if (usedCode !== code && lastCodeRef.current !== code) {
          lastCodeRef.current = code;
          handleLogin(code);
        }
      } else {
        // In production mode, always make the API call
        if (lastCodeRef.current !== code) {
          lastCodeRef.current = code;
          handleLogin(code);
        }
      }
    }

    // 2. User is not logged in and we don't have a code
    if (
      !user &&
      !code &&
      !hasNavigatedRef.current &&
      location.pathname !== "/login"
    ) {
      console.log("User is not logged in and we don't have a code");
      navigate("/login", { replace: true });
      hasNavigatedRef.current = true;
    }

    // 3. User is logged in and there's no code
    if (user && !code && !hasNavigatedRef.current) {
      // Don't redirect to home if we're on the logout page
      if (location.pathname !== "/logout" && location.pathname !== "/home") {
        navigate("/home", { replace: true });
        hasNavigatedRef.current = true;
      }
    }

    // Reset navigation flag when user or code changes significantly
    if (user || code) {
      hasNavigatedRef.current = false;
    }
  }, [code, user, loading, location.pathname, navigate, login]);

  return (
    <AuthContext.Provider value={value}>
      <main className="h-screen flex flex-col items-center gap-y-10">
        {loading ? (
          <p>Loading...</p>
        ) : (
          <>
            {/* User is authenticated, show the children */}
            {user && children}

            {/* User is not authenticated and there's no code, show the login page */}
            {!user && !code && <Login />}

            {/* User is not authenticated and there's a code, get user data from teamwork */}
            {!user && code && <p>Getting user data from teamwork...</p>}
          </>
        )}
      </main>
    </AuthContext.Provider>
  );
}
