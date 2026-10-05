import { useEffect } from 'react'
import { useLocation, useParams } from 'react-router'
import { apiFetch } from '../../data/http/client'
import { CoupleInvitation } from '../../invitation/CoupleInvitation'
import { resolveThemeId } from '../../themes'
import { useCouple } from '../useCouple'
import { LoadError, LoadingPage } from './LoadState'
import { NotFound } from './NotFound'
import { Unavailable } from './Unavailable'

/** /:slug — a couple's invitation, loaded from the server. */
export function CouplePage() {
  const { slug } = useParams()
  const { search } = useLocation()
  const state = useCouple(slug)
  const ready = state.status === 'ready'

  // One view per tab; previews load this page in a frame and don't count.
  useEffect(() => {
    if (!ready || !slug || window.self !== window.top) return
    const key = `viewed:${slug}`
    try {
      if (sessionStorage.getItem(key)) return
      sessionStorage.setItem(key, '1')
    } catch {
      // storage blocked: count anyway
    }
    apiFetch(`/public/couples/${encodeURIComponent(slug)}/view`, { method: 'POST' }).catch(() => {})
  }, [ready, slug])

  if (state.status === 'loading') return <LoadingPage />
  if (state.status === 'not-found') return <NotFound />
  if (state.status === 'draft') return <Unavailable />
  if (state.status === 'error') return <LoadError onRetry={state.retry} />
  const { couple } = state
  return (
    <CoupleInvitation
      content={couple.content}
      themeId={resolveThemeId(search, couple.defaultTheme)}
      liveSlug={couple.slug}
    />
  )
}
