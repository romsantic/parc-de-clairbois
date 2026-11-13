import { describe, it, expect } from 'vitest'
import { saveGame, loadGame, SAVE_KEY, BROKEN_KEY, type Storage } from '../../src/save/save'
import { newGame } from '../../src/sim/newGame'

function memory(init: Record<string, string> = {}): Storage & { data: Record<string, string> } {
  const data = { ...init }
  return { data, getItem: (k) => (k in data ? data[k] : null), setItem: (k, v) => { data[k] = v } }
}
const g = newGame(3, 1_800_000_000_000)

describe('sauvegarde : ne jamais perdre la partie', () => {
  it("un onglet ne sauvegarde pas par-dessus la partie qu'un autre onglet a reprise", () => {
    const m = memory()
    expect(saveGame(m, g, 1, 'onglet-A')).toBe('ok')
    expect(saveGame(m, { ...g, coins: 1 }, 2, 'onglet-B')).toBe('ok') // B reprend la main (au chargement)
    expect(saveGame(m, { ...g, coins: 999 }, 3, 'onglet-A', true)).toBe('pris-ailleurs')
    expect(JSON.parse(m.data[SAVE_KEY]).state.coins).toBe(1)
  })
  it("un vieil onglet n'écrase pas une sauvegarde d'une version plus récente", () => {
    const raw = JSON.stringify({ version: 2, savedAt: 1, owner: 'onglet-B', state: {} })
    const m = memory({ [SAVE_KEY]: raw })
    expect(saveGame(m, g, 3, 'onglet-A', true)).toBe('trop-recente')
    expect(m.data[SAVE_KEY]).toBe(raw)
  })
  it('mémoire pleine : signalé, sans planter', () => {
    const full: Storage = { getItem: () => null, setItem: () => { throw new Error('QuotaExceededError') } }
    expect(saveGame(full, g, 1, 'onglet-A')).toBe('erreur')
  })
  it('une deuxième sauvegarde abîmée est mise de côté elle aussi', () => {
    const m = memory({ [SAVE_KEY]: 'cassé 2', [BROKEN_KEY]: 'cassé 1' })
    expect(loadGame(m, undefined, 42).kind).toBe('illisible')
    expect(m.data[BROKEN_KEY]).toBe('cassé 1')
    expect(m.data[`${BROKEN_KEY}:42`]).toBe('cassé 2')
  })
  it('refuse une partie incohérente (espèce inconnue, garde-manger incomplet)', () => {
    const bad1 = { ...g, animals: [{ ...g.animals[0], species: 'licorne' }] }
    const bad2 = { ...g, pantry: { viande: 0, capacity: 200 } }
    for (const state of [bad1, bad2]) {
      const m = memory({ [SAVE_KEY]: JSON.stringify({ version: 1, savedAt: 1, state }) })
      expect(loadGame(m).kind).toBe('illisible')
    }
  })
  it("une migration manquante n'efface pas la partie : elle est signalée", () => {
    const m = memory({ [SAVE_KEY]: JSON.stringify({ version: 0, savedAt: 1, state: g }) })
    expect(loadGame(m, {})).toEqual({ kind: 'migration-impossible', version: 0 })
  })
})
