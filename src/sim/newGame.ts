import { START_PATH } from '../data/paths'
import { SPECIES } from '../data/species'
import { ANIMAL_NAMES } from '../data/names'
import { TUNING, HOUR_MS } from '../data/tuning'
import type { GameState } from './types'
import { random } from './random'
import { restock } from './merchant'
import { emptyStats } from './stats'
import { updateMissions } from './missions'

/** Nouvelle partie : un enclos de prairie, un couple de moutons adultes, un peu de fourrage. */
export function newGame(seed: number, nowMs: number): GameState {
  const time = Math.floor(nowMs / TUNING.STEP_MS) * TUNING.STEP_MS
  const state: GameState = {
    version: 4, time, rng: seed >>> 0, coins: TUNING.START_COINS, nextId: 1,
    pantry: { fourrage: TUNING.START_FOURRAGE, viande: 0, capacity: TUNING.START_PANTRY_CAPACITY },
    enclosures: [], animals: [],
    ticketPrice: 2, reputation: 1,
    village: { level: 1, clientsServed: 0 },
    buildings: [{ slot: 0, type: 'ferme', level: 1 }],
    merchant: { restockAt: time, restocks: 0, offers: [] },
    totalVisitors: 0,
    stats: emptyStats(),
    missions: {
      tutorial: { step: 0, current: null, skipped: false },
      story: { index: 0, current: null },
      daily: { dayKey: -1, list: [], streak: 0, lastFullDay: null, coupons: 0 },
      unread: true,
    },
    utcOffsetMin: 0,
    paths: [],
  }
  state.paths.push({ id: state.nextId++, a: { ...START_PATH.a }, b: { ...START_PATH.b } })
  const encId = state.nextId++
  state.enclosures.push({ id: encId, biome: 'prairie', species: 'mouton', rect: { ...TUNING.START_ENCLOSURE }, cleanedAt: time - TUNING.START_DIRT_H * HOUR_MS })
  const adultBorn = time - 2 * SPECIES.mouton.gestationH * HOUR_MS
  for (const sex of ['F', 'M'] as const) {
    const name = ANIMAL_NAMES[Math.floor(random(state) * ANIMAL_NAMES.length)]
    state.animals.push({
      id: state.nextId++, species: 'mouton', sex, name, bornAt: adultBorn, enclosureId: encId,
      lastFedAt: time, health: { status: 'ok' }, pregnantSince: null, lastBirthAt: null,
    })
  }
  restock(state) // premier stock : le couple de cochons
  updateMissions(state, []) // le premier des premiers pas démarre tout de suite
  return state
}
