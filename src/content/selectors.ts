import type { Person, WeddingContent, WeddingEvent } from './types'

export function mainEvent(content: WeddingContent): WeddingEvent {
  return content.events.find((e) => e.isMain) ?? content.events[0]
}

export function orderedCouple(content: WeddingContent): [Person, Person] {
  const { bride, groom, order } = content.couple
  return order === 'groom-first' ? [groom, bride] : [bride, groom]
}
