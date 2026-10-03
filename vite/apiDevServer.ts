import type { IncomingMessage, ServerResponse } from 'node:http'
import type { Plugin, ViteDevServer } from 'vite'
import { isAdminHost } from './devHostRouting.ts'

type Listener = (req: IncomingMessage, res: ServerResponse) => Promise<void> | void

/**
 * Mounts the Hono API at /api inside `vite dev` (research R10). The host picks the
 * surface like production: admin.localhost → admin API, anything else → public API.
 * The server code is loaded through Vite's SSR loader, so edits apply on the next request.
 */
export function apiDevServer(): Plugin {
  return {
    name: 'api-dev-server',
    apply: 'serve',
    configureServer(server) {
      if (process.env.VITEST) return
      let ready: Promise<{ admin: Listener; public: Listener }> | undefined
      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith('/api/') && req.url !== '/api') return next()
        try {
          ready ??= load(server)
          const listeners = await ready
          await (isAdminHost(req.headers.host) ? listeners.admin : listeners.public)(req, res)
        } catch (err) {
          ready = undefined
          next(err)
        }
      })
      // Reload the API after server/ or shared code changes.
      server.watcher.on('change', (file) => {
        if (/[\\/](server|src[\\/]data|src[\\/]lib)[\\/]/.test(file)) ready = undefined
      })
    },
  }
}

async function load(server: ViteDevServer) {
  const { loadEnv, loadEnvFileIfPresent } = (await server.ssrLoadModule('/server/env.ts')) as typeof import('../server/env')
  const { createApp } = (await server.ssrLoadModule('/server/app.ts')) as typeof import('../server/app')
  const { migrateDb } = (await server.ssrLoadModule('/server/db/client.ts')) as typeof import('../server/db/client')
  const { getRequestListener } = await import('@hono/node-server')
  loadEnvFileIfPresent()
  const base = loadEnv()
  await migrateDb(base.DATABASE_URL)
  return {
    admin: getRequestListener(createApp({ ...base, API_SURFACE: 'admin' }).fetch),
    public: getRequestListener(createApp({ ...base, API_SURFACE: 'public' }).fetch),
  }
}
