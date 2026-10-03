// Image/audio imports in shared sample content resolve to a path string:
// a URL under Vite, a file path under scripts/asset-loader.mjs (seed script).
declare module '*.webp' {
  const src: string
  export default src
}
declare module '*.wav' {
  const src: string
  export default src
}
