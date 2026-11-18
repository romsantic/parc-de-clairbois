import type { ModelKey } from '../assets/manifest'

/** Bâtiments du village, de l'autre côté de la rivière : position (m), hauteur, orientation, rayon occupé. */
export interface VillageProp { key: ModelKey; x: number; z: number; height: number; rot: number; r: number }

export const VILLAGE_PROPS: VillageProp[] = [
  { key: 'mairie', x: 17, z: -3, height: 7, rot: -Math.PI / 2, r: 3.5 },
  { key: 'maison1', x: 18, z: -11.5, height: 3.6, rot: 0.2, r: 3 },
  { key: 'maison3', x: 29.5, z: 3, height: 3.6, rot: -Math.PI / 2, r: 3 },
  { key: 'maison2', x: 11, z: 16, height: 3.6, rot: Math.PI + 0.4, r: 3 },
  { key: 'moulin', x: 31, z: -8, height: 7, rot: -0.6, r: 3.5 },
  { key: 'puits', x: 13, z: 0, height: 2.2, rot: 0, r: 1.2 },
  { key: 'charrette', x: 10, z: 4, height: 1.8, rot: 0.8, r: 1.5 },
  { key: 'banc', x: 15, z: 3.5, height: 0.9, rot: Math.PI, r: 0.8 },
]

/** La mairie : le « ! » de mission la survole quand la mission n'a pas de cible sur la carte. */
export const MAIRIE = VILLAGE_PROPS[0]
/** Hauteur du « ! » au-dessus du toit de la mairie (m) et au-dessus du sol pour un point de la carte. */
export const MARKER = { OVER_MAIRIE: 1.4, OVER_GROUND: 5, FALLBACK_TOP_Y: 9 } as const
