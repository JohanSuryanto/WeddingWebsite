import { advance, emptySlideshow, mergeNewest, withLatest } from '../../src/lib/slideshow'

const start = (ids: string[]) => advance(withLatest(emptySlideshow, ids, true))

describe('wishes slideshow order', () => {
  it('starts with the newest and cycles through, wrapping around', () => {
    let s = start(['c', 'b', 'a'])
    const shown = [s.current]
    for (let i = 0; i < 4; i++) shown.push((s = advance(s)).current)
    expect(shown).toEqual(['c', 'b', 'a', 'c', 'b'])
  })

  it('shows newly arrived wishes next, oldest arrival first, then carries on', () => {
    let s = start(['b', 'a']) // showing b
    s = withLatest(s, ['d', 'c', 'b', 'a']) // c arrived, then d
    const shown = [1, 2, 3, 4].map(() => (s = advance(s)).current)
    expect(shown).toEqual(['c', 'd', 'a', 'd']) // then the rotation resumes after b
  })

  it('drops hidden or deleted wishes, also from the queue and the screen', () => {
    let s = start(['b', 'a'])
    s = withLatest(s, ['c', 'b', 'a'])
    s = withLatest(s, ['a']) // b (on screen) and c (queued) were hidden
    expect(s.current).toBeNull()
    expect(s.queue).toEqual([])
    expect(advance(s).current).toBe('a')
  })

  it('has nothing to show without wishes', () => {
    expect(start([]).current).toBeNull()
  })
})

describe('merging a refresh of the newest page', () => {
  it('puts new wishes in front and keeps the older ones', () => {
    expect(mergeNewest(['e', 'd', 'c'], ['d', 'c', 'b', 'a'])).toEqual(['e', 'd', 'c', 'b', 'a'])
  })

  it("drops a wish hidden inside the newest page's range (it must not come back)", () => {
    // Known: d c b a. The admin hid c; the newest page is now e d b.
    expect(mergeNewest(['e', 'd', 'b'], ['d', 'c', 'b', 'a'])).toEqual(['e', 'd', 'b', 'a'])
  })
})
