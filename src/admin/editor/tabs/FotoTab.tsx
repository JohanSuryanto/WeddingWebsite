import { Controller, useFormContext, useFormState } from 'react-hook-form'
import { GalleryField } from '../../media/GalleryField'
import { ImageField } from '../../media/ImageField'
import { SAMPLE_BRIDE, SAMPLE_GROOM } from '../../media/samples'
import type { CoupleFormValues } from '../formModel'
import { Section, useFieldError } from '../fields'

export default function FotoTab() {
  const { control } = useFormContext<CoupleFormValues>()
  const { errors } = useFormState({ control })
  const coverError = useFieldError('content.cover.background')
  const brideError = useFieldError('content.couple.bride.photo')
  const groomError = useFieldError('content.couple.groom.photo')
  const galleryListError = useFieldError('content.gallery')
  const galleryErrors = errors.content?.gallery as unknown as
    ({ alt?: { message?: string } } | undefined)[] | undefined

  return (
    <div className="space-y-4">
      <Section title="Sampul & Mempelai">
        <div className="grid gap-6 md:grid-cols-3">
          <Controller
            control={control}
            name="content.cover.background"
            render={({ field }) => (
              <ImageField
                label="Latar sampul"
                preset="cover"
                aspect="aspect-[3/4]"
                required
                value={field.value}
                onChange={(v) => field.onChange(v)}
                error={coverError}
                testId="cover-field"
              />
            )}
          />
          <Controller
            control={control}
            name="content.couple.bride.photo"
            render={({ field }) => (
              <ImageField
                label="Foto mempelai wanita"
                preset="portrait"
                aspect="aspect-square"
                required
                value={field.value}
                onChange={(v) => field.onChange(v)}
                error={brideError}
                testId="bride-photo-field"
                samples={SAMPLE_BRIDE}
              />
            )}
          />
          <Controller
            control={control}
            name="content.couple.groom.photo"
            render={({ field }) => (
              <ImageField
                label="Foto mempelai pria"
                preset="portrait"
                aspect="aspect-square"
                required
                value={field.value}
                onChange={(v) => field.onChange(v)}
                error={groomError}
                testId="groom-photo-field"
                samples={SAMPLE_GROOM}
              />
            )}
          />
        </div>
      </Section>
      <Section title="Galeri">
        <p className="-mt-2 text-sm text-muted">
          Seret foto atau gunakan tombol ↑ ↓ untuk mengatur urutan. Setiap foto wajib diberi
          deskripsi.
        </p>
        {galleryListError && (
          <p role="alert" className="field-error">
            {galleryListError}
          </p>
        )}
        <Controller
          control={control}
          name="content.gallery"
          render={({ field }) => (
            <GalleryField
              value={field.value ?? []}
              onChange={(v) => field.onChange(v)}
              errors={(field.value ?? []).map((_, i) => galleryErrors?.[i]?.alt?.message)}
            />
          )}
        />
      </Section>
    </div>
  )
}
