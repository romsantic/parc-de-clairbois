import { SPECIES, type Food } from '../data/species'
import { TUNING, DAY_MS } from '../data/tuning'
import type { GameEvent, GameState } from './types'

const EPS = 1e-9

/** Part de nourriture d'un animal pour un pas de simulation. */
const partFor = (rationsPerDay: number) => (rationsPerDay * TUNING.STEP_MS) / DAY_MS

/**
 * Chaque animal prend sa part dans le premier aliment de son régime qui en a assez.
 * Servis par id croissant ; sans part, rien n'est retiré et il reste « non nourri ».
 */
export function feedStep(state: GameState, events: GameEvent[]): void {
  const eaten: Record<Food, number> = { fourrage: 0, viande: 0 }
  const animals = [...state.animals].sort((a, b) => a.id - b.id)
  for (const a of animals) {
    const sp = SPECIES[a.species], part = partFor(sp.rationsPerDay)
    const food = sp.diet.find((f) => state.pantry[f] + EPS >= part)
    if (!food) continue
    const take = Math.min(part, state.pantry[food])
    state.pantry[food] = Math.max(0, state.pantry[food] - take)
    eaten[food] += take
    a.lastFedAt = state.time
  }
  if (eaten.fourrage || eaten.viande) events.push({ kind: 'repas', at: state.time, ...eaten })
}

/** Heures avant que le premier aliment consommé soit épuisé (Infinity si personne ne mange). */
export function autonomyHours(state: GameState): number {
  const perHour: Record<Food, number> = { fourrage: 0, viande: 0 }
  for (const a of state.animals) {
    const sp = SPECIES[a.species]
    const food = sp.diet.find((f) => state.pantry[f] > EPS) ?? sp.diet[0]
    perHour[food] += sp.rationsPerDay / 24
  }
  let hours = Infinity
  for (const f of ['fourrage', 'viande'] as const) {
    if (perHour[f] > 0) hours = Math.min(hours, state.pantry[f] / perHour[f])
  }
  return hours
}
