import { describe, expect, it } from 'vitest'
import { animal, emptyState, enclosure, T0 } from './helpers'
import { applyAction } from '../../src/sim/actions'
import { advanceTo } from '../../src/sim/advance'
import { newGame } from '../../src/sim/newGame'
import { HOUR_MS, TUNING } from '../../src/data/tuning'
import { SPECIES } from '../../src/data/species'
import type { GameState } from '../../src/sim/types'

const sale = (): GameState => emptyState({
  enclosures: [enclosure(1, 'mouton', 12, 10, { cleanedAt: T0 - 48 * HOUR_MS })],
  animals: [animal(1, 'mouton', 'F', 1)],
})
const ok = (s: GameState, a: Parameters<typeof applyAction>[1]): GameState => {
  const r = applyAction(s, a)
  if (!r.ok) throw new Error(r.reason)
  return r.state
}

describe('compteurs (stats)', () => {
  it('une nouvelle partie a tous ses compteurs à zéro', () => {
    const g = newGame(1, T0)
    expect(g.version).toBe(3)
    expect(Object.values(g.stats.counts).every((n) => n === 0)).toBe(true)
    expect(g.stats.birthsBySpecies).toEqual({})
    expect(g.missions.story.index).toBe(0)
    expect(g.missions.tutorial).toEqual({ step: 0, current: { id: 'pas-fiche', base: 0, done: false, claimed: false }, skipped: false })
    expect(g.missions.unread).toBe(true)
  })
  it('nettoyer compte un nettoyage', () => {
    const s = ok(sale(), { type: 'nettoyer', encId: 1 })
    expect(s.stats.counts.nettoyages).toBe(1)
  })
  it('acheter 10 fourrages compte 10 ; de la viande compte à part', () => {
    let s = ok(emptyState(), { type: 'acheterRations', food: 'fourrage', n: 10 })
    expect(s.stats.counts.fourrageAchete).toBe(10)
    s = ok(s, { type: 'acheterRations', food: 'viande', n: 4 })
    expect(s.stats.counts.viandeAchetee).toBe(4)
    expect(s.stats.counts.fourrageAchete).toBe(10)
  })
  it('vendre, soigner, billet, améliorer comptent', () => {
    const base = emptyState({
      enclosures: [enclosure(1, 'mouton')],
      animals: [animal(1, 'mouton', 'F', 1), animal(2, 'mouton', 'M', 1, { health: { status: 'malade', since: T0 } }), animal(3, 'mouton', 'M', 1, { health: { status: 'malade', since: T0 } })],
    })
    expect(ok(base, { type: 'soigner', animalId: 2 }).stats.counts.soins).toBe(1)
    expect(ok(base, { type: 'soignerTout', encId: 1 }).stats.counts.soins).toBe(2)
    expect(ok(base, { type: 'vendre', animalId: 1 }).stats.counts.ventes).toBe(1)
    expect(ok(base, { type: 'billet', price: 3 }).stats.counts.billetsRegles).toBe(1)
    expect(ok(base, { type: 'ameliorer', slot: 0 }).stats.counts.ameliorations).toBe(1)
  })
  it('acheter un animal compte un achat', () => {
    const g = newGame(5, T0)
    g.coins = 5000
    const offer = g.merchant.offers[0]
    const enc = 50
    g.enclosures.push({ ...enclosure(50, offer.species, 40, 40), species: null })
    const s = applyAction(g, { type: 'acheterAnimal', offerId: offer.id, encId: enc })
    expect(s.ok && s.state.stats.counts.achatsAnimaux).toBe(1)
  })
  it('une action refusée ne change aucun compteur', () => {
    const s = emptyState({ enclosures: [enclosure(1, 'mouton')], animals: [] })
    const r = applyAction(s, { type: 'nettoyer', encId: 1 }) // déjà propre
    expect(r.ok).toBe(false)
    expect(s.stats.counts.nettoyages).toBe(0)
  })
  it('« vu » compte toujours (autonomie, fiche d’enclos)', () => {
    let s = ok(emptyState(), { type: 'vu', what: 'autonomie' })
    expect(s.stats.counts.autonomieVue).toBe(1)
    s = ok(s, { type: 'vu', what: 'ficheEnclos' })
    expect(s.stats.counts.ficheEnclosVue).toBe(1)
  })
  it('une naissance pendant advanceTo compte naissance par espèce', () => {
    const gest = SPECIES.mouton.gestationH * HOUR_MS
    const s = emptyState({
      enclosures: [enclosure(1, 'mouton')],
      animals: [animal(1, 'mouton', 'F', 1, { pregnantSince: T0 - gest + TUNING.STEP_MS / 2, bornAt: T0 - 5 * gest })],
    })
    const r = advanceTo(s, T0 + TUNING.STEP_MS)
    const babies = r.state.animals.length - 1
    expect(babies).toBeGreaterThan(0)
    expect(r.state.stats.counts.naissances).toBe(babies)
    expect(r.state.stats.birthsBySpecies.mouton).toBe(babies)
  })
  it('une conception compte une gestation', () => {
    const s = emptyState({
      enclosures: [enclosure(1, 'mouton', 40, 40)],
      animals: [animal(1, 'mouton', 'F', 1), animal(2, 'mouton', 'M', 1)],
    })
    const r = advanceTo(s, T0 + 600 * HOUR_MS)
    const conceptions = r.events.filter((e) => e.kind === 'gestation').length
    expect(conceptions).toBeGreaterThan(0)
    expect(r.state.stats.counts.gestations).toBe(conceptions)
  })
  it('1 h de visites : visiteurs et piecesGagnees > 0', () => {
    const s = emptyState({
      enclosures: [enclosure(1, 'mouton', 40, 40)],
      animals: [animal(1, 'mouton', 'F', 1), animal(2, 'mouton', 'M', 1)],
      pantry: { fourrage: 500, viande: 0, capacity: 1000 },
    })
    const r = advanceTo(s, T0 + HOUR_MS)
    expect(r.state.stats.counts.visiteurs).toBeGreaterThan(0)
    expect(r.state.stats.counts.piecesGagnees).toBeGreaterThan(0)
    expect(r.state.stats.counts.visiteurs).toBeCloseTo(r.state.totalVisitors)
  })
})
