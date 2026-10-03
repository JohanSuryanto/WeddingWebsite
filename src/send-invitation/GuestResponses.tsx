import { useEffect, useState } from 'react'
import { ResponseTotals, RsvpList } from '../components/ResponsesView'
import { formatRelativeId } from '../lib/dateFormat'
import { coupleAccess, type CoupleResponses, type CoupleWish } from '../services/coupleAccess'

/** "Respons Tamu" on the couple's unlocked page: totals, RSVPs and wishes, read only (US5-8). */
export function GuestResponses({ slug }: { slug: string }) {
  const [data, setData] = useState<CoupleResponses | null>(null)
  const [wishes, setWishes] = useState<CoupleWish[]>([])
  const [cursor, setCursor] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)
  const [reloads, setReloads] = useState(0)

  useEffect(() => {
    let active = true
    coupleAccess.responses(slug).then(
      (res) => {
        if (!active) return
        setData(res)
        setWishes(res.wishes.items)
        setCursor(res.wishes.nextCursor)
        setFailed(false)
      },
      () => active && setFailed(true),
    )
    return () => {
      active = false
    }
  }, [slug, reloads])

  async function loadMore() {
    if (!cursor) return
    const res = await coupleAccess.responses(slug, cursor)
    setWishes((prev) => [...prev, ...res.wishes.items.filter((w) => !prev.some((p) => p.id === w.id))])
    setCursor(res.wishes.nextCursor)
  }

  return (
    <section aria-labelledby="guest-responses" className="card space-y-4 p-5 sm:p-6" data-testid="guest-responses">
      <div className="flex flex-wrap items-center gap-2">
        <h2 id="guest-responses" className="text-2xl text-text">
          Respons Tamu
        </h2>
        <div className="ml-auto flex gap-2">
          <a href={coupleAccess.csvUrl(slug)} download className="btn-outline px-4 py-1 text-sm">
            Unduh CSV
          </a>
          <button type="button" className="btn-outline px-4 py-1 text-sm" onClick={() => setReloads((n) => n + 1)}>
            Muat ulang
          </button>
        </div>
      </div>
      {failed && (
        <p className="field-error" role="alert">
          Gagal memuat respons. Coba muat ulang.
        </p>
      )}
      {data && (
        <>
          <ResponseTotals totals={data.totals} />
          <div className="grid gap-6 lg:grid-cols-2">
            <div>
              <h3 className="mb-2 text-lg text-text">Konfirmasi kehadiran</h3>
              <RsvpList rsvps={data.rsvps} />
            </div>
            <div>
              <h3 className="mb-2 text-lg text-text">Ucapan & doa</h3>
              {!wishes.length && <p className="text-sm text-muted">Belum ada ucapan.</p>}
              <ul className="space-y-3">
                {wishes.map((w) => (
                  <li key={w.id} className="rounded-xl bg-surface-alt/60 p-3">
                    <p className="font-bold break-words text-text">{w.name}</p>
                    <p className="mt-1 break-words whitespace-pre-line text-text">{w.message}</p>
                    <p className="mt-1 text-xs text-muted">{formatRelativeId(new Date(w.createdAt))}</p>
                  </li>
                ))}
              </ul>
              {cursor && (
                <button type="button" className="btn-outline mt-3 text-sm" onClick={() => void loadMore()}>
                  Muat lebih banyak
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </section>
  )
}
