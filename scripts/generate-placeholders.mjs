// Generates placeholder images and background music for development.
// Replace the files in src/content/images and public/music with real ones.
import sharp from 'sharp'
import { writeFileSync } from 'node:fs'

const out = 'src/content/samples/anisa-raka/images'
const palettes = [
  ['#F8E1E4', '#D8A7B1'],
  ['#FFF8F6', '#E9C4CC'],
  ['#EFD9E0', '#9E7A8C'],
  ['#F6E7DA', '#C9A66B'],
]

function svg(w, h, label, [a, b]) {
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
  <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient></defs>
  <rect width="100%" height="100%" fill="url(#g)"/>
  <g fill="#ffffff" fill-opacity="0.35">
    <circle cx="${w * 0.2}" cy="${h * 0.25}" r="${Math.min(w, h) * 0.18}"/>
    <circle cx="${w * 0.8}" cy="${h * 0.75}" r="${Math.min(w, h) * 0.24}"/>
  </g>
  <text x="50%" y="50%" text-anchor="middle" dominant-baseline="middle" font-family="Georgia, serif" font-size="${Math.min(w, h) * 0.07}" fill="#4A3440" fill-opacity="0.7">${label}</text>
</svg>`)
}

async function img(name, w, h, label, i) {
  await sharp(svg(w, h, label, palettes[i % palettes.length]))
    .webp({ quality: 70 })
    .toFile(`${out}/${name}.webp`)
}

await sharp(svg(1200, 1600, '', ['#FBF8F1', '#EADFCB']))
  .webp({ quality: 70 })
  .toFile(`${out}/cover-bg.webp`)
await img('bride', 600, 600, 'Foto Mempelai Wanita', 1)
await img('groom', 600, 600, 'Foto Mempelai Pria', 2)
for (let i = 1; i <= 4; i++) await img(`story-${i}`, 800, 600, `Cerita ${i}`, i)
const sizes = [
  [1200, 1600],
  [1600, 1200],
  [1200, 1200],
  [1200, 1600],
  [1600, 1200],
  [1200, 1200],
  [1200, 1600],
  [1600, 1200],
]
for (let i = 0; i < sizes.length; i++)
  await img(`gallery-${i + 1}`, sizes[i][0], sizes[i][1], `Galeri ${i + 1}`, i)

// Soft looping arpeggio (WAV) as placeholder background music.
const rate = 16000,
  seconds = 16
const samples = new Int16Array(rate * seconds)
const chords = [
  [261.63, 329.63, 392.0, 523.25],
  [220.0, 261.63, 329.63, 440.0],
  [174.61, 220.0, 261.63, 349.23],
  [196.0, 246.94, 293.66, 392.0],
]
const noteLen = rate / 2
for (let n = 0; n < samples.length / noteLen; n++) {
  const chord = chords[Math.floor(n / 8) % chords.length]
  const f = chord[n % 4]
  for (let i = 0; i < noteLen; i++) {
    const t = i / rate
    const env = Math.exp(-3 * t)
    const idx = n * noteLen + i
    if (idx < samples.length)
      samples[idx] = Math.round(
        6000 * env * (Math.sin(2 * Math.PI * f * t) + 0.3 * Math.sin(4 * Math.PI * f * t)),
      )
  }
}
const header = Buffer.alloc(44)
header.write('RIFF', 0)
header.writeUInt32LE(36 + samples.byteLength, 4)
header.write('WAVE', 8)
header.write('fmt ', 12)
header.writeUInt32LE(16, 16)
header.writeUInt16LE(1, 20)
header.writeUInt16LE(1, 22)
header.writeUInt32LE(rate, 24)
header.writeUInt32LE(rate * 2, 28)
header.writeUInt16LE(2, 32)
header.writeUInt16LE(16, 34)
header.write('data', 36)
header.writeUInt32LE(samples.byteLength, 40)
writeFileSync(
  'src/content/samples/anisa-raka/backsound.wav',
  Buffer.concat([header, Buffer.from(samples.buffer)]),
)
console.log('placeholders generated')
