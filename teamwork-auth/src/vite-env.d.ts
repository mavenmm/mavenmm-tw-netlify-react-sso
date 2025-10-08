/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_TEAMWORK_CLIENT_ID: string;
  readonly VITE_TEAMWORK_REDIRECT_URI: string;
  readonly VITE_TEAMWORK_CLIENT_SECRET?: string;
  readonly DEV: boolean;
  readonly PROD: boolean;
  readonly MODE: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
