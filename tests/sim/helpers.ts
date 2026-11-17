import type { Animal, Enclosure, GameState } from '../../src/sim/types'
import type { SpeciesId } from '../../src/data/species'
import { SPECIES } from '../../src/data/species'
import { emptyStats } from '../../src/sim/stats'
import { HOUR_MS } from '../../src/data/tuning'

/** Petites fabriques pour les tests de la simulation. */
export const T0 = 1_800_000_000_000 - (1_800_000_000_000 % 600_000) // aligné sur le pas

export function emptyState(over: Partial<GameState> = {}): GameState {
  return {
    version: 3, time: T0, rng: 12345, coins: 1000, nextId: 100,
    pantry: { fourrage: 0, viande: 0, capacity: 1000 },
    enclosures: [], animals: [],
    ticketPrice: 5, reputation: 1,
    village: { level: 1, clientsServed: 0 },
    buildings: [{ slot: 0, type: 'ferme', level: 1 }],
    merchant: { restockAt: T0, restocks: 0, offers: [] },
    totalVisitors: 0,
    stats: emptyStats(),
    missions: {
      tutorial: { step: 0, current: null, skipped: false },
      story: { index: 0, current: null },
      daily: { dayKey: -1, list: [], streak: 0, lastFullDay: null, coupons: 0 },
      unread: true,
    },
    utcOffsetMin: 0,
    ...over,
  }
}

export function enclosure(id: number, species: SpeciesId | null, w = 12, d = 10, over: Partial<Enclosure> = {}): Enclosure {
  return { id, biome: species ? SPECIES[species].biome : 'prairie', species, rect: { x: 0, z: 0, w, d }, cleanedAt: T0, ...over }
}

export function animal(id: number, species: SpeciesId, sex: 'F' | 'M', encId: number, over: Partial<Animal> = {}): Animal {
  return {
    id, species, sex, name: `Bête${id}`, enclosureId: encId,
    bornAt: T0 - 3 * SPECIES[species].gestationH * HOUR_MS, // adulte
    lastFedAt: T0, health: { status: 'ok' }, pregnantSince: null, lastBirthAt: null, ...over,
  }
}
