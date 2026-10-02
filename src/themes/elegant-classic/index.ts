import '@fontsource/pinyon-script/400.css'
import '@fontsource/cinzel/500.css'
import '@fontsource/cinzel/600.css'
import '@fontsource/eb-garamond/400.css'
import '@fontsource/eb-garamond/400-italic.css'
import '@fontsource/eb-garamond/600.css'
import './tokens.css'

import type { Theme } from '../types'
import { CoverFrame } from './ornaments/CoverFrame'
import { GoldDivider, GoldRule, Monogram } from './ornaments/Dividers'
import { CornerBottomRight, CornerTopLeft } from './ornaments/GoldCorner'
import { GoldSparkle } from './ornaments/GoldSparkle'

export const elegantClassic: Theme = {
  id: 'elegant-classic',
  code: '2',
  name: 'Elegant Classic',
  metaColor: '#F3EEE2',
  ornaments: {
    CoverBackdrop: CoverFrame,
    CornerTopLeft,
    CornerBottomRight,
    SectionDivider: GoldDivider,
    NameFlourish: GoldRule,
    AmbientEffect: GoldSparkle,
    Monogram,
  },
}
