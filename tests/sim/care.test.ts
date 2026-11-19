import { describe, it, expect } from 'vitest'
import { animal, emptyState, enclosure, T0 } from './helpers'
import { assignGaps, careCoverage, careStep, cleanerCapacity, keeperCapacity, redistribute } from '../../src/sim/care'
import { cleanliness } from '../../src/sim/enclosure'
import { HOUR_MS, TUNING } from '../../src/data/tuning'
import type { Animal, Employee, GameState } from '../../src/sim/types'

const emp = (id: number, job: Employee['job'], encIds: number[], xpH = 0): Employee =>
  ({ id, name: `E${id}`, job, xpH, hiredAt: T0, encIds })

const herd = (encId: number, n: number, firstId: number): Animal[] =>
  Array.from({ length: n }, (_, i) => animal(firstId + i, 'mouton', i % 2 ? 'M' : 'F', encId))

const park = (employees: Employee[], animals: Animal[], encIds: number[], over: Partial<GameState> = {}): GameState => {
  const s = emptyState({ enclosures: encIds.map((id) => enclosure(id, 'mouton', 40, 40)), animals, ...over })
  s.staff = { ...s.staff, employees, coverAllUntil: 0 }
  return s
}

describe('capacité des soigneurs', () => {
  it('un soigneur niveau 1 sur 15 animaux en suit 12, les plus petits id', () => {
    const s = park([emp(1, 'soigneur', [1])], herd(1, 15, 10), [1])
    const { covered, byEnclosure } = careCoverage(s)
    expect(covered.size).toBe(12)
    for (let id = 10; id < 22; id++) expect(covered.has(id)).toBe(true)
    expect(byEnclosure.get(1)).toEqual({ animals: 15, covered: 12 })
  })
  it('deux soigneurs sur le même enclos suivent les 15', () => {
    const s = park([emp(1, 'soigneur', [1]), emp(2, 'soigneur', [1])], herd(1, 15, 10), [1])
    expect(careCoverage(s).covered.size).toBe(15)
  })
  it('un soigneur sur deux enclos de 8 : 8 puis 4', () => {
    const s = park([emp(1, 'soigneur', [1, 2])], [...herd(1, 8, 10), ...herd(2, 8, 30)], [1, 2])
    const { byEnclosure } = careCoverage(s)
    expect(byEnclosure.get(1)).toEqual({ animals: 8, covered: 8 })
    expect(byEnclosure.get(2)).toEqual({ animals: 8, covered: 4 })
  })
  it('caisse à -1 : efficacité réduite de moitié, 6 suivis', () => {
    const s = park([emp(1, 'soigneur', [1])], herd(1, 15, 10), [1], { coins: -1 })
    expect(keeperCapacity(s, s.staff.employees[0])).toBe(6)
    expect(careCoverage(s).covered.size).toBe(6)
  })
  it('capacité de l’agent selon le niveau et la dette', () => {
    const s = park([emp(1, 'entretien', [], 0), emp(2, 'entretien', [], 168)], [], [])
    expect(cleanerCapacity(s, s.staff.employees[0])).toBe(4)
    expect(cleanerCapacity(s, s.staff.employees[1])).toBe(6)
    s.coins = -5
    expect(cleanerCapacity(s, s.staff.employees[0])).toBe(2)
  })
  it('règles V1 gardées : délai de grâce, tous suivis sans employé', () => {
    const s = emptyState({ enclosures: [enclosure(1, 'mouton', 40, 40)], animals: herd(1, 15, 10) })
    s.staff.coverAllUntil = T0 + 1
    expect(careCoverage(s).covered.size).toBe(15)
    s.staff.coverAllUntil = T0 - 1
    expect(careCoverage(s).covered.size).toBe(0)
  })
})

describe('salissure', () => {
  const after = (s: GameState, hours: number) => {
    for (let i = 0; i < hours * 6; i++) { s.time += TUNING.STEP_MS; careStep(s, []) }
    return cleanliness(s.enclosures[0], s.time)
  }
  it('sans soigneur : 0 après 12 h', () => {
    expect(after(park([], herd(1, 4, 10), [1]), 12)).toBeCloseTo(0)
  })
  it('à moitié suivi : 0,25 après 12 h', () => {
    const s = park([emp(1, 'soigneur', [1], 0)], herd(1, 24, 10), [1])
    expect(after(s, 12)).toBeCloseTo(0.25)
  })
  it('entièrement suivi : 0,5 après 12 h', () => {
    expect(after(park([emp(1, 'soigneur', [1])], herd(1, 4, 10), [1]), 12)).toBeCloseTo(0.5)
  })
  it('un enclos vide ne se salit pas plus vite', () => {
    expect(after(park([], [], [1]), 12)).toBeCloseTo(0.5)
  })
  it('ne descend pas sous 0 et ne ressuscite pas un enclos très sale', () => {
    const s = park([], herd(1, 4, 10), [1])
    s.enclosures[0].cleanedAt = T0 - 100 * HOUR_MS
    s.time += TUNING.STEP_MS
    careStep(s, [])
    expect(s.enclosures[0].cleanedAt).toBe(T0 - 100 * HOUR_MS)
  })
})

describe('agent d’entretien', () => {
  it('nettoie un enclos à 40 % de propreté, gratuitement', () => {
    const s = park([emp(1, 'entretien', [1])], herd(1, 4, 10), [1])
    s.enclosures[0].cleanedAt = T0 - 0.6 * 24 * HOUR_MS
    s.time += TUNING.STEP_MS
    const coins = s.coins, counts = s.stats.counts.nettoyages
    careStep(s, [])
    expect(s.enclosures[0].cleanedAt).toBe(s.time)
    expect(s.coins).toBe(coins)
    expect(s.stats.counts.nettoyages).toBe(counts)
  })
  it('laisse tranquille un enclos propre à plus de 50 %', () => {
    const s = park([emp(1, 'entretien', [1]), emp(2, 'soigneur', [1])], herd(1, 4, 10), [1])
    s.enclosures[0].cleanedAt = T0 - 0.3 * 24 * HOUR_MS
    s.time += TUNING.STEP_MS
    careStep(s, [])
    expect(s.enclosures[0].cleanedAt).toBe(T0 - 0.3 * 24 * HOUR_MS)
  })
  it('en dette, un agent niveau 1 avec 4 enclos n’en nettoie que 2', () => {
    const s = park([emp(1, 'entretien', [1, 2, 3, 4])], [], [1, 2, 3, 4], { coins: -10 })
    for (const e of s.enclosures) e.cleanedAt = T0 - 20 * HOUR_MS
    s.time += TUNING.STEP_MS
    careStep(s, [])
    expect(s.enclosures.map((e) => e.cleanedAt === s.time)).toEqual([true, true, false, false])
  })
})

describe('assignGaps', () => {
  it('ajoute un nouvel enclos de 5 animaux au soigneur qui a de la place', () => {
    const s = park([emp(1, 'soigneur', [1])], [...herd(1, 4, 10), ...herd(2, 5, 30)], [1, 2])
    assignGaps(s)
    expect(s.staff.employees[0].encIds).toEqual([1, 2])
    expect(careCoverage(s).covered.size).toBe(9)
  })
  it('un enclos confié à la main reste à son soigneur après une naissance', () => {
    const s = park([emp(1, 'soigneur', [1]), emp(2, 'soigneur', [2])], [...herd(1, 4, 10), ...herd(2, 4, 30)], [1, 2])
    s.animals.push(animal(50, 'mouton', 'F', 1))
    assignGaps(s)
    expect(s.staff.employees[0].encIds).toEqual([1])
    expect(s.staff.employees[1].encIds).toEqual([2])
  })
  it('un enclos supprimé disparaît des encIds', () => {
    const s = park([emp(1, 'soigneur', [1, 9]), emp(2, 'entretien', [9, 1])], herd(1, 4, 10), [1])
    assignGaps(s)
    expect(s.staff.employees[0].encIds).toEqual([1])
    expect(s.staff.employees[1].encIds).toEqual([1])
  })
  it('aucun soigneur libre : rien ne plante, animaux non suivis', () => {
    const s = park([emp(1, 'soigneur', [1])], [...herd(1, 12, 10), ...herd(2, 5, 30)], [1, 2])
    assignGaps(s)
    expect(s.staff.employees[0].encIds).toEqual([1])
    expect(careCoverage(s).byEnclosure.get(2)).toEqual({ animals: 5, covered: 0 })
    const vide = park([], herd(1, 3, 10), [1])
    assignGaps(vide)
    expect(careCoverage(vide).covered.size).toBe(0)
  })
  it('donne un enclos occupé sans agent à l’agent qui a de la place', () => {
    const s = park([emp(1, 'entretien', [])], herd(1, 3, 10), [1, 2])
    assignGaps(s)
    expect(s.staff.employees[0].encIds).toEqual([1]) // l'enclos 2 est vide
  })
})

describe('redistribute', () => {
  it('2 soigneurs, 3 enclos (20, 6, 4) : les 30 animaux sont suivis', () => {
    const s = park(
      [emp(1, 'soigneur', [3], 168), emp(2, 'soigneur', [3], 168)],
      [...herd(1, 20, 10), ...herd(2, 6, 40), ...herd(3, 4, 60)], [1, 2, 3],
    )
    redistribute(s)
    expect(careCoverage(s).covered.size).toBe(30)
  })
})
