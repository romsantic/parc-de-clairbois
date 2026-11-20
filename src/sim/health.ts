import { HOUR_MS, DAY_MS, TUNING } from '../data/tuning'
import { DISEASES, HEALTH_TUNING } from '../data/diseases'
import type { Animal, DiseaseId, Enclosure, GameEvent, GameState, Health, Stage } from './types'
import { hoursWithoutFood } from './animal'
import { buildRoster, capacity, cleanliness } from './enclosure'
import { random, chanceOver } from './random'

export const isSick = (a: Animal): boolean => a.health.status === 'malade'

/** Une grippe qui se transmet : ni en soin (`careUntil`), ni en quarantaine. */
export function isContagious(a: Animal): boolean {
  const h = a.health
  return h.status === 'malade' && DISEASES[h.disease].contagious && h.careUntil === null && !h.quarantined
}

/** Un enclos vacciné est à l'abri de la grippe tant que la protection dure. */
export const isFluProtected = (enc: Enclosure, now: number): boolean => enc.vaccinatedUntil !== null && now < enc.vaccinatedUntil

const isPredator = (a: Animal): boolean => (HEALTH_TUNING.PREDATORS as readonly string[]).includes(a.species)

/** Maladie qui commence : stade léger ; repérée tout de suite seulement si un soigneur suit l'animal. */
function newSickness(disease: DiseaseId, now: number, followed: boolean): Health {
  return { status: 'malade', disease, stage: 1, stageSince: now, detectedAt: followed ? now : null, careUntil: null, vetId: null, quarantined: false }
}

/** Effectifs d'un enclos, comptés une fois par pas (les animaux en quarantaine ne comptent pas). */
interface Crowd { occupants: number; predators: number; contagious: number }

/**
 * Pour chaque animal, dans cet ordre :
 * 1. malade : en soin, rien ne bouge ; sinon il s'aggrave (léger, grave, mortel) puis meurt au bout du dernier stade.
 *    Il est repéré quand un soigneur le suit, ou au stade grave ;
 * 2. en forme : une seule maladie peut commencer — indigestion (24 h sans manger), parasites (enclos sale),
 *    blessure (enclos surpeuplé, ou bagarre entre prédateurs), grippe (village, contagion).
 */
export function healthStep(state: GameState, events: GameEvent[]): void {
  const now = state.time
  const roster = buildRoster(state)
  const stepDays = TUNING.STEP_MS / DAY_MS
  const crowds = new Map<number, Crowd>()
  for (const a of state.animals) {
    const quarantined = a.health.status === 'malade' && a.health.quarantined
    let c = crowds.get(a.enclosureId)
    if (!c) crowds.set(a.enclosureId, c = { occupants: 0, predators: 0, contagious: 0 })
    if (!quarantined) {
      c.occupants++
      if (isPredator(a)) c.predators++
    }
    if (isContagious(a)) c.contagious++
  }
  const parasiteChance = chanceOver(HEALTH_TUNING.DIRTY_PARASITES_PER_DAY, stepDays)
  const overcrowdChance = chanceOver(HEALTH_TUNING.OVERCROWD_INJURY_PER_DAY, stepDays)
  const fightChance = chanceOver(HEALTH_TUNING.PREDATOR_FIGHT_PER_DAY, stepDays)
  const fluSeason = state.village.level >= HEALTH_TUNING.FLU_MIN_VILLAGE_LEVEL
  const survivors: Animal[] = []
  for (const a of state.animals) {
    const followed = roster.covered.has(a.id)
    const h = a.health
    if (h.status === 'malade') {
      if (h.careUntil === null && now - h.stageSince >= DISEASES[h.disease].stageH[h.stage - 1] * HOUR_MS) {
        if (h.stage === 3) {
          events.push({ kind: 'mort', at: now, animalId: a.id, name: a.name, species: a.species, cause: h.disease })
          continue
        }
        h.stage = (h.stage + 1) as Stage
        h.stageSince = now
        events.push({ kind: 'aggravation', at: now, animalId: a.id, stage: h.stage as 2 | 3 })
      }
      if (h.detectedAt === null && (followed || h.stage >= 2)) {
        h.detectedAt = now
        events.push({ kind: 'malade', at: now, animalId: a.id, disease: h.disease })
      }
      survivors.push(a)
      continue
    }
    const enc = roster.enclosureById.get(a.enclosureId)
    const crowd = crowds.get(a.enclosureId)
    let disease: DiseaseId | null = null
    if (hoursWithoutFood(a, now) >= HEALTH_TUNING.INDIGESTION_AFTER_H) disease = 'indigestion'
    else if (enc && cleanliness(enc, now) === 0 && random(state) < parasiteChance) disease = 'parasites'
    else if (enc && crowd && crowd.occupants > capacity(enc) && random(state) < overcrowdChance) disease = 'blessure'
    else if (crowd && isPredator(a) && crowd.predators >= 2 && random(state) < fightChance) disease = 'blessure'
    else if (enc && crowd && fluSeason && !isFluProtected(enc, now)
      && random(state) < chanceOver(HEALTH_TUNING.FLU_PER_DAY + HEALTH_TUNING.FLU_CONTAGION_PER_DAY * crowd.contagious, stepDays)) disease = 'grippe'
    if (disease) {
      a.health = newSickness(disease, now, followed)
      if (followed) events.push({ kind: 'malade', at: now, animalId: a.id, disease })
    }
    survivors.push(a)
  }
  state.animals = survivors
}
