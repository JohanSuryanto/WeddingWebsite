import '@fontsource/alex-brush/400.css'
import '@fontsource/josefin-sans/400.css'
import '@fontsource/josefin-sans/600.css'
import '@fontsource/lora/400.css'
import '@fontsource/lora/400-italic.css'
import '@fontsource/lora/600.css'
import './tokens.css'

import type { Theme } from '../types'
import { FallingLeaves } from './ornaments/FallingLeaves'
import {
  CornerBottomRight,
  CornerTopLeft,
  GardenBackdrop,
  SprigFlourish,
  VineDivider,
} from './ornaments/GardenOrnaments'
import { LeafWreath } from './ornaments/LeafWreath'

export const rusticGarden: Theme = {
  id: 'rustic-garden',
  code: '3',
  name: 'Rustic Garden',
  metaColor: '#E9EFE3',
  ornaments: {
    CoverBackdrop: GardenBackdrop,
    CornerTopLeft,
    CornerBottomRight,
    SectionDivider: VineDivider,
    NameFlourish: SprigFlourish,
    AmbientEffect: FallingLeaves,
    Monogram: LeafWreath,
  },
}
