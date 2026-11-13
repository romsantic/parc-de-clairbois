import { SPECIES } from '../data/species'
import { ANIMAL_NAMES } from '../data/names'
import { TUNING, HOUR_MS } from '../data/tuning'
import type { GameState } from './types'
import { random } from './random'

/** Nouvelle partie : un enclos de prairie, un couple de moutons adultes, un peu de fourrage. */
export function newGame(seed: number, nowMs: number): GameState {
  const time = Math.floor(nowMs / TUNING.STEP_MS) * TUNING.STEP_MS
  const state: GameState = {
    version: 1, time, rng: seed >>> 0, coins: TUNING.START_COINS, nextId: 1,
    pantry: { fourrage: TUNING.START_FOURRAGE, viande: 0, capacity: TUNING.START_PANTRY_CAPACITY },
    enclosures: [], animals: [],
  }
  const encId = state.nextId++
  state.enclosures.push({ id: encId, biome: 'prairie', species: 'mouton', rect: { ...TUNING.START_ENCLOSURE }, cleanedAt: time })
  const adultBorn = time - 2 * SPECIES.mouton.gestationH * HOUR_MS
  for (const sex of ['F', 'M'] as const) {
    const name = ANIMAL_NAMES[Math.floor(random(state) * ANIMAL_NAMES.length)]
    state.animals.push({
      id: state.nextId++, species: 'mouton', sex, name, bornAt: adultBorn, enclosureId: encId,
      lastFedAt: time, health: { status: 'ok' }, pregnantSince: null,
    })
  }
  return state
}
