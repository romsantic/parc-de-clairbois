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

/** Missions avec l'histoire placée à l'index donné (4 = palier Village, 8 = palier Bourg : les portes sont ouvertes). */
export function storyAt(index: number): GameState['missions'] {
  return {
    tutorial: { step: 9, current: null, skipped: false },
    story: { index, current: null },
    daily: { dayKey: -1, list: [], streak: 0, lastFullDay: null, coupons: 0 },
    unread: false,
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

/**
 * Grand parc réaliste de niveau 3 : village niveau 3, 15 enclos rangés par colonnes de 6 m dans leur zone
 * (prairie, forêt, montagne), ≈ 150 animaux des 10 espèces (mâles et femelles adultes, en bonne santé),
 * garde-manger plein (grande capacité) et bâtiments construits.
 */
export function bigPark(): GameState {
  const columns: { zone: 'foret' | 'prairie' | 'montagne'; z: number; d: number; species: SpeciesId[] }[] = [
    { zone: 'prairie', z: -8, d: 16.5, species: ['mouton', 'mouton', 'cochon', 'ane', 'alpaga'] },
    { zone: 'foret', z: -24, d: 16, species: ['renard', 'renard', 'cerf', 'cheval', 'cerf'] },
    { zone: 'montagne', z: 11.5, d: 12.5, species: ['lama', 'lama', 'taureau', 'loup', 'loup'] },
  ]
  const enclosures: Enclosure[] = []
  const animals: Animal[] = []
  let encId = 1, animalId = 1
  for (const col of columns) {
    col.species.forEach((sp, i) => {
      enclosures.push(enclosure(encId, sp, 6, col.d, { rect: { x: -34 + 6 * i, z: col.z, w: 6, d: col.d } }))
      for (let k = 0; k < 10; k++) animals.push(animal(animalId++, sp, k % 2 === 0 ? 'F' : 'M', encId))
      encId++
    })
  }
  return emptyState({
    coins: 5000, nextId: animalId,
    pantry: { fourrage: 400, viande: 400, capacity: 800 },
    village: { level: 3, clientsServed: 0 },
    buildings: [
      { slot: 0, type: 'ferme', level: 2 }, { slot: 1, type: 'cafe', level: 2 },
      { slot: 2, type: 'boutique', level: 1 }, { slot: 3, type: 'auberge', level: 1 },
    ],
    enclosures, animals, missions: storyAt(8),
  })
}
