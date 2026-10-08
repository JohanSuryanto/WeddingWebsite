import type { ComponentType } from 'react'

export type ThemeId = 'romantic-floral' | 'elegant-classic' | 'rustic-garden' | 'javanese-heritage'

export interface ThemeOrnaments {
  /** Decorative layer behind the cover content. */
  CoverBackdrop: ComponentType
  CornerTopLeft?: ComponentType
  CornerBottomRight?: ComponentType
  /** Rendered between section title and content. */
  SectionDivider: ComponentType
  /** Decoration around the couple's names. */
  NameFlourish?: ComponentType
  /** Ambient effect such as falling petals; must respect reduced motion. */
  AmbientEffect?: ComponentType
  /** Couple's initials shown on the cover above the names, e.g. "A ✦ R". */
  Monogram?: ComponentType<{ initials: [string, string] }>
}

export interface Theme {
  id: ThemeId
  /** Short code for the preview link, e.g. `?t=1`. */
  code: string
  name: string
  ornaments: ThemeOrnaments
  /** Browser UI color (meta theme-color) on mobile. */
  metaColor: string
}

/** Tokens every theme's tokens.css must define (contracts/theme-contract.md). */
export const REQUIRED_TOKENS = [
  '--theme-bg',
  '--theme-surface',
  '--theme-surface-alt',
  '--theme-primary',
  '--theme-primary-contrast',
  '--theme-accent',
  '--theme-highlight',
  '--theme-highlight-text',
  '--theme-text',
  '--theme-text-muted',
  '--theme-font-script',
  '--theme-font-heading',
  '--theme-font-body',
  '--theme-radius-card',
  '--theme-shadow-card',
  '--theme-anim-reveal',
] as const
