import { describe, it, expect } from 'vitest'
import { saveGame, loadGame, SAVE_KEY, BROKEN_KEY, type Storage } from '../../src/save/save'
import { MIGRATIONS } from '../../src/save/migrations'
import { newGame } from '../../src/sim/newGame'

function memory(init: Record<string, string> = {}): Storage & { data: Record<string, string> } {
  const data = { ...init }
  return { data, getItem: (k) => (k in data ? data[k] : null), setItem: (k, v) => { data[k] = v } }
}

describe('sauvegarde', () => {
  const g = newGame(3, 1_800_000_000_000)

  it('aller-retour fidèle', () => {
    const m = memory()
    saveGame(m, g, 1_800_000_123_000)
    expect(loadGame(m)).toEqual({ kind: 'ok', state: g })
    expect(JSON.parse(m.data[SAVE_KEY]).savedAt).toBe(1_800_000_123_000)
  })
  it('aucune sauvegarde', () => {
    expect(loadGame(memory())).toEqual({ kind: 'aucune' })
  })
  it('sauvegarde abîmée : signalée et mise de côté, jamais perdue', () => {
    const m = memory({ [SAVE_KEY]: '{pas du json' })
    expect(loadGame(m)).toEqual({ kind: 'illisible' })
    expect(m.data[BROKEN_KEY]).toBe('{pas du json')
  })
  it("ne remplace pas une copie de secours déjà présente", () => {
    const m = memory({ [SAVE_KEY]: 'cassé 2', [BROKEN_KEY]: 'cassé 1' })
    loadGame(m)
    expect(m.data[BROKEN_KEY]).toBe('cassé 1')
  })
  it('sauvegarde d’une version plus récente : refusée sans rien écraser', () => {
    const raw = JSON.stringify({ version: 3, savedAt: 1, state: {} })
    const m = memory({ [SAVE_KEY]: raw })
    expect(loadGame(m)).toEqual({ kind: 'trop-recente', version: 3 })
    expect(m.data[SAVE_KEY]).toBe(raw)
  })
  it('applique les migrations en chaîne', () => {
    const old = { ...g, version: 0, coins: undefined, argent: 42 }
    const m = memory({ [SAVE_KEY]: JSON.stringify({ version: 0, savedAt: 1, state: old }) })
    const migrations = { ...MIGRATIONS, 0: (o: any) => { const { argent, ...rest } = o; return { ...rest, coins: argent, version: 1 } } }
    const r = loadGame(m, migrations)
    expect(r.kind === 'ok' && r.state.coins).toBe(42)
    expect(r.kind === 'ok' && r.state.version).toBe(2)
  })
})
