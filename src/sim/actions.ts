import { SPECIES, type Food } from '../data/species'
import { TUNING } from '../data/tuning'
import type { GameState } from './types'

/** Résultat d'une action : nouvel état, ou raison du refus (en français, affichable telle quelle). */
export type ActionResult = { ok: true; state: GameState } | { ok: false; reason: string }

const NOT_FOUND: ActionResult = { ok: false, reason: 'Introuvable.' }
const noMoney = (cost: number): ActionResult => ({ ok: false, reason: `Pas assez de pièces (il en faut ${cost}).` })

export const cureCost = (price: number): number => Math.max(TUNING.CURE_MIN_COST, Math.round(price * TUNING.CURE_PRICE_SHARE))

export function cleanEnclosure(state: GameState, encId: number): ActionResult {
  if (!state.enclosures.some((e) => e.id === encId)) return NOT_FOUND
  if (state.coins < TUNING.CLEAN_COST) return noMoney(TUNING.CLEAN_COST)
  const s = structuredClone(state)
  s.coins -= TUNING.CLEAN_COST
  s.enclosures.find((e) => e.id === encId)!.cleanedAt = s.time
  return { ok: true, state: s }
}

/** Soigne un animal malade ; son compteur de faim repart de zéro. */
export function cureAnimal(state: GameState, animalId: number): ActionResult {
  const a = state.animals.find((x) => x.id === animalId)
  if (!a) return NOT_FOUND
  if (a.health.status !== 'malade') return { ok: false, reason: "Cet animal n'est pas malade." }
  const cost = cureCost(SPECIES[a.species].price)
  if (state.coins < cost) return noMoney(cost)
  const s = structuredClone(state)
  s.coins -= cost
  const b = s.animals.find((x) => x.id === animalId)!
  b.health = { status: 'ok' }
  b.lastFedAt = s.time
  return { ok: true, state: s }
}

/** Ajoute des rations dans la limite du garde-manger (l'achat à la ferme arrive à l'étape 4). */
export function addRations(state: GameState, food: Food, n: number): ActionResult {
  const p = state.pantry
  if (p.fourrage + p.viande >= p.capacity) return { ok: false, reason: 'Le garde-manger est plein.' }
  const s = structuredClone(state)
  s.pantry[food] += Math.min(n, p.capacity - p.fourrage - p.viande)
  return { ok: true, state: s }
}

export function renameAnimal(state: GameState, animalId: number, name: string): ActionResult {
  if (!state.animals.some((x) => x.id === animalId)) return NOT_FOUND
  const clean = name.trim().replace(/\s+/g, ' ')
  if (clean.length < 1 || clean.length > TUNING.NAME_MAX_LENGTH)
    return { ok: false, reason: `Le nom doit faire entre 1 et ${TUNING.NAME_MAX_LENGTH} caractères.` }
  const s = structuredClone(state)
  s.animals.find((x) => x.id === animalId)!.name = clean
  return { ok: true, state: s }
}
