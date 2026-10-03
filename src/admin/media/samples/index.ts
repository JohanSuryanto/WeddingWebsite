// Sample photos and music offered in the upload picker (admin only, so they never
// reach the public bundle). Regenerate with `node scripts/generate-media-samples.mjs`,
// or replace a file with your own under the same name.
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
