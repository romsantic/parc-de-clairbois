import { describe, it, expect } from 'vitest'
import { employeeLevel, wage, dailyWages, firstKeeper } from '../../src/sim/staff'
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
