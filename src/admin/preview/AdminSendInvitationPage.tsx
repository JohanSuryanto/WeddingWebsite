import { useMemo } from 'react'
import { Link, useParams } from 'react-router'
import { MessagePage } from '../../components/MessagePage'
import { coupleUrl } from '../../config/site'
import { coupleRepository, mediaStore, ready } from '../../data/index.admin'
import { resolveMedia } from '../../data/resolveMedia'
import { adminGuestList } from '../../send-invitation/guestList'
import { SendInvitationPage } from '../../send-invitation/SendInvitationPage'
import { useLoad } from '../hooks/useLoad'

/**
 * /couples/:id/send-invitation — the couple's guest-link page inside the admin.
 * Links point to the PUBLIC address; the phone preview loads the admin's own
 * preview frame so drafts and not-yet-public couples show correctly.
 */
export default function AdminSendInvitationPage() {
  const { id = '' } = useParams()
  const guestList = useMemo(() => adminGuestList(id), [id])
  const { state } = useLoad(async () => {
    await ready
    const couple = await coupleRepository.get(id)
    const { content } = await resolveMedia(couple.content, mediaStore)
    return { couple, content }
  }, id)

  if (state.status === 'loading') return null
  if (state.status === 'error') {
    return <MessagePage title="Pasangan tidak ditemukan" message="Data pasangan ini tidak ada." />
  }
  const { couple, content } = state.data
  return (
    <>
      <div className="bg-surface px-4 py-2 text-sm">
        <Link to="/" className="font-bold text-muted hover:underline">
          ← Daftar pasangan
        </Link>
      </div>
      <SendInvitationPage
        content={content}
        coupleUrl={coupleUrl(couple.slug)}
        defaultThemeId={couple.defaultTheme}
        previewUrl={(name, code) =>
          `/preview-frame?${new URLSearchParams({ couple: couple.id, inv: name, t: code })}`
        }
        guestList={guestList}
      />
    </>
  )
}
