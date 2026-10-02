// Generates upload fixtures for the admin e2e tests (tests/e2e-admin/fixtures).
import sharp from 'sharp'
import { copyFileSync, mkdirSync, statSync, writeFileSync } from 'node:fs'

const out = 'tests/e2e-admin/fixtures'
mkdirSync(out, { recursive: true })

// A noisy 4000×3000 photo at high quality ≈ a 5 MB phone picture.
const width = 4000
const height = 3000
const pixels = Buffer.alloc(width * height * 3)
let seed = 7
for (let i = 0; i < pixels.length; i += 3) {
  seed = (seed * 1103515245 + 12345) & 0x7fffffff
  const x = (i / 3) % width
  const y = Math.floor(i / 3 / width)
  pixels[i] = (x / width) * 200 + (seed % 55)
  pixels[i + 1] = (y / height) * 160 + ((seed >> 8) % 60)
  pixels[i + 2] = 150 + ((seed >> 16) % 90)
}
const raw = { raw: { width, height, channels: 3 } }
// Over the 10 MB upload limit (rejection test).
await sharp(pixels, raw)
  .jpeg({ quality: 98, chromaSubsampling: '4:4:4' })
  .toFile(`${out}/too-big.jpg`)
// About 5 MB, like a phone photo (compression test).
await sharp(pixels, raw).blur(0.6).jpeg({ quality: 97 }).toFile(`${out}/large-photo.jpg`)

const colors = ['#d8a7b1', '#9e7a8c', '#c9a66b']
for (const [i, color] of colors.entries()) {
  await sharp({ create: { width: 1200, height: 900, channels: 3, background: color } })
    .jpeg({ quality: 80 })
    .toFile(`${out}/photo-${i + 1}.jpg`)
}

copyFileSync('src/content/samples/anisa-raka/backsound.wav', `${out}/song.wav`)
writeFileSync(`${out}/notes.txt`, 'bukan gambar')

for (const f of ['large-photo.jpg', 'too-big.jpg']) {
  console.log(`${f}: ${(statSync(`${out}/${f}`).size / 1024 / 1024).toFixed(1)} MB`)
}
