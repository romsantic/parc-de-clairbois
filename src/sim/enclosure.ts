import { SPECIES } from '../data/species'
import { TUNING, HOUR_MS } from '../data/tuning'
import type { Animal, Enclosure, GameState, Rect } from './types'

export const area = (r: Rect): number => r.w * r.d

/** Nombre d'animaux que l'enclos peut accueillir sans être surpeuplé. */
export function capacity(e: Enclosure): number {
  return e.species ? Math.floor(area(e.rect) / SPECIES[e.species].spaceM2) : 0
}

export const animalsIn = (state: GameState, encId: number): Animal[] =>
  state.animals.filter((a) => a.enclosureId === encId)

/** Propreté de 1 (juste nettoyé) à 0 (sale), en 24 h. */
export function cleanliness(e: Enclosure, nowMs: number): number {
  const h = (nowMs - e.cleanedAt) / HOUR_MS
  return Math.max(0, Math.min(1, 1 - h / TUNING.DIRTY_AFTER_H))
}
