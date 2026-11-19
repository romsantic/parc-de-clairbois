import { TUNING, HOUR_MS, DAY_MS } from '../data/tuning'
import type { DiseaseId, GameEvent, GameState, Health } from './types'
import { hoursWithoutFood } from './animal'
import { cleanliness } from './enclosure'
import { random, chanceOver } from './random'

/** Maladie qui commence : stade léger, repérée tout de suite (adaptation minimale : la vraie règle arrive avec la tâche 2). */
function newSickness(disease: DiseaseId, now: number): Health {
  return { status: 'malade', disease, stage: 1, stageSince: now, detectedAt: now, careUntil: null, vetId: null, quarantined: false }
}

/**
 * Pour chaque animal, dans cet ordre :
 * 1. malade depuis 48 h → meurt ;
 * 2. 24 h sans nourriture → tombe malade (faim) ;
 * 3. enclos sale (propreté 0) → risque de maladie (15 % par jour).
 */
export function healthStep(state: GameState, events: GameEvent[]): void {
  const now = state.time
  const dirtyChance = chanceOver(TUNING.DIRTY_SICK_PER_DAY, TUNING.STEP_MS / DAY_MS)
  const enclosureById = new Map(state.enclosures.map((e) => [e.id, e]))
  const survivors = []
  for (const a of state.animals) {
    if (a.health.status === 'malade' && now - a.health.stageSince >= TUNING.DEATH_AFTER_SICK_H * HOUR_MS) {
      events.push({ kind: 'mort', at: now, animalId: a.id, name: a.name, species: a.species, cause: a.health.disease })
      continue
    }
    if (a.health.status === 'ok') {
      if (hoursWithoutFood(a, now) >= TUNING.SICK_AFTER_H) {
        a.health = newSickness('indigestion', now)
        events.push({ kind: 'malade', at: now, animalId: a.id, disease: 'indigestion' })
      } else {
        const enc = enclosureById.get(a.enclosureId)
        if (enc && cleanliness(enc, now) === 0 && random(state) < dirtyChance) {
          a.health = newSickness('parasites', now)
          events.push({ kind: 'malade', at: now, animalId: a.id, disease: 'parasites' })
        }
      }
    }
    survivors.push(a)
  }
  state.animals = survivors
}
