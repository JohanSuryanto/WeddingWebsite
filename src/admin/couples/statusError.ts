import { NetworkError } from '../../data/types'
import { ValidationError } from '../../services/types'

/** Toast text when publishing or unpublishing fails. */
export function statusErrorMessage(err: unknown): string {
  if (err instanceof ValidationError && err.code === 'not_publishable') {
    return `Belum bisa diterbitkan: ${err.message}`
  }
  if (err instanceof NetworkError) return 'Gagal mengubah status. Periksa koneksi lalu coba lagi.'
  return `Gagal mengubah status: ${(err as Error).message}`
}
