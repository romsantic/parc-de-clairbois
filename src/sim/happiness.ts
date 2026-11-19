import { SPECIES } from '../data/species'
import { TUNING } from '../data/tuning'
import type { Animal, GameState } from './types'
import { isHungry, satiety } from './animal'
import { STAFF_TUNING } from '../data/staff'
import { careCoverage } from './care'
import { animalsIn, capacity, cleanliness, countSpecies, type Roster } from './enclosure'

/**
 * (`roster` : animaux déjà regroupés par enclos pour ce pas ; même résultat, sans parcourir tous les animaux.)
 * Bonheur de 0 à 1 : 0,35 satiété + 0,25 propreté + 0,2 espace + 0,2 santé ;
 * × 0,6 pour une espèce sociale seule de son espèce ; × 0,7 sans soigneur ; 0 s'il est affamé.
 */
export function happiness(state: GameState, a: Animal, roster?: Roster): number {
  const now = state.time
  if (isHungry(a, now)) return 0
  const enc = roster ? roster.enclosureById.get(a.enclosureId) : state.enclosures.find((e) => e.id === a.enclosureId)
  const mates = enc ? (roster ? roster.byEnclosure.get(enc.id) ?? [] : animalsIn(state, enc.id)) : [a]
  const cap = enc ? capacity(enc) : 0
  const space = mates.length <= cap ? 1 : cap / mates.length
  const clean = enc ? cleanliness(enc, now) : 0
  const health = a.health.status === 'ok' ? 1 : 0
  let h = 0.35 * satiety(a, now) + 0.25 * clean + 0.2 * space + 0.2 * health
  if (SPECIES[a.species].social) {
    const sameSpecies = roster && enc ? countSpecies(roster, enc.id, a.species) : mates.filter((m) => m.species === a.species).length
    if (sameSpecies < 2) h *= TUNING.SOCIAL_ALONE_FACTOR
  }
  const followed = roster ? roster.covered.has(a.id) : state.time <= state.staff.coverAllUntil || careCoverage(state).covered.has(a.id)
  if (!followed) h *= STAFF_TUNING.UNCOVERED_HAPPINESS
  return Math.max(0, Math.min(1, h))
}
