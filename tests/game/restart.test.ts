import { describe, it, expect } from 'vitest'
import { restartState, RESET_BACKUP_KEY } from '../../src/game/session'
import { createConfirmGuard, restartButtonLook } from '../../src/ui/confirmGuard'
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

describe('restartState : copie de secours', () => {
  const stored = (m: Storage) => m.getItem(SAVE_KEY)
  it('ne remplace pas la copie si la partie effacée n’a pas avancé', () => {
    const real = newGame(1, NOW); real.coins = 777
    const m = memory()
    saveGame(m, real, NOW, 'a')
    restartState(m, NOW) // 1re remise à zéro : copie du vrai parc
    const backup = m.data[RESET_BACKUP_KEY]
    const fresh = newGame(2, NOW)
    saveGame(m, fresh, NOW, 'a')
    restartState(m, NOW, fresh) // 2e : la partie remplacée est neuve
    expect(m.data[RESET_BACKUP_KEY]).toBe(backup)
    expect(stored(m)).toBeTruthy()
  })
  it('fait toujours la copie la première fois, même si la partie n’a pas avancé', () => {
    const old = newGame(5, NOW); old.coins = 4242
    const m = memory()
    saveGame(m, old, NOW, 'a')
    const before = m.data[SAVE_KEY]
    restartState(m, NOW, old) // tutoriel à 0, mais aucune copie n'existe encore
    expect(m.data[RESET_BACKUP_KEY]).toBe(before)
  })
  it('remplace la copie si la partie effacée a avancé', () => {
    const m = memory()
    saveGame(m, newGame(1, NOW), NOW, 'a')
    const played = newGame(3, NOW); played.missions.tutorial.step = 2
    saveGame(m, played, NOW, 'a')
    const now = m.data[SAVE_KEY]
    restartState(m, NOW, played)
    expect(m.data[RESET_BACKUP_KEY]).toBe(now)
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

describe('apparence du bouton de confirmation', () => {
  it('désarmé : texte normal ; armé : texte d\'avertissement et classe confirmer', () => {
    expect(restartButtonLook(false)).toEqual({ className: 'vendre', text: 'Recommencer à zéro' })
    expect(restartButtonLook(true)).toEqual({ className: 'vendre confirmer', text: 'Tout ton parc sera effacé — confirmer ?' })
  })
})
