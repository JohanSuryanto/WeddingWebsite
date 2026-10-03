import { MAX_UPLOAD_BYTES } from '../../data/mediaLimits'

/** Longest side (px) per kind of photo (research R7). */
export const PRESETS = {
  cover: 1600,
  gallery: 1600,
  story: 1000,
  portrait: 800,
  logo: 400,
} as const
export type ImagePreset = keyof typeof PRESETS

export { MAX_UPLOAD_BYTES }

/** Size that fits within `max` on the longest side, never enlarging. */
export function fitWithin(width: number, height: number, max: number) {
  const scale = Math.min(1, max / Math.max(width, height))
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  }
}

/** Indonesian error message, or null when the file is acceptable (FR-016). */
export function validateUpload(file: { type: string; size: number }, kind: 'image' | 'audio') {
  if (kind === 'image' && !file.type.startsWith('image/')) return 'File harus berupa gambar'
  if (kind === 'audio' && !file.type.startsWith('audio/')) return 'File harus berupa audio'
  if (file.size > MAX_UPLOAD_BYTES) return 'Ukuran maksimal 10 MB'
  return null
}

async function encode(
  canvas: OffscreenCanvas | HTMLCanvasElement,
  type: string,
  quality: number,
): Promise<Blob> {
  if ('convertToBlob' in canvas) return canvas.convertToBlob({ type, quality })
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('Gagal memproses foto'))),
      type,
      quality,
    ),
  )
}

/**
 * Resizes and re-encodes a photo in the browser: WebP at 0.8, or JPEG at 0.82
 * where the browser can't encode WebP (Safari). EXIF rotation is applied.
 */
export async function compressImage(
  file: Blob,
  preset: ImagePreset,
): Promise<{ blob: Blob; width: number; height: number }> {
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
  const { width, height } = fitWithin(bitmap.width, bitmap.height, PRESETS[preset])
  const canvas: OffscreenCanvas | HTMLCanvasElement =
    typeof OffscreenCanvas !== 'undefined'
      ? new OffscreenCanvas(width, height)
      : Object.assign(document.createElement('canvas'), { width, height })
  const ctx = canvas.getContext('2d') as
    CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D
  if (!ctx) throw new Error('Gagal memproses foto')
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(bitmap, 0, 0, width, height)
  bitmap.close()
  let blob = await encode(canvas, 'image/webp', 0.8)
  if (blob.type !== 'image/webp') blob = await encode(canvas, 'image/jpeg', 0.82)
  return { blob, width, height }
}

export function formatSize(bytes: number): string {
  return bytes >= 1024 * 1024
    ? `${(bytes / 1024 / 1024).toFixed(1)} MB`
    : `${Math.max(1, Math.round(bytes / 1024))} KB`
}
