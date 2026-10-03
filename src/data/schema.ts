import { z } from 'zod'
import { MAX_GALLERY } from './mediaLimits'
import { validateSlug } from './slug'

/**
 * One source of truth for invitation content rules (data-model.md, FR-012).
 * Used by the dashboard forms, unit tests, backup restore and, later, the backend.
 */

const ISO_WITH_ID_OFFSET = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?\+0[789]:00$/

const text = (min: number, max: number, message: string) =>
  z.string().trim().min(min, message).max(max, message)

export const imageRefSchema = z.object({
  src: z.string(),
  width: z.number().positive(),
  height: z.number().positive(),
})

const requiredImage = imageRefSchema.refine((img) => img.src.trim() !== '', {
  message: 'Foto wajib diunggah',
})

const optionalImage = imageRefSchema.optional()

const personSchema = z.object({
  fullName: text(2, 80, 'Nama lengkap 2–80 karakter'),
  nickname: z
    .string()
    .trim()
    .min(1, 'Nama panggilan wajib diisi')
    .max(30, 'Nama panggilan maksimal 30 karakter'),
  photo: requiredImage,
  childOrder: z.string().optional(),
  father: text(2, 80, 'Nama ayah 2–80 karakter'),
  mother: text(2, 80, 'Nama ibu 2–80 karakter'),
  instagram: z.string().optional(),
})

const httpsUrl = z
  .string()
  .optional()
  .refine((v) => !v || /^https:\/\/\S+$/.test(v), { message: 'Link harus diawali https://' })

export const eventSchema = z
  .object({
    id: z.string().min(1),
    name: text(1, 60, 'Nama acara wajib diisi'),
    start: z
      .string()
      .min(1, 'Tanggal & jam mulai wajib diisi')
      .regex(ISO_WITH_ID_OFFSET, 'Tanggal & jam mulai wajib diisi'),
    end: z.string().regex(ISO_WITH_ID_OFFSET, 'Format jam selesai tidak valid').nullable(),
    venueName: text(1, 100, 'Nama tempat wajib diisi'),
    address: text(1, 200, 'Alamat wajib diisi'),
    mapUrl: httpsUrl,
    isMain: z.boolean(),
  })
  .superRefine((e, ctx) => {
    if (e.end && ISO_WITH_ID_OFFSET.test(e.start) && Date.parse(e.end) <= Date.parse(e.start)) {
      ctx.addIssue({
        code: 'custom',
        path: ['end'],
        message: 'Jam selesai harus setelah jam mulai',
      })
    }
  })

const storySchema = z.object({
  title: text(1, 80, 'Judul cerita wajib diisi'),
  date: text(1, 40, 'Waktu cerita wajib diisi'),
  description: text(1, 600, 'Isi cerita wajib diisi'),
  photo: optionalImage,
})

const galleryPhotoSchema = z.object({
  src: requiredImage,
  alt: z
    .string()
    .trim()
    .min(1, 'Deskripsi foto wajib diisi')
    .max(150, 'Deskripsi foto maksimal 150 karakter'),
  caption: z.string().optional(),
})

const giftAccountSchema = z.object({
  provider: text(1, 40, 'Nama bank/dompet digital wajib diisi'),
  accountNumber: z.string().refine((v) => /^\d+$/.test(v.replace(/[\s-]/g, '')), {
    message: 'Nomor rekening hanya boleh angka',
  }),
  accountHolder: text(1, 80, 'Nama pemilik rekening wajib diisi'),
  logo: optionalImage,
})

const wishSchema = z.object({
  id: z.string(),
  name: z.string(),
  message: z.string(),
  attendance: z.enum(['hadir', 'tidak_hadir']).optional(),
  createdAt: z.coerce.date(),
})

export const weddingContentSchema = z.object({
  cover: z.object({
    heading: text(1, 60, 'Judul sampul wajib diisi'),
    defaultGuestLabel: text(1, 60, 'Sapaan tamu wajib diisi'),
    background: requiredImage,
  }),
  couple: z.object({
    bride: personSchema,
    groom: personSchema,
    order: z.enum(['bride-first', 'groom-first']),
    hashtag: z.string().optional(),
  }),
  events: z
    .array(eventSchema)
    .min(1, 'Minimal satu acara')
    .superRefine((events, ctx) => {
      if (events.filter((e) => e.isMain).length !== 1) {
        ctx.addIssue({ code: 'custom', message: 'Pilih tepat satu acara utama' })
      }
    }),
  story: z.array(storySchema).optional(),
  gallery: z.array(galleryPhotoSchema).max(MAX_GALLERY, `Maksimal ${MAX_GALLERY} foto`).optional(),
  gifts: z
    .object({
      intro: z.string(),
      accounts: z.array(giftAccountSchema),
      address: z
        .object({
          recipient: text(1, 80, 'Nama penerima wajib diisi'),
          address: text(1, 300, 'Alamat pengiriman wajib diisi'),
          phone: z.string().optional(),
        })
        .optional(),
    })
    .optional(),
  sampleWishes: z.array(wishSchema).optional(),
  music: z.object({ src: z.string().min(1), title: z.string().optional() }).optional(),
  closing: z.object({
    message: text(1, 1000, 'Pesan penutup wajib diisi'),
    quote: z.object({ text: z.string(), source: z.string() }).optional(),
  }),
  shareMessage: z.string().max(2000, 'Pesan maksimal 2000 karakter').optional(),
})

/**
 * Content as stored. Drafts may be unfinished, so this checks structure only:
 * the full rules (weddingContentSchema) apply when the admin saves or publishes
 * (data-model.md § Content validation).
 */
export const storedContentSchema = z.looseObject({
  cover: z.looseObject({ background: z.looseObject({ src: z.string() }) }),
  couple: z.looseObject({ bride: z.looseObject({}), groom: z.looseObject({}) }),
  events: z.array(z.looseObject({})),
  closing: z.looseObject({}),
})

export const slugSchema = z.string().superRefine((s, ctx) => {
  const message = validateSlug(s)
  if (message) ctx.addIssue({ code: 'custom', message })
})

export const themeIdSchema = z.enum(['romantic-floral', 'elegant-classic', 'rustic-garden'])

export const coupleSchema = z.object({
  id: z.string().min(1),
  slug: slugSchema,
  status: z.enum(['draft', 'active']),
  defaultTheme: themeIdSchema,
  content: weddingContentSchema,
  version: z.number().int().min(1),
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1),
})

/** First issue's message, or null when valid. */
export function firstContentProblem(content: unknown): string | null {
  const result = weddingContentSchema.safeParse(content)
  return result.success ? null : (result.error.issues[0]?.message ?? 'Data tidak valid')
}
