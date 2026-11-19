import { SPECIES, type SpeciesId } from '../data/species'
import { TUNING, HOUR_MS } from '../data/tuning'
import type { Animal, Enclosure, GameState, Rect } from './types'
import { careCoverage } from './care'

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

/** Animaux regroupés par enclos (ordre de la liste conservé) : à construire une fois par pas, puis à interroger. */
export interface Roster {
  byEnclosure: Map<number, Animal[]>
  enclosureById: Map<number, Enclosure>
  /** Nombre d'animaux de chaque espèce, par enclos (calculé à la demande, une fois par pas). */
  speciesCount: Map<number, Map<SpeciesId, number>>
  /** Animaux suivis par un soigneur. */
  covered: Set<number>
}

/** Effectif d'une espèce dans un enclos, sans reparcourir les occupants à chaque animal. */
export function countSpecies(roster: Roster, encId: number, species: SpeciesId): number {
  let counts = roster.speciesCount.get(encId)
  if (!counts) {
    counts = new Map()
    for (const m of roster.byEnclosure.get(encId) ?? []) counts.set(m.species, (counts.get(m.species) ?? 0) + 1)
    roster.speciesCount.set(encId, counts)
  }
  return counts.get(species) ?? 0
}

export function buildRoster(state: GameState): Roster {
  const byEnclosure = new Map<number, Animal[]>()
  for (const a of state.animals) {
    const list = byEnclosure.get(a.enclosureId)
    if (list) list.push(a)
    else byEnclosure.set(a.enclosureId, [a])
  }
  return { byEnclosure, enclosureById: new Map(state.enclosures.map((e) => [e.id, e])), speciesCount: new Map(), covered: careCoverage(state).covered }
}
