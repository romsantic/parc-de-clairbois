import { describe, it, expect, vi } from 'vitest'
import { breedingStep } from '../../src/sim/breeding'
import { ageStage } from '../../src/sim/animal'
import type { GameEvent, GameState } from '../../src/sim/types'
import { ANIMAL_NAMES } from '../../src/data/names'
import { HOUR_MS } from '../../src/data/tuning'
import { animal, sick, emptyState, enclosure, T0 } from './helpers'

// Chance forcée : tant que `force.on` est vrai, tout tirage aléatoire vaut 0 (la conception réussit toujours).
const force = vi.hoisted(() => ({ on: false }))
vi.mock('../../src/sim/random', async (orig) => {
  const m = await orig<typeof import('../../src/sim/random')>()
  return { ...m, random: (st: Parameters<typeof m.random>[0]) => { const v = m.random(st); return force.on ? 0 : v } }
})

const MIN10 = 600_000

/** Fait tourner la reproduction pas à pas en gardant tout le monde nourri et l'enclos propre. */
function run(s: GameState, steps: number, ev: GameEvent[] = []) {
  for (let i = 0; i < steps; i++) {
    s.time += MIN10
    for (const a of s.animals) a.lastFedAt = s.time
    for (const e of s.enclosures) e.cleanedAt = s.time
    breedingStep(s, ev)
  }
  return ev
}

const couple = (over: Parameters<typeof animal>[4] = {}) =>
  emptyState({ rng: 7, enclosures: [enclosure(1, 'mouton')], animals: [animal(1, 'mouton', 'F', 1), animal(2, 'mouton', 'M', 1, over)] })

describe('breedingStep', () => {
  it('un couple heureux finit par avoir des petits', () => {
    const s = couple()
    const ev = run(s, 144 + 12)
    expect(ev.some((e) => e.kind === 'gestation')).toBe(true)
    const babies = s.animals.filter((a) => a.id >= 100)
    expect(babies.length).toBeGreaterThanOrEqual(1)
    for (const b of babies) {
      expect(ANIMAL_NAMES).toContain(b.name)
      expect(['bebe', 'jeune', 'adulte']).toContain(ageStage(b, s.time))
      expect(b.enclosureId).toBe(1)
    }
    expect(ev.filter((e) => e.kind === 'naissance').length).toBe(babies.length)
  })
  it('naissance exactement après la gestation (2 h pour un mouton)', () => {
    const s = couple()
    s.animals[0].pregnantSince = T0
    run(s, 11)
    expect(s.animals).toHaveLength(2)
    run(s, 1)
    expect(s.animals.length).toBeGreaterThanOrEqual(3)
    expect(s.animals[0].pregnantSince === null || s.animals[0].pregnantSince > T0).toBe(true)
  })
  const noConception = (s: GameState) => {
    run(s, 144)
    return s.animals[0].pregnantSince === null && s.animals.length === 2
  }
  it('pas de conception si le mâle est jeune', () => {
    // Taureau : gestation 18 h, donc jeune jusqu'à 36 h. Né il y a 18 h, il reste jeune 18 h de plus ;
    // on observe 16 h (si la conception était permise, elle aurait 99 % de chances d'arriver).
    const s = emptyState({ rng: 7, enclosures: [enclosure(1, 'taureau', 20, 20)],
      animals: [animal(1, 'taureau', 'F', 1), animal(2, 'taureau', 'M', 1, { bornAt: T0 - 18 * HOUR_MS })] })
    run(s, 96)
    expect(s.animals[0].pregnantSince).toBeNull()
  })
  it("pas de conception si l'enclos est plein", () => {
    const s = couple()
    s.enclosures[0].rect = { x: 0, z: 0, w: 4, d: 10 } // capacité 2
    expect(noConception(s)).toBe(true)
  })
  it('pas de conception si la femelle est malade', () => {
    const s = couple()
    s.animals[0].health = sick(T0)
    expect(noConception(s)).toBe(true)
  })
  it('pas de conception si la femelle est affamée', () => {
    const s = couple()
    let ok = true
    for (let i = 0; i < 144; i++) {
      s.time += MIN10
      s.animals[1].lastFedAt = s.time
      s.enclosures[0].cleanedAt = s.time
      s.animals[0].lastFedAt = s.time - 13 * HOUR_MS
      breedingStep(s, [])
      if (s.animals[0].pregnantSince !== null) ok = false
    }
    expect(ok).toBe(true)
  })
})

describe('repos après une naissance', () => {
  const withBirth = (hoursAgo: number) => {
    const s = couple()
    s.animals[0].lastBirthAt = T0 - hoursAgo * HOUR_MS
    return s
  }
  it('une brebis qui a mis bas il y a 3 h ne conçoit pas avant 4 h de repos (chance forcée)', () => {
    force.on = true
    try {
      const s = withBirth(3)
      run(s, 5) // jusqu'à 3 h 50 après la naissance
      expect(s.animals[0].pregnantSince).toBeNull()
    } finally { force.on = false }
  })
  it('à 4 h de repos elle peut concevoir (chance forcée)', () => {
    force.on = true
    try {
      const s = withBirth(3)
      run(s, 6)
      expect(s.animals[0].pregnantSince).not.toBeNull()
    } finally { force.on = false }
  })
  it('la mère qui met bas reçoit lastBirthAt', () => {
    const s = couple()
    s.animals[0].pregnantSince = T0
    run(s, 12)
    expect(s.animals[0].lastBirthAt).toBe(s.time)
  })
  it('une femelle non suivie ne conçoit jamais ; suivie, elle conçoit', () => {
    const sans = couple()
    sans.staff.coverAllUntil = 0
    expect(run(sans, 30 * 144).some((e) => e.kind === 'gestation')).toBe(false)
    const avec = couple()
    avec.staff.coverAllUntil = 0
    avec.staff.employees.push({ id: 5, name: 'Léa', job: 'soigneur', xpH: 0, hiredAt: T0, encIds: [1] })
    expect(run(avec, 30 * 144).some((e) => e.kind === 'gestation')).toBe(true)
  })
})
