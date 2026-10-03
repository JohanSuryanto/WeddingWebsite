// Lets plain Node (tsx) import images and audio the way Vite does: the import's
// default export becomes the file's absolute path. Used by the seed script, which
// reads the sample couple from src/content/samples (research R13).
// Usage: tsx --import ./scripts/asset-loader.mjs scripts/db-seed.ts
import { register } from 'node:module'

const hooks = `
const ASSET = /\\.(webp|jpe?g|png|gif|svg|wav|mp3|ogg|m4a)$/i
export async function load(url, context, next) {
  if (ASSET.test(new URL(url).pathname)) {
    const { fileURLToPath } = await import('node:url')
    return { format: 'module', shortCircuit: true, source: 'export default ' + JSON.stringify(fileURLToPath(url)) }
  }
  return next(url, context)
}
`

register(`data:text/javascript,${encodeURIComponent(hooks)}`)
