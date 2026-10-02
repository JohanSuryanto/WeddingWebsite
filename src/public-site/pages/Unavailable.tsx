import { useEffect } from 'react'
import { MessagePage } from '../../components/MessagePage'
import type { ThemeId } from '../../themes/types'

export function Unavailable({ themeId }: { themeId?: ThemeId }) {
  useEffect(() => {
    document.title = 'Undangan belum tersedia'
  }, [])
  return (
    <MessagePage
      themeId={themeId}
      title="Undangan belum tersedia"
      message="Undangan ini sedang disiapkan. Silakan coba lagi nanti."
    />
  )
}
