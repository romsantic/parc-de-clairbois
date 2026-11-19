import { describe, it, expect } from 'vitest'
import { cleanEnclosure, cureAnimal, addRations, renameAnimal } from '../../src/sim/actions'
import { HOUR_MS } from '../../src/data/tuning'
import { animal, sick, emptyState, enclosure, T0 } from './helpers'

const base = () => emptyState({
  time: T0 + 30 * HOUR_MS, coins: 1000,
  pantry: { fourrage: 190, viande: 0, capacity: 200 },
  enclosures: [enclosure(1, 'mouton'), enclosure(2, 'loup')],
  animals: [
    animal(1, 'mouton', 'F', 1, { health: sick(T0 + 24 * HOUR_MS) }),
    animal(2, 'loup', 'M', 2, { health: sick(T0 + 24 * HOUR_MS) }),
    animal(3, 'mouton', 'M', 1),
  ],
})

describe('actions du joueur', () => {
  it('nettoyer coûte 5 et remet la propreté à neuf', () => {
    const s = base()
    const r = cleanEnclosure(s, 1)
    expect(r.ok && r.state.coins).toBe(995)
    expect(r.ok && r.state.enclosures[0].cleanedAt).toBe(s.time)
    expect(s.coins).toBe(1000) // l'original n'est pas touché
  })
  it('nettoyer sans assez de pièces est refusé', () => {
    expect(cleanEnclosure({ ...base(), coins: 4 }, 1)).toEqual({ ok: false, reason: 'Pas assez de pièces (il en faut 5).' })
  })
  it('soigner un mouton coûte 50, un loup 625, et relance le compteur de faim', () => {
    const s = base()
    const r1 = cureAnimal(s, 1)
    expect(r1.ok && r1.state.coins).toBe(950)
    expect(r1.ok && r1.state.animals[0].health).toEqual({ status: 'ok' })
    expect(r1.ok && r1.state.animals[0].lastFedAt).toBe(s.time)
    const r2 = cureAnimal(s, 2)
    expect(r2.ok && r2.state.coins).toBe(375)
  })
  it('soigner un animal en bonne santé est refusé', () => {
    expect(cureAnimal(base(), 3)).toEqual({ ok: false, reason: "Cet animal n'est pas malade." })
  })
  it('les rations sont bornées par la capacité ; garde-manger plein refusé', () => {
    const r = addRations(base(), 'fourrage', 20)
    expect(r.ok && r.state.pantry.fourrage).toBe(200)
    expect(addRations({ ...base(), pantry: { fourrage: 200, viande: 0, capacity: 200 } }, 'fourrage', 5))
      .toEqual({ ok: false, reason: 'Le garde-manger est plein.' })
  })
  it('renommer nettoie les espaces et borne la longueur', () => {
    const r = renameAnimal(base(), 3, '  Monsieur   Laine  ')
    expect(r.ok && r.state.animals[2].name).toBe('Monsieur Laine')
    const bad = { ok: false, reason: 'Le nom doit faire entre 1 et 20 caractères.' }
    expect(renameAnimal(base(), 3, '   ')).toEqual(bad)
    expect(renameAnimal(base(), 3, 'x'.repeat(21))).toEqual(bad)
  })
  it('un identifiant inconnu est refusé', () => {
    expect(cleanEnclosure(base(), 99)).toEqual({ ok: false, reason: 'Introuvable.' })
    expect(cureAnimal(base(), 99)).toEqual({ ok: false, reason: 'Introuvable.' })
    expect(renameAnimal(base(), 99, 'Zoé')).toEqual({ ok: false, reason: 'Introuvable.' })
  })
})
