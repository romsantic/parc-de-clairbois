import { describe, it, expect } from 'vitest'
import { population, canLevelUp, farmLevel, missionGateOk } from '../../src/sim/village'
import { advanceTo } from '../../src/sim/advance'
import { newGame } from '../../src/sim/newGame'
import { summarize } from '../../src/sim/summary'
import { DAY_MS, HOUR_MS } from '../../src/data/tuning'
import { animal, emptyState, enclosure, storyAt, T0 } from './helpers'

/** Deux moutons heureux dans un enclos plein, propreté neutralisée, garde-manger rempli. */
function happySheep(over = {}) {
  return emptyState({
    pantry: { fourrage: 500, viande: 0, capacity: 1000 },
    enclosures: [enclosure(1, 'mouton', 4, 10, { cleanedAt: T0 + 100 * DAY_MS })],
    animals: [animal(1, 'mouton', 'F', 1), animal(2, 'mouton', 'M', 1)],
    ...over,
  })
}

describe('population et niveau', () => {
  it('population : base, bâtiments, clients servis', () => {
    expect(population(emptyState())).toBe(15) // 10 + ferme niveau 1 (5)
    expect(population(newGame(1, T0))).toBe(15)
    const s = emptyState({ buildings: [{ slot: 0, type: 'ferme', level: 1 }, { slot: 1, type: 'cafe', level: 2 }] })
    expect(population(s)).toBe(10 + 5 + 10)
    expect(population(emptyState({ village: { level: 1, clientsServed: 300 } }))).toBe(25)
  })
  it('canLevelUp : seuils et raisons', () => {
    const at = (n: number, level: 1 | 2 | 3 = 1) =>
      emptyState({ village: { level, clientsServed: (n - 15) * 30 }, missions: storyAt(level === 1 ? 4 : 8) })
    expect(canLevelUp(at(49))).toEqual({ ok: false, reason: 'Il faut 50 habitants (encore 1).' })
    expect(canLevelUp(at(50))).toEqual({ ok: true, level: 2 })
    expect(canLevelUp(at(150, 2))).toEqual({ ok: true, level: 3 })
    expect(canLevelUp(at(500, 3))).toEqual({ ok: false, reason: 'Clairbois est déjà un bourg.' })
    expect(missionGateOk(emptyState(), 2)).toBe(false)
    expect(missionGateOk(emptyState({ missions: storyAt(4) }), 2)).toBe(true)
  })
  it('farmLevel', () => {
    expect(farmLevel(emptyState())).toBe(1)
    expect(farmLevel(emptyState({ buildings: [] }))).toBe(0)
  })
  it('le niveau ne change jamais tout seul (30 jours à 200 habitants)', () => {
    const s = happySheep({ village: { level: 1, clientsServed: 30 * 185 } })
    const r = advanceTo(s, T0 + 30 * DAY_MS)
    expect(r.state.village.level).toBe(1)
  })
})

describe('recettes à chaque pas', () => {
  it('1 h, 2 moutons heureux au prix juste → 30 pièces', () => {
    const r = advanceTo(happySheep(), T0 + HOUR_MS)
    expect(r.state.coins - 1000).toBeCloseTo(30, 2)
    expect(r.state.totalVisitors).toBeCloseTo(6, 2)
    expect(r.events.some((e) => e.kind === 'recettes')).toBe(true)
  })
  it('réputation : prix à 2 × juste 10 h → 0,8 ; puis prix juste 10 h → 0,9', () => {
    const a = advanceTo(happySheep({ ticketPrice: 10 }), T0 + 10 * HOUR_MS).state
    expect(a.reputation).toBeCloseTo(0.8, 5)
    a.ticketPrice = 5
    const b = advanceTo(a, a.time + 10 * HOUR_MS).state
    expect(b.reputation).toBeCloseTo(0.9, 5)
  })
  it('réputation bornée à 1', () => {
    expect(advanceTo(happySheep(), T0 + 5 * HOUR_MS).state.reputation).toBe(1)
  })
  it('ferme niveau 3 → +15 fourrage en 24 h (hors consommation)', () => {
    const s = emptyState({ buildings: [{ slot: 0, type: 'ferme', level: 3 }], pantry: { fourrage: 10, viande: 0, capacity: 1000 } })
    expect(advanceTo(s, T0 + DAY_MS).state.pantry.fourrage).toBeCloseTo(25, 5)
  })
  it('fourrage gratuit limité par la capacité', () => {
    const s = emptyState({ buildings: [{ slot: 0, type: 'ferme', level: 3 }], pantry: { fourrage: 90, viande: 8, capacity: 100 } })
    const p = advanceTo(s, T0 + DAY_MS).state.pantry
    expect(p.fourrage + p.viande).toBeLessThanOrEqual(100)
  })
  it('30 jours d’absence d’une nouvelle partie : pièces finies, > 0, rapide', () => {
    const s = newGame(7, T0)
    s.pantry.fourrage = 200
    const t = performance.now()
    const r = advanceTo(s, T0 + 30 * DAY_MS)
    expect(performance.now() - t).toBeLessThan(2000)
    expect(Number.isFinite(r.state.coins)).toBe(true)
    expect(r.state.coins).toBeGreaterThan(0)
  })
  it('summarize additionne pièces et visiteurs', () => {
    const sum = summarize([
      { kind: 'recettes', at: 1, visiteurs: 1, billets: 5, village: 2 },
      { kind: 'recettes', at: 2, visiteurs: 2, billets: 10, village: 1 },
    ])
    expect(sum.pieces).toBe(18)
    expect(sum.visiteurs).toBe(3)
  })
})
