import { z } from 'zod'

const origin = z.url().transform((u) => u.replace(/\/+$/, ''))

const envSchema = z
  .object({
    DATABASE_URL: z
      .string()
      .min(1)
      .refine((u) => /^(postgres(ql)?:\/\/|pglite:)/.test(u), 'harus postgres://… atau pglite:…'),
    MEDIA_DRIVER: z.enum(['cloudinary', 'local']).default('local'),
    MEDIA_ROOT: z
      .string()
      .regex(/^[a-z0-9_-]+(\/[a-z0-9_-]+)*$/i, 'contoh: wedding/prod')
      .default('wedding/dev'),
    LOCAL_MEDIA_DIR: z.string().min(1).default('.data/media'),
    CLOUDINARY_CLOUD_NAME: z.string().optional(),
    CLOUDINARY_API_KEY: z.string().optional(),
    CLOUDINARY_API_SECRET: z.string().optional(),
    ADMIN_EMAIL: z.string().optional(),
    ADMIN_PASSWORD_HASH: z.string().optional(),
    SESSION_SECRET: z.string().min(32, 'minimal 32 karakter'),
    CRON_SECRET: z.string().optional(),
    PUBLIC_ORIGIN: origin,
    ADMIN_ORIGIN: origin,
    API_SURFACE: z.enum(['public', 'admin', 'both']).default('both'),
  })
  .superRefine((env, ctx) => {
    if (env.MEDIA_DRIVER === 'cloudinary') {
      for (const key of ['CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET'] as const) {
        if (!env[key]) ctx.addIssue({ code: 'custom', path: [key], message: 'wajib untuk MEDIA_DRIVER=cloudinary' })
      }
    }
    if (env.API_SURFACE !== 'public') {
      for (const key of ['ADMIN_EMAIL', 'ADMIN_PASSWORD_HASH'] as const) {
        if (!env[key]) ctx.addIssue({ code: 'custom', path: [key], message: 'wajib untuk API admin' })
      }
    }
  })

export type Env = z.infer<typeof envSchema>
export type ApiSurface = Env['API_SURFACE']

/** Parses and validates the server environment; throws one error listing every problem. */
export function loadEnv(source: Record<string, string | undefined> = process.env): Env {
  // Treat empty strings (e.g. blank lines copied from .env.example) as unset.
  const cleaned = Object.fromEntries(Object.entries(source).filter(([, v]) => v !== undefined && v !== ''))
  const result = envSchema.safeParse(cleaned)
  if (!result.success) {
    const lines = result.error.issues.map((i) => `- ${i.path.join('.') || '(env)'}: ${i.message}`)
    throw new Error(`Konfigurasi server tidak lengkap:\n${lines.join('\n')}`)
  }
  return result.data
}

/** Loads `.env.local` into process.env when present (scripts and local servers only). */
export function loadEnvFileIfPresent(path = '.env.local') {
  try {
    process.loadEnvFile(path)
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== 'ENOENT') throw err
  }
}
