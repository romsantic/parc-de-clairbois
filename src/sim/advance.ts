import { TUNING, DAY_MS } from '../data/tuning'
import type { GameEvent, GameState } from './types'
import { feedStep } from './feeding'
import { careStep } from './care'
import { healthStep } from './health'
import { breedingStep } from './breeding'
import { economyStep } from './economy'
import { merchantStep } from './merchant'
import { missionsStep } from './missions'
import { staffStep } from './staff'

/** Un pas de 10 minutes, en place : repas, soins du personnel, santé, puis naissances et conceptions, puis recettes et marchand. */
export function step(state: GameState): GameEvent[] {
  const events: GameEvent[] = []
  state.time += TUNING.STEP_MS
  feedStep(state, events)
  careStep(state, events)
  healthStep(state, events)
  breedingStep(state, events)
  economyStep(state, events)
  merchantStep(state, events)
  staffStep(state, events) // paie, expérience, candidats
  missionsStep(state, events) // en dernier : mesure ce que ce pas vient de changer
  return events
}

/**
 * Fait avancer la partie jusqu'à `nowMs` par pas entiers de 10 minutes. C'est la même
 * fonction en jeu et au retour d'une absence. Au-delà de 30 jours, le reste n'est pas rejoué :
 * le parc reprend comme au 30ᵉ jour (toutes ses dates sont décalées d'autant).
 */
export function advanceTo(state: GameState, nowMs: number): { state: GameState; events: GameEvent[]; skippedMs: number } {
  if (state.time - nowMs >= TUNING.STEP_MS) {
    // L'horloge de l'appareil a reculé d'au moins un pas : on recale le parc sur « maintenant »
    // sans le faire rajeunir (toutes ses dates reculent d'autant), pour qu'il continue de vivre.
    const s = structuredClone(state)
    shiftDates(s, Math.floor(nowMs / TUNING.STEP_MS) * TUNING.STEP_MS - s.time)
    return { state: s, events: [], skippedMs: 0 }
  }
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
  s.merchant.restockAt += ms
  s.staff.renewAt += ms // pas coverAllUntil : le délai de grâce ne doit pas s'allonger
  for (const e of s.staff.employees) e.hiredAt += ms
  for (const e of s.enclosures) {
    e.cleanedAt += ms
    if (e.vaccinatedUntil !== null) e.vaccinatedUntil += ms
  }
  for (const a of s.animals) {
    a.bornAt += ms
    a.lastFedAt += ms
    if (a.pregnantSince !== null) a.pregnantSince += ms
    if (a.lastBirthAt !== null) a.lastBirthAt += ms
    if (a.health.status === 'malade') {
      a.health.stageSince += ms
      if (a.health.detectedAt !== null) a.health.detectedAt += ms
      if (a.health.careUntil !== null) a.health.careUntil += ms
    }
  }
}
