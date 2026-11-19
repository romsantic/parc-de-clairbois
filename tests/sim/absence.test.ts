import { describe, it, expect } from 'vitest'
import { advanceTo } from '../../src/sim/advance'
import { summarize } from '../../src/sim/summary'
import { newGame } from '../../src/sim/newGame'
import { DAY_MS, HOUR_MS } from '../../src/data/tuning'
import { efficiency } from '../../src/sim/care'
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

describe('dette du personnel', () => {
  it('trois nuits sans recettes : la caisse ne passe jamais sous une journée de salaires', () => {
    let st = emptyState({ coins: 0 })
    st.staff = { ...st.staff, coverAllUntil: 0, renewAt: Number.MAX_SAFE_INTEGER, payDay: Math.floor(T0 / DAY_MS) }
    st.staff.employees = [
      { id: 1, name: 'Léa', job: 'soigneur', xpH: 0, hiredAt: T0, encIds: [] },
      { id: 2, name: 'Hugo', job: 'entretien', xpH: 0, hiredAt: T0, encIds: [] },
    ]
    for (let i = 0; i < 3 * 144; i++) {
      st = advanceTo(st, st.time + 600_000).state
      expect(st.coins).toBeGreaterThanOrEqual(-100)
    }
    expect(st.coins).toBeLessThan(0)
    expect(efficiency(st)).toBe(0.5)
    st.coins += 1000 // des recettes arrivent
    st = advanceTo(st, st.time + DAY_MS).state
    expect(st.coins).toBeGreaterThan(0)
    expect(efficiency(st)).toBe(1)
  })
})
