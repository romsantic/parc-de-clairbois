import { TUNING, DAY_MS } from '../data/tuning'
import type { GameEvent, GameState } from './types'
import { feedStep } from './feeding'
import { healthStep } from './health'
import { breedingStep } from './breeding'

/** Un pas de 10 minutes, en place : repas, santé, puis naissances et conceptions. */
export function step(state: GameState): GameEvent[] {
  const events: GameEvent[] = []
  state.time += TUNING.STEP_MS
  feedStep(state, events)
  healthStep(state, events)
  breedingStep(state, events)
  return events
}

/**
 * Fait avancer la partie jusqu'à `nowMs` par pas entiers de 10 minutes. C'est la même
 * fonction en jeu et au retour d'une absence. Au-delà de 30 jours, le reste n'est pas rejoué :
 * le parc reprend comme au 30ᵉ jour (toutes ses dates sont décalées d'autant).
 */
export function advanceTo(state: GameState, nowMs: number): { state: GameState; events: GameEvent[]; skippedMs: number } {
  const steps = Math.floor((nowMs - state.time) / TUNING.STEP_MS)
  if (steps <= 0) return { state, events: [], skippedMs: 0 }
  const s = structuredClone(state)
  const maxSteps = (TUNING.MAX_CATCHUP_DAYS * DAY_MS) / TUNING.STEP_MS
  const events: GameEvent[] = []
  for (let i = 0; i < Math.min(steps, maxSteps); i++) for (const e of step(s)) events.push(e)
  const skippedMs = Math.max(0, steps - maxSteps) * TUNING.STEP_MS
  if (skippedMs > 0) shiftDates(s, skippedMs)
  return { state: s, events, skippedMs }
}

/** Décale toutes les dates de la partie (temps non rejoué après le plafond). */
function shiftDates(s: GameState, ms: number): void {
  s.time += ms
  for (const e of s.enclosures) e.cleanedAt += ms
  for (const a of s.animals) {
    a.bornAt += ms
    a.lastFedAt += ms
    if (a.pregnantSince !== null) a.pregnantSince += ms
    if (a.health.status === 'malade') a.health.since += ms
  }
}
