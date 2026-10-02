// Data wiring for the PUBLIC site (wedding.johansuryanto.dev).
// Backend phase: replace with an HttpCoupleRepository (public read endpoints) and
// an HTTP media source; screens stay unchanged.
import { SAMPLE_COUPLES } from '../content/samples'
import { StaticCoupleRepository } from './static/StaticCoupleRepository'
import type { CoupleRepository, MediaStore } from './types'

export const coupleRepository: CoupleRepository = new StaticCoupleRepository(SAMPLE_COUPLES)
export const mediaStore: MediaStore | null = null
