import { Controller, useFormContext } from 'react-hook-form'
import { QrCode } from '../../../components/QrCode'
import { useToast } from '../../../components/Toast'
import { passcodeMessage } from '../../../config/service'
import { coupleSendUrl, coupleUrl } from '../../../config/site'
import { orderedCouple } from '../../../content/selectors'
import { randomPasscode } from '../../../data/passcode'
import { copyText } from '../../../lib/clipboard'
import { CopyField } from '../../components/CopyField'
import { ThemePicker } from '../../components/ThemePicker'
import { useEditor } from '../editorContext'
import type { CoupleFormValues } from '../formModel'
import { Section, TextField } from '../fields'

export default function PengaturanTab() {
  const { control, watch, setValue } = useFormContext<CoupleFormValues>()
  const { couple, setStatus } = useEditor()
  const toast = useToast()
  const slug = watch('slug')
  const content = watch('content')
  const passcode = watch('passcode')
  const [a, b] = orderedCouple(content)
  const slugChanged = slug !== couple.slug
  const passcodeChanged = passcode !== couple.passcode
  const [savedA, savedB] = orderedCouple(couple.content)

  async function copyMessage() {
    const text = passcodeMessage(`${savedA.nickname} & ${savedB.nickname}`, coupleSendUrl(couple.slug), couple.passcode)
    toast((await copyText(text)) ? 'Pesan tersalin!' : 'Gagal menyalin')
  }

  return (
    <div className="space-y-4">
      <Section title="Status">
        <div className="flex flex-wrap items-center gap-3">
          <span
            data-testid="editor-status"
            className={`rounded-full px-3 py-1 text-sm font-bold ${
              couple.status === 'active'
                ? 'bg-highlight text-highlight-text'
                : 'bg-surface-alt text-muted'
            }`}
          >
            {couple.status === 'active' ? 'Aktif' : 'Draf'}
          </span>
          <button
            type="button"
            className="btn-outline px-4 py-1 text-sm"
            onClick={() => setStatus(couple.status === 'active' ? 'draft' : 'active')}
          >
            {couple.status === 'active' ? 'Jadikan Draf' : 'Terbitkan'}
          </button>
          <p className="text-sm text-muted">
            {couple.status === 'active'
              ? 'Undangan bisa dibuka tamu.'
              : 'Tamu melihat "Undangan belum tersedia".'}
          </p>
        </div>
      </Section>

      <Section title="Alamat undangan">
        <TextField path="slug" label="Nama alamat" required maxLength={40} className="font-mono" />
        {slugChanged && couple.status === 'active' && (
          <p
            role="alert"
            className="rounded-lg bg-highlight px-3 py-2 text-sm font-bold text-highlight-text"
          >
            Link yang sudah dibagikan akan berhenti berfungsi.
          </p>
        )}
        <div className="grid gap-3 sm:grid-cols-2">
          <CopyField label="Undangan" value={coupleUrl(couple.slug)} />
          <CopyField label="Kirim undangan" value={coupleSendUrl(couple.slug)} />
        </div>
        {slugChanged && <p className="text-sm text-muted">Alamat baru berlaku setelah disimpan.</p>}
        <QrCode url={coupleUrl(couple.slug)} fileName={`qr-${couple.slug}`} />
      </Section>

      <Section title="Kode akses halaman kirim undangan">
        <div className="flex flex-wrap items-end gap-2">
          <div className="w-36">
            <TextField
              path="passcode"
              label="Kode akses"
              required
              maxLength={4}
              inputMode="numeric"
              className="font-mono text-lg tracking-[0.4em]"
            />
          </div>
          <button
            type="button"
            className="btn-outline px-4 py-1 text-sm"
            onClick={() => setValue('passcode', randomPasscode(), { shouldDirty: true, shouldValidate: true })}
          >
            Acak
          </button>
          <button
            type="button"
            className="btn-outline px-4 py-1 text-sm"
            onClick={copyMessage}
            disabled={passcodeChanged || slugChanged}
          >
            Salin pesan
          </button>
        </div>
        <p className="text-sm text-muted">
          {passcodeChanged || slugChanged
            ? 'Simpan dulu, lalu salin pesan untuk pasangan.'
            : 'Kirim link halaman dan kode ini ke pasangan. Mengubah kode akan mengeluarkan pasangan dari halaman kirim undangan di semua perangkat.'}
        </p>
      </Section>

      <Section title="Tema bawaan">
        <Controller
          control={control}
          name="defaultTheme"
          render={({ field }) => (
            <ThemePicker
              value={field.value}
              onChange={field.onChange}
              sample={`${a.nickname || '…'} & ${b.nickname || '…'}`}
              label="Tema bawaan"
            />
          )}
        />
      </Section>
    </div>
  )
}
