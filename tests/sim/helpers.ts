import type { Animal, Enclosure, GameState } from '../../src/sim/types'
import type { SpeciesId } from '../../src/data/species'
import { SPECIES } from '../../src/data/species'
import { capacity } from '../../src/sim/enclosure'
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
 * Parc de stress (pas réaliste) : village niveau 3, 15 enclos de 6 m dans leur zone, 150 animaux des 10 espèces
 * (10 par enclos, donc très surpeuplé), en bonne santé, garde-manger de capacité 800 plein, bâtiments construits.
 */
export function crowdedPark(): GameState {
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

/**
 * Parc réaliste de niveau 3 (pour les missions du jour et le robot d'équilibrage) : 15 enclos propres rangés dans
 * leur zone (prairie 6, forêt 5, montagne 4), des animaux adultes mâles et femelles en bonne santé, en nombre
 * calé sur la capacité de chaque enclos (un de moins quand il y a de la place, pour que des naissances restent
 * possibles), garde-manger rempli pour ≈ 3 jours de consommation, bâtiments construits.
 */
export function bigPark(): GameState {
  const R = (x: number, z: number, w: number, d: number) => ({ x, z, w, d })
  const layout: [SpeciesId, Enclosure['rect']][] = [
    // prairie : deux rangées de 3 (z de -8 à 8,5, juste avant l'allée)
    ['mouton', R(-34, -8, 10, 8)], ['cochon', R(-24, -8, 10, 8)], ['ane', R(-14, -8, 10, 8)],
    ['alpaga', R(-34, 0, 10, 8.5)], ['mouton', R(-24, 0, 10, 8.5)], ['cochon', R(-14, 0, 10, 8.5)],
    // forêt : une rangée de 3, une de 2
    ['renard', R(-34, -24, 10, 8)], ['cerf', R(-24, -24, 10, 8)], ['renard', R(-14, -24, 10, 8)],
    ['cheval', R(-34, -16, 15, 8)], ['cerf', R(-19, -16, 15, 8)],
    // montagne
    ['lama', R(-34, 11.5, 6, 12.5)], ['taureau', R(-28, 11.5, 9, 12.5)], ['loup', R(-19, 11.5, 7.5, 12.5)], ['loup', R(-11.5, 11.5, 7.5, 12.5)],
  ]
  const enclosures: Enclosure[] = []
  const animals: Animal[] = []
  const perDay = { fourrage: 0, viande: 0 }
  let animalId = 1
  layout.forEach(([sp, rect], i) => {
    const enc = enclosure(i + 1, sp, rect.w, rect.d, { rect })
    enclosures.push(enc)
    const cap = capacity(enc)
    const n = cap >= 3 ? cap - 1 : cap
    for (let k = 0; k < n; k++) {
      animals.push(animal(animalId++, sp, k % 2 === 0 ? 'F' : 'M', enc.id))
      perDay[SPECIES[sp].diet[0]] += SPECIES[sp].rationsPerDay
    }
  })
  const capacityTotal = 800
  const scale = Math.min(1, capacityTotal / (3 * (perDay.fourrage + perDay.viande)))
  return emptyState({
    coins: 5000, nextId: animalId,
    pantry: { fourrage: 3 * perDay.fourrage * scale, viande: 3 * perDay.viande * scale, capacity: capacityTotal },
    village: { level: 3, clientsServed: 0 },
    buildings: [
      { slot: 0, type: 'ferme', level: 2 }, { slot: 1, type: 'cafe', level: 2 },
      { slot: 2, type: 'boutique', level: 1 }, { slot: 3, type: 'auberge', level: 1 },
    ],
    enclosures, animals, missions: storyAt(8),
  })
}
