/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_DOMAIN_KEY?: string;
  readonly DOMAIN_KEY?: string;
  readonly VITE_CLIENT_ID?: string;
  readonly VITE_CLIENT_SECRET?: string;
  readonly VITE_REDIRECT_URI?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
