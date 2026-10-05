import type { ReactNode } from 'react'
import type { WeddingContent } from '../content/types'
import { GuestNameProvider } from '../hooks/useGuestName'
import { ServicesProvider } from '../services'
import { ThemeProvider } from '../themes'
import type { ThemeId } from '../themes/types'
import { Invitation } from './Invitation'
import { WeddingProvider } from './WeddingProvider'

/**
 * A couple's invitation with everything it needs around it. Used by the public
 * couple page and by the admin preview frame, so both render identically.
 */
export function CoupleInvitation({
  content,
  themeId,
  guestName,
  skipCover = false,
  liveSlug,
  onOpen,
}: {
  /** Content with media already resolved to usable URLs. */
  content: WeddingContent
  themeId: ThemeId
  /** Override the ?inv= guest name (admin live preview); omit to read the URL. */
  guestName?: string | null
  skipCover?: boolean
  /** Set on the public site: RSVPs and wishes are saved for this couple. Previews omit it. */
  liveSlug?: string
  /** Called when the guest presses "Buka Undangan" (the admin preview follows it). */
  onOpen?: () => void
}) {
  let body: ReactNode = <Invitation skipCover={skipCover} onOpen={onOpen} />
  if (guestName !== undefined) body = <GuestNameProvider name={guestName}>{body}</GuestNameProvider>
  return (
    <ThemeProvider themeId={themeId}>
      <WeddingProvider content={content}>
        <ServicesProvider content={content} liveSlug={liveSlug}>
          {body}
        </ServicesProvider>
      </WeddingProvider>
    </ThemeProvider>
  )
}
