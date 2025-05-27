// Utility to get environment variables that works across different bundlers
export function getEnvVar(key: string): string | undefined {
  // Try different environment variable sources

  // 1. Check import.meta.env (Vite/ESM) - direct access for better static analysis
  try {
    // @ts-ignore - import.meta might not be available in all environments
    if (import.meta && import.meta.env) {
      // @ts-ignore
      const value = import.meta.env[key];
      if (value) {
        return value;
      }
    }
  } catch (e) {
    // import.meta not available, continue to next method
  }

  // 2. Check process.env (Node.js/SSR)
  if (typeof process !== "undefined" && process.env && process.env[key]) {
    return process.env[key];
  }

  // 3. Check window.__ENV__ (custom injection)
  if (
    typeof window !== "undefined" &&
    (window as any).__ENV__ &&
    (window as any).__ENV__[key]
  ) {
    return (window as any).__ENV__[key];
  }

  return undefined;
}

// Check if we're in development mode
export function isDev(): boolean {
  // Try different development detection methods

  // 1. Check import.meta.env.DEV (Vite) - direct access
  try {
    // @ts-ignore - import.meta might not be available in all environments
    if (import.meta && import.meta.env) {
      // @ts-ignore
      const isDev = import.meta.env.DEV;
      if (typeof isDev === "boolean") {
        return isDev;
      }
    }
  } catch (e) {
    // import.meta not available, continue to next method
  }

  // 2. Check NODE_ENV (Node.js)
  if (typeof process !== "undefined" && process.env && process.env.NODE_ENV) {
    return process.env.NODE_ENV === "development";
  }

  // 3. Check window.__DEV__ (custom injection)
  if (
    typeof window !== "undefined" &&
    typeof (window as any).__DEV__ === "boolean"
  ) {
    return (window as any).__DEV__;
  }

  // 4. Default to false in production
  return false;
}
