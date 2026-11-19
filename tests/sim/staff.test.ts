import { describe, it, expect } from 'vitest'
import { employeeLevel, wage, dailyWages, firstKeeper, staffStep, renewCandidates } from '../../src/sim/staff'
import { advanceTo, step } from '../../src/sim/advance'
import { DAY_MS, HOUR_MS } from '../../src/data/tuning'
import { JOBS } from '../../src/data/staff'
import { animal, enclosure } from './helpers'
import type { GameEvent } from '../../src/sim/types'
import { STAFF_NAMES } from '../../src/data/names'
import { emptyState, T0 } from './helpers'
import type { Employee } from '../../src/sim/types'

const emp = (xpH: number, job: Employee['job'] = 'soigneur'): Employee => ({ id: 1, name: 'X', job, xpH, hiredAt: T0, encIds: [] })

describe('employeeLevel', () => {
  it('suit les seuils d\'expérience', () => {
    expect(employeeLevel(emp(0))).toBe(1)
    expect(employeeLevel(emp(71.9))).toBe(1)
    expect(employeeLevel(emp(72))).toBe(2)
    expect(employeeLevel(emp(168))).toBe(3)
    expect(employeeLevel(emp(336))).toBe(4)
    expect(employeeLevel(emp(672))).toBe(5)
    expect(employeeLevel(emp(5000))).toBe(5)
  })
})

describe('wage', () => {
  it('monte de 20 % par niveau, arrondi', () => {
    expect(wage('soigneur', 1)).toBe(60)
    expect(wage('soigneur', 3)).toBe(84)
    expect(wage('entretien', 2)).toBe(48)
  })
})

describe('dailyWages', () => {
  it('additionne les salaires', () => {
    const s = emptyState()
    expect(dailyWages(s)).toBe(0)
    s.staff.employees = [emp(0), emp(72, 'entretien')]
    expect(dailyWages(s)).toBe(60 + 48)
  })
})

describe('firstKeeper', () => {
  it('crée Léa niveau 1, prend un id, sans l\'ajouter', () => {
    const s = emptyState()
    const l = firstKeeper(s, [4, 5])
    expect(l).toEqual({ id: 100, name: 'Léa', job: 'soigneur', xpH: 0, hiredAt: T0, encIds: [4, 5] })
    expect(s.nextId).toBe(101)
    expect(s.staff.employees).toEqual([])
  })
})

describe('STAFF_NAMES', () => {
  it('au moins 30 prénoms distincts, sans Léa ni Margaux', () => {
    expect(STAFF_NAMES.length).toBeGreaterThanOrEqual(30)
    expect(new Set(STAFF_NAMES).size).toBe(STAFF_NAMES.length)
    expect(STAFF_NAMES).not.toContain('Léa')
    expect(STAFF_NAMES).not.toContain('Margaux')
  })
})

const flat = () => ({ ...emptyState().staff, coverAllUntil: 0, renewAt: Number.MAX_SAFE_INTEGER, payDay: Math.floor(T0 / DAY_MS) })

/** État juste avant minuit (le prochain pas franchit le jour), avec salaires de 100. */
function beforeMidnight(coins: number) {
  const midnight = (Math.floor(T0 / DAY_MS) + 1) * DAY_MS
  const s = emptyState({ time: midnight - 600_000, coins })
  s.staff = { ...flat(), payDay: Math.floor((midnight - 600_000) / DAY_MS) }
  s.staff.employees = [emp(0, 'soigneur'), { ...emp(0, 'entretien'), id: 2 }] // 60 + 40
  return { s, midnight }
}

describe('paie de minuit', () => {
  it('paie les salaires au passage de minuit', () => {
    const { s } = beforeMidnight(500)
    const ev = step(s)
    expect(s.coins).toBeLessThanOrEqual(400)
    expect(ev.find((e) => e.kind === 'paie')).toMatchObject({ due: 100, paid: 100 })
  })
  it('la dette est plafonnée à une journée de salaires', () => {
    const { s } = beforeMidnight(30)
    const ev = step(s)
    expect(s.coins).toBeLessThanOrEqual(-70)
    expect(s.coins).toBeGreaterThan(-100)
    expect(ev.find((e) => e.kind === 'paie')).toMatchObject({ due: 100, paid: 30 })
  })
  it('déjà à -100 : reste à -100', () => {
    const { s } = beforeMidnight(-100)
    const ev = step(s)
    expect(s.coins).toBeLessThan(0)
    expect(s.coins).toBeGreaterThanOrEqual(-100)
    expect(ev.find((e) => e.kind === 'paie')).toMatchObject({ due: 100, paid: 0 })
  })
  it('payDay -1 : le premier pas note le jour sans payer', () => {
    const { s } = beforeMidnight(500)
    s.staff.payDay = -1
    const ev: GameEvent[] = []
    staffStep(s, ev)
    expect(s.coins).toBe(500)
    expect(s.staff.payDay).toBe(Math.floor(s.time / DAY_MS))
    expect(ev.some((e) => e.kind === 'paie')).toBe(false)
  })
  it('horloge qui recule : une seule paie ce jour-là', () => {
    const { s, midnight } = beforeMidnight(500)
    const r1 = advanceTo(s, midnight)
    expect(r1.events.filter((e) => e.kind === 'paie')).toHaveLength(1)
    const back = advanceTo(r1.state, midnight - DAY_MS / 2)
    const r2 = advanceTo(back.state, midnight + 600_000)
    expect(r2.events.filter((e) => e.kind === 'paie')).toHaveLength(0)
  })
})

describe('expérience', () => {
  it('niveau 2 à 72 h, salaire 72', () => {
    const s = emptyState({ staff: flat() })
    s.staff.employees = [emp(71.9)]
    const ev: GameEvent[] = []
    staffStep(s, ev)
    expect(employeeLevel(s.staff.employees[0])).toBe(2)
    expect(ev.filter((e) => e.kind === 'niveauEmploye')).toEqual([{ kind: 'niveauEmploye', at: s.time, employeeId: 1, name: 'X', level: 2 }])
    expect(dailyWages(s)).toBe(72)
  })
})

describe('candidats', () => {
  it('premier tirage : 4 candidats, un soigneur et un agent au moins, métiers ouverts', () => {
    const s = emptyState()
    const ev: GameEvent[] = []
    renewCandidates(s, ev)
    expect(s.staff.candidates).toHaveLength(4)
    const jobs = s.staff.candidates.map((c) => c.job)
    expect(jobs).toContain('soigneur')
    expect(jobs).toContain('entretien')
    expect(jobs.every((j) => JOBS[j].open)).toBe(true)
    expect(s.staff.renewAt).toBe(s.time + 12 * HOUR_MS)
    expect(s.staff.renewals).toBe(1)
    expect(new Set(s.staff.candidates.map((c) => c.id)).size).toBe(4)
    expect(ev).toEqual([{ kind: 'candidats', at: s.time }])
  })
  it('même graine, mêmes candidats', () => {
    const a = emptyState(); const b = emptyState()
    renewCandidates(a); renewCandidates(b)
    expect(a.staff.candidates).toEqual(b.staff.candidates)
  })
  it('staffStep renouvelle quand renewAt est atteint', () => {
    const s = emptyState({ staff: { ...flat(), renewAt: T0 } })
    const ev: GameEvent[] = []
    staffStep(s, ev)
    expect(s.staff.candidates).toHaveLength(4)
    expect(ev.some((e) => e.kind === 'candidats')).toBe(true)
  })
})

describe('naissance et affectations', () => {
  it('une naissance complète les trous au même pas', () => {
    const s = emptyState({ staff: flat() })
    s.enclosures = [enclosure(1, 'mouton', 4, 10)]
    s.animals = [animal(1, 'mouton', 'F', 1)]
    s.staff.employees = [{ id: 1, name: 'Léa', job: 'soigneur', xpH: 0, hiredAt: T0, encIds: [] }]
    const ev: GameEvent[] = [{ kind: 'naissance', at: s.time, animalId: 1, motherId: 1 }]
    staffStep(s, ev)
    expect(s.staff.employees[0].encIds).toEqual([1])
  })
})
