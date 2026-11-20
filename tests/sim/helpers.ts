import type { Animal, Employee, Enclosure, GameState, Health, JobId } from '../../src/sim/types'
import type { SpeciesId } from '../../src/data/species'
import { SPECIES } from '../../src/data/species'
import { capacity } from '../../src/sim/enclosure'
import { emptyStats } from '../../src/sim/stats'
import { HOUR_MS } from '../../src/data/tuning'
import { redistribute } from '../../src/sim/care'
import { dailyWages } from '../../src/sim/staff'

/** Petites fabriques pour les tests de la simulation. */
export const T0 = 1_800_000_000_000 - (1_800_000_000_000 % 600_000) // aligné sur le pas

export function emptyState(over: Partial<GameState> = {}): GameState {
  return {
    version: 6, time: T0, rng: 12345, coins: 1000, nextId: 100,
    pantry: { fourrage: 0, viande: 0, capacity: 1000 },
    enclosures: [], animals: [],
    ticketPrice: 2, reputation: 1,
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
    paths: [],
    // les anciens tests gardent les règles V1 (tout est suivi) ; un test du personnel met `coverAllUntil: 0`
    staff: { employees: [], candidates: [], renewAt: T0, renewals: 0, payDay: -1, coverAllUntil: Number.MAX_SAFE_INTEGER },
    ...over,
  }
}

/** Missions avec l'histoire placée à l'index donné (4 = palier Village, 8 = palier Bourg : les portes sont ouvertes). */
export function storyAt(index: number): GameState['missions'] {
  return {
    tutorial: { step: 10, current: null, skipped: false },
    story: { index, current: null },
    daily: { dayKey: -1, list: [], streak: 0, lastFullDay: null, coupons: 0 },
    unread: false,
  }
}

export function enclosure(id: number, species: SpeciesId | null, w = 12, d = 10, over: Partial<Enclosure> = {}): Enclosure {
  return { id, biome: species ? SPECIES[species].biome : 'prairie', species, rect: { x: 0, z: 0, w, d }, cleanedAt: T0, vaccinatedUntil: null, ...over }
}

export function animal(id: number, species: SpeciesId, sex: 'F' | 'M', encId: number, over: Partial<Animal> = {}): Animal {
  return {
    id, species, sex, name: `Bête${id}`, enclosureId: encId,
    bornAt: T0 - 3 * SPECIES[species].gestationH * HOUR_MS, // adulte
    lastFedAt: T0, health: { status: 'ok' }, pregnantSince: null, lastBirthAt: null, ...over,
  }
}

/**
 * Relie tous les enclos (pour les tests de charge) : une chaîne de chemins de l'allée jusqu'au centre de chaque enclos.
 * Pas réaliste (les chemins traversent les enclos, les parcs tassés n'ont pas de place pour de vrais chemins) : seule la liaison compte ici.
 */
function linkedPark(s: GameState): GameState {
  let prev = { x: -20, z: 10 } // sur l'allée d'entrée
  const paths = [...s.paths]
  let nextId = s.nextId
  for (const e of s.enclosures) {
    const c = { x: e.rect.x + e.rect.w / 2, z: e.rect.z + e.rect.d / 2 }
    paths.push({ id: nextId++, a: prev, b: c })
    prev = c
  }
  return { ...s, paths, nextId }
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
  return linkedPark(emptyState({
    coins: 5000, nextId: animalId,
    pantry: { fourrage: 400, viande: 400, capacity: 800 },
    village: { level: 3, clientsServed: 0 },
    buildings: [
      { slot: 0, type: 'ferme', level: 2 }, { slot: 1, type: 'cafe', level: 2 },
      { slot: 2, type: 'boutique', level: 1 }, { slot: 3, type: 'auberge', level: 1 },
    ],
    enclosures, animals, missions: storyAt(8),
  }))
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
  return linkedPark(emptyState({
    coins: 5000, nextId: animalId,
    pantry: { fourrage: 3 * perDay.fourrage * scale, viande: 3 * perDay.viande * scale, capacity: capacityTotal },
    village: { level: 3, clientsServed: 0 },
    buildings: [
      { slot: 0, type: 'ferme', level: 2 }, { slot: 1, type: 'cafe', level: 2 },
      { slot: 2, type: 'boutique', level: 1 }, { slot: 3, type: 'auberge', level: 1 },
    ],
    enclosures, animals, missions: storyAt(8),
  }))
}

/** Un animal malade (par défaut : indigestion légère, repérée, depuis `since`). */
export function sick(since: number = T0, over: Partial<Extract<Health, { status: 'malade' }>> = {}): Health {
  return { status: 'malade', disease: 'indigestion', stage: 1, stageSince: since, detectedAt: since, careUntil: null, vetId: null, quarantined: false, ...over }
}

/** Un employé (par défaut : débutant, embauché à T0, sans enclos). */
export function employee(id: number, job: JobId, over: Partial<Employee> = {}): Employee {
  return { id, name: `Employé${id}`, job, xpH: 0, hiredAt: T0, encIds: [], ...over }
}

/** Remplit le garde-manger pour `days` jours de consommation (capacité relevée si besoin). */
function stockFor(s: GameState, days: number): void {
  const perDay = { fourrage: 0, viande: 0 }
  for (const a of s.animals) perDay[SPECIES[a.species].diet[0]] += SPECIES[a.species].rationsPerDay
  const need = days * (perDay.fourrage + perDay.viande)
  s.pantry = { fourrage: days * perDay.fourrage, viande: days * perDay.viande, capacity: Math.max(s.pantry.capacity, Math.ceil(need * 1.1)) }
}

/**
 * Parc bien tenu : `bigPark()` + personnel qui couvre tous les animaux et tous les enclos (règles de l'étape 2, plus de « tout est suivi »),
 * maison du personnel, centre vétérinaire niveau 3 (emplacement 7) avec 2 vétérinaires, garde-manger pour 4 jours,
 * caisse = 3 jours de salaires + 3 000, aucun enclos vacciné (le centre 3 ne vaccine pas).
 */
export function wellKeptPark(): GameState {
  const s = bigPark()
  s.staff.coverAllUntil = 0 // la couverture vient vraiment des soigneurs ajoutés
  s.buildings.push({ slot: 6, type: 'personnel', level: 3 }, { slot: 7, type: 'centreVeto', level: 3 })
  let id = 6000
  for (let i = 0; i < 4; i++) s.staff.employees.push(employee(id++, 'soigneur', { xpH: 700, hiredAt: s.time }))
  for (let i = 0; i < 2; i++) s.staff.employees.push(employee(id++, 'entretien', { xpH: 700, hiredAt: s.time }))
  for (let i = 0; i < 2; i++) s.staff.employees.push(employee(id++, 'veterinaire', { hiredAt: s.time }))
  redistribute(s)
  stockFor(s, 4)
  s.coins = 3 * dailyWages(s) + 3000
  return s
}

/** Parc du Hameau : niveau 1, 3 enclos de prairie, soigneur offert, centre niveau 1, 1 vétérinaire, garde-manger pour 4 jours. */
export function hameauPark(): GameState {
  const R = (x: number, z: number, w: number, d: number) => ({ x, z, w, d })
  const layout: [SpeciesId, Enclosure['rect']][] = [['mouton', R(-34, -8, 10, 8)], ['cochon', R(-24, -8, 10, 8)], ['ane', R(-14, -8, 10, 8)]]
  const enclosures: Enclosure[] = []
  const animals: Animal[] = []
  let animalId = 1
  layout.forEach(([sp, rect], i) => {
    const enc = enclosure(i + 1, sp, rect.w, rect.d, { rect })
    enclosures.push(enc)
    // que des femelles : pas de portée qui dépasse la capacité (blessures que le centre niveau 1 ne soigne pas : question ouverte pour Romain)
    for (let k = 0; k < Math.min(3, capacity(enc)); k++) animals.push(animal(animalId++, sp, 'F', enc.id))
  })
  const s = linkedPark(emptyState({
    nextId: animalId, village: { level: 1, clientsServed: 0 },
    buildings: [{ slot: 0, type: 'ferme', level: 1 }, { slot: 7, type: 'centreVeto', level: 1 }],
    enclosures, animals,
  }))
  s.staff.coverAllUntil = 0
  s.staff.employees.push(employee(6000, 'soigneur', { hiredAt: s.time }), employee(6001, 'veterinaire', { hiredAt: s.time }))
  redistribute(s)
  stockFor(s, 4)
  s.coins = 3 * dailyWages(s) + 3000
  return s
}
