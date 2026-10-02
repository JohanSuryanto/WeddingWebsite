/** Lowercase letters/digits separated by single hyphens. */
export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
export const SLUG_MIN = 3
export const SLUG_MAX = 40

/** Paths the public site uses itself; no couple may take them (contracts/routes.md). */
export const RESERVED_SLUGS: ReadonlySet<string> = new Set([
  'send-invitation',
  'api',
  'assets',
  'music',
  'admin',
  'login',
  'dashboard',
  'u',
  'inv',
  'tema',
  'favicon.svg',
  'robots.txt',
])

export function isReservedSlug(slug: string): boolean {
  return RESERVED_SLUGS.has(slug)
}

/** Clean form of any text: lowercase, no accents, a–z/0–9 with single hyphens. */
export function toSlug(text: string): string {
  return text
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/&/g, ' ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, SLUG_MAX)
    .replace(/-+$/g, '')
}

/** Suggested address from the two nicknames, e.g. ("Budi", "Sari") → "budi-sari". */
export function slugify(a: string, b: string): string {
  return toSlug([a, b].filter((s) => s.trim()).join(' '))
}

/** Indonesian error message, or null when the slug is valid. */
export function validateSlug(slug: string): string | null {
  if (!SLUG_PATTERN.test(slug)) return 'Hanya huruf kecil, angka dan tanda hubung'
  if (slug.length < SLUG_MIN || slug.length > SLUG_MAX) return 'Minimal 3 dan maksimal 40 karakter'
  if (isReservedSlug(slug)) return 'Nama alamat ini dipakai oleh sistem'
  return null
}

/** First free slug of base, base-salinan, base-salinan-2, … */
export async function uniqueSlug(
  base: string,
  exists: (slug: string) => Promise<boolean> | boolean,
): Promise<string> {
  const suffixes = ['-salinan', ...Array.from({ length: 98 }, (_, i) => `-salinan-${i + 2}`)]
  for (const suffix of suffixes) {
    const stem = base.slice(0, SLUG_MAX - suffix.length).replace(/-+$/g, '')
    const candidate = `${stem}${suffix}`
    if (!(await exists(candidate))) return candidate
  }
  throw new Error('Tidak bisa membuat nama alamat unik')
}
