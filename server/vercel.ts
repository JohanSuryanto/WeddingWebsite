// Bundled by scripts/build-api.mjs into api/_server.mjs, which api/index.ts re-exports.
import { createApp } from './app'
import { loadEnv } from './env'

let app: ReturnType<typeof createApp> | undefined

// Built on the first request, so a configuration error shows up as a logged 500
// with the list of missing variables rather than a crash at cold start.
export default {
  fetch(request: Request) {
    app ??= createApp(loadEnv())
    return app.fetch(request)
  },
}
