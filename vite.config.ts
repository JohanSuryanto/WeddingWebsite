/// <reference types="vitest/config" />
import { copyFileSync, existsSync } from 'node:fs'
import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { devHostRouting } from './vite/devHostRouting.ts'
import { apiDevServer } from './vite/apiDevServer.ts'

/** Which site to build: `public` (wedding.johansuryanto.dev) or `admin` (admin.…). */
const site = process.env.SITE === 'admin' ? 'admin' : 'public'

/**
 * The admin build also gets `index.html` (a copy of `admin.html`), so the one shared
 * `vercel.json` fallback (`/(.*)` → `/index.html`) serves the admin app on any host,
 * including Vercel preview URLs.
 */
function adminIndexCopy(): Plugin {
  return {
    name: 'admin-index-copy',
    apply: 'build',
    closeBundle() {
      const from = `dist/${site}/admin.html`
      if (site === 'admin' && existsSync(from)) copyFileSync(from, `dist/${site}/index.html`)
    },
  }
}

export default defineConfig(({ command }) => ({
  plugins: [react(), tailwindcss(), devHostRouting(), apiDevServer(), adminIndexCopy()],
  // Fixed dev port (both localhost:5177 and admin.localhost:5177).
  server: { port: 5177, strictPort: true },
  // The admin build gets its own static files (host rewrites, favicon).
  publicDir: command === 'build' && site === 'admin' ? 'admin-static' : 'public',
  build: {
    outDir: `dist/${site}`,
    emptyOutDir: true,
    rollupOptions: {
      input: site === 'admin' ? 'admin.html' : 'index.html',
    },
  },
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: 'unit',
          environment: 'jsdom',
          globals: true,
          setupFiles: ['./tests/setup.ts'],
          include: ['tests/unit/**/*.test.{ts,tsx}', 'tests/component/**/*.test.{ts,tsx}'],
          css: false,
        },
      },
      {
        extends: true,
        test: {
          name: 'api',
          environment: 'node',
          globals: true,
          include: ['tests/api/**/*.test.ts'],
          // PGlite boots a WASM Postgres per test file.
          testTimeout: 30_000,
          hookTimeout: 60_000,
        },
      },
    ],
  },
}))
