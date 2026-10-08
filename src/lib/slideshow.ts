// Which wish the venue slideshow shows next: newly arrived wishes first (in the
// order they came in), then the rotation carries on where it left off, wrapping.

export interface SlideshowState {
  /** Wish ids, newest first, as the server lists them (hidden ones already left out). */
  ids: string[]
  /** Arrived since the slideshow started and not shown yet, oldest first. */
  queue: string[]
  /** On screen now. */
  current: string | null
  /** Last wish shown by the rotation (not the queue): where it continues. */
  last: string | null
}

export const emptySlideshow: SlideshowState = { ids: [], queue: [], current: null, last: null }

/** After a refresh: new ids join the queue, and ids that disappeared (hidden, deleted) drop out. */
export function withLatest(state: SlideshowState, latest: string[], firstLoad = false): SlideshowState {
  const known = new Set(state.ids)
  const arrived = firstLoad ? [] : latest.filter((id) => !known.has(id)).reverse()
  const keep = new Set(latest)
  const kept = (id: string | null) => (id && keep.has(id) ? id : null)
  return {
    ids: latest,
    queue: [...state.queue.filter((id) => keep.has(id)), ...arrived],
    current: kept(state.current),
    last: kept(state.last),
  }
}

/** Moves to the next wish to show. */
export function advance(state: SlideshowState): SlideshowState {
  if (state.queue.length) return { ...state, current: state.queue[0], queue: state.queue.slice(1) }
  if (!state.ids.length) return { ...state, current: null, last: null }
  const at = state.last ? state.ids.indexOf(state.last) : -1
  const next = state.ids[(at + 1) % state.ids.length]
  return { ...state, current: next, last: next }
}

/**
 * A refresh that saw only the newest page: that page, then the known wishes older
 * than it. A known wish inside the page's range that's missing was hidden, so it goes.
 * ponytail: a wish hidden beyond the newest page stays until the page is reloaded.
 */
export function mergeNewest(newest: string[], known: string[]): string[] {
  const oldest = known.indexOf(newest[newest.length - 1])
  const older = oldest === -1 ? known : known.slice(oldest + 1)
  const seen = new Set(newest)
  return [...newest, ...older.filter((id) => !seen.has(id))]
}
