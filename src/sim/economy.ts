import { BUILDINGS, ECONOMY, FARM } from '../data/economy'
import { DAY_MS, HOUR_MS, TUNING } from '../data/tuning'
import { farmLevel } from './village'
import { SPECIES } from '../data/species'
import type { SpeciesId } from '../data/species'
import { bump } from './stats'
import { happiness } from './happiness'
import { buildRoster } from './enclosure'
import type { ParkPace } from '../data/missions'
import { linkedEnclosureIds } from './paths'
import type { Animal, BuildingType, GameEvent, GameState } from './types'

/** Animaux que les visiteurs peuvent voir : ceux des enclos reliés à l'allée par un chemin. */
export function visibleAnimals(state: GameState): Animal[] {
  const linked = linkedEnclosureIds(state)
  return state.animals.filter((a) => linked.has(a.enclosureId))
}

/** Nombre d'espèces que les visiteurs voient. */
export const visibleSpecies = (state: GameState): number => new Set(visibleAnimals(state).map((a) => a.species)).size

/** Attrait : par espèce visible, base × (1 + 0,5 × √(n − 1)), n = nombre d'animaux visibles de l'espèce. */
export function appeal(state: GameState): number {
  const counts = new Map<SpeciesId, number>()
  for (const a of visibleAnimals(state)) counts.set(a.species, (counts.get(a.species) ?? 0) + 1)
  let total = 0
  for (const [id, n] of counts) {
    total += SPECIES[id].appeal * (1 + ECONOMY.APPEAL_EXTRA_FACTOR * Math.sqrt(n - 1))
  }
  return total
}

/** Bonheur moyen de tous les animaux (0 sans animal). */
export function averageHappiness(state: GameState): number {
  if (state.animals.length === 0) return 0
  const roster = buildRoster(state)
  return state.animals.reduce((s, a) => s + happiness(state, a, roster), 0) / state.animals.length
}

/** Prix juste du billet : entier, au moins 1. */
export function fairPrice(state: GameState): number {
  const p = ECONOMY.FAIR_BASE + ECONOMY.FAIR_PER_LEVEL * (state.village.level - 1) + ECONOMY.FAIR_PER_APPEAL * appeal(state)
  return Math.max(1, Math.round(p))
}

/** Multiplicateur de visiteurs selon prix / prix juste (interpolation linéaire de la courbe). */
export function priceMultiplier(ratio: number): number {
  const curve = ECONOMY.PRICE_CURVE
  if (ratio <= curve[0][0]) return curve[0][1]
  const last = curve[curve.length - 1]
  if (ratio >= last[0]) return last[1]
  for (let i = 1; i < curve.length; i++) {
    const [x1, y1] = curve[i]
    if (ratio <= x1) {
      const [x0, y0] = curve[i - 1]
      return y0 + ((y1 - y0) * (ratio - x0)) / (x1 - x0)
    }
  }
  return last[1]
}

/** Visiteurs par heure au prix donné. */
export function visitorsPerHour(state: GameState, price: number = state.ticketPrice): number {
  const auberge = state.buildings.some((b) => b.type === 'auberge') ? ECONOMY.AUBERGE_VISITOR_BONUS : 1
  const reputation = ECONOMY.REPUTATION_BASE + (1 - ECONOMY.REPUTATION_BASE) * state.reputation
  return appeal(state) * averageHappiness(state) * priceMultiplier(price / fairPrice(state))
    * reputation * auberge * ECONOMY.VISITORS_PER_APPEAL
}

/** Dépense d'un client dans un bâtiment (boutique : selon le nombre d'espèces du parc). */
export function spendPerClient(type: BuildingType, level: number, especes: number): number {
  const data = BUILDINGS[type]
  if (data.share === 0 || level - 1 >= data.spend.length) return 0 // ferme, maison du personnel, centre : pas de clients
  return type === 'boutique'
    ? (ECONOMY.BOUTIQUE_BASE + ECONOMY.BOUTIQUE_PER_SPECIES * especes) * data.spend[level - 1]
    : data.spend[level - 1]
}

/** Clients et recettes par heure d'un bâtiment, pour un nombre de visiteurs et d'espèces donnés. */
function buildingFlow(b: { type: BuildingType; level: number }, visiteurs: number, especes: number): { clients: number; pieces: number } {
  const data = BUILDINGS[b.type]
  const i = b.level - 1
  if (data.share === 0 || i >= data.maxClientsPerH.length) return { clients: 0, pieces: 0 }
  const clients = Math.min(visiteurs * data.share, data.maxClientsPerH[i])
  return { clients, pieces: clients * spendPerClient(b.type, b.level, especes) }
}

/** Estimation d'un bâtiment (clients/h et pièces/h) ; zéro si l'emplacement est libre. */
export function buildingIncomePerHour(state: GameState, slot: number): { clients: number; pieces: number } {
  const b = state.buildings.find((x) => x.slot === slot)
  if (!b) return { clients: 0, pieces: 0 }
  return buildingFlow(b, visitorsPerHour(state), visibleSpecies(state))
}

/** Revenus par heure : billets, commerces du village, et nombre de clients servis. */
export function incomePerHour(state: GameState, price: number = state.ticketPrice):
  { visiteurs: number; billets: number; village: number; clients: number } {
  const visiteurs = visitorsPerHour(state, price)
  const especes = visibleSpecies(state)
  let village = 0
  let clients = 0
  for (const b of state.buildings) {
    const f = buildingFlow(b, visiteurs, especes)
    clients += f.clients
    village += f.pieces
  }
  return { visiteurs, billets: visiteurs * price, village, clients }
}

/** L'avancement du parc à cet instant : de quoi régler les missions du jour. */
export function parkPace(state: GameState): ParkPace {
  const inc = incomePerHour(state)
  return {
    visitorsPerH: inc.visiteurs,
    coinsPerH: inc.billets + inc.village,
    rationsPerDay: state.animals.reduce((n, a) => n + SPECIES[a.species].rationsPerDay, 0),
    enclosures: state.enclosures.length,
    animals: state.animals.length,
  }
}

/** Un pas (1/6 h) : recettes, clients, réputation et fourrage gratuit de la ferme. */
export function economyStep(state: GameState, events: GameEvent[]): void {
  const h = TUNING.STEP_MS / HOUR_MS
  const inc = incomePerHour(state)
  const billets = inc.billets * h
  const village = inc.village * h
  const visiteurs = inc.visiteurs * h
  if (billets + village > 0) {
    state.coins += billets + village
    bump(state.stats, 'piecesGagnees', billets + village)
    events.push({ kind: 'recettes', at: state.time, visiteurs, billets, village })
  }
  state.village.clientsServed += inc.clients * h
  state.totalVisitors += visiteurs
  bump(state.stats, 'visiteurs', visiteurs)

  // Réputation : baisse si le billet dépasse 1,5 × le prix juste, sinon remonte.
  const cher = state.ticketPrice > ECONOMY.REPUTATION_DROP_ABOVE * fairPrice(state)
  const delta = cher ? -ECONOMY.REPUTATION_DROP_PER_H * h : ECONOMY.REPUTATION_GAIN_PER_H * h
  state.reputation = Math.min(1, Math.max(0, state.reputation + delta))

  // Fourrage gratuit de la ferme, dans la limite du garde-manger.
  const niveau = farmLevel(state)
  if (niveau > 0) {
    const libre = Math.max(0, state.pantry.capacity - state.pantry.fourrage - state.pantry.viande)
    state.pantry.fourrage += Math.min(libre, (FARM.freeFourragePerDay[niveau - 1] * TUNING.STEP_MS) / DAY_MS)
  }
}
