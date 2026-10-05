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

// ---------- Bride and groom silhouettes --------------------------------------
// Square, like the portrait fields. Added after the photos above so the seeded
// `rand` sequence, and so those photos, stay unchanged.

const backdrop = (a, b) =>
  `<defs>${gradient('g', a, b)}</defs><rect width="100%" height="100%" fill="url(#g)"/>` +
  bokeh(1000, 1000, 10, ['#ffffff'])

const WOMAN_BODY = `<path d="M180 1000 C190 820 300 700 420 670 L500 690 L580 670 C700 700 810 820 820 1000 Z"/>`
const WOMAN_HEAD = `<ellipse cx="500" cy="390" rx="105" ry="125"/><rect x="462" y="490" width="76" height="200"/>`
const LONG_HAIR = `<path d="M330 420 C320 250 420 200 500 200 C580 200 680 250 670 420 C668 560 690 660 720 780 Q500 830 280 780 C310 660 332 560 330 420 Z"/>`
const HAIR_CAP = `<path d="M392 410 C378 255 440 232 500 232 C562 232 622 255 608 410 C602 340 570 300 500 300 C430 300 398 340 392 410 Z"/>`
const HIJAB = `<path d="M500 235 C605 235 650 320 648 425 C646 520 620 585 690 650 C765 700 805 800 812 1000 L188 1000 C195 800 235 700 310 650 C380 585 354 520 352 425 C350 320 395 235 500 235 Z"/>`

/** A woman's silhouette: `hair` behind the head, `extra` drawn on top. */
const woman = (fill, { hair = '', hijab = false, extra = '' }) =>
  `<g fill="${fill}">${hijab ? HIJAB : hair + WOMAN_HEAD + WOMAN_BODY}</g>${extra}`

const MAN = `<ellipse cx="500" cy="385" rx="102" ry="122"/><rect x="452" y="470" width="96" height="170"/><path d="M130 1000 C140 760 280 630 420 610 L500 630 L580 610 C720 630 860 760 870 1000 Z"/>`
const SHORT_HAIR = `<path d="M396 400 C380 250 440 205 500 205 C565 205 622 250 604 400 C600 330 570 300 500 300 C430 300 400 330 396 400 Z"/>`
const SWEPT_HAIR = `<path d="M396 400 C372 250 430 185 525 190 C610 196 640 260 604 400 C600 330 565 292 480 298 C432 302 404 335 396 400 Z"/>`
const peci = (fill) => `<path d="M396 335 L402 228 C462 212 538 212 598 228 L604 335 Z" fill="${fill}"/>`
const collar = (light) => `<path d="M440 612 L500 770 L560 612 L500 632 Z" fill="${light}"/>`
const tie = (dark) => `<path d="M485 642 L515 642 L526 740 L500 785 L474 740 Z" fill="${dark}"/>`
const bowTie = (dark) => `<path d="M458 630 L500 650 L458 672 Z M542 630 L500 650 L542 672 Z" fill="${dark}"/><circle cx="500" cy="650" r="12" fill="${dark}"/>`
/** Beskap: high band collar with buttons down the front. */
const beskap = (light, gold) =>
  `<path d="M436 598 L564 598 L570 642 L430 642 Z" fill="${light}"/>` +
  [690, 760, 830, 900].map((y) => `<circle cx="500" cy="${y}" r="11" fill="${gold}"/>`).join('')
const glasses = (light) =>
  `<g fill="none" stroke="${light}" stroke-width="9"><circle cx="458" cy="380" r="34"/><circle cx="542" cy="380" r="34"/><path d="M492 380 h16 M424 374 L400 366 M576 374 L600 366"/></g>`
const crown = (gold) => `<path d="M430 252 L444 196 L470 230 L500 180 L530 230 L556 196 L570 252 Z" fill="${gold}"/>`
const pearls = () =>
  Array.from({ length: 9 }, (_, i) => {
    const a = Math.PI * (0.15 + (i / 8) * 0.7)
    return `<circle cx="${500 - Math.cos(a) * 80}" cy="${640 + Math.sin(a) * 60}" r="9" fill="#FFF8F0"/>`
  }).join('')

const portraits = [
  ['bride-1', '#FBEFF1', '#E8B9C3', woman('#7A4E5E', { hair: LONG_HAIR, extra: rose(640, 290, 48, '#F2C2CC', '#C96F86') })],
  ['bride-2', '#F1F5EE', '#C9D8C5', woman('#5E6B57', { hair: `<circle cx="500" cy="232" r="72"/>` + HAIR_CAP, extra: rose(560, 200, 40, '#FFFFFF', '#D9B5BE') })],
  ['bride-3', '#FFFDF7', '#EFE3CC', woman('#8A6A4F', { hijab: true, extra: rose(600, 640, 34, '#F3DFA2', '#B8893A') })],
  ['bride-4', '#F4F0F8', '#D5CBE3', woman('#5D5170', { hair: LONG_HAIR }) + `<path d="M500 225 C640 225 700 330 770 1000 L230 1000 C300 330 360 225 500 225 Z" fill="#FFFFFF" fill-opacity="0.28"/>` + rose(500, 225, 30, '#FFFFFF', '#D5CBE3')],
  ['bride-5', '#FDF1EA', '#EBC3B0', woman('#8A5545', { hair: `<path d="M370 420 C360 250 430 215 500 215 C570 215 640 250 630 420 C634 500 648 560 660 600 Q500 630 340 600 C352 560 366 500 370 420 Z"/>`, extra: pearls() })],
  ['bride-6', '#FBF6EC', '#E4D2AE', woman('#6E4E5A', { hijab: true, extra: crown('#D9B25F') })],
  ['groom-1', '#EEF1F5', '#C6CFDB', `<g fill="#3F4A5C">${SHORT_HAIR}${MAN}</g>` + collar('#F4F6F9') + tie('#2A3240')],
  ['groom-2', '#F1F5EE', '#C9D8C5', `<g fill="#46523F">${SHORT_HAIR}${MAN}</g>` + collar('#F7F9F4') + bowTie('#2E3829')],
  ['groom-3', '#FFFDF7', '#EFE3CC', `<g fill="#5A4A3A">${MAN}</g>` + peci('#2B2522') + beskap('#F3E7CF', '#C9A04A')],
  ['groom-4', '#F4F0F8', '#D5CBE3', `<g fill="#4B4560">${SHORT_HAIR}${MAN}</g>` + glasses('#E9E4F2') + collar('#F7F5FA') + tie('#2F2B3D')],
  ['groom-5', '#FDF1EA', '#EBC3B0', `<g fill="#5B4038">${SWEPT_HAIR}${MAN}</g>` + collar('#FBF4F0') + bowTie('#3A2723')],
  ['groom-6', '#EAF0F6', '#B9C8DA', `<g fill="#34425A">${MAN}</g>` + peci('#1E2533') + collar('#F2F5F9') + tie('#1E2533')],
]
for (const [name, a, b, figure] of portraits) photos.push({ name, w: 1000, h: 1000, body: () => backdrop(a, b) + figure })

// ---------- The couple together (gallery and story) --------------------------
// The same silhouettes, side by side on a 1600×1200 scene.

const heart = (x, y, s, fill) =>
  `<path transform="translate(${x} ${y}) scale(${s})" d="M0 30 C-60 -20 -30 -70 0 -40 C30 -70 60 -20 0 30 Z" fill="${fill}"/>`
const stars = (n) =>
  Array.from({ length: n }, () => `<circle cx="${rand() * 1600}" cy="${rand() * 700}" r="${2 + rand() * 4}" fill="#FFFFFF" fill-opacity="${0.4 + rand() * 0.6}"/>`).join('')
/** Bride on the left, groom on the right, shoulders touching. */
const pair = (bride, groom) =>
  `<g transform="translate(200 330) scale(0.88)">${bride}</g><g transform="translate(560 260) scale(0.94)">${groom}</g>`
const scene = (a, b, extra = '') =>
  `<defs>${gradient('g', a, b)}</defs><rect width="100%" height="100%" fill="url(#g)"/>${extra}`

const longHairBride = (fill) => woman(fill, { hair: LONG_HAIR })
const suitGroom = (fill, light, dark) => `<g fill="${fill}">${SHORT_HAIR}${MAN}</g>` + collar(light) + tie(dark)

const together = [
  ['couple-1', () => scene('#FBEFF1', '#E8B9C3', bokeh(1600, 1200, 16, ['#ffffff'])) + pair(longHairBride('#8A5A6B'), suitGroom('#4A3F52', '#F7F1F4', '#2E2733')) + heart(800, 250, 1.6, '#E7A3B3')],
  ['couple-2', () => scene('#EAF1E8', '#C9D8C5', `<path d="M300 1200 V560 A500 460 0 0 1 1300 560 V1200" fill="none" stroke="#FFFFFF" stroke-opacity="0.75" stroke-width="40"/>` + Array.from({ length: 13 }, (_, i) => { const a = Math.PI + (i / 12) * Math.PI; return rose(800 + Math.cos(a) * 500, 560 + Math.sin(a) * 460, 40, i % 2 ? '#F4D3DA' : '#FFFFFF', i % 2 ? '#C98597' : '#D9B5BE') }).join('')) + pair(longHairBride('#5E6B57'), suitGroom('#3E4A39', '#F4F7F2', '#2A3326'))],
  ['couple-3', () => scene('#F7C59F', '#E0777D', `<circle cx="800" cy="760" r="300" fill="#FFE3B3" fill-opacity="0.85"/><rect y="1000" width="1600" height="200" fill="#B5525E" fill-opacity="0.5"/>`) + pair(longHairBride('#3B2230'), suitGroom('#3B2230', '#3B2230', '#3B2230'))],
  ['couple-4', () => scene('#FFFDF7', '#EFE3CC', bokeh(1600, 1200, 16, ['#ffffff', '#F3E6C4'])) + pair(woman('#8A6A4F', { hijab: true, extra: rose(600, 640, 34, '#F3DFA2', '#B8893A') }), `<g fill="#5A4A3A">${MAN}</g>` + peci('#2B2522') + beskap('#F3E7CF', '#C9A04A'))],
  ['couple-5', () => scene('#1E2540', '#4A3F6B', stars(70) + `<circle cx="1330" cy="220" r="80" fill="#FFF6D8"/><circle cx="1365" cy="200" r="72" fill="#28304F"/>`) + pair(longHairBride('#0F1428'), suitGroom('#0F1428', '#0F1428', '#0F1428'))],
  ['couple-6', () => scene('#F4F0F8', '#D5CBE3', [[260, 300, 1.2], [1340, 260, 1.5], [1200, 520, 0.9], [420, 600, 0.8], [800, 200, 1.1]].map(([x, y, s]) => heart(x, y, s, '#FFFFFF')).join('')) + pair(woman('#5D5170', { hair: `<circle cx="500" cy="232" r="72"/>` + HAIR_CAP, extra: rose(560, 200, 40, '#FFFFFF', '#D5CBE3') }), `<g fill="#4B4560">${SWEPT_HAIR}${MAN}</g>` + collar('#F7F5FA') + bowTie('#2F2B3D'))],
]
// Bodies are functions so `rand` is only used after the photos above are drawn.
for (const [name, body] of together) photos.push({ name, w: 1600, h: 1200, body })

// ---------- Bank name tiles (gift accounts) ------------------------------------
// Simple name tiles, not the banks' official logos: replace a file with the real
// logo if you have it. Text stays in the middle so the picker's square crop fits.

const banks = [
  ['bank-bca', 'BCA', '#0060AF'],
  ['bank-mandiri', 'mandiri', '#003D79'],
  ['bank-bni', 'BNI', '#F15A23'],
  ['bank-bri', 'BRI', '#00529C'],
  ['bank-bsi', 'BSI', '#00A39D'],
  ['bank-cimb', 'CIMB', '#7A0019'],
]
for (const [name, text, color] of banks) {
  photos.push({
    name,
    w: 600,
    h: 400,
    body: () =>
      `<rect width="100%" height="100%" fill="#FFFFFF"/>` +
      `<rect x="150" y="285" width="300" height="14" rx="7" fill="${color}" fill-opacity="0.85"/>` +
      `<text x="300" y="240" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-weight="700" font-style="italic" font-size="${text.length > 4 ? 84 : 120}" fill="${color}">${text}</text>`,
  })
}

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
