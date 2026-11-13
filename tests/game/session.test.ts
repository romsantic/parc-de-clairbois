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
  it('sauvegarde abîmée : nouvelle partie, problème signalé', () => {
    const r = startSession(memory({ [SAVE_KEY]: 'zut' }), NOW)
    expect(r.problem).toBe('illisible')
    expect(r.canSave).toBe(true)
  })
})
