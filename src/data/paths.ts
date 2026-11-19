import type { PathPoint, PathSegment, Rect } from '../sim/types'
import { BRIDGE_X } from './zones'

/** Réglages des chemins à construire (V2). Aucune logique ici. */
export const PATHS_TUNING = {
  /** Largeur d'un chemin (m). */
  WIDTH_M: 2.2,
  /** Marge au-delà de la demi-largeur à laquelle un enclos est encore « relié » (m). */
  TOUCH_EXTRA_M: 1,
  /** Prix du mètre de chemin (pièces). */
  COST_PER_M: 3,
  /** Longueur minimale d'un segment (m). */
  MIN_LENGTH_M: 1,
  /** Aimantation du tracé (m), souris puis téléphone. */
  SNAP_M: 2,
  SNAP_M_PHONE: 3,
  /** Tolérance pour dire qu'un bout de segment est « sur » un autre (m). */
  ON_PATH_EPS: 0.05,
}

/** Zone où l'axe d'un chemin construit peut aller. */
export const PATH_AREA: Rect = { x: -34, z: -24, w: 30, d: 48 }

/** Identifiant du segment d'entrée (toujours présent, jamais sauvegardé). */
export const ENTRANCE_ID = -1
export const ENTRANCE_PATH: PathSegment[] = [{ id: ENTRANCE_ID, a: { x: -36, z: 10 }, b: { x: BRIDGE_X - 3.5, z: 10 } }]

/** Chemin offert au départ : de l'enclos des moutons à l'allée. */
export const START_PATH: { a: PathPoint; b: PathPoint } = { a: { x: -20, z: 10 }, b: { x: -20, z: 6.5 } }

/** Style du chemin selon le niveau du village. */
export const PATH_STYLE_BY_LEVEL: Record<number, 1 | 2 | 3> = { 1: 1, 2: 2, 3: 3 }
