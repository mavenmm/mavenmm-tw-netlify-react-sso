import { useEffect, createContext, useContext, useRef } from "react";
import { useLocation } from "react-router-dom";
import { Login } from "../components/Login";
import { useTeamworkAuth, type TeamworkAuthConfig } from "../hooks/useTeamworkAuth";
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

export interface AuthProviderProps {
  children: React.ReactNode;
  authConfig: TeamworkAuthConfig;
}

export default function AuthProvider({
  children,
  authConfig,
}: AuthProviderProps) {
  const { user, setUser, logout, loading, isAuthenticated, login } =
    useTeamworkAuth(authConfig);

  // Get the code from the URL for the teamwork login flow
  const location = useLocation();
  const params = location.search;
  const code = new URLSearchParams(params).get("code");

  const value = { user, logout, loading, isAuthenticated };

  // Use refs to prevent infinite loops
  const lastCodeRef = useRef<string | null>(null);

  // Handle OAuth callback code
  useEffect(() => {
    // Skip if still loading
    if (loading) return;

    const usedCode = localStorage.getItem("prevCode");

    const handleLogin = async (code: string) => {
      try {
        const result = await login(code);
      } catch (err: any) {
        // Handle login error silently or with user-facing error handling
      }
    };

    // Process OAuth callback code if present
    if (code && !user) {
      // React.StrictMode is causing this provider to render twice on load, teamwork will return an error on the second login call
      // Add a prevCode check here to make sure we don't double request /api/login with the same code
      if (usedCode !== code && lastCodeRef.current !== code) {
        lastCodeRef.current = code;
        handleLogin(code);
      }
    }
  }, [code, user, loading, login]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
