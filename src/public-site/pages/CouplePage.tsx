import { useLocation, useParams } from 'react-router'
import { CoupleInvitation } from '../../invitation/CoupleInvitation'
import { resolveThemeId } from '../../themes'
import { useCouple } from '../useCouple'
import { NotFound } from './NotFound'
import { Unavailable } from './Unavailable'

/** /:slug — a couple's invitation. */
export function CouplePage() {
  const { slug } = useParams()
  const { search } = useLocation()
  const state = useCouple(slug)

  if (state.status === 'loading') return null
  if (state.status === 'not-found') return <NotFound />
  if (state.status === 'draft') return <Unavailable themeId={state.couple.defaultTheme} />
  const { couple } = state
  return (
    <CoupleInvitation
      content={couple.content}
      themeId={resolveThemeId(search, couple.defaultTheme)}
    />
  )
}
