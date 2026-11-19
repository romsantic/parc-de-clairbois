import { describe, it, expect } from 'vitest'
import { loadGame, SAVE_KEY, type Storage } from '../../src/save/save'
import { newGame } from '../../src/sim/newGame'
import { CURRENT_VERSION, MIGRATIONS } from '../../src/save/migrations'
import { VET_CENTER } from '../../src/data/diseases'
import { advanceTo } from '../../src/sim/advance'
import type { GameState } from '../../src/sim/types'

function memory(init: Record<string, string> = {}): Storage & { data: Record<string, string> } {
  const data = { ...init }
  return { data, getItem: (k) => (k in data ? data[k] : null), setItem: (k, v) => { data[k] = v } }
}

/** Copie littérale d'une partie au format 1 (deux moutons) : ne doit jamais changer. */
const V1_STATE = {
  version: 1, time: 1_800_000_000_000, rng: 987654, coins: 432, nextId: 5,
  pantry: { fourrage: 17, viande: 0, capacity: 200 },
  enclosures: [{ id: 1, biome: 'prairie', species: 'mouton', rect: { x: -26, z: -5, w: 12, d: 10 }, cleanedAt: 1_799_999_400_000 }],
  animals: [
    { id: 2, species: 'mouton', sex: 'F', name: 'Brindille', bornAt: 1_799_000_000_000, enclosureId: 1, lastFedAt: 1_800_000_000_000, health: { status: 'ok' }, pregnantSince: null },
    { id: 3, species: 'mouton', sex: 'M', name: 'Nuage', bornAt: 1_799_000_000_000, enclosureId: 1, lastFedAt: 1_800_000_000_000, health: { status: 'ok' }, pregnantSince: 1_799_990_000_000 },
  ],
}

describe('migration v1 -> v2', () => {
  const m = memory({ [SAVE_KEY]: JSON.stringify({ version: 1, savedAt: 1, state: V1_STATE }) })
  const r = loadGame(m)

  it('charge la partie, migrée jusqu à la version courante', () => {
    expect(CURRENT_VERSION).toBe(6)
    expect(r.kind).toBe('ok')
    if (r.kind !== 'ok') return
    expect(r.state.version).toBe(6)
  })
  it('ajoute la ferme niveau 1, le billet à 5, la réputation à 1, le village niveau 1', () => {
    if (r.kind !== 'ok') throw new Error('illisible')
    const s = r.state
    expect(s.buildings).toEqual([{ slot: 0, type: 'ferme', level: 1 }, { slot: 7, type: 'centreVeto', level: 1 }]) // le centre est offert par la migration v5 -> v6
    expect(s.ticketPrice).toBe(5)
    expect(s.reputation).toBe(1)
    expect(s.village).toEqual({ level: 1, clientsServed: 0 })
    expect(s.merchant).toEqual({ restockAt: V1_STATE.time, restocks: 0, offers: [] })
    expect(s.totalVisitors).toBe(0)
  })
  it('ne perd rien : pièces, animaux, enclos, avec lastBirthAt à null', () => {
    if (r.kind !== 'ok') throw new Error('illisible')
    const s = r.state
    expect(s.coins).toBe(432)
    expect(s.pantry).toEqual(V1_STATE.pantry)
    expect(s.enclosures).toEqual(V1_STATE.enclosures.map((e) => ({ ...e, vaccinatedUntil: null })))
    expect(s.animals).toEqual(V1_STATE.animals.map((a) => ({ ...a, lastBirthAt: null })))
  })
  it('une partie v2 sans village est illisible', () => {
    const { village, ...rest } = newGame(1, 1_800_000_000_000)
    const mm = memory()
    mm.setItem(SAVE_KEY, JSON.stringify({ version: 2, savedAt: 1, state: rest }))
    expect(loadGame(mm).kind).toBe('illisible')
    void village
  })
})

/** Copie littérale d'une partie au format 2 (café, deux espèces, village niveau 1) : ne doit jamais changer. */
const V2_STATE = {
  version: 2, time: 1_800_000_000_000, rng: 4242, coins: 321, nextId: 9,
  pantry: { fourrage: 40, viande: 3, capacity: 200 },
  enclosures: [{ id: 1, biome: 'prairie', species: 'mouton', rect: { x: -26, z: -5, w: 12, d: 10 }, cleanedAt: 1_799_999_400_000 }],
  animals: [
    { id: 2, species: 'mouton', sex: 'F', name: 'Brindille', bornAt: 1_799_000_000_000, enclosureId: 1, lastFedAt: 1_800_000_000_000, health: { status: 'ok' }, pregnantSince: null, lastBirthAt: null },
  ],
  ticketPrice: 6, reputation: 0.8,
  village: { level: 1, clientsServed: 12 },
  buildings: [{ slot: 0, type: 'ferme', level: 1 }, { slot: 1, type: 'cafe', level: 1 }],
  merchant: { restockAt: 1_800_000_000_000, restocks: 1, offers: [] },
  totalVisitors: 77,
}
const ZERO_COUNTS = {
  nettoyages: 0, fourrageAchete: 0, viandeAchetee: 0, ventes: 0, achatsAnimaux: 0, naissances: 0, gestations: 0,
  visiteurs: 0, piecesGagnees: 0, soins: 0, billetsRegles: 0, ficheEnclosVue: 0, autonomieVue: 0, ameliorations: 0,
}
const loadV2 = (state: unknown) => loadGame(memory({ [SAVE_KEY]: JSON.stringify({ version: 2, savedAt: 1, state }) }))

describe('migration v2 -> v3', () => {
  it('charge la partie au format 3', () => {
    expect(CURRENT_VERSION).toBe(6)
    const r = loadV2(V2_STATE)
    expect(r.kind).toBe('ok')
    if (r.kind !== 'ok') return
    expect(r.state.version).toBe(6)
  })
  it('compteurs à zéro, sauf les visiteurs (= totalVisitors)', () => {
    const r = loadV2(V2_STATE)
    if (r.kind !== 'ok') throw new Error('illisible')
    expect(r.state.stats).toEqual({ counts: { ...ZERO_COUNTS, visiteurs: 77, vaccinations: 0 }, birthsBySpecies: {} })
  })
  it('missions : premiers pas à l’étape 0, histoire à 0, quotidiennes vides, « ! » allumé', () => {
    const r = loadV2(V2_STATE)
    if (r.kind !== 'ok') throw new Error('illisible')
    expect(r.state.missions).toEqual({
      tutorial: { step: 0, current: null, skipped: false },
      story: { index: 0, current: null },
      daily: { dayKey: -1, list: [], streak: 0, lastFullDay: null, coupons: 0 },
      unread: true,
    })
    expect(r.state.utcOffsetMin).toBe(0)
  })
  it('ne perd rien de la partie', () => {
    const r = loadV2(V2_STATE)
    if (r.kind !== 'ok') throw new Error('illisible')
    const { version, buildings, enclosures, nextId, ...rest } = V2_STATE
    expect(r.state.nextId).toBe(nextId + 1) // la vétérinaire offerte en v6 prend l'id suivant
    expect(r.state).toMatchObject(rest)
    expect(r.state.buildings).toEqual(expect.arrayContaining(buildings)) // + le centre offert en v6
    expect(r.state.enclosures).toEqual(enclosures.map((e) => ({ ...e, vaccinatedUntil: null })))
    void version
  })
  it('village niveau 2 : l’histoire commence au palier Village (index 4) ; niveau 3 : Bourg (index 8)', () => {
    const r2 = loadV2({ ...V2_STATE, village: { level: 2, clientsServed: 0 } })
    const r3 = loadV2({ ...V2_STATE, village: { level: 3, clientsServed: 0 } })
    if (r2.kind !== 'ok' || r3.kind !== 'ok') throw new Error('illisible')
    expect(r2.state.missions.story.index).toBe(4)
    expect(r3.state.missions.story.index).toBe(8)
  })
  it('une partie v3 sans missions est illisible', () => {
    const { missions, ...rest } = newGame(1, 1_800_000_000_000)
    const mm = memory()
    mm.setItem(SAVE_KEY, JSON.stringify({ version: 6, savedAt: 1, state: rest }))
    expect(loadGame(mm).kind).toBe('illisible')
    void missions
  })
  it('une partie v3 sans utcOffsetMin valide est illisible', () => {
    const g = { ...newGame(1, 1_800_000_000_000), utcOffsetMin: 'x' }
    const mm = memory({ [SAVE_KEY]: JSON.stringify({ version: 6, savedAt: 1, state: g }) })
    expect(loadGame(mm).kind).toBe('illisible')
  })
})

describe('migration v3 -> v4', () => {
  it('ajoute paths vide, version 4, et garde le reste', () => {
    const { paths, ...v3 } = { ...newGame(1, 1_800_000_000_000), version: 3 }
    void paths
    const out = MIGRATIONS[3](v3) as Record<string, unknown>
    expect(out.version).toBe(4)
    expect(out.paths).toEqual([])
    expect(out).toMatchObject({ ...v3, version: 4 })
  })
})

describe('migration v4 -> v5', () => {
  it('ajoute un personnel vide, version 5, et garde le reste (chemins compris)', () => {
    const { staff, ...v4 } = { ...newGame(1, 1_800_000_000_000), version: 4 }
    void staff
    const out = MIGRATIONS[4](v4) as Record<string, unknown>
    expect(out.version).toBe(5)
    expect(out.staff).toEqual({ employees: [], candidates: [], renewAt: v4.time, renewals: 0, payDay: -1, coverAllUntil: 0 })
    expect(out.paths).toEqual(v4.paths)
    expect(out).toMatchObject({ ...v4, version: 5 })
  })
})

/** Partie littérale au format 5 : un mouton malade depuis 47 h (affamé depuis 30 h), un cochon malade depuis 2 h dans un enclos sale. */
function v5State(over: Record<string, unknown> = {}): Record<string, any> { // eslint-disable-line @typescript-eslint/no-explicit-any
  const T = 1_800_000_000_000
  const H = 3_600_000
  return {
    version: 5, time: T, rng: 4242, coins: 500, nextId: 40,
    pantry: { fourrage: 50, viande: 0, capacity: 200 },
    enclosures: [
      { id: 1, biome: 'prairie', species: 'mouton', rect: { x: -26, z: -5, w: 12, d: 10 }, cleanedAt: T - 1 * H },
      { id: 2, biome: 'prairie', species: 'cochon', rect: { x: -26, z: 6, w: 12, d: 10 }, cleanedAt: T - 30 * H },
    ],
    animals: [
      { id: 10, species: 'mouton', sex: 'F', name: 'Brindille', bornAt: T - 900 * H, enclosureId: 1, lastFedAt: T - 30 * H, health: { status: 'malade', since: T - 47 * H }, pregnantSince: null, lastBirthAt: null },
      { id: 11, species: 'cochon', sex: 'M', name: 'Groin', bornAt: T - 900 * H, enclosureId: 2, lastFedAt: T - 3 * H, health: { status: 'malade', since: T - 2 * H }, pregnantSince: null, lastBirthAt: null },
      { id: 12, species: 'cochon', sex: 'F', name: 'Truffe', bornAt: T - 900 * H, enclosureId: 2, lastFedAt: T - 1 * H, health: { status: 'ok' }, pregnantSince: null, lastBirthAt: null },
    ],
    ticketPrice: 2, reputation: 1, village: { level: 1, clientsServed: 0 },
    buildings: [{ slot: 0, type: 'ferme', level: 1 }],
    merchant: { restockAt: T, restocks: 0, offers: [] }, totalVisitors: 0,
    stats: { counts: { ...ZERO_COUNTS }, birthsBySpecies: {} },
    missions: { tutorial: { step: 9, current: null, skipped: false }, story: { index: 0, current: null }, daily: { dayKey: -1, list: [], streak: 0, lastFullDay: null, coupons: 0 }, unread: false },
    utcOffsetMin: 0, paths: [],
    staff: { employees: [{ id: 30, name: 'Léa', job: 'soigneur', xpH: 0, hiredAt: T, encIds: [1] }], candidates: [], renewAt: T, renewals: 0, payDay: -1, coverAllUntil: 0 },
    ...over,
  }
}
const loadV5 = (state: unknown) => loadGame(memory({ [SAVE_KEY]: JSON.stringify({ version: 5, savedAt: 1, state }) }))
const okState = (state: unknown): GameState => {
  const r = loadV5(state)
  if (r.kind !== 'ok') throw new Error('illisible')
  return r.state
}

describe('migration v5 -> v6 (maladies et centre vétérinaire)', () => {
  it('le centre est sur l’emplacement 7 (la migration l’écrit en dur)', () => {
    expect(VET_CENTER.SLOT).toBe(7)
  })
  it('affamé depuis 30 h, malade depuis 47 h : indigestion, stade grave, repartie à zéro et repérée', () => {
    const s = okState(v5State())
    expect(s.version).toBe(6)
    expect(s.animals[0].health).toEqual({ status: 'malade', disease: 'indigestion', stage: 2, stageSince: s.time, detectedAt: s.time, careUntil: null, vetId: null, quarantined: false })
  })
  it('malade depuis 2 h, nourri, enclos sale : parasites, stade léger', () => {
    const s = okState(v5State())
    expect(s.animals[1].health).toEqual({ status: 'malade', disease: 'parasites', stage: 1, stageSince: s.time, detectedAt: s.time, careUntil: null, vetId: null, quarantined: false })
    expect(s.animals[2].health).toEqual({ status: 'ok' })
  })
  it('malade, nourri et enclos propre : indigestion', () => {
    const old = v5State()
    old.animals[1].health = { status: 'malade', since: old.time - 2 * 3_600_000 }
    old.enclosures[1].cleanedAt = old.time
    const s = okState(old)
    expect(s.animals[1].health).toMatchObject({ status: 'malade', disease: 'indigestion', stage: 1 })
  })
  it('ajoute le centre niveau 1 sur l’emplacement 7', () => {
    const s = okState(v5State())
    expect(s.buildings).toContainEqual({ slot: 7, type: 'centreVeto', level: 1 })
  })
  it('n’ajoute pas de second centre s’il y en a déjà un, ni si l’emplacement 7 est pris', () => {
    const a = okState(v5State({ buildings: [{ slot: 0, type: 'ferme', level: 1 }, { slot: 1, type: 'centreVeto', level: 2 }] }))
    expect(a.buildings.filter((b) => b.type === 'centreVeto')).toHaveLength(1)
    const b = okState(v5State({ buildings: [{ slot: 0, type: 'ferme', level: 1 }, { slot: 7, type: 'cafe', level: 1 }] }))
    expect(b.buildings.filter((x) => x.type === 'centreVeto')).toHaveLength(0)
    expect(b.buildings.filter((x) => x.slot === 7)).toHaveLength(1)
  })
  it('offre Élise Fontaine, vétérinaire : id = nextId, nextId + 1', () => {
    const s = okState(v5State())
    expect(s.nextId).toBe(41)
    expect(s.staff.employees).toContainEqual({ id: 40, name: 'Élise Fontaine', job: 'veterinaire', xpH: 0, hiredAt: s.time, encIds: [] })
    expect(s.staff.employees).toHaveLength(2)
  })
  it('une partie qui a déjà un vétérinaire n’en reçoit pas un second', () => {
    const old = v5State()
    old.staff.employees.push({ id: 31, name: 'Paul', job: 'veterinaire', xpH: 0, hiredAt: old.time, encIds: [] })
    const s = okState(old)
    expect(s.nextId).toBe(40)
    expect(s.staff.employees.filter((e) => e.job === 'veterinaire')).toHaveLength(1)
  })
  it('compteur de vaccinations à zéro, enclos non vaccinés, le reste est gardé', () => {
    const old = v5State()
    const s = okState(old)
    expect(s.stats.counts.vaccinations).toBe(0)
    expect(s.enclosures.every((e) => e.vaccinatedUntil === null)).toBe(true)
    expect(s.coins).toBe(500)
    expect(s.enclosures[0]).toMatchObject({ id: 1, cleanedAt: old.enclosures[0].cleanedAt })
  })
  it('Review Focus 4 : un malade depuis 47 h est encore vivant 10 minutes plus tard', () => {
    const s = okState(v5State())
    const r = advanceTo(s, s.time + 600_000)
    expect(r.state.animals.some((a) => a.id === 10)).toBe(true)
  })
})

describe('validation de la santé et du centre (v6)', () => {
  const sickOk = { status: 'malade', disease: 'parasites', stage: 1, stageSince: 5, detectedAt: null, careUntil: null, vetId: null, quarantined: false }
  const load = (fn: (g: any) => void) => { // eslint-disable-line @typescript-eslint/no-explicit-any
    const g = newGame(1, 1_800_000_000_000) as any // eslint-disable-line @typescript-eslint/no-explicit-any
    fn(g)
    return loadGame(memory({ [SAVE_KEY]: JSON.stringify({ version: 6, savedAt: 1, state: g }) })).kind
  }
  const withHealth = (h: unknown) => load((g) => { g.animals[0].health = h })
  it('accepte une santé malade bien formée (repérage et soin vides)', () => {
    expect(withHealth(sickOk)).toBe('ok')
  })
  it('refuse : sans maladie, maladie inconnue, stade 4, repérage non fini, quarantaine non booléenne', () => {
    const { disease, ...noDisease } = sickOk
    void disease
    expect(withHealth(noDisease)).toBe('illisible')
    expect(withHealth({ ...sickOk, disease: 'peste' })).toBe('illisible')
    expect(withHealth({ ...sickOk, stage: 4 })).toBe('illisible')
    expect(withHealth({ ...sickOk, stageSince: 'x' })).toBe('illisible')
    expect(withHealth({ ...sickOk, detectedAt: 'x' })).toBe('illisible')
    expect(withHealth({ ...sickOk, vetId: 'x' })).toBe('illisible')
    expect(withHealth({ ...sickOk, quarantined: 1 })).toBe('illisible')
    expect(withHealth({ status: 'zombie' })).toBe('illisible')
  })
  it('refuse vaccinatedUntil texte et un centre de niveau 6, accepte le niveau 5', () => {
    expect(load((g) => { g.enclosures[0].vaccinatedUntil = 'x' })).toBe('illisible')
    expect(load((g) => { g.enclosures[0].vaccinatedUntil = 12345 })).toBe('ok')
    expect(load((g) => { g.buildings.push({ slot: 7, type: 'centreVeto', level: 6 }) })).toBe('illisible')
    expect(load((g) => { g.buildings.push({ slot: 7, type: 'centreVeto', level: 5 }) })).toBe('ok')
    expect(load((g) => { g.buildings[0].level = 4 })).toBe('illisible') // la ferme n'a que 3 niveaux
  })
})
