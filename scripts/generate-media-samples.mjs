// Generates the admin's sample library (src/admin/media/samples): 6 decorative
// photos and 3 short background melodies, offered in the upload picker.
// Replace any file with your own (same name), or edit samples/index.ts.
// Usage: node scripts/generate-media-samples.mjs
import { mkdirSync, writeFileSync } from 'node:fs'
import sharp from 'sharp'

const out = 'src/admin/media/samples'
mkdirSync(out, { recursive: true })

// ---------- Photos ----------------------------------------------------------

const rand = (() => {
  let s = 20261003
  return () => ((s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff)
})()

const gradient = (id, a, b, angle = 1) =>
  `<linearGradient id="${id}" x1="0" y1="0" x2="${angle}" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient>`

/** A rose: layered petals around a center. */
function rose(cx, cy, r, color, dark) {
  let s = ''
  for (let ring = 3; ring >= 1; ring--) {
    const rr = (r * ring) / 3
    const n = 5 + ring
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + ring
      s += `<ellipse cx="${cx + Math.cos(a) * rr * 0.45}" cy="${cy + Math.sin(a) * rr * 0.45}" rx="${rr * 0.55}" ry="${rr * 0.38}" transform="rotate(${(a * 180) / Math.PI} ${cx + Math.cos(a) * rr * 0.45} ${cy + Math.sin(a) * rr * 0.45})" fill="${ring === 1 ? dark : color}" fill-opacity="${0.55 + ring * 0.1}"/>`
    }
  }
  return s + `<circle cx="${cx}" cy="${cy}" r="${r * 0.12}" fill="${dark}"/>`
}

/** A leaf sprig along a curve. */
function sprig(x, y, len, angle, color) {
  let s = `<path d="M${x} ${y} q ${Math.cos(angle) * len * 0.5} ${Math.sin(angle) * len * 0.5 - len * 0.15} ${Math.cos(angle) * len} ${Math.sin(angle) * len}" stroke="${color}" stroke-width="${len * 0.015}" fill="none"/>`
  for (let i = 1; i <= 6; i++) {
    const t = i / 7
    const px = x + Math.cos(angle) * len * t
    const py = y + Math.sin(angle) * len * t - len * 0.08 * Math.sin(Math.PI * t)
    for (const side of [-1, 1]) {
      const a = (angle * 180) / Math.PI + side * 55
      s += `<ellipse cx="${px}" cy="${py}" rx="${len * 0.09}" ry="${len * 0.035}" transform="rotate(${a} ${px} ${py}) translate(${len * 0.07} 0)" fill="${color}" fill-opacity="0.85"/>`
    }
  }
  return s
}

function bokeh(w, h, n, colors) {
  let s = ''
  for (let i = 0; i < n; i++) {
    const r = 20 + rand() * Math.min(w, h) * 0.09
    s += `<circle cx="${rand() * w}" cy="${rand() * h}" r="${r}" fill="${colors[i % colors.length]}" fill-opacity="${0.12 + rand() * 0.3}"/>`
  }
  return s
}

const photos = [
  {
    name: 'photo-1',
    w: 1600,
    h: 1200,
    body: (w, h) =>
      `<defs>${gradient('g', '#FBEFF1', '#E8B9C3')}</defs><rect width="100%" height="100%" fill="url(#g)"/>` +
      bokeh(w, h, 18, ['#ffffff', '#F6D5DC']) +
      sprig(w * 0.18, h * 0.82, w * 0.3, -0.6, '#8FA88A') +
      sprig(w * 0.86, h * 0.2, w * 0.25, 2.5, '#8FA88A') +
      rose(w * 0.38, h * 0.55, h * 0.2, '#E7A3B3', '#B95B73') +
      rose(w * 0.6, h * 0.45, h * 0.24, '#F2C2CC', '#C96F86') +
      rose(w * 0.74, h * 0.68, h * 0.14, '#EBAFBD', '#B95B73'),
  },
  {
    name: 'photo-2',
    w: 1200,
    h: 1600,
    body: (w, h) =>
      `<defs>${gradient('g', '#FFFDF7', '#EFE3CC')}${gradient('gold', '#F3DFA2', '#B8893A')}</defs>` +
      `<rect width="100%" height="100%" fill="url(#g)"/>` +
      bokeh(w, h, 14, ['#ffffff', '#F3E6C4']) +
      `<circle cx="${w * 0.42}" cy="${h * 0.5}" r="${w * 0.2}" fill="none" stroke="url(#gold)" stroke-width="${w * 0.045}"/>` +
      `<circle cx="${w * 0.6}" cy="${h * 0.5}" r="${w * 0.2}" fill="none" stroke="url(#gold)" stroke-width="${w * 0.045}"/>` +
      `<circle cx="${w * 0.6}" cy="${h * 0.5 - w * 0.2}" r="${w * 0.035}" fill="#ffffff" stroke="#E9D9A8" stroke-width="6"/>` +
      sprig(w * 0.1, h * 0.86, w * 0.45, -0.3, '#A9B89A'),
  },
  {
    name: 'photo-3',
    w: 1600,
    h: 1200,
    body: (w, h) => {
      let flowers = ''
      for (let i = 0; i <= 14; i++) {
        const a = Math.PI + (i / 14) * Math.PI
        const x = w / 2 + Math.cos(a) * w * 0.3
        const y = h * 0.72 + Math.sin(a) * h * 0.5
        flowers += rose(x, y, h * (0.05 + rand() * 0.04), i % 2 ? '#F4D3DA' : '#FFFFFF', i % 2 ? '#C98597' : '#D9B5BE')
      }
      return (
        `<defs>${gradient('g', '#EAF1E8', '#C9D8C5')}</defs><rect width="100%" height="100%" fill="url(#g)"/>` +
        `<path d="M${w * 0.2} ${h} V${h * 0.72} A${w * 0.3} ${h * 0.5} 0 0 1 ${w * 0.8} ${h * 0.72} V${h}" fill="none" stroke="#FFFFFF" stroke-opacity="0.7" stroke-width="${w * 0.03}"/>` +
        flowers +
        sprig(w * 0.2, h * 0.7, w * 0.15, -2.2, '#7E9A78') +
        sprig(w * 0.8, h * 0.7, w * 0.15, -0.9, '#7E9A78')
      )
    },
  },
  {
    name: 'photo-4',
    w: 1200,
    h: 1600,
    body: (w, h) =>
      `<defs>${gradient('g', '#F7EDE6', '#DCC1B0')}</defs><rect width="100%" height="100%" fill="url(#g)"/>` +
      bokeh(w, h, 12, ['#ffffff']) +
      sprig(w * 0.5, h * 0.62, w * 0.5, -2.3, '#8FA88A') +
      sprig(w * 0.5, h * 0.62, w * 0.5, -0.8, '#8FA88A') +
      sprig(w * 0.5, h * 0.62, w * 0.45, -1.6, '#7E9A78') +
      rose(w * 0.4, h * 0.42, w * 0.13, '#FFFFFF', '#D8B4A8') +
      rose(w * 0.6, h * 0.4, w * 0.15, '#F3D5CC', '#C38B78') +
      rose(w * 0.5, h * 0.52, w * 0.14, '#ECC3B8', '#B97663') +
      `<path d="M${w * 0.44} ${h * 0.6} L${w * 0.5} ${h * 0.92} L${w * 0.56} ${h * 0.6} Z" fill="#9C7A5B" fill-opacity="0.85"/>` +
      `<path d="M${w * 0.42} ${h * 0.66} q ${w * 0.08} ${h * 0.05} ${w * 0.16} 0" stroke="#F7EDE6" stroke-width="10" fill="none"/>`,
  },
  {
    name: 'photo-5',
    w: 1600,
    h: 1200,
    body: (w, h) => {
      let leaves = ''
      for (let i = 0; i < 9; i++) leaves += sprig(rand() * w, h * (0.2 + rand() * 0.8), w * (0.2 + rand() * 0.15), -0.4 - rand() * 2.2, i % 2 ? '#7E9A78' : '#A3B79A')
      return `<defs>${gradient('g', '#F3F1EA', '#D6DDCF')}</defs><rect width="100%" height="100%" fill="url(#g)"/>` + leaves
    },
  },
  {
    name: 'photo-6',
    w: 1200,
    h: 1600,
    body: (w, h) =>
      `<defs>${gradient('g', '#2B2A3F', '#5B4A5E')}<radialGradient id="glow"><stop offset="0" stop-color="#FFE9B8"/><stop offset="1" stop-color="#FFE9B8" stop-opacity="0"/></radialGradient></defs>` +
      `<rect width="100%" height="100%" fill="url(#g)"/>` +
      bokeh(w, h, 40, ['#FFE3A6', '#F7C9A0', '#FFFFFF']) +
      [0.3, 0.5, 0.7]
        .map(
          (x, i) =>
            `<circle cx="${w * x}" cy="${h * (0.52 - i * 0.04)}" r="${w * 0.16}" fill="url(#glow)"/>` +
            `<rect x="${w * x - w * 0.045}" y="${h * (0.55 - i * 0.04)}" width="${w * 0.09}" height="${h * (0.35 + i * 0.04)}" rx="12" fill="#FBF6EC"/>` +
            `<ellipse cx="${w * x}" cy="${h * (0.52 - i * 0.04)}" rx="${w * 0.018}" ry="${w * 0.04}" fill="#FFD27A"/>`,
        )
        .join(''),
  },
]

for (const p of photos) {
  const svg = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${p.w}" height="${p.h}">${p.body(p.w, p.h)}</svg>`)
  await sharp(svg).webp({ quality: 82 }).toFile(`${out}/${p.name}.webp`)
  console.log(`${out}/${p.name}.webp`)
}

// ---------- Music -----------------------------------------------------------

const RATE = 22050
const SECONDS = 24

const NOTE = (n) => 440 * 2 ** ((n - 69) / 12)
const midi = (name) => {
  const m = /^([A-G])(#?)(\d)$/.exec(name)
  return 12 * (Number(m[3]) + 1) + { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }[m[1]] + (m[2] ? 1 : 0)
}

/** Soft piano-like tone: a few harmonics with a quick attack and long decay. */
function addNote(buf, start, freq, dur, gain) {
  const s0 = Math.floor(start * RATE)
  const n = Math.min(Math.floor(dur * RATE), buf.length - s0)
  for (let i = 0; i < n; i++) {
    const t = i / RATE
    const env = Math.min(1, t / 0.012) * Math.exp(-t * 2.2)
    const v =
      Math.sin(2 * Math.PI * freq * t) +
      0.35 * Math.sin(2 * Math.PI * 2 * freq * t) * Math.exp(-t * 3) +
      0.12 * Math.sin(2 * Math.PI * 3 * freq * t) * Math.exp(-t * 5)
    buf[s0 + i] += v * env * gain
  }
}

function render({ bpm, beatsPerBar, chords, pattern }) {
  const buf = new Float32Array(RATE * SECONDS)
  const beat = 60 / bpm
  let t = 0
  for (let bar = 0; t < SECONDS - 2; bar++) {
    const chord = chords[bar % chords.length].map(midi)
    addNote(buf, t, NOTE(chord[0] - 12), beat * beatsPerBar * 1.5, 0.22)
    pattern.forEach((idx, k) => {
      const when = t + k * (beat * beatsPerBar) / pattern.length
      addNote(buf, when, NOTE(chord[idx % chord.length] + (idx >= chord.length ? 12 : 0)), beat * 2.5, 0.16)
    })
    t += beat * beatsPerBar
  }
  // Light echo, then fade in/out and normalise.
  const d = Math.floor(0.23 * RATE)
  for (let i = d; i < buf.length; i++) buf[i] += buf[i - d] * 0.28
  let peak = 0
  for (let i = 0; i < buf.length; i++) {
    const tt = i / RATE
    buf[i] *= Math.min(1, tt / 1.5) * Math.min(1, (SECONDS - tt) / 3)
    peak = Math.max(peak, Math.abs(buf[i]))
  }
  const pcm = Buffer.alloc(44 + buf.length * 2)
  pcm.write('RIFF', 0)
  pcm.writeUInt32LE(36 + buf.length * 2, 4)
  pcm.write('WAVEfmt ', 8)
  pcm.writeUInt32LE(16, 16)
  pcm.writeUInt16LE(1, 20) // PCM
  pcm.writeUInt16LE(1, 22) // mono
  pcm.writeUInt32LE(RATE, 24)
  pcm.writeUInt32LE(RATE * 2, 28)
  pcm.writeUInt16LE(2, 32)
  pcm.writeUInt16LE(16, 34)
  pcm.write('data', 36)
  pcm.writeUInt32LE(buf.length * 2, 40)
  for (let i = 0; i < buf.length; i++) pcm.writeInt16LE(Math.round((buf[i] / peak) * 0.8 * 32767), 44 + i * 2)
  return pcm
}

const songs = [
  // Gentle: C – G – Am – F, flowing arpeggio
  { name: 'music-1', bpm: 72, beatsPerBar: 4, chords: [['C4', 'E4', 'G4'], ['G3', 'B3', 'D4'], ['A3', 'C4', 'E4'], ['F3', 'A3', 'C4']], pattern: [0, 1, 2, 3, 2, 1, 0, 1] },
  // Waltz: D – Bm – G – A in 3/4
  { name: 'music-2', bpm: 84, beatsPerBar: 3, chords: [['D4', 'F#4', 'A4'], ['B3', 'D4', 'F#4'], ['G3', 'B3', 'D4'], ['A3', 'C#4', 'E4']], pattern: [0, 1, 2, 3, 2, 1] },
  // Bright: G – D – Em – C
  { name: 'music-3', bpm: 96, beatsPerBar: 4, chords: [['G3', 'B3', 'D4'], ['D4', 'F#4', 'A4'], ['E4', 'G4', 'B4'], ['C4', 'E4', 'G4']], pattern: [0, 2, 1, 3, 0, 2, 1, 2] },
]

for (const song of songs) {
  writeFileSync(`${out}/${song.name}.wav`, render(song))
  console.log(`${out}/${song.name}.wav`)
}
