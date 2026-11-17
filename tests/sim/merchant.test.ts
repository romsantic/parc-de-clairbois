import { describe, it, expect } from 'vitest'
import { newGame } from '../../src/sim/newGame'
import { catalogue, restock, merchantStep, acceptsSpecies, buyAnimal, sellPrice, sellAnimal, offerPriceFor } from '../../src/sim/merchant'
import { applyAction, buyRations } from '../../src/sim/actions'
import { advanceTo } from '../../src/sim/advance'
import { ageStage } from '../../src/sim/animal'
import { SPECIES } from '../../src/data/species'
import { HOUR_MS } from '../../src/data/tuning'
import type { GameEvent, GameState } from '../../src/sim/types'
import { animal, emptyState, enclosure, T0 } from './helpers'

const ok = (r: ReturnType<typeof buyAnimal>): GameState => { if (!r.ok) throw new Error(r.reason); return r.state }

describe('catalogue', () => {
  it('niveau 1 : 4 espèces de prairie ; niveau 3 : les 10', () => {
    expect(catalogue(1).sort()).toEqual(['alpaga', 'ane', 'cochon', 'mouton'])
    expect(catalogue(3)).toHaveLength(10)
  })
})

describe('stock', () => {
  it('une nouvelle partie a 4 offres, dont un couple de cochons adultes à 150', () => {
    const g = newGame(7, 1_000_000_000_123)
    expect(g.merchant.offers).toHaveLength(4)
    expect(g.merchant.restocks).toBe(1)
    expect(g.merchant.restockAt).toBe(g.time + 6 * HOUR_MS)
    const [a, b] = g.merchant.offers
    expect([a, b].map((o) => o.sex).sort()).toEqual(['F', 'M'])
    for (const o of [a, b]) expect(o).toMatchObject({ species: 'cochon', stage: 'adulte', price: 150 })
  })
  it('se renouvelle après 6 h, avec un événement', () => {
    const g = newGame(7, 1_000_000_000_123)
    const sig = () => JSON.stringify(g.merchant.offers.map((o) => ({ ...o, id: 0 })))
    const before = sig()
    const events: GameEvent[] = []
    g.time += 5 * HOUR_MS
    merchantStep(g, events)
    expect(g.merchant.restocks).toBe(1)
    g.time += HOUR_MS
    merchantStep(g, events)
    expect(g.merchant.restocks).toBe(2)
    expect(events).toEqual([{ kind: 'stock', at: g.time }])
    expect(g.merchant.offers).toHaveLength(4)
    expect(sig()).not.toBe(before)
  })
  it('remplit un stock vide au pas suivant (ancienne sauvegarde)', () => {
    const s = emptyState()
    merchantStep(s, [])
    expect(s.merchant.offers).toHaveLength(4)
  })
  it('est reproductible avec la même graine', () => {
    expect(newGame(5, 1e12).merchant).toEqual(newGame(5, 1e12).merchant)
  })
  it('un jeune alpaga coûte 390', () => {
    const s = emptyState()
    s.merchant.restocks = 1
    const jeune = () => s.merchant.offers.find((o) => o.species === 'alpaga' && o.stage === 'jeune')
    for (let i = 0; i < 300 && !jeune(); i++) restock(s)
    expect(jeune()!.price).toBe(390)
  })
})

describe('acceptsSpecies', () => {
  const s = emptyState({
    enclosures: [enclosure(1, 'mouton'), enclosure(2, null), enclosure(3, 'cochon', 4, 4)],
    animals: [animal(10, 'mouton', 'F', 1), animal(11, 'cochon', 'F', 3)],
  })
  it('accepte un enclos vide du bon biome', () => expect(acceptsSpecies(s, s.enclosures[1], 'cochon')).toBeNull())
  it('refuse une autre espèce', () => expect(acceptsSpecies(s, s.enclosures[0], 'cochon')).toBe('Cet enclos accueille déjà une autre espèce.'))
  it('refuse un autre biome', () => {
    expect(acceptsSpecies(s, s.enclosures[1], 'renard')).toBe('Il faut un enclos de forêt.')
    expect(acceptsSpecies(s, s.enclosures[1], 'loup')).toBe('Il faut un enclos de montagne.')
  })
  it('refuse un enclos plein (capacité de la nouvelle espèce)', () => {
    expect(acceptsSpecies(s, s.enclosures[2], 'cochon')).toBe('Cet enclos est plein.')
  })
})

describe('achat', () => {
  const base = (): GameState => {
    const s = emptyState({ enclosures: [enclosure(1, 'mouton'), enclosure(2, null)], animals: [animal(10, 'mouton', 'F', 1)] })
    s.merchant.offers = [
      { id: 50, species: 'cochon', sex: 'F', stage: 'adulte', price: 150 },
      { id: 51, species: 'cochon', sex: 'M', stage: 'jeune', price: 98 },
    ]
    return s
  }
  it('un cochon dans un enclos vide : -150, espèce fixée, animal adulte nourri', () => {
    const s = ok(buyAnimal(base(), 50, 2))
    expect(s.coins).toBe(850)
    expect(s.enclosures[1].species).toBe('cochon')
    expect(s.merchant.offers.map((o) => o.id)).toEqual([51])
    const a = s.animals.find((x) => x.species === 'cochon')!
    expect(a.enclosureId).toBe(2)
    expect(a.sex).toBe('F')
    expect(ageStage(a, s.time)).toBe('adulte')
    expect(a.lastFedAt).toBe(s.time)
    expect(a.bornAt).toBe(s.time - 2 * SPECIES.cochon.gestationH * HOUR_MS)
  })
  it('un jeune naît il y a 1,5 gestation', () => {
    const s = ok(buyAnimal(base(), 51, 2))
    const a = s.animals.find((x) => x.species === 'cochon')!
    expect(ageStage(a, s.time)).toBe('jeune')
  })
  it("refuse dans l'enclos des moutons", () => {
    expect(buyAnimal(base(), 50, 1)).toEqual({ ok: false, reason: 'Cet enclos accueille déjà une autre espèce.' })
  })
  it('refuse sans assez de pièces ou offre inconnue', () => {
    expect(buyAnimal({ ...base(), coins: 100 }, 50, 2)).toEqual({ ok: false, reason: 'Pas assez de pièces (il en faut 150).' })
    expect(buyAnimal(base(), 999, 2).ok).toBe(false)
    expect(buyAnimal(base(), 50, 999).ok).toBe(false)
  })
  it('passe par applyAction', () => {
    expect(applyAction(base(), { type: 'acheterAnimal', offerId: 50, encId: 2 }).ok).toBe(true)
  })
})

describe('revente', () => {
  const s = emptyState({
    enclosures: [enclosure(1, 'mouton')],
    animals: [
      animal(10, 'mouton', 'F', 1),
      animal(11, 'mouton', 'M', 1, { bornAt: T0 - 1.5 * 2 * HOUR_MS }),
      animal(12, 'mouton', 'F', 1, { bornAt: T0 }),
      animal(13, 'mouton', 'F', 1, { health: { status: 'malade', since: T0 } }),
    ],
  })
  it('prix : adulte 72, jeune 48, bébé aucun', () => {
    expect(sellPrice(s, s.animals[0])).toBe(72)
    expect(sellPrice(s, s.animals[1])).toBe(48)
    expect(sellPrice(s, s.animals[2])).toBeNull()
  })
  it('vend un adulte (+72) et un jeune (+48)', () => {
    const r = sellAnimal(s, 10)
    expect(r.ok && r.state.coins).toBe(1072)
    expect(r.ok && r.state.animals.some((a) => a.id === 10)).toBe(false)
    const j = sellAnimal(s, 11)
    expect(j.ok && j.state.coins).toBe(1048)
  })
  it('refuse un bébé et un malade', () => {
    expect(sellAnimal(s, 12)).toEqual({ ok: false, reason: 'Un bébé ne peut pas être vendu.' })
    expect(sellAnimal(s, 13)).toEqual({ ok: false, reason: 'Soigne-le avant de le vendre.' })
    expect(sellAnimal(s, 999).ok).toBe(false)
  })
  it("un enclos vidé accepte de nouveau n'importe quelle espèce du biome", () => {
    let st = emptyState({ enclosures: [enclosure(1, 'mouton')], animals: [animal(10, 'mouton', 'F', 1), animal(11, 'mouton', 'M', 1)] })
    st.merchant.offers = [{ id: 50, species: 'cochon', sex: 'F', stage: 'adulte', price: 150 }]
    st = ok(sellAnimal(st, 10)); st = ok(sellAnimal(st, 11))
    st = ok(buyAnimal(st, 50, 1))
    expect(st.enclosures[0].species).toBe('cochon')
  })
  it('passe par applyAction', () => {
    expect(applyAction(s, { type: 'vendre', animalId: 10 }).ok).toBe(true)
  })
})

describe('intégration', () => {
  it('step() renouvelle le stock de la partie', () => {
    const g = newGame(3, 1e12)
    const r = advanceTo(g, g.time + 6 * HOUR_MS)
    expect(r.state.merchant.restocks).toBe(2)
  })
})

describe('buyRations : quantité', () => {
  it('refuse une quantité non entière ou nulle', () => {
    const s = emptyState()
    for (const n of [0, -3, 1.5, NaN]) expect(buyRations(s, 'fourrage', n)).toEqual({ ok: false, reason: 'Quantité invalide.' })
  })
})

describe('relecture : enclos vidé par la vente', () => {
  it("l'enclos redevient sans espèce quand le dernier animal part", () => {
    const s = emptyState({ enclosures: [enclosure(1, 'mouton')], animals: [animal(2, 'mouton', 'F', 1), animal(3, 'mouton', 'M', 1)] })
    const un = ok(sellAnimal(s, 2))
    expect(un.enclosures[0].species).toBe('mouton')
    expect(ok(sellAnimal(un, 3)).enclosures[0].species).toBeNull()
  })
})

describe('bon de réduction', () => {
  const withCoupon = (coins = 1000): GameState => {
    const s = emptyState({ coins, enclosures: [enclosure(2, null)] })
    s.merchant.offers = [{ id: 50, species: 'cochon', sex: 'F', stage: 'adulte', price: 150 }]
    s.missions.daily.coupons = 1
    return s
  }
  it('sans demander le bon : prix plein, bon conservé', () => {
    const s = ok(buyAnimal(withCoupon(), 50, 2))
    expect(s.coins).toBe(850)
    expect(s.missions.daily.coupons).toBe(1)
  })
  it('avec useCoupon et 0 bon : refus', () => {
    const s = withCoupon(); s.missions.daily.coupons = 0
    expect(buyAnimal(s, 50, 2, true)).toEqual({ ok: false, reason: "Tu n'as pas de bon de réduction." })
  })
  it('un cochon à 150 avec le bon choisi : -113 pièces, bon consommé', () => {
    const s = ok(buyAnimal(withCoupon(), 50, 2, true))
    expect(s.coins).toBe(1000 - 113)
    expect(s.missions.daily.coupons).toBe(0)
  })
  it('offerPriceFor donne le prix réel', () => {
    const s = withCoupon()
    expect(offerPriceFor(s, s.merchant.offers[0])).toBe(150)
    expect(offerPriceFor(s, s.merchant.offers[0], true)).toBe(113)
    s.missions.daily.coupons = 0
    expect(offerPriceFor(s, s.merchant.offers[0], true)).toBe(150)
  })
  it('le refus tient compte du prix réduit', () => {
    expect(buyAnimal(withCoupon(112), 50, 2, true)).toEqual({ ok: false, reason: 'Pas assez de pièces (il en faut 113).' })
    expect(buyAnimal(withCoupon(113), 50, 2, true).ok).toBe(true)
  })
  it('sans bon, le prix est plein', () => {
    const s = withCoupon(); s.missions.daily.coupons = 0
    expect(ok(buyAnimal(s, 50, 2)).coins).toBe(850)
  })
})
