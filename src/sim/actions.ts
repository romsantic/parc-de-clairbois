import { SPECIES, type Food } from '../data/species'
import { TUNING } from '../data/tuning'
import type { GameState, Rect } from './types'
import { animalsIn, capacity, cleanliness } from './enclosure'
import { checkPlacement, enclosureCost, resizeCost, snapRect } from './placement'

/** Résultat d'une action : nouvel état, ou raison du refus (en français, affichable telle quelle). */
export type ActionResult = { ok: true; state: GameState } | { ok: false; reason: string }

const NOT_FOUND: ActionResult = { ok: false, reason: 'Introuvable.' }
const noMoney = (cost: number): ActionResult => ({ ok: false, reason: `Pas assez de pièces (il en faut ${cost}).` })

export const cureCost = (price: number): number => Math.max(TUNING.CURE_MIN_COST, Math.round(price * TUNING.CURE_PRICE_SHARE))

export function cleanEnclosure(state: GameState, encId: number): ActionResult {
  const enc = state.enclosures.find((e) => e.id === encId)
  if (!enc) return NOT_FOUND
  if (cleanliness(enc, state.time) > 0.95) return { ok: false, reason: "L'enclos est déjà propre." }
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

/** Pose un nouvel enclos (vide) dans une zone débloquée. */
export function buildEnclosure(state: GameState, rect: Rect): ActionResult {
  const r = snapRect(rect)
  const check = checkPlacement(state, r)
  if (!check.ok) return check
  const cost = enclosureCost(r)
  if (state.coins < cost) return noMoney(cost)
  const s = structuredClone(state)
  s.coins -= cost
  s.enclosures.push({ id: s.nextId++, biome: check.zone.id, species: null, rect: r, cleanedAt: s.time })
  return { ok: true, state: s }
}

/** Agrandit (on paie la différence) ou rétrécit (gratuit) un enclos. */
export function resizeEnclosure(state: GameState, encId: number, rect: Rect): ActionResult {
  const enc = state.enclosures.find((e) => e.id === encId)
  if (!enc) return NOT_FOUND
  const r = snapRect(rect)
  const check = checkPlacement(state, r, encId)
  if (!check.ok) return check
  const here = animalsIn(state, encId).length
  if (capacity({ ...enc, rect: r }) < here)
    return { ok: false, reason: `Trop d'animaux pour cette taille (il faut de la place pour ${here}).` }
  const cost = resizeCost(enc.rect, r)
  if (state.coins < cost) return noMoney(cost)
  const s = structuredClone(state)
  s.coins -= cost
  s.enclosures.find((e) => e.id === encId)!.rect = r
  return { ok: true, state: s }
}

/** Soigne tous les malades d'un enclos ; coût = somme des soins. */
export function cureAllInEnclosure(state: GameState, encId: number): ActionResult {
  if (!state.enclosures.some((e) => e.id === encId)) return NOT_FOUND
  const sick = animalsIn(state, encId).filter((a) => a.health.status === 'malade')
  if (sick.length === 0) return { ok: false, reason: 'Aucun animal malade ici.' }
  const cost = sick.reduce((t, a) => t + cureCost(SPECIES[a.species].price), 0)
  if (state.coins < cost) return noMoney(cost)
  const s = structuredClone(state)
  s.coins -= cost
  for (const a of s.animals) {
    if (a.enclosureId === encId && a.health.status === 'malade') { a.health = { status: 'ok' }; a.lastFedAt = s.time }
  }
  return { ok: true, state: s }
}

/** Toutes les actions du joueur, pour l'interface. */
export type Action =
  | { type: 'nettoyer'; encId: number }
  | { type: 'soignerTout'; encId: number }
  | { type: 'soigner'; animalId: number }
  | { type: 'construire'; rect: Rect }
  | { type: 'redimensionner'; encId: number; rect: Rect }
  | { type: 'renommer'; animalId: number; name: string }
  | { type: 'rations'; food: Food; n: number }

export function applyAction(state: GameState, a: Action): ActionResult {
  switch (a.type) {
    case 'nettoyer': return cleanEnclosure(state, a.encId)
    case 'soignerTout': return cureAllInEnclosure(state, a.encId)
    case 'soigner': return cureAnimal(state, a.animalId)
    case 'construire': return buildEnclosure(state, a.rect)
    case 'redimensionner': return resizeEnclosure(state, a.encId, a.rect)
    case 'renommer': return renameAnimal(state, a.animalId, a.name)
    case 'rations': return addRations(state, a.food, a.n)
  }
}
