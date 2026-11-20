import { describe, it, expect } from 'vitest'
import { buildEnclosure, resizeEnclosure, applyAction, cleanEnclosure, previewEnclosure } from '../../src/sim/actions'
import { animal, emptyState, enclosure, T0 } from './helpers'

const R = (x: number, z: number, w: number, d: number) => ({ x, z, w, d })
const START = R(-26, -5, 12, 10)
const base = () => emptyState({
  coins: 1000,
  enclosures: [enclosure(1, 'mouton', 12, 10, { rect: START })],
  animals: Array.from({ length: 6 }, (_, i) => animal(i + 1, 'mouton', i % 2 ? 'M' : 'F', 1)),
})

describe('construire un enclos', () => {
  it('retire le prix et ajoute un enclos vide de prairie', () => {
    const r = buildEnclosure(base(), R(-13.5, -6, 9.5, 8))
    expect(r.ok).toBe(true)
    if (!r.ok) return
    const e = r.state.enclosures[1]
    expect(e).toMatchObject({ species: null, biome: 'prairie', rect: R(-13.5, -6, 9.5, 8), cleanedAt: r.state.time })
    expect(r.state.coins).toBe(1000 - (4 * 35 + 76))
    expect(new Set(r.state.enclosures.map((x) => x.id)).size).toBe(2)
  })
  it('refuse sans assez de pièces', () => {
    expect(buildEnclosure({ ...base(), coins: 10 }, R(-13.5, -6, 9.5, 8)))
      .toEqual({ ok: false, reason: 'Pas assez de pièces (il en faut 216).' })
  })
  it('refuse sur un chemin, avec la raison de la pose', () => {
    expect(buildEnclosure(base(), R(-13, 2, 8, 7.5))).toEqual({ ok: false, reason: 'Il chevauche un chemin.' })
  })
})

describe('redimensionner', () => {
  it('agrandir coûte la différence', () => {
    const r = resizeEnclosure(base(), 1, R(-26, -5, 14, 10))
    expect(r.ok && r.state.coins).toBe(964)
    expect(r.ok && r.state.enclosures[0].rect).toEqual(R(-26, -5, 14, 10))
  })
  it('refuse de rétrécir sous le nombre d’animaux', () => {
    expect(resizeEnclosure(base(), 1, R(-26, -5, 8, 10)))
      .toEqual({ ok: false, reason: "Trop d'animaux pour cette taille (il faut de la place pour 6)." })
  })
})

describe("aperçu d'un enclos (éditeur)", () => {
  it('signale déjà dans l’éditeur un enclos trop petit pour ses animaux', () => {
    expect(previewEnclosure(base(), R(-26, -5, 8, 10), 1))
      .toEqual({ ok: false, reason: "Trop d'animaux pour cette taille (il faut de la place pour 6).", cost: 0 })
  })
  it('signale déjà dans l’éditeur un manque de pièces', () => {
    expect(previewEnclosure({ ...base(), coins: 10 }, R(-13.5, -6, 9.5, 8)))
      .toEqual({ ok: false, reason: 'Pas assez de pièces (il en faut 216).', cost: 216 })
  })
  it('donne le prix quand tout va bien', () => {
    expect(previewEnclosure(base(), R(-26, -5, 14, 10), 1)).toEqual({ ok: true, cost: 36 })
  })
})

describe('nettoyer', () => {
  it("refuse un enclos déjà propre", () => {
    expect(cleanEnclosure(base(), 1)).toEqual({ ok: false, reason: "L'enclos est déjà propre." })
  })
})

describe('applyAction', () => {
  it('aiguille chaque type vers la bonne action', () => {
    const dirty = { ...base(), time: T0 + 20 * 3_600_000 }
    expect(applyAction(dirty, { type: 'nettoyer', encId: 1 }).ok).toBe(true)
    expect(applyAction(base(), { type: 'construire', rect: R(-13.5, -6, 9.5, 8) }).ok).toBe(true)
    expect(applyAction(base(), { type: 'redimensionner', encId: 1, rect: R(-26, -5, 14, 10) }).ok).toBe(true)
    expect(applyAction(base(), { type: 'renommer', animalId: 1, name: 'Zoé' }).ok).toBe(true)
    expect(applyAction(base(), { type: 'acheterRations', food: 'fourrage', n: 5 }).ok).toBe(true)
    expect(applyAction(base(), { type: 'isoler', animalId: 1 }).ok).toBe(false)
  })
})
