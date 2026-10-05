// Sample photos and music offered in the upload picker (admin only, so they never
// reach the public bundle). Regenerate with `node scripts/generate-media-samples.mjs`,
// or replace a file with your own under the same name.
import bankBca from './bank-bca.webp?url'
import bankMandiri from './bank-mandiri.webp?url'
import bankBni from './bank-bni.webp?url'
import bankBri from './bank-bri.webp?url'
import bankBsi from './bank-bsi.webp?url'
import bankCimb from './bank-cimb.webp?url'
import couple1 from './couple-1.webp?url'
import couple2 from './couple-2.webp?url'
import couple3 from './couple-3.webp?url'
import couple4 from './couple-4.webp?url'
import couple5 from './couple-5.webp?url'
import couple6 from './couple-6.webp?url'
import bride1 from './bride-1.webp?url'
import bride2 from './bride-2.webp?url'
import bride3 from './bride-3.webp?url'
import bride4 from './bride-4.webp?url'
import bride5 from './bride-5.webp?url'
import bride6 from './bride-6.webp?url'
import groom1 from './groom-1.webp?url'
import groom2 from './groom-2.webp?url'
import groom3 from './groom-3.webp?url'
import groom4 from './groom-4.webp?url'
import groom5 from './groom-5.webp?url'
import groom6 from './groom-6.webp?url'
import music1 from './music-1.wav?url'
import music2 from './music-2.wav?url'
import music3 from './music-3.wav?url'
import photo1 from './photo-1.webp?url'
import photo2 from './photo-2.webp?url'
import photo3 from './photo-3.webp?url'
import photo4 from './photo-4.webp?url'
import photo5 from './photo-5.webp?url'
import photo6 from './photo-6.webp?url'

export interface MediaSample {
  id: string
  /** Shown in the picker; also the gallery photo's starting description. */
  label: string
  url: string
  mime: string
}

export const SAMPLE_PHOTOS: readonly MediaSample[] = [
  { id: 'photo-1', label: 'Mawar merah muda', url: photo1, mime: 'image/webp' },
  { id: 'photo-2', label: 'Cincin pernikahan', url: photo2, mime: 'image/webp' },
  { id: 'photo-3', label: 'Lengkung bunga', url: photo3, mime: 'image/webp' },
  { id: 'photo-4', label: 'Buket bunga', url: photo4, mime: 'image/webp' },
  { id: 'photo-5', label: 'Daun eukaliptus', url: photo5, mime: 'image/webp' },
  { id: 'photo-6', label: 'Cahaya lilin', url: photo6, mime: 'image/webp' },
]

/** Silhouettes for the bride's and groom's photo fields, instead of SAMPLE_PHOTOS. */
export const SAMPLE_BRIDE: readonly MediaSample[] = [
  { id: 'bride-1', label: 'Rambut panjang', url: bride1, mime: 'image/webp' },
  { id: 'bride-2', label: 'Sanggul', url: bride2, mime: 'image/webp' },
  { id: 'bride-3', label: 'Berhijab', url: bride3, mime: 'image/webp' },
  { id: 'bride-4', label: 'Kerudung pengantin', url: bride4, mime: 'image/webp' },
  { id: 'bride-5', label: 'Rambut pendek', url: bride5, mime: 'image/webp' },
  { id: 'bride-6', label: 'Hijab & mahkota', url: bride6, mime: 'image/webp' },
]

export const SAMPLE_GROOM: readonly MediaSample[] = [
  { id: 'groom-1', label: 'Jas & dasi', url: groom1, mime: 'image/webp' },
  { id: 'groom-2', label: 'Dasi kupu-kupu', url: groom2, mime: 'image/webp' },
  { id: 'groom-3', label: 'Peci & beskap', url: groom3, mime: 'image/webp' },
  { id: 'groom-4', label: 'Berkacamata', url: groom4, mime: 'image/webp' },
  { id: 'groom-5', label: 'Rambut klimis', url: groom5, mime: 'image/webp' },
  { id: 'groom-6', label: 'Peci & jas', url: groom6, mime: 'image/webp' },
]

/** The couple together, first in the gallery and story pickers. */
export const SAMPLE_COUPLE: readonly MediaSample[] = [
  { id: 'couple-1', label: 'Berdua', url: couple1, mime: 'image/webp' },
  { id: 'couple-2', label: 'Di bawah lengkung bunga', url: couple2, mime: 'image/webp' },
  { id: 'couple-3', label: 'Senja berdua', url: couple3, mime: 'image/webp' },
  { id: 'couple-4', label: 'Berhijab & berpeci', url: couple4, mime: 'image/webp' },
  { id: 'couple-5', label: 'Malam berbintang', url: couple5, mime: 'image/webp' },
  { id: 'couple-6', label: 'Penuh cinta', url: couple6, mime: 'image/webp' },
]

export const SAMPLE_GALLERY: readonly MediaSample[] = [...SAMPLE_COUPLE, ...SAMPLE_PHOTOS]

/** Simple bank name tiles for gift accounts (not official logos). */
export const SAMPLE_BANKS: readonly MediaSample[] = [
  { id: 'bank-bca', label: 'BCA', url: bankBca, mime: 'image/webp' },
  { id: 'bank-mandiri', label: 'Bank Mandiri', url: bankMandiri, mime: 'image/webp' },
  { id: 'bank-bni', label: 'BNI', url: bankBni, mime: 'image/webp' },
  { id: 'bank-bri', label: 'BRI', url: bankBri, mime: 'image/webp' },
  { id: 'bank-bsi', label: 'BSI', url: bankBsi, mime: 'image/webp' },
  { id: 'bank-cimb', label: 'CIMB Niaga', url: bankCimb, mime: 'image/webp' },
]

export const SAMPLE_MUSIC: readonly MediaSample[] = [
  { id: 'music-1', label: 'Lembut (piano)', url: music1, mime: 'audio/wav' },
  { id: 'music-2', label: 'Waltz romantis', url: music2, mime: 'audio/wav' },
  { id: 'music-3', label: 'Ceria', url: music3, mime: 'audio/wav' },
]

/** Downloads a sample as a File, so it goes through the normal upload path. */
export async function sampleFile(sample: MediaSample): Promise<File> {
  const res = await fetch(sample.url)
  if (!res.ok) throw new Error('Contoh tidak bisa dimuat')
  const blob = await res.blob()
  const ext = sample.url.split('?')[0].split('.').pop() ?? 'bin'
  return new File([blob], `${sample.label}.${ext}`, { type: sample.mime })
}
