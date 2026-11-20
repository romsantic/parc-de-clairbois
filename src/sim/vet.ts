import { SPECIES } from '../data/species'
import { DISEASES, HEALTH_TUNING, VET_CENTER } from '../data/diseases'
import { TUNING, HOUR_MS, DAY_MS } from '../data/tuning'
import type { Animal, DiseaseId, Employee, GameEvent, GameState, Health } from './types'
import type { ActionResult } from './actions'
import { noMoney } from './actions'
import { efficiency } from './care'
import { employeeLevel } from './staff'
import { animalsIn } from './enclosure'
import { bump } from './stats'

type Sick = Extract<Health, { status: 'malade' }>

const sickOf = (a: Animal): Sick | null => (a.health.status === 'malade' ? a.health : null)

/** Niveau du centre vétérinaire (0 = pas de centre). */
export function centerLevel(state: GameState): 0 | 1 | 2 | 3 | 4 | 5 {
  return (state.buildings.find((b) => b.type === 'centreVeto')?.level ?? 0) as 0 | 1 | 2 | 3 | 4 | 5
}

/** Le centre sait-il soigner cette maladie ? */
export const canTreat = (state: GameState, d: DiseaseId): boolean => centerLevel(state) >= DISEASES[d].centerLevel

/** Vétérinaires qui travaillent : dans l'ordre d'embauche, au plus autant que de places (aucun sans centre). */
export function workingVets(state: GameState): Employee[] {
  const level = centerLevel(state)
  if (level === 0) return []
  return state.staff.employees
    .filter((e) => e.job === 'veterinaire')
    .sort((a, b) => a.hiredAt - b.hiredAt || a.id - b.id)
    .slice(0, VET_CENTER.PLACES[level - 1])
}

/** Prix d'un soin : une part du prix de l'espèce selon le stade, au moins CARE_MIN_COST. */
export function careCost(a: Animal): number {
  const h = sickOf(a)
  const stage = h ? h.stage : 1
  return Math.max(HEALTH_TUNING.CARE_MIN_COST, Math.round(SPECIES[a.species].price * HEALTH_TUNING.CARE_PRICE_SHARE[stage - 1]))
}

/** Durée d'un soin, arrondie au pas supérieur (au moins un pas) : plus vite au niveau 5 et avec l'expérience, plus lentement dans le rouge. */
export function careDurationMs(state: GameState, d: DiseaseId, vet: Employee): number {
  const level = Math.max(1, centerLevel(state))
  const hours = DISEASES[d].careH * VET_CENTER.SPEED[level - 1]
    / (efficiency(state) * (1 + VET_CENTER.LEVEL_SPEEDUP * (employeeLevel(vet) - 1)))
  const steps = Math.ceil((hours * HOUR_MS) / TUNING.STEP_MS - 1e-9) // tolérance : 2 × 0,6 donne 1,2000000000000002 en flottants
  return Math.max(1, steps) * TUNING.STEP_MS
}

/** Malades repérés qui ne sont pas déjà en soin. */
function waiting(state: GameState): Animal[] {
  return state.animals.filter((a) => {
    const h = sickOf(a)
    return h !== null && h.detectedAt !== null && h.careUntil === null
  })
}

/** La file du centre : malades repérés, pas en soin, soignables ; le plus grave d'abord, puis le premier repéré. */
export function careQueue(state: GameState): Animal[] {
  return waiting(state)
    .filter((a) => canTreat(state, (a.health as Sick).disease))
    .sort((x, y) => {
      const a = x.health as Sick, b = y.health as Sick
      return b.stage - a.stage || a.detectedAt! - b.detectedAt! || x.id - y.id
    })
}

/** Malades repérés que personne ne peut soigner : pas de centre, pas de vétérinaire, ou centre trop petit. */
export function untreatable(state: GameState): Animal[] {
  const noVet = workingVets(state).length === 0
  return waiting(state).filter((a) => noVet || !canTreat(state, (a.health as Sick).disease))
}

export const quarantinePlaces = (state: GameState): number => {
  const level = centerLevel(state)
  return level === 0 ? 0 : VET_CENTER.QUARANTINE[level - 1]
}

export const quarantineUsed = (state: GameState): number =>
  state.animals.filter((a) => sickOf(a)?.quarantined === true).length

/** Prix de la vaccination d'un enclos. */
export function vaccineCost(state: GameState, encId: number): number {
  return Math.max(VET_CENTER.VACCINE_MIN_COST, VET_CENTER.VACCINE_COST_PER_ANIMAL * animalsIn(state, encId).length)
}

/**
 * Un pas du centre :
 * 1. les soins finis guérissent (l'animal sort de quarantaine) ; ceux dont le vétérinaire ne travaille plus sont annulés
 *    (le stade repart de zéro : le soin avait gelé son compteur) ;
 * 2. chaque vétérinaire libre prend le premier de la file dont il peut payer le soin (jamais de dette pour un soin).
 */
export function vetStep(state: GameState, events: GameEvent[]): void {
  const now = state.time
  const vets = workingVets(state)
  const busy = new Set<number>()
  for (const a of state.animals) {
    const h = sickOf(a)
    if (!h || h.careUntil === null) continue
    if (h.careUntil <= now) {
      if (h.disease === 'indigestion') a.lastFedAt = now // comme la V1 : le compteur de faim repart de zéro
      a.health = { status: 'ok' }
      bump(state.stats, 'soins')
    } else if (h.vetId !== null && vets.some((v) => v.id === h.vetId)) busy.add(h.vetId)
    else { h.careUntil = null; h.vetId = null; h.stageSince = now }
  }
  const free = vets.filter((v) => !busy.has(v.id))
  if (free.length === 0) return
  const queue = careQueue(state)
  for (const vet of free) {
    const i = queue.findIndex((a) => state.coins >= careCost(a))
    if (i < 0) return // personne dans la file n'est payable : on attend
    const a = queue.splice(i, 1)[0]
    const h = a.health as Sick
    const cost = careCost(a)
    state.coins -= cost
    h.careUntil = now + careDurationMs(state, h.disease, vet)
    h.vetId = vet.id
    events.push({ kind: 'soigne', at: now, animalId: a.id, disease: h.disease, cost })
  }
}

/** Pourquoi on ne peut pas vacciner cet enclos (hors argent) ; null si c'est permis. L'interface s'en sert pour montrer le bouton. */
export function vaccinateRefusal(state: GameState, encId: number): string | null {
  const enc = state.enclosures.find((e) => e.id === encId)
  if (!enc) return 'Introuvable.'
  if (centerLevel(state) < VET_CENTER.VACCINE_LEVEL) return `Le centre vétérinaire doit être au niveau ${VET_CENTER.VACCINE_LEVEL}.`
  if (workingVets(state).length === 0) return 'Il faut un vétérinaire au centre.'
  if (animalsIn(state, encId).length === 0) return 'Aucun animal dans cet enclos.'
  if (enc.vaccinatedUntil !== null) {
    const left = enc.vaccinatedUntil - state.time
    if (left > VET_CENTER.VACCINE_RENEW_BELOW_H * HOUR_MS) return `Cet enclos est encore protégé ${Math.ceil(left / HOUR_MS)} h.`
  }
  return null
}

/** Vaccine tous les animaux d'un enclos contre la grippe, pour VACCINE_DAYS jours. */
export function vaccinate(state: GameState, encId: number): ActionResult {
  const refusal = vaccinateRefusal(state, encId)
  if (refusal) return { ok: false, reason: refusal }
  const cost = vaccineCost(state, encId)
  if (state.coins < cost) return noMoney(cost)
  const s = structuredClone(state)
  s.coins -= cost
  s.enclosures.find((e) => e.id === encId)!.vaccinatedUntil = s.time + VET_CENTER.VACCINE_DAYS * DAY_MS
  return { ok: true, state: s }
}

/** Pourquoi on ne peut pas isoler cet animal ; null si c'est permis. L'interface s'en sert pour montrer le bouton. */
export function isolateRefusal(state: GameState, animalId: number): string | null {
  const a = state.animals.find((x) => x.id === animalId)
  if (!a) return 'Introuvable.'
  if (centerLevel(state) < VET_CENTER.QUARANTINE_LEVEL) return `Le centre vétérinaire doit être au niveau ${VET_CENTER.QUARANTINE_LEVEL}.`
  const h = sickOf(a)
  if (!h) return "Cet animal n'est pas malade."
  if (h.detectedAt === null) return "Sa maladie n'a pas encore été repérée."
  if (h.quarantined) return 'Il est déjà en quarantaine.'
  const places = quarantinePlaces(state)
  if (quarantineUsed(state) >= places) return `La quarantaine est pleine (${places} places).`
  return null
}

/** Met un malade repéré en quarantaine : il ne contamine plus. */
export function isolate(state: GameState, animalId: number): ActionResult {
  const refusal = isolateRefusal(state, animalId)
  if (refusal) return { ok: false, reason: refusal }
  const s = structuredClone(state)
  ;(s.animals.find((x) => x.id === animalId)!.health as Sick).quarantined = true
  return { ok: true, state: s }
}

/** Sort un animal de quarantaine avant qu'il soit guéri. */
export function release(state: GameState, animalId: number): ActionResult {
  const a = state.animals.find((x) => x.id === animalId)
  if (!a) return { ok: false, reason: 'Introuvable.' }
  if (sickOf(a)?.quarantined !== true) return { ok: false, reason: "Il n'est pas en quarantaine." }
  const s = structuredClone(state)
  ;(s.animals.find((x) => x.id === animalId)!.health as Sick).quarantined = false
  return { ok: true, state: s }
}
