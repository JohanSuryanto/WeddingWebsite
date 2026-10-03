// Data wiring for the PUBLIC site (wedding.johansuryanto.dev): published couples only.
import { HttpPublicCoupleSource } from './http/HttpPublicCoupleSource'
import type { PublicCoupleSource } from './types'

export const publicCouples: PublicCoupleSource = new HttpPublicCoupleSource()
