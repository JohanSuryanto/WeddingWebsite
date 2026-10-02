/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Admin login email (frontend-only phase). */
  readonly VITE_ADMIN_EMAIL?: string
  /** Lowercase hex SHA-256 of the admin password. */
  readonly VITE_ADMIN_PASSWORD_SHA256?: string
  /** Public site origin without trailing slash, e.g. https://wedding.johansuryanto.dev */
  readonly VITE_PUBLIC_SITE_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
