// Polyfills for Node.js globals in browser environments
// This helps resolve buffer and process dependency issues

// Polyfill for process global
if (typeof process === "undefined") {
  (globalThis as any).process = {
    env: {},
    nextTick: (fn: Function) => setTimeout(fn, 0),
    version: "",
    versions: {},
    platform: "browser",
    browser: true,
  };
}

// Polyfill for Buffer global
if (typeof Buffer === "undefined") {
  try {
    const { Buffer } = require("buffer");
    (globalThis as any).Buffer = Buffer;
  } catch (e) {
    // If buffer package is not available, provide a minimal polyfill
    (globalThis as any).Buffer = {
      from: (data: any) => new Uint8Array(data),
      isBuffer: () => false,
    };
  }
}

// Export a function to ensure polyfills are loaded
export function ensurePolyfills() {
  // This function exists to ensure the polyfills are loaded when imported
  return true;
}
