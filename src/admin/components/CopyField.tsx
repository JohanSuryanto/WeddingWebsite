import { useToast } from '../../components/Toast'
import { copyText } from '../../lib/clipboard'

/** Label + value + "Salin" button. */
export function CopyField({
  label,
  value,
  testId,
}: {
  label: string
  value: string
  testId?: string
}) {
  const toast = useToast()
  return (
    <div className="min-w-0">
      <p className="text-xs font-bold tracking-wide text-muted uppercase">{label}</p>
      <div className="mt-1 flex items-center gap-2">
        <p data-testid={testId} className="min-w-0 flex-1 font-mono text-xs break-all text-text">
          {value}
        </p>
        <button
          type="button"
          className="btn-outline shrink-0 px-3 py-1 text-xs"
          aria-label={`Salin ${label}`}
          onClick={async () => toast((await copyText(value)) ? 'Tersalin!' : 'Gagal menyalin')}
        >
          Salin
        </button>
      </div>
    </div>
  )
}
