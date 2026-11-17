import { describe, it, expect } from 'vitest'
import { startSession } from '../../src/game/session'
import { saveGame, loadGame, SAVE_KEY, type Storage } from '../../src/save/save'
import { newGame } from '../../src/sim/newGame'
import { DAY_MS } from '../../src/data/tuning'

function memory(init: Record<string, string> = {}): Storage & { data: Record<string, string> } {
  const data = { ...init }
  return { data, getItem: (k) => (k in data ? data[k] : null), setItem: (k, v) => { data[k] = v } }
}
const NOW = 1_800_000_000_000

describe('startSession', () => {
  it('sans sauvegarde : nouvelle partie, aussitôt sauvegardée', () => {
    const m = memory()
    const r = startSession(m, NOW)
    expect(r.problem).toBeNull()
    expect(r.canSave).toBe(true)
    expect(r.state.animals).toHaveLength(2)
    expect(loadGame(m).kind).toBe('ok')
  })
  it('avec une sauvegarde de la veille : rattrape la journée et donne un résumé', () => {
    const m = memory()
    const g = newGame(5, NOW - DAY_MS)
    saveGame(m, g, NOW - DAY_MS)
    const r = startSession(m, NOW)
    expect(r.state.time).toBe(g.time + DAY_MS)
    expect(r.summary).not.toBeNull()
  })
  it('sauvegarde plus récente : on ne sauvegarde surtout pas par-dessus', () => {
    const raw = JSON.stringify({ version: 9, savedAt: 1, state: {} })
    const m = memory({ [SAVE_KEY]: raw })
    const r = startSession(m, NOW)
    expect(r.problem).toBe('trop-recente')
    expect(r.canSave).toBe(false)
    expect(m.data[SAVE_KEY]).toBe(raw)
  })
  it("prend la main sur la sauvegarde : les autres onglets n'écriront plus par-dessus", () => {
    const m = memory()
    const r = startSession(m, NOW)
    expect(JSON.parse(m.data[SAVE_KEY]).owner).toBe(r.owner)
    expect(startSession(m, NOW).owner).not.toBe(r.owner)
  })
  it('migration impossible : la partie est gardée intacte et on ne sauvegarde pas', () => {
    const raw = JSON.stringify({ version: 0, savedAt: 1, state: {} })
    const m = memory({ [SAVE_KEY]: raw })
    const r = startSession(m, NOW)
    expect(r.problem).toBe('migration-impossible')
    expect(r.canSave).toBe(false)
    expect(m.data[SAVE_KEY]).toBe(raw)
  })
  it('stockage indisponible : on joue sans sauvegarder', () => {
    const r = startSession(memory(), NOW, false)
    expect(r.canSave).toBe(false)
    expect(r.problem).toBeNull()
  })
  it('signale le temps non rejoué au-delà de 30 jours', () => {
    const m = memory()
    saveGame(m, newGame(5, NOW - 100 * DAY_MS), NOW - 100 * DAY_MS)
    expect(startSession(m, NOW).skippedMs).toBeGreaterThan(60 * DAY_MS)
  })
  it("mesure l'absence depuis la dernière sauvegarde (0 pour une nouvelle partie)", () => {
    expect(startSession(memory(), NOW).absentMs).toBe(0)
    const m = memory()
    saveGame(m, newGame(5, NOW - 5 * 3_600_000), NOW - 5 * 3_600_000)
    expect(startSession(m, NOW).absentMs).toBe(5 * 3_600_000)
  })
  it('sauvegarde abîmée : nouvelle partie, problème signalé', () => {
    const r = startSession(memory({ [SAVE_KEY]: 'zut' }), NOW)
    expect(r.problem).toBe('illisible')
    expect(r.canSave).toBe(true)
  })
})

describe('relecture : marchand après migration', () => {
  it("une partie v1 chargée quelques minutes après sa sauvegarde trouve déjà le premier stock", () => {
    const v1 = { version: 1, time: NOW - 60_000, rng: 7, coins: 10, nextId: 5,
      pantry: { fourrage: 1, viande: 0, capacity: 200 }, enclosures: [], animals: [] }
    const m = memory({ [SAVE_KEY]: JSON.stringify({ version: 1, savedAt: NOW - 60_000, state: v1 }) })
    const r = startSession(m, NOW)
    expect(r.problem).toBeNull()
    expect(r.state.merchant.offers.length).toBeGreaterThan(0)
    expect(r.state.merchant.restocks).toBe(1)
  })
})
