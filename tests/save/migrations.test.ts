import { describe, it, expect } from 'vitest'
import { loadGame, SAVE_KEY, type Storage } from '../../src/save/save'
import { newGame } from '../../src/sim/newGame'
import { CURRENT_VERSION } from '../../src/save/migrations'

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

  it('charge la partie au format 2', () => {
    expect(CURRENT_VERSION).toBe(2)
    expect(r.kind).toBe('ok')
    if (r.kind !== 'ok') return
    expect(r.state.version).toBe(2)
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
