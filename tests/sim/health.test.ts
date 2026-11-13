import { describe, it, expect } from 'vitest'
import { healthStep } from '../../src/sim/health'
import type { GameEvent } from '../../src/sim/types'
import { HOUR_MS } from '../../src/data/tuning'
import { animal, emptyState, enclosure, T0 } from './helpers'

const MIN10 = 600_000

describe('healthStep', () => {
  it('tombe malade de faim à 24 h sans nourriture, pas avant', () => {
    const at = (h: number) => {
      const s = emptyState({ time: T0 + h, enclosures: [enclosure(1, 'mouton', 12, 10, { cleanedAt: T0 + h })],
        animals: [animal(1, 'mouton', 'F', 1)] })
      const ev: GameEvent[] = []
      healthStep(s, ev)
      return { s, ev }
    }
    expect(at(24 * HOUR_MS - MIN10).s.animals[0].health.status).toBe('ok')
    const r = at(24 * HOUR_MS)
    expect(r.s.animals[0].health).toEqual({ status: 'malade', since: T0 + 24 * HOUR_MS })
    expect(r.ev).toContainEqual({ kind: 'malade', at: T0 + 24 * HOUR_MS, animalId: 1, cause: 'faim' })
  })
  it('meurt après 48 h de maladie sans soin, pas avant', () => {
    const at = (h: number) => {
      const s = emptyState({ time: T0 + h, enclosures: [enclosure(1, 'mouton', 12, 10, { cleanedAt: T0 + h })],
        animals: [animal(1, 'mouton', 'F', 1, { lastFedAt: T0 + h, health: { status: 'malade', since: T0 } })] })
      const ev: GameEvent[] = []
      healthStep(s, ev)
      return { s, ev }
    }
    expect(at(48 * HOUR_MS - MIN10).s.animals).toHaveLength(1)
    const r = at(48 * HOUR_MS)
    expect(r.s.animals).toHaveLength(0)
    expect(r.ev).toContainEqual({ kind: 'mort', at: T0 + 48 * HOUR_MS, animalId: 1, name: 'Bête1', species: 'mouton' })
  })
  it('un enclos propre ne rend jamais malade', () => {
    const s = emptyState({ enclosures: [enclosure(1, 'mouton')], animals: [animal(1, 'mouton', 'F', 1)] })
    for (let i = 0; i < 1000; i++) {
      s.time += MIN10
      s.enclosures[0].cleanedAt = s.time
      s.animals[0].lastFedAt = s.time
      healthStep(s, [])
    }
    expect(s.animals[0].health.status).toBe('ok')
  })
  it('un enclos sale rend malade environ 15 % des animaux par jour', () => {
    const animals = Array.from({ length: 200 }, (_, i) => animal(i + 1, 'mouton', 'F', 1))
    const s = emptyState({ rng: 99, enclosures: [enclosure(1, 'mouton', 100, 100, { cleanedAt: T0 - 48 * HOUR_MS })], animals })
    for (let i = 0; i < 144; i++) {
      s.time += MIN10
      for (const a of s.animals) a.lastFedAt = s.time
      healthStep(s, [])
    }
    const sick = s.animals.filter((a) => a.health.status === 'malade').length
    // 15 % attendus en moyenne (≈ 30 sur 200) : on accepte 10 à 25 %.
    expect(sick).toBeGreaterThanOrEqual(20)
    expect(sick).toBeLessThanOrEqual(50)
  })
})
