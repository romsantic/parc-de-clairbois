import { describe, it, expect } from 'vitest'
import { feedStep, autonomyHours, consumptionPerHour } from '../../src/sim/feeding'
import type { GameEvent } from '../../src/sim/types'
import { animal, emptyState, enclosure, T0 } from './helpers'

const PART_MOUTON = 1 / 144 // 1 ration/jour, pas de 10 min

describe('feedStep', () => {
  it('nourrit chaque animal de sa part et note un seul repas', () => {
    const s = emptyState({ time: T0 + 600_000, pantry: { fourrage: 10, viande: 0, capacity: 200 },
      enclosures: [enclosure(1, 'mouton')], animals: [animal(1, 'mouton', 'F', 1), animal(2, 'mouton', 'M', 1)] })
    const ev: GameEvent[] = []
    feedStep(s, ev)
    expect(s.pantry.fourrage).toBeCloseTo(10 - 2 * PART_MOUTON)
    expect(s.animals.every((a) => a.lastFedAt === s.time)).toBe(true)
    expect(ev.filter((e) => e.kind === 'repas')).toHaveLength(1)
  })
  it("stock partiel : le premier servi mange, l'autre non, sans stock négatif", () => {
    const s = emptyState({ time: T0 + 600_000, pantry: { fourrage: PART_MOUTON, viande: 0, capacity: 200 },
      enclosures: [enclosure(1, 'mouton')], animals: [animal(2, 'mouton', 'M', 1), animal(1, 'mouton', 'F', 1)] })
    feedStep(s, [])
    expect(s.animals.find((a) => a.id === 1)!.lastFedAt).toBe(s.time)
    expect(s.animals.find((a) => a.id === 2)!.lastFedAt).toBe(T0)
    expect(s.pantry.fourrage).toBe(0)
  })
  it('un loup ne mange pas de fourrage', () => {
    const s = emptyState({ time: T0 + 600_000, pantry: { fourrage: 10, viande: 0, capacity: 200 },
      enclosures: [enclosure(1, 'loup')], animals: [animal(1, 'loup', 'F', 1)] })
    feedStep(s, [])
    expect(s.animals[0].lastFedAt).toBe(T0)
    expect(s.pantry.fourrage).toBe(10)
  })
  it('un cochon sans fourrage mange de la viande', () => {
    const s = emptyState({ time: T0 + 600_000, pantry: { fourrage: 0, viande: 5, capacity: 200 },
      enclosures: [enclosure(1, 'cochon')], animals: [animal(1, 'cochon', 'F', 1)] })
    feedStep(s, [])
    expect(s.animals[0].lastFedAt).toBe(s.time)
    expect(s.pantry.viande).toBeCloseTo(5 - 2 / 144)
  })
})

describe('autonomyHours', () => {
  it('2 moutons et 10 fourrage → 120 h', () => {
    const s = emptyState({ pantry: { fourrage: 10, viande: 0, capacity: 200 },
      animals: [animal(1, 'mouton', 'F', 1), animal(2, 'mouton', 'M', 1)] })
    expect(autonomyHours(s)).toBeCloseTo(120)
  })
  it('30 fourrage, 2 moutons dont une gestante (portée moyenne 1,5) → ≈ 205,7 h', () => {
    const s = emptyState({ pantry: { fourrage: 30, viande: 0, capacity: 200 },
      animals: [animal(1, 'mouton', 'F', 1, { pregnantSince: T0 }), animal(2, 'mouton', 'M', 1)] })
    expect(autonomyHours(s)).toBeCloseTo(30 / (3.5 / 24), 1)
  })
  it("0 si un aliment nécessaire manque déjà", () => {
    const s = emptyState({ pantry: { fourrage: 10, viande: 0, capacity: 200 },
      animals: [animal(1, 'loup', 'F', 1), animal(2, 'mouton', 'M', 1)] })
    expect(autonomyHours(s)).toBe(0)
  })
  it('infini sans animaux', () => {
    expect(autonomyHours(emptyState())).toBe(Infinity)
  })
})

describe('consumptionPerHour', () => {
  it('2 moutons dont une gestante → 3,5 rations par jour de fourrage, 0 de viande', () => {
    const s = emptyState({ pantry: { fourrage: 30, viande: 0, capacity: 200 },
      animals: [animal(1, 'mouton', 'F', 1, { pregnantSince: T0 }), animal(2, 'mouton', 'M', 1)] })
    const c = consumptionPerHour(s)
    expect(c.fourrage * 24).toBeCloseTo(3.5)
    expect(c.viande).toBe(0)
  })
})
