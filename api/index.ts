// Vercel Function for /api/* (vercel.json rewrites /api/(.*) here).
// The server is bundled into ./_server.mjs during `npm run build` (scripts/build-api.mjs),
// so Node's ES-module rules about import extensions never apply to our sources.
// Files starting with "_" in api/ are not turned into functions by Vercel.
// @ts-expect-error generated at build time; not present in the repo
import handler from './_server.mjs'

export default handler as { fetch(request: Request): Promise<Response> | Response }
