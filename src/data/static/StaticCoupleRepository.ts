import { orderedCouple, mainEvent } from '../../content/selectors'
import { isReservedSlug } from '../slug'
import { NotFoundError, type Couple, type CoupleRepository, type CoupleSummary } from '../types'

const readOnly = () => Promise.reject(new Error('read-only'))

/** Read-only repository over bundled couples (public site, frontend-only phase). */
export class StaticCoupleRepository implements CoupleRepository {
  private readonly couples: readonly Couple[]

  constructor(couples: readonly Couple[]) {
    this.couples = couples
  }

  async list(): Promise<CoupleSummary[]> {
    return this.couples.map((c) => {
      const [a, b] = orderedCouple(c.content)
      return {
        id: c.id,
        slug: c.slug,
        status: c.status,
        defaultTheme: c.defaultTheme,
        updatedAt: c.updatedAt,
        names: `${a.nickname} & ${b.nickname}`,
        mainDate: mainEvent(c.content)?.start || null,
        coverSrc: c.content.cover.background.src || null,
      }
    })
  }

  async get(id: string): Promise<Couple> {
    const c = this.couples.find((x) => x.id === id)
    if (!c) throw new NotFoundError()
    return c
  }

  async findBySlug(slug: string, opts?: { includeDrafts?: boolean }): Promise<Couple | null> {
    if (isReservedSlug(slug)) return null
    const c = this.couples.find((x) => x.slug === slug)
    if (!c) return null
    return c.status === 'active' || opts?.includeDrafts ? c : null
  }

  create = readOnly
  update = readOnly
  setStatus = readOnly
  duplicate = readOnly
  remove = readOnly
}
