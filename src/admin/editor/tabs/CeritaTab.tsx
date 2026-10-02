import { Controller, useFieldArray, useFormContext } from 'react-hook-form'
import { ImageField } from '../../media/ImageField'
import type { CoupleFormValues } from '../formModel'
import { ItemControls, Section, TextArea, TextField } from '../fields'

export default function CeritaTab() {
  const { control } = useFormContext<CoupleFormValues>()
  const { fields, append, remove, move } = useFieldArray({ control, name: 'content.story' })

  return (
    <div className="space-y-4">
      {fields.length === 0 && (
        <p className="card px-4 py-3 text-sm text-muted">
          Belum ada cerita. Bagian &ldquo;Cerita&rdquo; tidak akan tampil di undangan.
        </p>
      )}
      {fields.map((field, i) => (
        <Section key={field.id} title={`Cerita ${i + 1}`}>
          <div className="flex justify-end">
            <ItemControls
              index={i}
              count={fields.length}
              onMove={move}
              onRemove={() => remove(i)}
              label={`cerita ${i + 1}`}
            />
          </div>
          <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_240px]">
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <TextField
                  path={`content.story.${i}.title`}
                  label="Judul"
                  required
                  placeholder="Pertama Bertemu"
                />
                <TextField
                  path={`content.story.${i}.date`}
                  label="Waktu"
                  required
                  placeholder="Agustus 2019"
                />
              </div>
              <TextArea
                path={`content.story.${i}.description`}
                label="Cerita"
                required
                rows={3}
                maxLength={600}
              />
            </div>
            <Controller
              control={control}
              name={`content.story.${i}.photo`}
              render={({ field: photo }) => (
                <ImageField
                  label="Foto (opsional)"
                  preset="story"
                  value={photo.value}
                  onChange={(v) => photo.onChange(v)}
                />
              )}
            />
          </div>
        </Section>
      ))}
      <button
        type="button"
        className="btn-outline"
        onClick={() => append({ title: '', date: '', description: '' })}
      >
        + Tambah Cerita
      </button>
    </div>
  )
}
