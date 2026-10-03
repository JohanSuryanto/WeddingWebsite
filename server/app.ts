// The one Hono app behind /api on both sites (research R4, contracts/api.md).
// API_SURFACE decides which route groups this deployment serves:
//   public → /public, /couple          (wedding.johansuryanto.dev)
//   admin  → /admin, /public, /cron    (admin.wedding.johansuryanto.dev)
//   both   → everything                (dev and tests)
import { Hono } from 'hono'
import { getDb, type Db } from './db/client'
import type { Env } from './env'
import { notFound, toResponse } from './http/errors'
import { bodyLimit, noStore, originCheck } from './http/middleware'
import { createMediaProvider, type MediaProvider } from './media/provider'
import { adminRoutes } from './routes/admin'
import { adminCouplesRoutes } from './routes/adminCouples'
import { adminImportRoutes } from './routes/adminImport'
import { adminMediaRoutes } from './routes/adminMedia'
import { adminResponsesRoutes } from './routes/adminResponses'
import { coupleRoutes } from './routes/couple'
import { cronRoutes } from './routes/cron'
import { devMediaRoutes } from './routes/devMedia'
import { publicRoutes } from './routes/public'
import type { AppEnv } from './types'

export interface AppDeps {
  db?: Db
  media?: MediaProvider
}

/** JSON API defaults for a route group: no caching, small bodies. */
function api(r: Hono<AppEnv>) {
  return new Hono<AppEnv>().use('*', noStore, bodyLimit()).route('/', r)
}

export function createApp(env: Env, deps: AppDeps = {}) {
  const app = new Hono<AppEnv>().basePath('/api')
  let media: Promise<MediaProvider> | undefined

  app.use('*', async (c, next) => {
    c.set('env', env)
    c.set('db', deps.db ?? (await getDb(env.DATABASE_URL)))
    c.set('media', deps.media ?? (await (media ??= createMediaProvider(env))))
    await next()
  })
  app.use('*', originCheck(env))

  const surface = env.API_SURFACE
  const serves = (s: 'public' | 'admin') => surface === 'both' || surface === s

  if (env.MEDIA_DRIVER === 'local') app.route('/dev/media', devMediaRoutes())
  // /public is on both sites: the admin uses it for previews.
  app.route('/public', api(publicRoutes()))
  if (serves('public')) app.route('/couple', api(coupleRoutes()))
  if (serves('admin')) {
    app.route(
      '/admin',
      api(
        adminRoutes([
          adminCouplesRoutes(),
          adminMediaRoutes(),
          adminResponsesRoutes(),
          adminImportRoutes(),
        ]),
      ),
    )
    app.route('/cron', api(cronRoutes()))
  }

  app.notFound((c) => toResponse(notFound(), c))
  app.onError(toResponse)
  return app
}

export type App = ReturnType<typeof createApp>
