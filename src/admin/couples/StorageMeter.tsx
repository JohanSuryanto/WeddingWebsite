import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { mediaStore } from '../../data/index.admin'

const MB = 1024 * 1024
const LOW_QUOTA = 200 * MB

function formatBytes(n: number): string {
  if (n >= 1024 * MB) return `${(n / (1024 * MB)).toFixed(1)} GB`
  if (n >= MB) return `${(n / MB).toFixed(1)} MB`
  return `${Math.max(1, Math.round(n / 1024))} KB`
}

let persistRequested = false

/** Browser storage usage, with a warning when space runs low (research R15). */
export function StorageMeter({ refreshKey }: { refreshKey?: unknown }) {
  const [usage, setUsage] = useState<{ usedBytes: number; quotaBytes: number | null } | null>(null)

  useEffect(() => {
    if (!persistRequested) {
      persistRequested = true
      navigator.storage?.persist?.().catch(() => {})
    }
    let cancelled = false
    mediaStore.usage().then((u) => !cancelled && setUsage(u))
    return () => {
      cancelled = true
    }
  }, [refreshKey])

  if (!usage) return null
  const { usedBytes, quotaBytes } = usage
  const ratio = quotaBytes ? usedBytes / quotaBytes : 0
  const low = !!quotaBytes && (ratio > 0.8 || quotaBytes < LOW_QUOTA)

  return (
    <div className="card px-4 py-3" data-testid="storage-meter">
      <div className="flex items-baseline justify-between gap-2 text-sm">
        <span className="font-bold text-text">Penyimpanan</span>
        <span className="text-muted" data-testid="storage-used">
          {formatBytes(usedBytes)}
          {quotaBytes ? ` dari ${formatBytes(quotaBytes)}` : ''}
        </span>
      </div>
      {quotaBytes ? (
        <div
          className="mt-2 h-2 overflow-hidden rounded-full bg-surface-alt"
          role="progressbar"
          aria-label="Penyimpanan terpakai"
          aria-valuenow={Math.round(ratio * 100)}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div
            className={`h-full ${low ? 'bg-[#a33a50]' : 'bg-accent'}`}
            style={{ width: `${Math.min(100, Math.max(2, ratio * 100))}%` }}
          />
        </div>
      ) : null}
      {low && (
        <p className="mt-2 text-sm font-bold text-[#a33a50]">
          Penyimpanan hampir penuh —{' '}
          <Link to="/backup" className="underline">
            unduh cadangan
          </Link>
        </p>
      )}
    </div>
  )
}
