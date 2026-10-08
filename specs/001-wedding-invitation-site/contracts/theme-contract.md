# Contract: Theme

Covers FR-018 and FR-018a: four themes, switched through one setting, with no content or section edits.

## Selection
- **Live site**: each couple has a **default theme** (`Couple.defaultTheme`, set in the admin dashboard → Pengaturan; see [feature 002](../../002-admin-couple-dashboard/contracts/data-layer.md)). It decides which theme guests see when a link has no `?t=`. *(Before feature 002 this was the global `activeTheme` in `src/config/site.ts`, which no longer exists.)*
- **Preview**: `?t=<number>` overrides the setting for that visit only: `1` = romantic-floral, `2` = elegant-classic, `3` = rustic-garden, `4` = javanese-heritage. It can be combined with `?inv=`, e.g. `/?inv=Budi&t=2`. Unknown values are ignored and the configured theme is used. This lets the couple compare themes before choosing.
- At startup `applyTheme()` sets `<html data-theme="<id>">` and the mobile browser color (`meta theme-color`).

Theme registry: `src/themes/index.ts` exports `themes: Record<ThemeId, Theme>`. Adding a theme = add a folder, add its id to `ThemeId` in `src/themes/types.ts`, and register it. Every theme's stylesheet is bundled, and each is scoped to its own `[data-theme]`. Fonts from themes that aren't active are declared but never downloaded.

## Theme module (`src/themes/<id>/index.ts`)

```ts
export interface Theme {
  id: ThemeId;                  // 'romantic-floral' | 'elegant-classic' | 'rustic-garden' | 'javanese-heritage'
  code: string;                 // unique preview number: '1' | '2' | '3' | '4'
  name: string;
  metaColor: string;            // mobile browser UI color
  ornaments: ThemeOrnaments;
}

export interface ThemeOrnaments {
  CoverBackdrop: ComponentType;          // decorative layer behind cover content (required)
  SectionDivider: ComponentType;         // under each section title (required)
  CornerTopLeft?: ComponentType;
  CornerBottomRight?: ComponentType;
  NameFlourish?: ComponentType;          // under the couple's names
  AmbientEffect?: ComponentType;         // must render nothing under prefers-reduced-motion
  Monogram?: ComponentType<{ initials: [string, string] }>;  // on the cover, above the names
}
```
Sections render ornaments only through these slots, never with hard-coded theme images.

## Required CSS tokens (`src/themes/<id>/tokens.css`, scoped to `[data-theme='<id>']`)

| Token | Purpose | Romantic Floral | Elegant Classic | Rustic Garden | Javanese Heritage |
|---|---|---|---|---|---|
| `--theme-bg` | page background | `#FFF8F6` | `#FBF8F1` ivory | `#F7F3EA` cream | `#F6EFE2` cream |
| `--theme-surface` | cards | `#FFFFFF` | `#FFFFFF` | `#FFFDF8` | `#FFFAF1` |
| `--theme-surface-alt` | alternating sections | `#F8E1E4` | `#F3EEE2` | `#E9EFE3` sage tint | `#EEE2C9` batik cream |
| `--theme-primary` | buttons, music toggle, borders | `#D8A7B1` | `#1F2A44` navy | `#5F7152` sage | `#6B4226` soga brown |
| `--theme-primary-contrast` | text on primary | `#4A3440` | `#FBF8F1` | `#FFFFFF` | `#FFF8EC` |
| `--theme-accent` | dividers, ornaments, "&" | `#C9A66B` | `#B8964F` gold | `#A47148` warm brown | `#A8792E` gold |
| `--theme-highlight` | selected/active background (nav item, chosen RSVP option, badge) | `#F2D9DE` | `#ECE3CC` | `#DDE6D3` | `#EAD9B6` |
| `--theme-highlight-text` | text on highlight | `#4A3440` | `#1F2A44` | `#3E4A35` | `#43281A` |
| `--theme-text` | body text | `#4A3440` | `#1F2A44` | `#4A3F35` | `#3A281C` |
| `--theme-text-muted` | secondary text | `#86606F` | `#5B6479` | `#6E6456` | `#6B5644` |
| `--theme-font-script` | couple names | Great Vibes | Pinyon Script | Alex Brush | Pinyon Script |
| `--theme-font-heading` | headings | Cormorant Garamond | Cinzel | Josefin Sans | Cormorant Garamond |
| `--theme-font-body` | body | Lato | EB Garamond | Lora | EB Garamond |
| `--theme-radius-card` | card corners | `1.25rem` | `0.375rem` | `0.75rem` | `0.5rem` |
| `--theme-shadow-card` | card shadow | soft rose-tinted | soft navy | soft warm brown | soft dark brown |
| `--theme-anim-reveal` | reveal keyframe name | `float-up` | `ec-fade-rise` | `rg-grow` | `jh-unfold` |

Sections use only the Tailwind utilities mapped from these tokens in `src/index.css` (e.g. `bg-surface`, `bg-highlight`, `text-accent`, `font-script`). They must not use `primary` at reduced opacity as a background behind text; use `highlight` instead so contrast holds for dark primaries.

A theme's `tokens.css` may also add scoped refinements (e.g. Elegant Classic adds a gold keyline to `.card`; Rustic Garden adds a paper-grain texture to sections and a stitched edge to cards), as long as they stay under its `[data-theme]` selector.

**Conformance check**: `tests/unit/themes.test.ts` asserts that every registered theme defines every required token and the required ornament slots. `tests/e2e/themes.spec.ts` previews every theme at all viewports and checks for horizontal overflow.
