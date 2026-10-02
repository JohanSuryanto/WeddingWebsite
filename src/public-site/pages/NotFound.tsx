import { useEffect } from 'react'
import { Link } from 'react-router'
import { MessagePage } from '../../components/MessagePage'

export function NotFound() {
  useEffect(() => {
    document.title = 'Undangan tidak ditemukan'
  }, [])
  return (
    <MessagePage
      title="Undangan tidak ditemukan"
      message="Periksa kembali link undangan yang Anda terima."
      action={
        <Link to="/" className="btn-outline">
          Ke halaman utama
        </Link>
      }
    />
  )
}
