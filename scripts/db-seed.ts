// Adds the sample couple Anisa & Raka (FR-022) with its photos and music uploaded
// through the configured media provider. Safe to run more than once.
// Usage: npm run db:seed [-- --passcode-file <path>]
import { randomUUID } from 'node:crypto'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, extname } from 'node:path'
import { anisaRaka } from '../src/content/samples/anisa-raka/content'
import { mapSources, mediaRef } from '../src/data/resolveMedia'
import { closeDb, getDb } from '../server/db/client'
import { createCouple, findRowBySlug } from '../server/db/repos/couples'
import { media as mediaTable, wishes } from '../server/db/schema'
import { loadEnv, loadEnvFileIfPresent } from '../server/env'
import { createMediaProvider, keyFor } from '../server/media/provider'

const SLUG = 'anisa-raka'
const MIME: Record<string, string> = {
  '.webp': 'image/webp',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.wav': 'audio/wav',
  '.mp3': 'audio/mpeg',
}

loadEnvFileIfPresent()
// The seed only needs the database and media settings.
const env = loadEnv({ API_SURFACE: 'public', ...process.env })
const passcodeFile = process.argv.includes('--passcode-file')
  ? process.argv[process.argv.indexOf('--passcode-file') + 1]
  : undefined

const db = await getDb(env.DATABASE_URL)
const existing = await findRowBySlug(db, SLUG)
let passcode = existing?.passcode

if (existing) {
  console.log(`Anisa & Raka sudah ada. Kode akses: ${passcode}`)
} else {
  const provider = await createMediaProvider(env)
  const coupleId = randomUUID()
  // The asset loader turns each image/audio import into its file path.
  const files = new Set<string>()
  mapSources(anisaRaka, (src) => {
    if (src) files.add(src)
    return null
  })
  const refs = new Map<string, string>()
  const rows: (typeof mediaTable.$inferInsert)[] = []
  for (const file of files) {
    const mime = MIME[extname(file).toLowerCase()]
    if (!mime) throw new Error(`Jenis file tidak dikenal: ${file}`)
    const kind = mime.startsWith('audio/') ? 'audio' : 'image'
    const id = randomUUID()
    const key = keyFor(env.MEDIA_ROOT, coupleId, id)
    const bytes = new Uint8Array(readFileSync(file))
    const uploaded = await provider.upload(key, bytes, kind, mime)
    refs.set(file, mediaRef(id))
    rows.push({
      id,
      coupleId,
      kind,
      mime,
      size: uploaded.bytes,
      width: uploaded.width,
      height: uploaded.height,
      providerKey: key,
      url: uploaded.url,
      status: 'ready',
    })
    console.log(`  diunggah: ${file.split(/[\\/]/).pop()}`)
  }

  const content = mapSources(anisaRaka, (src) => refs.get(src))
  const row = await createCouple(
    db,
    { slug: SLUG, defaultTheme: 'romantic-floral', content },
    { id: coupleId, status: 'active', skipMediaCheck: true },
  )
  await db.insert(mediaTable).values(rows)
  const sampleWishes = anisaRaka.sampleWishes ?? []
  if (sampleWishes.length) {
    await db.insert(wishes).values(
      sampleWishes.map((w) => ({
        id: randomUUID(),
        coupleId,
        name: w.name,
        message: w.message,
        attendance: w.attendance ?? null,
        createdAt: new Date(w.createdAt),
      })),
    )
  }
  passcode = row.passcode
  console.log(`Anisa & Raka siap. Kode akses: ${passcode}`)
}

if (passcodeFile && passcode) {
  mkdirSync(dirname(passcodeFile), { recursive: true })
  writeFileSync(passcodeFile, passcode)
}
await closeDb(env.DATABASE_URL)
