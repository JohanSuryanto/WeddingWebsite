import '@fontsource/pinyon-script/400.css'
import '@fontsource/cormorant-garamond/500.css'
import '@fontsource/cormorant-garamond/600.css'
import '@fontsource/eb-garamond/400.css'
import '@fontsource/eb-garamond/400-italic.css'
import './tokens.css'

import type { Theme } from '../types'
import {
  BatikBackdrop,
  CornerBottomRight,
  CornerTopLeft,
  GununganFlourish,
  KawungDivider,
  KawungMonogram,
  MelatiFall,
} from './ornaments/Batik'

export const javaneseHeritage: Theme = {
  id: 'javanese-heritage',
  code: '4',
  name: 'Javanese Heritage',
  metaColor: '#EEE2C9',
  ornaments: {
    CoverBackdrop: BatikBackdrop,
    CornerTopLeft,
    CornerBottomRight,
    SectionDivider: KawungDivider,
    NameFlourish: GununganFlourish,
    AmbientEffect: MelatiFall,
    Monogram: KawungMonogram,
  },
}
