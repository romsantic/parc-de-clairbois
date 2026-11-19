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
    expect(g.pantry).toEqual({ fourrage: 30, viande: 0, capacity: 200 })
  })
  it("crée directement l'état version 4", () => {
    expect(g.version).toBe(4)
    expect(g.ticketPrice).toBe(2)
    expect(g.reputation).toBe(1)
    expect(g.village).toEqual({ level: 1, clientsServed: 0 })
    expect(g.buildings).toEqual([{ slot: 0, type: 'ferme', level: 1 }])
    expect(g.merchant.restocks).toBe(1)
    expect(g.merchant.offers).toHaveLength(4)
    expect(g.totalVisitors).toBe(0)
    for (const a of g.animals) expect(a.lastBirthAt).toBeNull()
  })
  it('démarre le premier des premiers pas', () => {
    expect(g.missions.tutorial.current).toMatchObject({ id: 'pas-fiche', done: false, claimed: false })
  })
  it('est déterministe', () => {
    expect(newGame(7, 1_000_000_000_123)).toEqual(g)
  })
})

describe('premiers pas enchaînés dans une vraie nouvelle partie', () => {
  it('les pas 1 à 4 passent tout de suite, sans avancer le temps (l\'enclos de départ est un peu sale)', async () => {
    const { applyAction } = await import('../../src/sim/actions')
    let s = newGame(7, 1_800_000_000_000)
    const t0 = s.time
    const encId = s.enclosures[0].id
    const act = (a: Parameters<typeof applyAction>[1]) => {
      const r = applyAction(s, a)
      if (!r.ok) throw new Error(`${a.type} : ${r.reason}`)
      s = r.state
    }
    const claim = (id: string) => {
      expect(s.missions.tutorial.current?.id).toBe(id)
      expect(s.missions.tutorial.current?.done).toBe(true)
      act({ type: 'recuperer', track: 'tutoriel' })
    }
    act({ type: 'vu', what: 'ficheEnclos' }); claim('pas-fiche')
    act({ type: 'acheterRations', food: 'fourrage', n: 20 }); claim('pas-fourrage')
    act({ type: 'nettoyer', encId }); claim('pas-nettoyer')
    act({ type: 'billet', price: 6 }); claim('pas-billet')
    expect(s.missions.tutorial.step).toBe(4)
    expect(s.time).toBe(t0)
  })
})
