import { SafeImage } from '../../components/SafeImage'
import { SectionShell } from '../../components/SectionShell'
import { useToast } from '../../components/Toast'
import { useWedding } from '../WeddingProvider'
import { copyText } from '../../lib/clipboard'

function CopyButton({ text, label }: { text: string; label: string }) {
  const toast = useToast()
  return (
    <button
      type="button"
      className="btn-outline text-sm"
      onClick={async () => toast((await copyText(text)) ? 'Tersalin!' : 'Gagal menyalin')}
    >
      <svg
        viewBox="0 0 24 24"
        className="h-4 w-4"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        aria-hidden="true"
      >
        <rect x="9" y="9" width="11" height="11" rx="2" />
        <path d="M5 15V5a2 2 0 0 1 2-2h8" />
      </svg>
      {label}
    </button>
  )
}

export function Gift() {
  const wedding = useWedding()
  const gifts = wedding.gifts
  if (!gifts) return null
  return (
    <SectionShell id="hadiah" title="Tanda Kasih" subtitle={gifts.intro}>
      <div className="mx-auto grid max-w-3xl gap-6 sm:grid-cols-2">
        {gifts.accounts.map((a) => (
          <article
            key={`${a.provider}-${a.accountNumber}`}
            className="card flex flex-col items-center px-6 py-8 text-center"
          >
            {a.logo ? (
              <SafeImage image={a.logo} alt={a.provider} className="h-10 w-auto" />
            ) : (
              <p className="font-heading text-2xl font-semibold tracking-wider text-text">
                {a.provider}
              </p>
            )}
            <p className="mt-4 font-heading text-2xl font-semibold tracking-wider break-all text-text">
              {a.accountNumber}
            </p>
            <p className="mt-1 text-sm text-muted">a.n. {a.accountHolder}</p>
            <div className="mt-5">
              <CopyButton text={a.accountNumber.replace(/[\s-]/g, '')} label="Salin" />
            </div>
          </article>
        ))}
      </div>

      {gifts.address && (
        <article className="card mx-auto mt-6 max-w-3xl px-6 py-8 text-center">
          <h3 className="text-2xl text-text">Kirim Hadiah</h3>
          <p className="mt-2 font-bold text-text">{gifts.address.recipient}</p>
          <p className="text-text">{gifts.address.address}</p>
          {gifts.address.phone && <p className="text-sm text-muted">{gifts.address.phone}</p>}
          <div className="mt-5">
            <CopyButton
              text={`${gifts.address.recipient}, ${gifts.address.address}${gifts.address.phone ? ` (${gifts.address.phone})` : ''}`}
              label="Salin Alamat"
            />
          </div>
        </article>
      )}
    </SectionShell>
  )
}
