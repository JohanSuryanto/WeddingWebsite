import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import { FormField } from '../../components/FormField'
import { coupleUrl } from '../../config/site'
import { emptyContent } from '../../data/emptyContent'
import { coupleRepository, ready } from '../../data/index.admin'
import { slugify, toSlug, validateSlug } from '../../data/slug'
import { SlugTakenError } from '../../data/types'
import type { ThemeId } from '../../themes/types'
import { ThemePicker } from '../components/ThemePicker'

export function NewCouplePage() {
  const navigate = useNavigate()
  const [bride, setBride] = useState('')
  const [groom, setGroom] = useState('')
  const [slug, setSlug] = useState('')
  const [slugEdited, setSlugEdited] = useState(false)
  const [theme, setTheme] = useState<ThemeId>('romantic-floral')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    document.title = 'Tambah Pasangan · Admin Undangan'
  }, [])

  const effectiveSlug = slugEdited ? slug : slugify(bride, groom)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    const next: Record<string, string> = {}
    if (!bride.trim()) next.bride = 'Nama panggilan wajib diisi'
    if (!groom.trim()) next.groom = 'Nama panggilan wajib diisi'
    const slugError = validateSlug(effectiveSlug)
    if (slugError) next.slug = slugError
    else {
      await ready
      if (await coupleRepository.findBySlug(effectiveSlug, { includeDrafts: true })) {
        next.slug = 'Nama alamat sudah dipakai pasangan lain'
      }
    }
    setErrors(next)
    if (Object.keys(next).length) return

    setBusy(true)
    try {
      const couple = await coupleRepository.create({
        slug: effectiveSlug,
        defaultTheme: theme,
        content: emptyContent(bride, groom),
      })
      navigate(`/couples/${couple.id}/mempelai`)
    } catch (err) {
      setErrors({ slug: err instanceof SlugTakenError ? err.message : (err as Error).message })
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link to="/" className="text-sm font-bold text-muted hover:underline">
        ← Daftar pasangan
      </Link>
      <h1 className="text-3xl text-text">Tambah Pasangan</h1>

      <form noValidate onSubmit={onSubmit} className="card space-y-5 p-5 sm:p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField id="new-bride" label="Nama panggilan mempelai wanita" error={errors.bride}>
            <input
              id="new-bride"
              className="field"
              value={bride}
              maxLength={30}
              onChange={(e) => setBride(e.target.value)}
              aria-invalid={!!errors.bride}
              aria-describedby={errors.bride ? 'new-bride-error' : undefined}
            />
          </FormField>
          <FormField id="new-groom" label="Nama panggilan mempelai pria" error={errors.groom}>
            <input
              id="new-groom"
              className="field"
              value={groom}
              maxLength={30}
              onChange={(e) => setGroom(e.target.value)}
              aria-invalid={!!errors.groom}
              aria-describedby={errors.groom ? 'new-groom-error' : undefined}
            />
          </FormField>
        </div>

        <FormField id="new-slug" label="Alamat undangan" error={errors.slug}>
          <input
            id="new-slug"
            className="field font-mono"
            value={effectiveSlug}
            maxLength={40}
            onChange={(e) => {
              setSlugEdited(true)
              setSlug(e.target.value.toLowerCase().replace(/\s+/g, '-'))
            }}
            onBlur={() => setSlug(toSlug(effectiveSlug))}
            aria-invalid={!!errors.slug}
            aria-describedby={errors.slug ? 'new-slug-error' : 'new-slug-hint'}
          />
        </FormField>
        <p id="new-slug-hint" className="-mt-3 text-sm break-all text-muted">
          {coupleUrl(effectiveSlug || '…')}
        </p>

        <fieldset>
          <legend className="mb-2 font-bold text-text">Tema bawaan</legend>
          <ThemePicker
            value={theme}
            onChange={setTheme}
            sample={`${bride || 'Anisa'} & ${groom || 'Raka'}`}
            label="Tema bawaan"
          />
        </fieldset>

        <div className="flex justify-end gap-2">
          <Link to="/" className="btn-outline">
            Batal
          </Link>
          <button type="submit" className="btn-primary" disabled={busy}>
            {busy ? 'Menyimpan…' : 'Buat & Lanjut Isi Data'}
          </button>
        </div>
      </form>
    </div>
  )
}
