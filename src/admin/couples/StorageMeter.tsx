import { useEffect, useState } from 'react'
import { mediaStore } from '../../data/index.admin'
import type { UsageReport } from '../../data/types'

const WARN = 'text-[#a33a50]'

function Bar({ percent, warn, label }: { percent: number; warn: boolean; label: string }) {
  return (
    <div
      className="mt-2 h-2 overflow-hidden rounded-full bg-surface-alt"
      role="progressbar"
      aria-label={label}
      aria-valuenow={Math.round(percent)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className={`h-full ${warn ? 'bg-[#a33a50]' : 'bg-accent'}`}
        style={{ width: `${Math.min(100, Math.max(2, percent))}%` }}
      />
    </div>
  )
}

/** Free-plan usage: media quota (storage plus delivery) and database size (FR-014). */
export function StorageMeter({ refreshKey }: { refreshKey?: unknown }) {
  const [usage, setUsage] = useState<UsageReport | null>(null)

  useEffect(() => {
    let cancelled = false
    mediaStore.usage().then(
      (u) => !cancelled && setUsage(u),
      () => {},
    )
    return () => {
      cancelled = true
    }
  }, [refreshKey])

  if (!usage) return null
  const warn = usage.warn || !!usage.database?.warn

  return (
    <div className="card px-4 py-3" data-testid="storage-meter">
      <div className="flex items-baseline justify-between gap-2 text-sm">
        <span className="font-bold text-text">Penyimpanan</span>
        <span className="text-muted" data-testid="storage-used">
          {usage.label}
        </span>
      </div>
      <Bar percent={usage.percent} warn={usage.warn} label="Kuota media terpakai" />
      {usage.database && (
        <>
          <p className="mt-3 text-right text-sm text-muted">{usage.database.label}</p>
          <Bar percent={usage.database.percent} warn={usage.database.warn} label="Database terpakai" />
        </>
      )}
      {warn && (
        <p className={`mt-2 text-sm font-bold ${WARN}`} role="alert">
          Penyimpanan hampir penuh (≥ 80%). Hapus foto yang tidak dipakai atau unduh cadangan.
        </p>
      )}
    </div>
  )
}
