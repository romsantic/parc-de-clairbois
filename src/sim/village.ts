import { BUILDINGS, ECONOMY, SLOTS } from '../data/economy'
import type { BuildingType, GameState } from './types'

/** Habitants : base + RESIDENTS_PER_LEVEL par niveau de chaque bâtiment + un nouvel habitant par groupe de clients servis. */
export function population(state: GameState): number {
  const niveaux = state.buildings.reduce((s, b) => s + b.level, 0)
  return ECONOMY.BASE_POPULATION + ECONOMY.RESIDENTS_PER_LEVEL * niveaux
    + Math.floor(state.village.clientsServed / ECONOMY.CLIENTS_PER_NEWCOMER)
}

/** Mission du palier. À l'étape 4 elle est toujours remplie ; l'étape 5 vérifiera la vraie mission. */
export function missionGateOk(_state: GameState, _level: 2 | 3): boolean {
  return true
}

/** Un emplacement libre et débloqué peut-il encore recevoir un bâtiment ? (Pas au Bourg en V1 ; sinon s'il reste un type constructible.) */
export function slotCanBuild(state: GameState, slotId: number): boolean {
  const sl = SLOTS.find((x) => x.id === slotId)
  if (!sl || sl.unlockLevel === 3) return false
  return (Object.keys(BUILDINGS) as BuildingType[]).some((t) =>
    BUILDINGS[t].buildCost !== null && BUILDINGS[t].unlockLevel <= state.village.level && !state.buildings.some((b) => b.type === t))
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
  return state.buildings.find((b) => b.type === 'ferme')?.level ?? 0
}

