import { describe, it, expect } from 'vitest'
import { newGame } from '../../src/sim/newGame'
import { capacity, area } from '../../src/sim/enclosure'
import { ageStage } from '../../src/sim/animal'
import { TUNING } from '../../src/data/tuning'

describe('newGame', () => {
  const g = newGame(7, 1_000_000_000_123)
  it("aligne l'heure sur le pas de 10 minutes", () => {
    expect(g.time % TUNING.STEP_MS).toBe(0)
    expect(g.time).toBeLessThanOrEqual(1_000_000_000_123)
  })
  it('démarre avec 500 pièces, un enclos prairie de 120 m² et un couple de moutons adultes', () => {
    expect(g.coins).toBe(500)
    expect(g.enclosures).toHaveLength(1)
    const e = g.enclosures[0]
    expect(e.biome).toBe('prairie')
    expect(e.species).toBe('mouton')
    expect(area(e.rect)).toBe(120)
    expect(capacity(e)).toBe(6)
    expect(g.animals.map((a) => a.sex).sort()).toEqual(['F', 'M'])
    for (const a of g.animals) {
      expect(a.species).toBe('mouton')
      expect(ageStage(a, g.time)).toBe('adulte')
      expect(a.lastFedAt).toBe(g.time)
    }
  })
  it('remplit un peu le garde-manger', () => {
    expect(g.pantry).toEqual({ fourrage: 10, viande: 0, capacity: 200 })
  })
  it("crée directement l'état version 2", () => {
    expect(g.version).toBe(2)
    expect(g.ticketPrice).toBe(5)
    expect(g.reputation).toBe(1)
    expect(g.village).toEqual({ level: 1, clientsServed: 0 })
    expect(g.buildings).toEqual([{ slot: 0, type: 'ferme', level: 1 }])
    expect(g.merchant).toEqual({ restockAt: g.time, restocks: 0, offers: [] })
    expect(g.totalVisitors).toBe(0)
    for (const a of g.animals) expect(a.lastBirthAt).toBeNull()
  })
  it('est déterministe', () => {
    expect(newGame(7, 1_000_000_000_123)).toEqual(g)
  })
})
