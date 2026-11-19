import { describe, it, expect } from 'vitest'
import { emptyState, enclosure, animal, T0 } from '../sim/helpers'
import { stars, employeeLine, candidateLine, staffHeader, debtLine, careWarning, encStaffNames } from '../../src/ui/staffModel'
import type { Candidate, Employee, GameState } from '../../src/sim/types'

const emp = (over: Partial<Employee> = {}): Employee => ({ id: 1, name: 'Léa', job: 'soigneur', xpH: 72, hiredAt: T0, encIds: [], ...over })
const withStaff = (employees: Employee[], over: Partial<GameState> = {}): GameState =>
  emptyState({ staff: { employees, candidates: [], renewAt: T0, renewals: 1, payDay: -1, coverAllUntil: 0 }, ...over })
const animals = (n: number, encId: number, firstId = 100) => Array.from({ length: n }, (_, i) => animal(firstId + i, 'mouton', 'F', encId))

describe('stars', () => {
  it('une étoile par niveau', () => {
    expect(stars(1)).toBe('★')
    expect(stars(3)).toBe('★★★')
  })
})

describe('employeeLine', () => {
  it('soigneur : animaux suivis sur sa capacité, salaire du niveau', () => {
    // niveau 2 (72 h) : capacité 14 ; 12 animaux dans l'enclos 1, qu'il suit tous
    const s = withStaff([emp({ encIds: [1] })], { enclosures: [enclosure(1, 'mouton')], animals: animals(12, 1) })
    expect(employeeLine(s, s.staff.employees[0])).toEqual({ title: 'Léa — Soigneur ★★', detail: '12/14 animaux suivis · 72 pièces/jour' })
  })
  it('soigneur : plafonné par sa capacité, le second ne suit que le reste', () => {
    // deux soigneurs niveau 1 (capacité 12) sur le même enclos de 20 animaux
    const k1 = emp({ id: 1, xpH: 0, encIds: [1] })
    const k2 = emp({ id: 2, name: 'Max', xpH: 0, encIds: [1] })
    const s = withStaff([k1, k2], { enclosures: [enclosure(1, 'mouton')], animals: animals(20, 1) })
    expect(employeeLine(s, k1).detail).toBe('12/12 animaux suivis · 60 pièces/jour')
    expect(employeeLine(s, k2).detail).toBe('8/12 animaux suivis · 60 pièces/jour')
  })
  it('agent : enclos existants sur sa capacité (les enclos disparus ne comptent pas)', () => {
    // niveau 2 (72 h) : capacité 5 ; 3 enclos existants sur 4 affectés
    const hugo = emp({ id: 3, name: 'Hugo', job: 'entretien', xpH: 72, encIds: [1, 2, 3, 9] })
    const s = withStaff([hugo], { enclosures: [enclosure(1, 'mouton'), enclosure(2, 'mouton'), enclosure(3, 'mouton')] })
    expect(employeeLine(s, hugo)).toEqual({ title: 'Hugo — Agent d’entretien ★★', detail: '3/5 enclos · 48 pièces/jour' })
  })
  it('métier fermé : salaire seul', () => {
    const a = emp({ name: 'Iris', job: 'animateur', xpH: 0 })
    const s = withStaff([a])
    expect(employeeLine(s, a)).toEqual({ title: 'Iris — Animateur ★', detail: '60 pièces/jour' })
  })
})

describe('candidateLine', () => {
  it('nom, métier, niveau et salaire journalier', () => {
    const c: Candidate = { id: 9, name: 'Hugo', job: 'entretien', level: 1 }
    expect(candidateLine(c)).toBe('Hugo — Agent d’entretien ★ · 40 pièces/jour')
  })
})

describe('staffHeader', () => {
  it('effectif sur le plafond et salaires du jour', () => {
    const s = withStaff([emp({ xpH: 0 }), emp({ id: 2, name: 'Hugo', job: 'entretien', xpH: 0 })])
    expect(staffHeader(s)).toBe('Personnel 2/3 · salaires 100 pièces/jour')
  })
  it('sans employé : zéro pièce', () => {
    expect(staffHeader(withStaff([]))).toBe('Personnel 0/3 · salaires 0 pièce/jour')
  })
})

describe('debtLine', () => {
  it('vide sans dette', () => {
    expect(debtLine(withStaff([], { coins: 0 }))).toBe('')
    expect(debtLine(withStaff([], { coins: 1000 }))).toBe('')
  })
  it('montant de la dette et conséquences', () => {
    expect(debtLine(withStaff([], { coins: -85 }))).toBe('Dette : 85 pièces. Tes employés travaillent moitié moins bien, et tu ne peux ni acheter ni construire tant qu’elle n’est pas remboursée.')
  })
  it('singulier pour une seule pièce', () => {
    expect(debtLine(withStaff([], { coins: -1 }))).toMatch(/^Dette : 1 pièce\. /)
  })
})

describe('careWarning', () => {
  it('vide quand tous les animaux sont suivis, ou pas d’animal', () => {
    const s = withStaff([emp({ encIds: [1] })], { enclosures: [enclosure(1, 'mouton'), enclosure(2, 'mouton')], animals: animals(2, 1) })
    expect(careWarning(s, 1)).toBe('')
    expect(careWarning(s, 2)).toBe('')
  })
  it('un animal sans soigneur : pas de petit pour lui', () => {
    const s = withStaff([], { enclosures: [enclosure(1, 'mouton')], animals: animals(1, 1) })
    expect(careWarning(s, 1)).toBe('1 animal sans soigneur : pas de petit pour lui.')
  })
  it('plusieurs animaux sans soigneur : l’enclos se salit, pas de petits', () => {
    const s = withStaff([], { enclosures: [enclosure(1, 'mouton')], animals: animals(3, 1) })
    expect(careWarning(s, 1)).toBe('3 animaux sans soigneur : l’enclos se salit plus vite et ils n’auront pas de petits.')
  })
})

describe('encStaffNames', () => {
  it('soigneur et agent affectés à l’enclos', () => {
    const hugo = emp({ id: 2, name: 'Hugo', job: 'entretien', xpH: 0, encIds: [1] })
    const s = withStaff([emp({ encIds: [1] }), hugo], { enclosures: [enclosure(1, 'mouton')] })
    expect(encStaffNames(s, 1)).toBe('Soigneur : Léa · Entretien : Hugo')
  })
  it('personne quand aucun soigneur n’est affecté', () => {
    const s = withStaff([], { enclosures: [enclosure(1, 'mouton')] })
    expect(encStaffNames(s, 1)).toBe('Soigneur : personne')
  })
  it('plusieurs soigneurs séparés par des virgules', () => {
    const s = withStaff([emp({ id: 1, name: 'Léa', encIds: [1] }), emp({ id: 2, name: 'Max', encIds: [1] })], { enclosures: [enclosure(1, 'mouton')] })
    expect(encStaffNames(s, 1)).toBe('Soigneur : Léa, Max')
  })
})
