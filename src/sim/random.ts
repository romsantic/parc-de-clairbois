import { nextRandom } from '../core/rng'
import type { GameState } from './types'

/** Tire un nombre dans [0, 1) et fait avancer la graine de la partie (en place). */
export function random(state: GameState): number {
  const [v, n] = nextRandom(state.rng)
  state.rng = n
  return v
}

/** Entier entre min et max inclus. */
export function randomInt(state: GameState, min: number, max: number): number {
  return min + Math.floor(random(state) * (max - min + 1))
}

/** Probabilité qu'un évènement de taux `perUnit` (par unité de temps) survienne sur `units` unités. */
export function chanceOver(perUnit: number, units: number): number {
  return 1 - (1 - perUnit) ** units
}
