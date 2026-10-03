import type { Db } from './db/client'
import type { CoupleRow } from './db/schema'
import type { Env } from './env'
import type { MediaProvider } from './media/provider'

/** Per-request values shared by every route (set in server/app.ts). */
export type AppVars = {
  env: Env
  db: Db
  media: MediaProvider
  /** Set by requireAdmin. */
  adminEmail?: string
  /** Set by requireCouple (send-invitation passcode). */
  couple?: CoupleRow
}

export type AppEnv = { Variables: AppVars }
