import { SPECIES, type Food } from '../data/species'
import { BUILDINGS, FARM, SLOTS, maxBuildingLevel } from '../data/economy'
import { TUNING } from '../data/tuning'
import type { BuildingType, GameState, PathPoint, Rect } from './types'
import { ENTRANCE_ID } from '../data/paths'
import { checkSegment, isLinked, linkPlan } from './paths'
import { bump } from './stats'
import { fairPrice } from './economy'
import { canLevelUp, farmLevel, isReservedType } from './village'
import { animalsIn, capacity, cleanliness } from './enclosure'
import { buyAnimal, restock, sellAnimal } from './merchant'
import { claimMission, skipTutorial, updateMissions } from './missions'
import { assign, debtRefusal, fire, hire, redistributeAll } from './staff'
import { assignGaps } from './care'
import { checkPlacement, enclosureCost, resizeCost, snapRect } from './placement'

/** Résultat d'une action : nouvel état, ou raison du refus (en français, affichable telle quelle). */
export type ActionResult = { ok: true; state: GameState } | { ok: false; reason: string }

const NOT_FOUND: ActionResult = { ok: false, reason: 'Introuvable.' }
export const noMoney = (cost: number): ActionResult => ({ ok: false, reason: `Pas assez de pièces (il en faut ${cost}).` })

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
  b.health = { status: 'ok' } // V1 : disparaît avec le bouton « Soigner » (tâche 3)
  b.lastFedAt = s.time
  return { ok: true, state: s }
}

/** Ajoute des rations dans la limite du garde-manger (gratuit : réservé au panneau ?debug ; le joueur achète via buyRations). */
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

/**
 * Vérifie un enclos à poser (sans encId) ou à redimensionner (avec encId), avec son prix.
 * L'éditeur s'en sert pour colorer la clôture fantôme ; les actions pour accepter ou refuser.
 */
export function previewEnclosure(state: GameState, rect: Rect, encId?: number):
  { ok: true; cost: number } | { ok: false; reason: string; cost: number } {
  const r = snapRect(rect)
  const enc = encId === undefined ? undefined : state.enclosures.find((e) => e.id === encId)
  if (encId !== undefined && !enc) return { ok: false, reason: 'Introuvable.', cost: 0 }
  const cost = enc ? resizeCost(enc.rect, r) : enclosureCost(r)
  const check = checkPlacement(state, r, encId)
  if (!check.ok) return { ok: false, reason: check.reason, cost }
  if (enc) {
    const here = animalsIn(state, enc.id).length
    if (capacity({ ...enc, rect: r }) < here)
      return { ok: false, reason: `Trop d'animaux pour cette taille (il faut de la place pour ${here}).`, cost }
  }
  if (state.coins < cost) return { ok: false, reason: `Pas assez de pièces (il en faut ${cost}).`, cost }
  return { ok: true, cost }
}

/** Pose un nouvel enclos (vide) dans une zone débloquée. */
export function buildEnclosure(state: GameState, rect: Rect): ActionResult {
  const r = snapRect(rect)
  const p = previewEnclosure(state, r)
  if (!p.ok) return { ok: false, reason: p.reason }
  const zone = checkPlacement(state, r)
  const s = structuredClone(state)
  s.coins -= p.cost
  s.enclosures.push({ id: s.nextId++, biome: zone.ok ? zone.zone.id : 'prairie', species: null, rect: r, cleanedAt: s.time, vaccinatedUntil: null })
  return { ok: true, state: s }
}

/** Agrandit (on paie la différence) ou rétrécit (gratuit) un enclos. */
export function resizeEnclosure(state: GameState, encId: number, rect: Rect): ActionResult {
  const r = snapRect(rect)
  const p = previewEnclosure(state, r, encId)
  if (!p.ok) return { ok: false, reason: p.reason }
  const s = structuredClone(state)
  s.coins -= p.cost
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

/** Bâtiments qui ont leur propre emplacement (champ `only` de SLOTS), avec les textes de refus. */
const RESERVED_TEXT: Partial<Record<BuildingType, string>> = { personnel: 'à la maison du personnel', centreVeto: 'au centre vétérinaire' }
const RESERVED_ELSEWHERE: Partial<Record<BuildingType, string>> = {
  personnel: 'La maison du personnel se construit sur son emplacement, au fond du village.',
  centreVeto: 'Le centre vétérinaire se construit sur son emplacement, au village.',
}

/** Bâtit un bâtiment (unique dans le village) sur un emplacement libre et débloqué. */
export function buildBuilding(state: GameState, slot: number, type: BuildingType): ActionResult {
  const sl = SLOTS.find((x) => x.id === slot)
  if (!sl) return NOT_FOUND
  if (state.village.level < sl.unlockLevel) return { ok: false, reason: `Cet emplacement se débloque au niveau ${sl.unlockLevel} du village.` }
  if (sl.unlockLevel === 3) return { ok: false, reason: 'De nouveaux bâtiments arriveront bientôt ici.' } // pas de bâtiment au Bourg en V1
  if (isReservedType(type) && state.buildings.some((b) => b.type === type)) return { ok: false, reason: `Clairbois a déjà ${BUILDINGS[type].withArticle}.` }
  if (state.buildings.some((b) => b.slot === slot)) return { ok: false, reason: 'Cet emplacement est déjà pris.' }
  if (sl.only && sl.only !== type) return { ok: false, reason: `Cet emplacement est réservé ${RESERVED_TEXT[sl.only]}.` }
  if (!sl.only && isReservedType(type)) return { ok: false, reason: RESERVED_ELSEWHERE[type]! }
  const data = BUILDINGS[type]
  if (state.village.level < data.unlockLevel) return { ok: false, reason: `Ce bâtiment se débloque au niveau ${data.unlockLevel} du village.` }
  if (state.buildings.some((b) => b.type === type)) return { ok: false, reason: `Clairbois a déjà ${data.withArticle}.` }
  if (data.buildCost === null) return { ok: false, reason: `La ${data.name.toLowerCase()} ne se construit pas.` }
  if (state.coins < data.buildCost) return noMoney(data.buildCost)
  const s = structuredClone(state)
  s.coins -= data.buildCost
  s.buildings.push({ slot, type, level: 1 })
  return { ok: true, state: s }
}

/** Passe au niveau suivant du village (le bouton n'apparaît que si canLevelUp le permet). */
export function levelUp(state: GameState): ActionResult {
  const c = canLevelUp(state)
  if (!c.ok) return { ok: false, reason: c.reason }
  const s = structuredClone(state)
  s.village.level = c.level
  restock(s) // le catalogue s'élargit : le marchand en profite tout de suite
  return { ok: true, state: s }
}

/** Améliore un bâtiment d'un niveau. */
export function upgradeBuilding(state: GameState, slot: number): ActionResult {
  const b = state.buildings.find((x) => x.slot === slot)
  if (!b) return NOT_FOUND
  if (b.level >= maxBuildingLevel(b.type)) return { ok: false, reason: 'Ce bâtiment est déjà au niveau maximum.' }
  const cost = BUILDINGS[b.type].upgradeCost[b.level - 1]
  if (state.coins < cost) return noMoney(cost)
  const s = structuredClone(state)
  s.coins -= cost
  s.buildings.find((x) => x.slot === slot)!.level = b.level + 1
  return { ok: true, state: s }
}

/** Prix de n rations (remise selon le niveau de la ferme, arrondi au-dessus). */
export function rationCost(state: GameState, food: Food, n: number): number {
  const niveau = farmLevel(state)
  const remise = niveau > 0 ? FARM.discount[niveau - 1] : 0
  // Petite tolérance : 20 × 0,65 donne 13,000000000000002 en flottants.
  return Math.ceil(n * FARM.foodPrice[food] * (1 - remise) - 1e-9)
}

/** Achète des rations à la ferme (remise selon son niveau) ; jamais d'achat partiel. */
export function buyRations(state: GameState, food: Food, n: number): ActionResult {
  if (!Number.isInteger(n) || n <= 0) return { ok: false, reason: 'Quantité invalide.' }
  const niveau = farmLevel(state)
  if (niveau === 0) return { ok: false, reason: 'Il faut une ferme pour acheter des rations.' }
  const p = state.pantry
  const place = p.capacity - p.fourrage - p.viande
  if (place <= 0) return { ok: false, reason: 'Le garde-manger est plein.' }
  if (n > place) return { ok: false, reason: `Il n'y a de la place que pour ${Math.floor(place)} rations.` }
  const cost = rationCost(state, food, n)
  if (state.coins < cost) return noMoney(cost)
  const s = structuredClone(state)
  s.coins -= cost
  s.pantry[food] += n
  return { ok: true, state: s }
}

/** Agrandit le garde-manger d'un cran. */
export function upgradePantry(state: GameState): ActionResult {
  const sizes = TUNING.PANTRY_SIZES
  let i = 0
  sizes.forEach((sz, k) => { if (sz.capacity <= state.pantry.capacity) i = k })
  const next = sizes[i + 1]
  if (!next) return { ok: false, reason: 'Le garde-manger est déjà au plus grand.' }
  if (state.village.level < (next.level ?? 1)) {
    return { ok: false, reason: `Le grand garde-manger se débloque au niveau ${next.level} du village.` }
  }
  const cost = next.cost ?? 0
  if (state.coins < cost) return noMoney(cost)
  const s = structuredClone(state)
  s.coins -= cost
  s.pantry.capacity = next.capacity
  return { ok: true, state: s }
}

/** Fixe le prix du billet : entier de 0 à 3 × le prix juste. */
export function setTicketPrice(state: GameState, price: number): ActionResult {
  const max = 3 * fairPrice(state)
  if (!Number.isInteger(price) || price < 0 || price > max) return { ok: false, reason: `Le prix doit être entre 0 et ${max} pièces.` }
  const s = structuredClone(state)
  s.ticketPrice = price
  return { ok: true, state: s }
}

/** Trace un chemin à partir d'un chemin existant. */
export function traceChemin(state: GameState, a: PathPoint, b: PathPoint): ActionResult {
  const c = checkSegment(state, a, b)
  if (!c.ok) return { ok: false, reason: c.reason }
  const s = structuredClone(state)
  s.coins -= c.cost
  s.paths.push({ id: s.nextId++, a: { ...a }, b: { ...b } })
  return { ok: true, state: s }
}

/** Détruit un chemin construit (rien n'est remboursé) ; l'entrée est indestructible. */
export function destroyPath(state: GameState, id: number): ActionResult {
  if (id === ENTRANCE_ID) return { ok: false, reason: "Le chemin de l'entrée ne peut pas être détruit." }
  if (!state.paths.some((p) => p.id === id)) return NOT_FOUND
  const s = structuredClone(state)
  s.paths = s.paths.filter((p) => p.id !== id)
  return { ok: true, state: s }
}

/** Relie un enclos au réseau par le plus court chemin possible. */
export function linkEnclosure(state: GameState, encId: number): ActionResult {
  if (!state.enclosures.some((e) => e.id === encId)) return NOT_FOUND
  if (isLinked(state, encId)) return { ok: false, reason: 'Cet enclos est déjà relié.' }
  const plan = linkPlan(state, encId)
  if (!plan) return { ok: false, reason: "Aucun chemin possible jusqu'à cet enclos." }
  if (state.coins < plan.cost) return noMoney(plan.cost)
  const s = structuredClone(state)
  s.coins -= plan.cost
  for (const seg of plan.segments) s.paths.push({ id: s.nextId++, a: { ...seg.a }, b: { ...seg.b } })
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
  | { type: 'batir'; slot: number; building: BuildingType }
  | { type: 'ameliorer'; slot: number }
  | { type: 'acheterRations'; food: Food; n: number }
  | { type: 'agrandirGardeManger' }
  | { type: 'billet'; price: number }
  | { type: 'monterNiveau' }
  | { type: 'acheterAnimal'; offerId: number; encId: number; useCoupon?: boolean }
  | { type: 'vendre'; animalId: number }
  /** Observation silencieuse : le joueur a vu la fiche d'un enclos ou le volet Autonomie. */
  | { type: 'vu'; what: 'ficheEnclos' | 'autonomie' }
  /** Récupère la récompense d'une mission réussie (id : celle visée, utile pour les quotidiennes). */
  | { type: 'recuperer'; track: 'tutoriel' | 'histoire' | 'quotidienne'; id?: string }
  | { type: 'passerTutoriel' }
  | { type: 'tracerChemin'; a: PathPoint; b: PathPoint }
  | { type: 'detruireChemin'; id: number }
  | { type: 'relierEnclos'; encId: number }
  | { type: 'embaucher'; candidateId: number }
  | { type: 'licencier'; employeeId: number }
  | { type: 'affecter'; employeeId: number; encIds: number[] }
  | { type: 'repartir' }
  /** Le joueur a lu la nouvelle mission : le « ! » s'éteint (silencieux). */
  | { type: 'lireMission' }

/** Applique l'action ; si elle réussit, compte ce qui s'est passé (les missions s'en servent). Un refus ne change rien. */
export function applyAction(state: GameState, a: Action): ActionResult {
  const r = run(state, a)
  if (!r.ok) return r
  const s = r.state
  switch (a.type) {
    case 'nettoyer': bump(s.stats, 'nettoyages'); break
    case 'acheterRations': bump(s.stats, a.food === 'fourrage' ? 'fourrageAchete' : 'viandeAchetee', a.n); break
    case 'vendre': bump(s.stats, 'ventes'); break
    case 'acheterAnimal': bump(s.stats, 'achatsAnimaux'); assignGaps(s); break
    case 'construire': assignGaps(s); break
    case 'soigner': bump(s.stats, 'soins'); break
    case 'soignerTout': bump(s.stats, 'soins', state.animals.filter((x) => x.enclosureId === a.encId && x.health.status === 'malade').length); break
    case 'billet': bump(s.stats, 'billetsRegles'); break
    case 'ameliorer': bump(s.stats, 'ameliorations'); break
    case 'vu': bump(s.stats, a.what === 'ficheEnclos' ? 'ficheEnclosVue' : 'autonomieVue'); break
    default: break
  }
  updateMissions(s, []) // une mission peut être réussie par cette action : le retour est immédiat
  return r
}

/** Actions qui dépensent : refusées tant que la caisse est dans le rouge. */
const SPENDING = new Set<Action['type']>(['construire', 'batir', 'ameliorer', 'agrandirGardeManger', 'acheterAnimal', 'tracerChemin', 'relierEnclos', 'embaucher'])

function run(state: GameState, a: Action): ActionResult {
  const debt = debtRefusal(state)
  if (debt) {
    if (SPENDING.has(a.type)) return debt
    if (a.type === 'redimensionner' && previewEnclosure(state, a.rect, a.encId).cost > 0) return debt
  }
  switch (a.type) {
    case 'nettoyer': return cleanEnclosure(state, a.encId)
    case 'soignerTout': return cureAllInEnclosure(state, a.encId)
    case 'soigner': return cureAnimal(state, a.animalId)
    case 'construire': return buildEnclosure(state, a.rect)
    case 'redimensionner': return resizeEnclosure(state, a.encId, a.rect)
    case 'renommer': return renameAnimal(state, a.animalId, a.name)
    case 'batir': return buildBuilding(state, a.slot, a.building)
    case 'ameliorer': return upgradeBuilding(state, a.slot)
    case 'acheterRations': return buyRations(state, a.food, a.n)
    case 'agrandirGardeManger': return upgradePantry(state)
    case 'billet': return setTicketPrice(state, a.price)
    case 'monterNiveau': return levelUp(state)
    case 'acheterAnimal': return buyAnimal(state, a.offerId, a.encId, a.useCoupon)
    case 'vendre': return sellAnimal(state, a.animalId)
    case 'vu': return { ok: true, state: structuredClone(state) }
    case 'recuperer': return claimMission(state, a.track, a.id)
    case 'passerTutoriel': return skipTutorial(state)
    case 'tracerChemin': return traceChemin(state, a.a, a.b)
    case 'detruireChemin': return destroyPath(state, a.id)
    case 'relierEnclos': return linkEnclosure(state, a.encId)
    case 'embaucher': return hire(state, a.candidateId)
    case 'licencier': return fire(state, a.employeeId)
    case 'affecter': return assign(state, a.employeeId, a.encIds)
    case 'repartir': return redistributeAll(state)
    case 'lireMission': { const s = structuredClone(state); s.missions.unread = false; return { ok: true, state: s } }
  }
}
