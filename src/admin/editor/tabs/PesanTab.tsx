import { useFormContext } from 'react-hook-form'
import { anisaRaka } from '../../../content/samples/anisa-raka/content'
import type { CoupleFormValues } from '../formModel'
import { Section, TextArea } from '../fields'

export default function PesanTab() {
  const { watch, setValue } = useFormContext<CoupleFormValues>()
  const message = watch('content.shareMessage') ?? ''
  return (
    <Section title="Pesan WhatsApp">
      <p className="-mt-2 text-sm text-muted">
        Dipakai di halaman Kirim Undangan. Kode yang diganti otomatis: <code>{'{nama}'}</code>,{' '}
        <code>{'{link}'}</code>, <code>{'{mempelai}'}</code>, <code>{'{tanggal}'}</code>.
      </p>
      <TextArea
        path="content.shareMessage"
        label="Isi pesan"
        rows={14}
        maxLength={2000}
        hint={
          <span className="text-xs text-muted" aria-live="polite">
            {message.length}/2000
          </span>
        }
      />
      <button
        type="button"
        className="btn-outline px-4 py-1 text-sm"
        onClick={() =>
          setValue('content.shareMessage', anisaRaka.shareMessage, { shouldDirty: true })
        }
      >
        Kembalikan pesan awal
      </button>
    </Section>
  )
}
