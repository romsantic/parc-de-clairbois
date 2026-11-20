import { BUILDINGS, ECONOMY, SLOTS } from '../data/economy'
import { STORY } from '../data/missions'
import type { BuildingType, GameState } from './types'

/** Nouveaux venus pour un nombre de clients servis : vite au début, plus lentement ensuite. */
export function newcomers(clients: number): number {
  const { CLIENTS_PER_NEWCOMER: fast, NEWCOMER_FAST_CLIENTS: limit, CLIENTS_PER_NEWCOMER_LATE: late } = ECONOMY
  if (clients <= limit) return Math.floor(clients / fast)
  return Math.floor(limit / fast) + Math.floor((clients - limit) / late)
}

/** Clients servis qu'il faut au minimum pour avoir `n` nouveaux venus. */
export function clientsForNewcomers(n: number): number {
  const { CLIENTS_PER_NEWCOMER: fast, NEWCOMER_FAST_CLIENTS: limit, CLIENTS_PER_NEWCOMER_LATE: late } = ECONOMY
  const fastCount = Math.floor(limit / fast)
  return n <= fastCount ? n * fast : limit + (n - fastCount) * late
}

/** Habitants : base + RESIDENTS_PER_LEVEL par niveau de chaque bâtiment + un nouvel habitant par groupe de clients servis. */
export function population(state: GameState): number {
  const niveaux = state.buildings.reduce((s, b) => s + b.level, 0)
  return ECONOMY.BASE_POPULATION + ECONOMY.RESIDENTS_PER_LEVEL * niveaux
    + newcomers(state.village.clientsServed)
}

/** Mission du palier : la mission d'histoire marquée `gate: level` est réussie (même pas encore récupérée), ou l'histoire est déjà au-delà. */
export function missionGateOk(state: GameState, level: 2 | 3): boolean {
  const gateIndex = STORY.findIndex((m) => m.gate === level)
  const { index, current } = state.missions.story
  return index > gateIndex || (index === gateIndex && current?.done === true)
}

/** Ce bâtiment a-t-il son propre emplacement (champ `only` de SLOTS) ? Maison du personnel, centre vétérinaire. */
export function isReservedType(type: BuildingType): boolean {
  return SLOTS.some((s) => s.only === type)
}

/** Un emplacement libre et débloqué peut-il encore recevoir un bâtiment ? (Pas au Bourg en V1 ; sinon s'il reste un type constructible.) */
export function slotCanBuild(state: GameState, slotId: number): boolean {
  const sl = SLOTS.find((x) => x.id === slotId)
  if (!sl || sl.unlockLevel === 3) return false
  return (Object.keys(BUILDINGS) as BuildingType[]).some((t) =>
    (sl.only ? t === sl.only : !isReservedType(t)) && BUILDINGS[t].buildCost !== null && BUILDINGS[t].unlockLevel <= state.village.level && !state.buildings.some((b) => b.type === t))
}

/** Le village peut-il passer au niveau suivant ? (Simple question : le niveau ne change que par une action.) */
export function canLevelUp(state: GameState): { ok: true; level: 2 | 3 } | { ok: false; reason: string } {
  if (state.village.level >= 3) return { ok: false, reason: 'Clairbois est déjà un bourg.' }
  const level = (state.village.level + 1) as 2 | 3
  const needed = ECONOMY.LEVEL_POPULATION[level]
  const pop = population(state)
  if (pop < needed) return { ok: false, reason: `Il faut ${needed} habitants (encore ${needed - pop}).` }
  if (!missionGateOk(state, level)) return { ok: false, reason: 'Il faut d\'abord terminer la mission du palier.' }
  return { ok: true, level }
}

/** Niveau de la ferme : 0 sans ferme. */
export function farmLevel(state: GameState): 0 | 1 | 2 | 3 {
  return (state.buildings.find((b) => b.type === 'ferme')?.level ?? 0) as 0 | 1 | 2 | 3 // la ferme n'a que 3 niveaux
}

