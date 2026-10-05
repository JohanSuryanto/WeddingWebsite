import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router'
import { QrCode } from '../../components/QrCode'
import { coupleUrl } from '../../config/site'
import {
  NotFoundError,
  SessionExpiredError,
  type CoupleGate,
  type CoupleStatus,
  type PublicCouple,
} from '../../data/types'
import { buildInviteUrl } from '../../lib/inviteLink'
import { coupleAccess } from '../../services/coupleAccess'
import { GuestResponses } from '../../send-invitation/GuestResponses'
import { coupleGuestList } from '../../send-invitation/guestList'
import { PasscodeScreen } from '../../send-invitation/PasscodeScreen'
import { SendInvitationPage } from '../../send-invitation/SendInvitationPage'
import { LoadError, LoadingPage } from './LoadState'
import { NotFound } from './NotFound'

type State =
  | { status: 'loading' }
  | { status: 'not-found' }
  | { status: 'error' }
  | { status: 'locked'; gate: CoupleGate }
  | { status: 'ready'; couple: PublicCouple; coupleStatus: CoupleStatus }

/**
 * /:slug/send-invitation — the couple's guest-link page, behind their 4-digit
 * passcode (US4). Nothing but the names is loaded until it's unlocked.
 */
export function CoupleSendInvitation() {
  const { slug = '' } = useParams()
  const [state, setState] = useState<State>({ status: 'loading' })
  const guestList = useMemo(() => coupleGuestList(slug), [slug])

  const refresh = useCallback(async () => {
    // Two rounds: if the passcode changed since this browser unlocked, the
    // gate is asked again and shows the passcode screen.
    for (let round = 0; round < 2; round++) {
      try {
        const gate = await coupleAccess.gate(slug)
        if (!gate.unlocked) return setState({ status: 'locked', gate })
        const { couple, status } = await coupleAccess.load(slug)
        return setState({ status: 'ready', couple, coupleStatus: status })
      } catch (err) {
        if (err instanceof SessionExpiredError && round === 0) continue
        return setState({ status: err instanceof NotFoundError ? 'not-found' : 'error' })
      }
    }
  }, [slug])

  useEffect(() => {
    // Load (or reload) whenever the address changes.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setState({ status: 'loading' })
    void refresh()
  }, [refresh])

  if (state.status === 'loading') return <LoadingPage />
  if (state.status === 'not-found') return <NotFound />
  if (state.status === 'error') return <LoadError onRetry={() => void refresh()} />
  if (state.status === 'locked') {
    return (
      <PasscodeScreen
        names={state.gate.names}
        initialRetryAt={state.gate.retryAt ? new Date(state.gate.retryAt) : null}
        onSubmit={async (passcode) => {
          await coupleAccess.unlock(slug, passcode)
          await refresh()
        }}
      />
    )
  }

  const { couple, coupleStatus } = state
  // The phone preview loads this same site, whatever address the links use.
  const localCoupleUrl = `${window.location.origin}/${couple.slug}`
  return (
    <SendInvitationPage
      content={couple.content}
      coupleUrl={coupleUrl(couple.slug)}
      defaultThemeId={couple.defaultTheme}
      previewUrl={(name, code) => buildInviteUrl(localCoupleUrl, name, code)}
      guestList={guestList}
      notice={
        coupleStatus === 'draft' && (
          <p className="rounded-lg bg-highlight px-4 py-3 text-sm font-bold text-highlight-text" role="note">
            Undangan belum aktif — tautan sudah bisa disiapkan, tetapi tamu belum bisa membukanya.
          </p>
        )
      }
      extra={
        <div className="space-y-6">
          <section aria-labelledby="qr-heading" className="card space-y-3 p-5 sm:p-6">
            <h2 id="qr-heading" className="text-2xl text-text">
              Kode QR Undangan
            </h2>
            <QrCode url={coupleUrl(couple.slug)} fileName={`qr-${couple.slug}`} />
          </section>
          <GuestResponses slug={couple.slug} />
        </div>
      }
      actions={
        <button
          type="button"
          className="btn-outline px-4 py-1 text-sm"
          onClick={async () => {
            await coupleAccess.lock(slug).catch(() => {})
            void refresh()
          }}
        >
          Keluar
        </button>
      }
    />
  )
}
