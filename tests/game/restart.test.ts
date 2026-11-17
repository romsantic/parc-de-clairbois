import { describe, it, expect } from 'vitest'
import { restartState, RESET_BACKUP_KEY } from '../../src/game/session'
import { createConfirmGuard } from '../../src/ui/confirmGuard'
import { saveGame, SAVE_KEY, type Storage } from '../../src/save/save'
import { newGame } from '../../src/sim/newGame'

function memory(init: Record<string, string> = {}): Storage & { data: Record<string, string> } {
  const data = { ...init }
  return { data, getItem: (k) => (k in data ? data[k] : null), setItem: (k, v) => { data[k] = v } }
}
const NOW = 1_800_000_000_000

describe('restartState', () => {
  it('rend une partie neuve : pièces de départ, un enclos, deux moutons, premiers pas à 0', () => {
    const m = memory()
    const s = restartState(m, NOW)
    expect(s.coins).toBe(newGame(1, NOW).coins)
    expect(s.enclosures).toHaveLength(1)
    expect(s.animals.filter((a) => a.species === 'mouton')).toHaveLength(2)
    expect(s.missions.tutorial.step).toBe(0)
    expect(Number.isFinite(s.utcOffsetMin)).toBe(true)
  })

  it('garde une copie de l’ancienne partie avant de l’effacer', () => {
    const old = newGame(42, NOW)
    old.coins = 9999
    const m = memory()
    saveGame(m, old, NOW, 'a')
    const before = m.data[SAVE_KEY]
    expect(before).toBeDefined()
    restartState(m, NOW + 1000)
    expect(m.data[RESET_BACKUP_KEY]).toBe(before)
  })

  it('sans ancienne sauvegarde : pas de copie, pas d’erreur', () => {
    const m = memory()
    expect(() => restartState(m, NOW)).not.toThrow()
    expect(m.data[RESET_BACKUP_KEY]).toBeUndefined()
  })

  it('ne plante pas si le stockage refuse la copie', () => {
    const m: Storage = { getItem: () => 'x', setItem: () => { throw new Error('plein') } }
    expect(() => restartState(m, NOW)).not.toThrow()
  })
})

describe('createConfirmGuard', () => {
  it('le 1er clic arme, un 2e clic trop rapproché est ignoré, un 2e clic assez tardif confirme', () => {
    let t = 1000
    const g = createConfirmGuard(400, () => t)
    expect(g.click()).toBe('armed')
    t += 100
    expect(g.click()).toBe('ignored')
    expect(g.armed()).toBe(true)
    t += 400
    expect(g.click()).toBe('confirmed')
    expect(g.armed()).toBe(false)
  })

  it('après reset (volet fermé), il faut de nouveau deux clics', () => {
    let t = 0
    const g = createConfirmGuard(400, () => t)
    g.click()
    g.reset()
    t += 1000
    expect(g.armed()).toBe(false)
    expect(g.click()).toBe('armed')
  })
})
