import '@fontsource/great-vibes/400.css'
import '@fontsource/cormorant-garamond/500.css'
import '@fontsource/cormorant-garamond/600.css'
import '@fontsource/lato/400.css'
import '@fontsource/lato/700.css'
import './tokens.css'

import type { Theme } from '../types'
import { CoverBackdrop } from './ornaments/CoverBackdrop'
import { CornerBottomRight, CornerTopLeft } from './ornaments/FloralCorner'
import { FloralDivider } from './ornaments/FloralDivider'
import { NameFlourish } from './ornaments/NameFlourish'
import { PetalFall } from './ornaments/PetalFall'

export const romanticFloral: Theme = {
  id: 'romantic-floral',
  code: '1',
  name: 'Romantic Floral',
  metaColor: '#F8E1E4',
  ornaments: {
    CoverBackdrop,
    CornerTopLeft,
    CornerBottomRight,
    SectionDivider: FloralDivider,
    NameFlourish,
    AmbientEffect: PetalFall,
  },
}
