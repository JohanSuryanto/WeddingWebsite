import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '../index.css'
import '../themes'
import { AdminApp } from './AdminApp'

/** Marker checked by scripts/check-public-build.mjs; must never reach the public build. */
export const ADMIN_MARKER = '__ADMIN_BUNDLE__'
;(window as unknown as Record<string, unknown>).__adminMarker = ADMIN_MARKER

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AdminApp />
  </StrictMode>,
)
