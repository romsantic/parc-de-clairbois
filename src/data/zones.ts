import type { Biome } from './species'
import type { Rect } from '../sim/types'

/** Les zones se touchent (seule l’allée du zoo les sépare de la montagne). Zone de biome du côté zoo de la carte (ouest de la rivière, x de −34 à −4). */
export interface Zone {
  id: Biome
  name: string
  rect: Rect
  unlockLevel: 1 | 2 | 3
}

export const ZONES: Zone[] = [
  { id: 'foret', name: 'Forêt', rect: { x: -34, z: -24, w: 30, d: 16 }, unlockLevel: 2 },
  { id: 'prairie', name: 'Prairie', rect: { x: -34, z: -8, w: 30, d: 18 }, unlockLevel: 1 },
  { id: 'montagne', name: 'Montagne', rect: { x: -34, z: 11.5, w: 30, d: 12.5 }, unlockLevel: 3 },
]

/** Couloirs de chemin où l'on ne peut pas poser d'enclos. */
export const PATHS: Rect[] = [
  { x: -34, z: 8.5, w: 30, d: 3 }, // allée du zoo, jusqu'au pont
]
