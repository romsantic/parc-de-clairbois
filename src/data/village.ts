import type { ModelKey } from '../assets/manifest'

/**
 * Bâtiments du village, de l'autre côté de la rivière : position (m), hauteur, orientation, rayon occupé.
 * `name` et `sentence` : ce que dit la barre du bas quand on touche l'objet.
 */
export interface VillageProp { key: ModelKey; x: number; z: number; height: number; rot: number; r: number; name: string; sentence: string }

export const VILLAGE_PROPS: VillageProp[] = [
  { key: 'mairie', x: 17, z: -3, height: 7, rot: -Math.PI / 2, r: 3.5, name: "Mairie de Clairbois — Margaux, la maire", sentence: "La mairie : Margaux, la maire, y suit la vie du village." },
  { key: 'maison1', x: 18, z: -11.5, height: 3.6, rot: 0.2, r: 3, name: "Maison d'habitant", sentence: "Une maison d'habitant : plus Clairbois grandit, plus il y en a qui s'y plaisent." },
  { key: 'maison3', x: 29.5, z: 3, height: 3.6, rot: -Math.PI / 2, r: 3, name: "Maison d'habitant", sentence: "Une maison d'habitant, de l'autre côté de la place." },
  { key: 'maison2', x: 11, z: 16, height: 3.6, rot: Math.PI + 0.4, r: 3, name: "Maison d'habitant", sentence: "Une maison d'habitant, au calme près du chemin." },
  { key: 'moulin', x: 31, z: -8, height: 7, rot: -0.6, r: 3.5, name: "Moulin", sentence: "Le vieux moulin du village : il tourne depuis bien avant le parc." },
  { key: 'puits', x: 13, z: 0, height: 2.2, rot: 0, r: 1.2, name: "Puits", sentence: "Le puits du village, où l'on tire l'eau fraîche." },
  { key: 'charrette', x: 10, z: 4, height: 1.8, rot: 0.8, r: 1.5, name: "Charrette", sentence: "Une charrette de livraison, garée près de la place." },
  { key: 'banc', x: 15, z: 3.5, height: 0.9, rot: Math.PI, r: 0.8, name: "Banc", sentence: "Un banc pour souffler un peu sur la place du village." },
]

/** La mairie : le « ! » de mission la survole quand la mission n'a pas de cible sur la carte. */
export const MAIRIE = VILLAGE_PROPS[0]
/** Hauteur du « ! » au-dessus du toit de la mairie (m) et au-dessus du sol pour un point de la carte. */
export const MARKER = { OVER_MAIRIE: 1.4, OVER_GROUND: 5, FALLBACK_TOP_Y: 9 } as const
