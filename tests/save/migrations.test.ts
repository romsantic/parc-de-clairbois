import { describe, it, expect } from 'vitest'
import { loadGame, SAVE_KEY, type Storage } from '../../src/save/save'
import { newGame } from '../../src/sim/newGame'
import { CURRENT_VERSION, MIGRATIONS } from '../../src/save/migrations'

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
    expect(CURRENT_VERSION).toBe(5)
    expect(r.kind).toBe('ok')
    if (r.kind !== 'ok') return
    expect(r.state.version).toBe(5)
  })
  it('ajoute la ferme niveau 1, le billet à 5, la réputation à 1, le village niveau 1', () => {
    if (r.kind !== 'ok') throw new Error('illisible')
    const s = r.state
    expect(s.buildings).toEqual([{ slot: 0, type: 'ferme', level: 1 }])
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
    expect(s.enclosures).toEqual(V1_STATE.enclosures)
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
    expect(CURRENT_VERSION).toBe(5)
    const r = loadV2(V2_STATE)
    expect(r.kind).toBe('ok')
    if (r.kind !== 'ok') return
    expect(r.state.version).toBe(5)
  })
  it('compteurs à zéro, sauf les visiteurs (= totalVisitors)', () => {
    const r = loadV2(V2_STATE)
    if (r.kind !== 'ok') throw new Error('illisible')
    expect(r.state.stats).toEqual({ counts: { ...ZERO_COUNTS, visiteurs: 77 }, birthsBySpecies: {} })
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
    const { version, ...rest } = V2_STATE
    expect(r.state).toMatchObject(rest)
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
    mm.setItem(SAVE_KEY, JSON.stringify({ version: 5, savedAt: 1, state: rest }))
    expect(loadGame(mm).kind).toBe('illisible')
    void missions
  })
  it('une partie v3 sans utcOffsetMin valide est illisible', () => {
    const g = { ...newGame(1, 1_800_000_000_000), utcOffsetMin: 'x' }
    const mm = memory({ [SAVE_KEY]: JSON.stringify({ version: 5, savedAt: 1, state: g }) })
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
