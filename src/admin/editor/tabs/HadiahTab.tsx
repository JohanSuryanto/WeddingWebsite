import { Controller, useFieldArray, useFormContext } from 'react-hook-form'
import { ImageField } from '../../media/ImageField'
import { SAMPLE_BANKS } from '../../media/samples'
import type { CoupleFormValues } from '../formModel'
import { ItemControls, Section, TextArea, TextField } from '../fields'

const DEFAULT_INTRO =
  'Doa restu Anda merupakan karunia yang sangat berarti bagi kami. Namun jika Anda ingin memberikan tanda kasih, Anda dapat mengirimkannya melalui:'

function GiftDetails() {
  const { control, watch, setValue } = useFormContext<CoupleFormValues>()
  const { fields, append, remove, move } = useFieldArray({
    control,
    name: 'content.gifts.accounts',
  })
  const address = watch('content.gifts.address')

  return (
    <>
      <Section title="Pengantar">
        <TextArea path="content.gifts.intro" label="Teks pengantar" rows={3} />
      </Section>
      {fields.map((field, i) => (
        <Section key={field.id} title={`Rekening ${i + 1}`}>
          <div className="flex justify-end">
            <ItemControls
              index={i}
              count={fields.length}
              onMove={move}
              onRemove={() => remove(i)}
              label={`rekening ${i + 1}`}
            />
          </div>
          <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_200px]">
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField
                path={`content.gifts.accounts.${i}.provider`}
                label="Bank / dompet digital"
                required
                placeholder="BCA"
              />
              <TextField
                path={`content.gifts.accounts.${i}.accountNumber`}
                label="Nomor rekening"
                required
                placeholder="1234 5678 90"
              />
              <TextField
                path={`content.gifts.accounts.${i}.accountHolder`}
                label="Atas nama"
                required
              />
            </div>
            <Controller
              control={control}
              name={`content.gifts.accounts.${i}.logo`}
              render={({ field: logo }) => (
                <ImageField
                  label="Logo (opsional)"
                  preset="logo"
                  samples={SAMPLE_BANKS}
                  aspect="aspect-[3/2]"
                  value={logo.value}
                  onChange={(v) => logo.onChange(v)}
                />
              )}
            />
          </div>
        </Section>
      ))}
      <button
        type="button"
        className="btn-outline"
        onClick={() => append({ provider: '', accountNumber: '', accountHolder: '' })}
      >
        + Tambah Rekening
      </button>
      <Section title="Alamat kirim hadiah">
        <label className="flex min-h-11 cursor-pointer items-center gap-2 font-bold text-text">
          <input
            type="checkbox"
            className="h-5 w-5 accent-[var(--theme-primary)]"
            checked={!!address}
            onChange={(e) =>
              setValue(
                'content.gifts.address',
                e.target.checked ? { recipient: '', address: '', phone: '' } : undefined,
                {
                  shouldDirty: true,
                },
              )
            }
          />
          Tampilkan alamat pengiriman
        </label>
        {address && (
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField path="content.gifts.address.recipient" label="Penerima" required />
            <TextField path="content.gifts.address.phone" label="No. HP" />
            <div className="sm:col-span-2">
              <TextArea
                path="content.gifts.address.address"
                label="Alamat lengkap"
                required
                rows={2}
              />
            </div>
          </div>
        )}
      </Section>
    </>
  )
}

export default function HadiahTab() {
  const { watch, setValue } = useFormContext<CoupleFormValues>()
  const gifts = watch('content.gifts')

  return (
    <div className="space-y-4">
      <label className="card flex min-h-11 cursor-pointer items-center gap-2 px-4 py-3 font-bold text-text">
        <input
          type="checkbox"
          className="h-5 w-5 accent-[var(--theme-primary)]"
          checked={!!gifts}
          onChange={(e) =>
            setValue(
              'content.gifts',
              e.target.checked ? { intro: DEFAULT_INTRO, accounts: [] } : undefined,
              {
                shouldDirty: true,
              },
            )
          }
        />
        Tampilkan bagian hadiah
      </label>
      {gifts && <GiftDetails />}
    </div>
  )
}
