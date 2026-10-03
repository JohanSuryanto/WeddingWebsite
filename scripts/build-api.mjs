// Bundles server/ (and the shared src/ modules it uses) into api/_server.mjs.
// npm packages stay external: Vercel installs them and traces them from this file.
import { build } from 'esbuild'

await build({
  entryPoints: ['server/vercel.ts'],
  outfile: 'api/_server.mjs',
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node22',
  packages: 'external',
  sourcemap: 'linked',
  logLevel: 'info',
})
