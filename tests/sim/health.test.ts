import { describe, it, expect } from 'vitest'
import { healthStep, isSick, isContagious, isFluProtected } from '../../src/sim/health'
import type { Animal, GameEvent, GameState } from '../../src/sim/types'
import { HOUR_MS, DAY_MS } from '../../src/data/tuning'
import { animal, sick, emptyState, enclosure, T0 } from './helpers'

const MIN10 = 600_000

type Sick = Extract<Animal['health'], { status: 'malade' }>

/** Un état dont personne ne suit les animaux (pas de soigneur, délai de grâce passé). */
function unfollowed(over: Partial<GameState> = {}): GameState {
  const s = emptyState(over)
  s.staff.coverAllUntil = 0
  return s
}

/** Fait tourner `healthStep` : animaux nourris, enclos propres gardés propres (ceux qui sont sales restent sales). */
function run(s: GameState, steps: number): GameEvent[] {
  const ev: GameEvent[] = []
  for (let i = 0; i < steps; i++) {
    s.time += MIN10
    for (const a of s.animals) a.lastFedAt = s.time
    for (const e of s.enclosures) if (e.cleanedAt >= T0) e.cleanedAt = s.time
    healthStep(s, ev)
  }
  return ev
}

const stageOf = (a: Animal): number => (a.health as Sick).stage

describe('healthStep : indigestion', () => {
  const at = (h: number, covered = true) => {
    const mk = covered ? emptyState : unfollowed
    const s = mk({ time: T0 + h, enclosures: [enclosure(1, 'mouton', 12, 10, { cleanedAt: T0 + h })],
      animals: [animal(1, 'mouton', 'F', 1)] })
    const ev: GameEvent[] = []
    healthStep(s, ev)
    return { s, ev }
  }
  it('indigestion après 24 h sans manger, pas avant', () => {
    expect(at(24 * HOUR_MS - MIN10).s.animals[0].health.status).toBe('ok')
    const r = at(24 * HOUR_MS)
    expect(r.s.animals[0].health).toEqual(sick(T0 + 24 * HOUR_MS))
    expect(r.ev).toContainEqual({ kind: 'malade', at: T0 + 24 * HOUR_MS, animalId: 1, disease: 'indigestion' })
  })
  it('sans soigneur, la maladie commence sans être repérée et sans événement', () => {
    const r = at(24 * HOUR_MS, false)
    expect(r.s.animals[0].health).toEqual(sick(T0 + 24 * HOUR_MS, { detectedAt: null }))
    expect(r.ev).toEqual([])
  })
})

describe('healthStep : aggravation et mort', () => {
  /** Un malade depuis T0, observé à T0 + h. */
  const at = (h: number, over: Partial<Sick> = {}, covered = true) => {
    const mk = covered ? emptyState : unfollowed
    const s = mk({ time: T0 + h, enclosures: [enclosure(1, 'mouton', 12, 10, { cleanedAt: T0 + h })],
      animals: [animal(1, 'mouton', 'F', 1, { lastFedAt: T0 + h, health: sick(T0, over) })] })
    const ev: GameEvent[] = []
    healthStep(s, ev)
    return { s, ev }
  }
  /** Un malade suivi pas à pas pendant h. */
  const walk = (disease: Sick['disease'], h: number) => {
    const s = emptyState({ enclosures: [enclosure(1, 'mouton', 12, 10)], animals: [animal(1, 'mouton', 'F', 1, { health: sick(T0, { disease }) })] })
    const ev: GameEvent[] = []
    for (let t = MIN10; t <= h; t += MIN10) {
      s.time = T0 + t
      s.enclosures[0].cleanedAt = s.time
      s.animals[0].lastFedAt = s.time
      healthStep(s, ev)
    }
    return { s, ev }
  }
  it('léger → grave → mortel → mort aux bons délais (indigestion : 24 / 24 / 12 h)', () => {
    expect(stageOf(walk('indigestion', 24 * HOUR_MS - MIN10).s.animals[0])).toBe(1)
    const b = walk('indigestion', 24 * HOUR_MS)
    expect(stageOf(b.s.animals[0])).toBe(2)
    expect(b.ev).toContainEqual({ kind: 'aggravation', at: T0 + 24 * HOUR_MS, animalId: 1, stage: 2 })
    const c = walk('indigestion', 48 * HOUR_MS)
    expect(stageOf(c.s.animals[0])).toBe(3)
    expect(c.ev).toContainEqual({ kind: 'aggravation', at: T0 + 48 * HOUR_MS, animalId: 1, stage: 3 })
    expect(walk('indigestion', 60 * HOUR_MS - MIN10).s.animals).toHaveLength(1)
    const d = walk('indigestion', 60 * HOUR_MS)
    expect(d.s.animals).toHaveLength(0)
    expect(d.ev).toContainEqual({ kind: 'mort', at: T0 + 60 * HOUR_MS, animalId: 1, name: 'Bête1', species: 'mouton', cause: 'indigestion' })
  })
  it('la grippe tue en 48 h (18 / 18 / 12 h)', () => {
    expect(walk('grippe', 48 * HOUR_MS - MIN10).s.animals).toHaveLength(1)
    const r = walk('grippe', 48 * HOUR_MS)
    expect(r.s.animals).toHaveLength(0)
    expect(r.ev).toContainEqual({ kind: 'mort', at: T0 + 48 * HOUR_MS, animalId: 1, name: 'Bête1', species: 'mouton', cause: 'grippe' })
  })
  it('sans soigneur, repérée au stade grave : événement malade à 24 h, pas avant', () => {
    const early = at(24 * HOUR_MS - MIN10, { detectedAt: null }, false)
    expect(early.ev).toEqual([])
    expect((early.s.animals[0].health as Sick).detectedAt).toBeNull()
    const late = at(24 * HOUR_MS, { detectedAt: null }, false)
    expect(late.ev).toContainEqual({ kind: 'malade', at: T0 + 24 * HOUR_MS, animalId: 1, disease: 'indigestion' })
    expect((late.s.animals[0].health as Sick).detectedAt).toBe(T0 + 24 * HOUR_MS)
  })
  it('un malade non repéré que suit un soigneur est repéré tout de suite', () => {
    const r = at(MIN10, { detectedAt: null }, true)
    expect(r.ev).toContainEqual({ kind: 'malade', at: T0 + MIN10, animalId: 1, disease: 'indigestion' })
  })
  it('un animal en soin ne s’aggrave pas et ne meurt pas', () => {
    const r = at(200 * HOUR_MS, { careUntil: T0 + 300 * HOUR_MS, vetId: 7 })
    expect(r.s.animals).toHaveLength(1)
    expect(stageOf(r.s.animals[0])).toBe(1)
    expect(r.ev).toEqual([])
  })
  it('isSick, isContagious, isFluProtected', () => {
    const ok = animal(1, 'mouton', 'F', 1)
    const flu = animal(2, 'mouton', 'F', 1, { health: sick(T0, { disease: 'grippe' }) })
    expect(isSick(ok)).toBe(false)
    expect(isSick(flu)).toBe(true)
    expect(isContagious(ok)).toBe(false)
    expect(isContagious(flu)).toBe(true)
    expect(isContagious(animal(3, 'mouton', 'F', 1, { health: sick(T0, { disease: 'grippe', careUntil: T0 + 1 }) }))).toBe(false)
    expect(isContagious(animal(4, 'mouton', 'F', 1, { health: sick(T0, { disease: 'grippe', quarantined: true }) }))).toBe(false)
    expect(isContagious(animal(5, 'mouton', 'F', 1, { health: sick(T0) }))).toBe(false)
    expect(isFluProtected(enclosure(1, 'mouton'), T0)).toBe(false)
    expect(isFluProtected(enclosure(1, 'mouton', 12, 10, { vaccinatedUntil: T0 + 1 }), T0)).toBe(true)
    expect(isFluProtected(enclosure(1, 'mouton', 12, 10, { vaccinatedUntil: T0 }), T0)).toBe(false)
  })
})

describe('healthStep : apparition', () => {
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
  it('parasites : un enclos sale rend malade environ 15 % des animaux par jour', () => {
    const animals = Array.from({ length: 200 }, (_, i) => animal(i + 1, 'mouton', 'F', 1))
    const s = emptyState({ rng: 99, enclosures: [enclosure(1, 'mouton', 100, 100, { cleanedAt: T0 - 48 * HOUR_MS })], animals })
    run(s, 144)
    const malades = s.animals.filter((a) => a.health.status === 'malade')
    // 15 % attendus en moyenne (≈ 30 sur 200) : on accepte 10 à 25 %.
    expect(malades.length).toBeGreaterThanOrEqual(20)
    expect(malades.length).toBeLessThanOrEqual(50)
    expect(malades.every((a) => (a.health as Sick).disease === 'parasites' && (a.health as Sick).stage === 1)).toBe(true)
  })
  it('blessure : en enclos surpeuplé, jamais en enclos à sa capacité', () => {
    const blessures = (n: number, days: number) => {
      const s = emptyState({ rng: 7, enclosures: [enclosure(1, 'mouton', 4, 10)], // 40 m² : capacité 2
        animals: Array.from({ length: n }, (_, i) => animal(i + 1, 'mouton', i % 2 ? 'F' : 'M', 1)) })
      let total = 0
      for (let d = 0; d < days; d++) {
        s.animals.forEach((a) => { a.health = { status: 'ok' } })
        total += run(s, 144).filter((e) => e.kind === 'malade' && e.disease === 'blessure').length
      }
      return total
    }
    expect(blessures(4, 10)).toBeGreaterThan(0)
    expect(blessures(2, 200)).toBe(0)
  })
  it('un animal en quarantaine ne compte pas comme occupant du surpeuplement', () => {
    const q = (i: number) => animal(i, 'mouton', 'F', 1, { health: sick(T0, { disease: 'grippe', quarantined: true, careUntil: T0 + 1000 * DAY_MS }) })
    const s = emptyState({ rng: 7, enclosures: [enclosure(1, 'mouton', 4, 10)],
      animals: [animal(1, 'mouton', 'F', 1), animal(2, 'mouton', 'M', 1), q(3), q(4)] })
    const ev = run(s, 144 * 100)
    expect(ev.filter((e) => e.kind === 'malade' && e.disease === 'blessure')).toHaveLength(0)
  })
  it('bagarre : 2 loups ensemble se blessent parfois, un loup seul jamais', () => {
    const wolves = (n: number) => {
      const s = emptyState({ rng: 3, enclosures: [enclosure(1, 'loup', 40, 40)],
        animals: Array.from({ length: n }, (_, i) => animal(i + 1, 'loup', i % 2 ? 'F' : 'M', 1)) })
      let total = 0
      for (let d = 0; d < 200; d++) {
        s.animals.forEach((a) => { a.health = { status: 'ok' } })
        total += run(s, 144).filter((e) => e.kind === 'malade' && e.disease === 'blessure').length
      }
      return total
    }
    expect(wolves(2)).toBeGreaterThan(0)
    expect(wolves(1)).toBe(0)
  })
})

describe('healthStep : grippe', () => {
  const flock = (n: number, level: 1 | 2 | 3, over: Partial<GameState> = {}) => emptyState({
    rng: 5, village: { level, clientsServed: 0 },
    enclosures: [enclosure(1, 'mouton', 300, 300)],
    animals: Array.from({ length: n }, (_, i) => animal(i + 1, 'mouton', 'F', 1)), ...over })
  const flus = (s: GameState) => s.animals.filter((a) => a.health.status === 'malade' && a.health.disease === 'grippe').length

  it('pas de grippe au Hameau', () => {
    const s = flock(1000, 1)
    run(s, 144 * 10)
    expect(s.animals.filter((a) => a.health.status === 'malade')).toHaveLength(0)
  })
  it('grippe au Village : environ 0,5 % par jour', () => {
    const s = flock(1000, 2)
    run(s, 144)
    // 5 attendus sur 1 000 en un jour
    expect(flus(s)).toBeGreaterThanOrEqual(1)
    expect(flus(s)).toBeLessThanOrEqual(15)
  })
  it('contagion : un grippé contagieux fait plus de grippés qu’un enclos témoin ; soin, quarantaine ou vaccin les arrêtent', () => {
    const total = (patch: (s: GameState) => void, seeded: boolean) => {
      let n = 0
      for (let seed = 1; seed <= 5; seed++) {
        const s = flock(20, 2, { rng: seed })
        if (seeded) s.animals[0].health = sick(T0, { disease: 'grippe' })
        patch(s)
        run(s, 144)
        n += flus(s) - (seeded ? 1 : 0)
      }
      return n
    }
    const first = (s: GameState) => s.animals[0].health as Sick
    const control = total(() => {}, false)
    expect(total(() => {}, true)).toBeGreaterThan(control + 10)
    expect(total((s) => { first(s).quarantined = true }, true)).toBeLessThanOrEqual(control + 3)
    expect(total((s) => { first(s).careUntil = T0 + 10 * DAY_MS }, true)).toBeLessThanOrEqual(control + 3)
    expect(total((s) => { s.enclosures[0].vaccinatedUntil = T0 + 10 * DAY_MS }, true)).toBe(0)
  })
})
