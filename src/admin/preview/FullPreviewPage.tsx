import { useEffect } from 'react'
import { Link, useParams, useSearchParams } from 'react-router'
import { themes } from '../../themes'

/** /couples/:id/preview — the couple's whole invitation, any status. */
export default function FullPreviewPage() {
  const { id = '' } = useParams()
  const [params, setParams] = useSearchParams()
  const t = params.get('t')

  useEffect(() => {
    document.title = 'Pratinjau · Admin Undangan'
  }, [])

  const frameParams = new URLSearchParams(params)
  frameParams.set('couple', id)

  return (
    <div className="flex h-dvh flex-col bg-bg">
      <div className="flex flex-wrap items-center gap-2 border-b border-accent/30 bg-surface px-3 py-2">
        <Link to={`/couples/${id}/mempelai`} className="btn-outline px-3 py-1 text-sm">
          ← Kembali
        </Link>
        <span className="text-sm font-bold text-muted">Pratinjau</span>
        <div role="group" aria-label="Tema pratinjau" className="ml-auto flex gap-1">
          <button
            type="button"
            aria-pressed={!t}
            className={`rounded-full px-3 py-1 text-sm font-bold ${!t ? 'bg-highlight text-highlight-text' : 'text-muted'}`}
            onClick={() => {
              const next = new URLSearchParams(params)
              next.delete('t')
              setParams(next)
            }}
          >
            Bawaan
          </button>
          {Object.values(themes).map((theme) => (
            <button
              key={theme.id}
              type="button"
              aria-pressed={t === theme.code}
              title={theme.name}
              className={`rounded-full px-3 py-1 text-sm font-bold ${t === theme.code ? 'bg-highlight text-highlight-text' : 'text-muted'}`}
              onClick={() => {
                const next = new URLSearchParams(params)
                next.set('t', theme.code)
                setParams(next)
              }}
            >
              {theme.code}
            </button>
          ))}
        </div>
      </div>
      <iframe
        key={frameParams.toString()}
        title="Pratinjau undangan"
        data-testid="full-preview"
        src={`/preview-frame?${frameParams}`}
        className="w-full flex-1 border-0"
      />
    </div>
  )
}
