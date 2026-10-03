import { useLocation, useParams } from 'react-router'
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
