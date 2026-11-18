import { describe, expect, it } from 'vitest'
import { animal, emptyState, enclosure } from './helpers'
import { appeal, buildingIncomePerHour, fairPrice, incomePerHour, priceMultiplier, visitorsPerHour } from '../../src/sim/economy'
import type { SpeciesId } from '../../src/data/species'
import type { GameState } from '../../src/sim/types'

/** Un animal par espèce, chacun dans son propre grand enclos (bonheur 1). */
function withAnimals(species: SpeciesId[]): GameState {
  return emptyState({
    enclosures: species.map((s, i) => enclosure(i + 1, s, 40, 40)),
    animals: species.map((s, i) => animal(i + 1, s, 'F', i + 1)),
  })
}

/** n moutons dans un grand enclos. */
function moutons(n: number): GameState {
  return emptyState({
    enclosures: [enclosure(1, 'mouton', 40, 40)],
    animals: Array.from({ length: n }, (_, i) => animal(i + 1, 'mouton', 'F', 1)),
  })
}

describe('attrait', () => {
  it('2 moutons = 1,5 ; 5 moutons = 2', () => {
    expect(appeal(moutons(2))).toBeCloseTo(1.5)
    expect(appeal(moutons(5))).toBeCloseTo(2)
  })
  it('2 moutons + 1 âne = 3,5', () => {
    const s = moutons(2)
    s.enclosures.push(enclosure(2, 'ane', 40, 40))
    s.animals.push(animal(9, 'ane', 'F', 2))
    expect(appeal(s)).toBeCloseTo(3.5)
  })
  it('aucun animal : attrait 0, 0 visiteur, prix juste 2', () => {
    const s = emptyState()
    expect(appeal(s)).toBe(0)
    expect(visitorsPerHour(s)).toBe(0)
    expect(fairPrice(s)).toBe(2)
  })
})

describe('prix juste et courbe', () => {
  it('départ : 2', () => expect(fairPrice(moutons(2))).toBe(2))
  it('priceMultiplier', () => {
    expect(priceMultiplier(0)).toBeCloseTo(1.3)
    expect(priceMultiplier(0.5)).toBeCloseTo(1.3)
    expect(priceMultiplier(1)).toBeCloseTo(1)
    expect(priceMultiplier(1.25)).toBeCloseTo(0.8)
    expect(priceMultiplier(2)).toBeCloseTo(0.25)
    expect(priceMultiplier(3)).toBe(0)
    expect(priceMultiplier(4)).toBe(0)
  })
})

describe('visiteurs', () => {
  it('2 moutons heureux au prix juste = 6', () => {
    expect(visitorsPerHour(moutons(2), 2)).toBeCloseTo(6)
  })
  it('avec une auberge : 7,2', () => {
    const s = moutons(2)
    s.buildings.push({ slot: 1, type: 'auberge', level: 1 })
    expect(visitorsPerHour(s, 2)).toBeCloseTo(7.2)
  })
  it('réputation 0 : la moitié', () => {
    const s = moutons(2)
    s.reputation = 0
    expect(visitorsPerHour(s, 2)).toBeCloseTo(3)
  })
})

describe('revenus', () => {
  it('café niveau 1, 6 visiteurs/h : 2,4 clients x 1,5 = 3,6', () => {
    const s = moutons(2)
    s.buildings.push({ slot: 1, type: 'cafe', level: 1 })
    const r = incomePerHour(s, 2)
    expect(r.visiteurs).toBeCloseTo(6)
    expect(r.clients).toBeCloseTo(2.4)
    expect(r.village).toBeCloseTo(3.6)
    expect(r.billets).toBeCloseTo(12)
  })
  it('café plafonné à 10 clients/h avec beaucoup de visiteurs', () => {
    const s = withAnimals(['mouton', 'cochon', 'ane', 'alpaga', 'renard', 'cerf', 'cheval', 'lama', 'taureau', 'loup'])
    s.buildings.push({ slot: 1, type: 'cafe', level: 1 })
    const r = incomePerHour(s, 2)
    expect(r.visiteurs).toBeGreaterThan(80)
    expect(r.clients).toBeCloseTo(10)
    expect(r.village).toBeCloseTo(15)
  })
  it('prix 0 : aucune recette de billet', () => {
    expect(incomePerHour(moutons(2), 0).billets).toBe(0)
  })
  it('boutique avec 3 espèces : (1 + 1,5) x 0,5 = 1,25 par client', () => {
    const s = withAnimals(['mouton', 'cochon', 'ane'])
    s.buildings = [{ slot: 1, type: 'boutique', level: 1 }]
    const r = incomePerHour(s, 2)
    expect(r.clients).toBeGreaterThan(0)
    expect(r.village / r.clients).toBeCloseTo(1.25)
  })
})

describe('buildingIncomePerHour', () => {
  it('café niveau 1 avec 2 moutons : 2,4 clients/h et 3,6 pièces/h', () => {
    const s = moutons(2)
    s.ticketPrice = 2
    s.buildings.push({ slot: 1, type: 'cafe', level: 1 })
    const r = buildingIncomePerHour(s, 1)
    expect(r.clients).toBeCloseTo(2.4)
    expect(r.pieces).toBeCloseTo(3.6)
  })
  it('emplacement libre : zéro', () => {
    expect(buildingIncomePerHour(moutons(2), 3)).toEqual({ clients: 0, pieces: 0 })
  })
})
