import { describe, it, expect } from 'vitest'
import { advanceTo } from '../../src/sim/advance'
import { summarize } from '../../src/sim/summary'
import { newGame } from '../../src/sim/newGame'
import { DAY_MS, HOUR_MS } from '../../src/data/tuning'
import { animal, emptyState, enclosure, T0 } from './helpers'

/** Couple de moutons dans un enclos plein (pas de naissance), propreté neutralisée. */
function sheepFor(days: number, fourrageHours: number) {
  return emptyState({
    pantry: { fourrage: (2 / 24) * fourrageHours, viande: 0, capacity: 1000 },
    enclosures: [enclosure(1, 'mouton', 4, 10, { cleanedAt: T0 + days * DAY_MS })], // 40 m² : capacité 2
    animals: [animal(1, 'mouton', 'F', 1), animal(2, 'mouton', 'M', 1)],
  })
}

describe("scénarios d'absence (spec §10)", () => {
  it('3 jours d’absence avec 2 jours de stock → malades mais vivants', () => {
    const r = advanceTo(sheepFor(3, 48), T0 + 3 * DAY_MS)
    expect(r.state.animals).toHaveLength(2)
    expect(r.state.animals.every((a) => a.health.status === 'malade')).toBe(true)
    const sum = summarize(r.events)
    expect(sum.malades).toBe(2)
    expect(sum.morts).toEqual([])
    expect(sum.fourrage).toBeCloseTo(4, 1)
  })
  it('5 jours sans stock → morts, annoncées dans le résumé', () => {
    const r = advanceTo(sheepFor(5, 0), T0 + 5 * DAY_MS)
    expect(r.state.animals).toHaveLength(0)
    expect(summarize(r.events).morts).toEqual([
      { name: 'Bête1', species: 'mouton' },
      { name: 'Bête2', species: 'mouton' },
    ])
  })
  it("une absence d'un an est plafonnée à 30 jours et reste rapide", () => {
    const s = sheepFor(400, 24 * 400)
    const t = performance.now()
    const r = advanceTo(s, T0 + 365 * DAY_MS + 123_456)
    expect(performance.now() - t).toBeLessThan(2000)
    expect(r.skippedMs).toBeGreaterThan(0)
    expect(r.state.time % 600_000).toBe(0)
    expect(r.state.time).toBeLessThanOrEqual(T0 + 365 * DAY_MS + 123_456)
  })
})

describe('nouvelle partie laissée seule', () => {
  it('72 h sans intervention : aucun animal ne tombe malade de faim (graines 1 à 20)', () => {
    for (let seed = 1; seed <= 20; seed++) {
      const g = newGame(seed, T0)
      const { events } = advanceTo(g, g.time + 72 * HOUR_MS)
      const faim = events.filter((e) => e.kind === 'malade' && e.cause === 'faim')
      expect(faim, `graine ${seed}`).toHaveLength(0)
    }
  })
})
