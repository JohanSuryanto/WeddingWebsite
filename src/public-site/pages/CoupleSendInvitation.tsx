import { useParams } from 'react-router'
import { coupleUrl } from '../../config/site'
import { buildInviteUrl } from '../../lib/inviteLink'
import { SendInvitationPage } from '../../send-invitation/SendInvitationPage'
import { useCouple } from '../useCouple'
import { NotFound } from './NotFound'

/** /:slug/send-invitation — the couple's guest-link page. */
export function CoupleSendInvitation() {
  const { slug } = useParams()
  const state = useCouple(slug)

  if (state.status === 'loading') return null
  if (state.status !== 'ready') return <NotFound />
  const { couple } = state
  // The phone preview loads this same site, whatever address the links use.
  const localCoupleUrl = `${window.location.origin}/${couple.slug}`
  return (
    <SendInvitationPage
      content={couple.content}
      coupleUrl={coupleUrl(couple.slug)}
      defaultThemeId={couple.defaultTheme}
      previewUrl={(name, code) => buildInviteUrl(localCoupleUrl, name, code)}
    />
  )
}
