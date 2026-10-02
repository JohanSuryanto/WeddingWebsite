# Contract: Wedding Content Schema

**File**: `src/content/wedding.ts` exports `const wedding: WeddingContent`.
**Types**: `src/content/types.ts`. Field meanings and validation are in [data-model.md](../data-model.md).

This is the **only** file the couple edits to change names, dates, venues, story, photos, gift accounts, music and texts (FR-019, SC-005). Images are placed in `src/content/images/` and imported in this file.

```ts
export interface WeddingContent {
  cover: { heading: string; defaultGuestLabel: string; background: ImageRef };
  couple: {
    bride: Person; groom: Person;
    order: 'bride-first' | 'groom-first';
    hashtag?: string;
  };
  events: WeddingEvent[];            // at least 1; exactly one isMain
  story?: StoryMilestone[];
  gallery?: GalleryPhoto[];
  gifts?: GiftInfo;
  sampleWishes?: Wish[];
  music?: { src: string; title?: string };
  closing: { message: string; quote?: { text: string; source: string } };
}
```

**Guarantees the UI relies on**
1. Optional sections (`story`, `gallery`, `gifts`, `music`) that are missing or empty are **hidden**, along with their navigation entry.
2. `events[].start` / `end` are ISO 8601 strings **with a UTC offset**, so the countdown is correct in any visitor time zone.
3. `content.test.ts` validates the object: exactly one main event, `end > start`, non-empty `alt` on gallery photos, and digits-only account numbers after removing spaces and dashes.
