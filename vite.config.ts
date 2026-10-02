/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { devHostRouting } from './vite/devHostRouting.ts'

/** Which site to build: `public` (wedding.johansuryanto.dev) or `admin` (admin.…). */
const site = process.env.SITE === 'admin' ? 'admin' : 'public'

export default defineConfig(({ command }) => ({
  plugins: [react(), tailwindcss(), devHostRouting()],
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
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/unit/**/*.test.{ts,tsx}', 'tests/component/**/*.test.{ts,tsx}'],
    css: false,
  },
}))
