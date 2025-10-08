/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_CLIENT_ID: string
  readonly VITE_CLIENT_SECRET: string
  readonly VITE_REDIRECT_URI: string
  readonly JWT_KEY: string
  readonly DEV_ID: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}