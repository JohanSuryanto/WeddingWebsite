/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Public site origin without trailing slash, e.g. https://wedding.johansuryanto.dev */
  readonly VITE_PUBLIC_SITE_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
