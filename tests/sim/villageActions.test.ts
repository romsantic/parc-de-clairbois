import { describe, expect, it } from 'vitest'
import { emptyState, storyAt } from './helpers'
import {
  applyAction, buildBuilding, buyRations, rationCost, levelUp, setTicketPrice, upgradeBuilding, upgradePantry,
} from '../../src/sim/actions'
import type { ActionResult } from '../../src/sim/actions'
import type { GameState } from '../../src/sim/types'
import { clientsForNewcomers, slotCanBuild } from '../../src/sim/village'
import { newGame } from '../../src/sim/newGame'
import { saveGame, loadGame } from '../../src/save/save'

const ok = (r: ActionResult): GameState => {
  if (!r.ok) throw new Error(r.reason)
  return r.state
}
const withCafe = (level: 1 | 2 | 3 = 1) =>
  emptyState({ coins: 5000, buildings: [{ slot: 0, type: 'ferme', level: 1 }, { slot: 1, type: 'cafe', level }] })

describe('buildBuilding : maison du personnel', () => {
  it('refuse un café sur son emplacement réservé', () => {
    expect(buildBuilding(emptyState({ coins: 5000 }), 6, 'cafe')).toEqual({ ok: false, reason: 'Cet emplacement est réservé à la maison du personnel.' })
  })
  it('refuse la maison ailleurs', () => {
    expect(buildBuilding(emptyState({ coins: 5000 }), 1, 'personnel')).toEqual({ ok: false, reason: 'La maison du personnel se construit sur son emplacement, au fond du village.' })
  })
  it("construit la maison sur l'emplacement 6 au Hameau : -400 pièces", () => {
    const s = ok(buildBuilding(emptyState({ coins: 1000 }), 6, 'personnel'))
    expect(s.coins).toBe(600)
    expect(s.buildings.find((b) => b.slot === 6)).toEqual({ slot: 6, type: 'personnel', level: 1 })
  })
  it('les emplacements du Bourg restent « Bientôt »', () => {
    expect(buildBuilding(emptyState({ coins: 5000 }), 4, 'cafe')).toEqual({ ok: false, reason: 'Cet emplacement se débloque au niveau 3 du village.' })
    const b = emptyState({ coins: 5000 }); b.village.level = 3
    expect(buildBuilding(b, 4, 'cafe')).toEqual({ ok: false, reason: 'De nouveaux bâtiments arriveront bientôt ici.' })
  })
  it('slotCanBuild respecte only', () => {
    const s = emptyState({ coins: 5000, buildings: [{ slot: 0, type: 'ferme', level: 1 }] })
    expect(slotCanBuild(s, 6)).toBe(true)
    expect(slotCanBuild(s, 1)).toBe(true)
    s.buildings.push({ slot: 1, type: 'cafe', level: 1 })
    expect(slotCanBuild(s, 6)).toBe(true)
    expect(slotCanBuild(s, 2)).toBe(false) // au Hameau, rien d'autre à bâtir : le niveau 2 est verrouillé de toute façon
    s.buildings.push({ slot: 6, type: 'personnel', level: 1 })
    expect(slotCanBuild(s, 6)).toBe(false)
  })
  it('une sauvegarde avec des bâtiments sur 0–5, ou sur 6, reste valide', () => {
    const load = (buildings: GameState['buildings']) => {
      const g = newGame(1, 1_800_000_000_000); g.buildings = buildings
      const data: Record<string, string> = {}
      const m = { getItem: (k: string) => data[k] ?? null, setItem: (k: string, v: string) => { data[k] = v } }
      saveGame(m, g, 1)
      return loadGame(m).kind
    }
    expect(load([{ slot: 0, type: 'ferme', level: 1 }, { slot: 5, type: 'cafe', level: 1 }])).toBe('ok')
    expect(load([{ slot: 0, type: 'ferme', level: 1 }, { slot: 6, type: 'personnel', level: 2 }])).toBe('ok')
  })
})

describe('buildBuilding', () => {
  it('construit un café au slot 1 : -300 pièces, niveau 1', () => {
    const s = ok(buildBuilding(emptyState({ coins: 1000 }), 1, 'cafe'))
    expect(s.coins).toBe(700)
    expect(s.buildings.find((b) => b.slot === 1)).toEqual({ slot: 1, type: 'cafe', level: 1 })
  })
  it('refuse un emplacement pris', () => {
    expect(buildBuilding(emptyState(), 0, 'cafe')).toEqual({ ok: false, reason: 'Cet emplacement est déjà pris.' })
  })
  it('refuse un emplacement verrouillé', () => {
    expect(buildBuilding(emptyState(), 2, 'cafe')).toEqual({ ok: false, reason: 'Cet emplacement se débloque au niveau 2 du village.' })
  })
  it('refuse un bâtiment verrouillé', () => {
    expect(buildBuilding(emptyState({ coins: 5000 }), 1, 'boutique')).toEqual({ ok: false, reason: 'Ce bâtiment se débloque au niveau 2 du village.' })
  })
  it('refuse un deuxième café', () => {
    const s = withCafe()
    s.village.level = 2
    expect(buildBuilding(s, 2, 'cafe')).toEqual({ ok: false, reason: 'Clairbois a déjà un café.' })
  })
  it('ne construit jamais la ferme', () => {
    expect(buildBuilding(emptyState(), 1, 'ferme')).toEqual({ ok: false, reason: 'Clairbois a déjà une ferme.' })
    expect(buildBuilding(emptyState({ buildings: [] }), 1, 'ferme')).toEqual({ ok: false, reason: 'La ferme ne se construit pas.' })
  })
  it('refuse sans assez de pièces ou pour un emplacement inconnu', () => {
    expect(buildBuilding(emptyState({ coins: 100 }), 1, 'cafe')).toEqual({ ok: false, reason: 'Pas assez de pièces (il en faut 300).' })
    expect(buildBuilding(emptyState(), 99, 'cafe').ok).toBe(false)
  })
})

describe('levelUp', () => {
  it('passe au niveau 2 à 40 habitants', () => {
    const r = levelUp(emptyState({ village: { level: 1, clientsServed: clientsForNewcomers(25) }, missions: storyAt(4) }))
    expect(r.ok && r.state.village.level).toBe(2)
  })
  it('refuse à 30 habitants avec la raison de canLevelUp', () => {
    expect(levelUp(emptyState({ village: { level: 1, clientsServed: clientsForNewcomers(15) } })))
      .toEqual({ ok: false, reason: 'Il faut 40 habitants (encore 10).' })
  })
})

describe('upgradeBuilding', () => {
  it('améliore le café : -600, niveau 2', () => {
    const s = ok(upgradeBuilding(withCafe(), 1))
    expect(s.coins).toBe(4400)
    expect(s.buildings.find((b) => b.slot === 1)!.level).toBe(2)
  })
  it('refuse au niveau 3, sans pièces, sans bâtiment', () => {
    expect(upgradeBuilding(withCafe(3), 1)).toEqual({ ok: false, reason: 'Ce bâtiment est déjà au niveau maximum.' })
    expect(upgradeBuilding({ ...withCafe(), coins: 10 }, 1)).toEqual({ ok: false, reason: 'Pas assez de pièces (il en faut 600).' })
    expect(upgradeBuilding(withCafe(), 4).ok).toBe(false)
  })
})

describe('buyRations', () => {
  const farm = (level: 1 | 2 | 3) =>
    emptyState({ coins: 1000, buildings: [{ slot: 0, type: 'ferme', level }], pantry: { fourrage: 0, viande: 0, capacity: 200 } })
  it('10 fourrage : 20 / 16 / 13 pièces selon la ferme', () => {
    expect(ok(buyRations(farm(1), 'fourrage', 10)).coins).toBe(980)
    expect(ok(buyRations(farm(2), 'fourrage', 10)).coins).toBe(984)
    expect(ok(buyRations(farm(3), 'fourrage', 10)).coins).toBe(987)
    expect(ok(buyRations(farm(1), 'fourrage', 10)).pantry.fourrage).toBe(10)
  })
  it('refuse sans ferme', () => {
    expect(buyRations(emptyState({ buildings: [] }), 'fourrage', 10))
      .toEqual({ ok: false, reason: 'Il faut une ferme pour acheter des rations.' })
  })
  it('refuse sans place, sans achat partiel', () => {
    const s = farm(1)
    s.pantry.fourrage = 195
    expect(buyRations(s, 'fourrage', 10)).toEqual({ ok: false, reason: "Il n'y a de la place que pour 5 rations." })
    s.pantry.fourrage = 200
    expect(buyRations(s, 'fourrage', 10)).toEqual({ ok: false, reason: 'Le garde-manger est plein.' })
  })
  it('refuse sans pièces', () => {
    expect(buyRations({ ...farm(1), coins: 5 }, 'viande', 10)).toEqual({ ok: false, reason: 'Pas assez de pièces (il en faut 40).' })
  })
})

describe('upgradePantry', () => {
  const pantry = (capacity: number, level: 1 | 2 | 3 = 1) =>
    emptyState({ coins: 5000, village: { level, clientsServed: 0 }, pantry: { fourrage: 0, viande: 0, capacity } })
  it('200 → 400 pour 600 pièces', () => {
    const s = ok(upgradePantry(pantry(200)))
    expect(s.pantry.capacity).toBe(400)
    expect(s.coins).toBe(4400)
  })
  it('400 → 800 refusé au niveau 1, accepté au niveau 3 (2 000 pièces)', () => {
    expect(upgradePantry(pantry(400))).toEqual({ ok: false, reason: 'Le grand garde-manger se débloque au niveau 3 du village.' })
    const s = ok(upgradePantry(pantry(400, 3)))
    expect(s.pantry.capacity).toBe(800)
    expect(s.coins).toBe(3000)
  })
  it('refuse au plus grand et sans pièces', () => {
    expect(upgradePantry(pantry(800, 3))).toEqual({ ok: false, reason: 'Le garde-manger est déjà au plus grand.' })
    expect(upgradePantry({ ...pantry(200), coins: 100 })).toEqual({ ok: false, reason: 'Pas assez de pièces (il en faut 600).' })
  })
})

describe('setTicketPrice', () => {
  it('accepte de 0 à 3 × prix juste (sans animal : 2, donc 6), entier seulement', () => {
    expect(ok(setTicketPrice(emptyState(), 5)).ticketPrice).toBe(5)
    expect(ok(setTicketPrice(emptyState(), 0)).ticketPrice).toBe(0)
    expect(setTicketPrice(emptyState(), 7)).toEqual({ ok: false, reason: 'Le prix doit être entre 0 et 6 pièces.' })
    expect(setTicketPrice(emptyState(), -1).ok).toBe(false)
    expect(setTicketPrice(emptyState(), 2.5).ok).toBe(false)
  })
})

describe('applyAction (village)', () => {
  const small = () => emptyState({ pantry: { fourrage: 0, viande: 0, capacity: 200 } })
  it('aiguille chaque nouveau type', () => {
    expect(applyAction(emptyState(), { type: 'batir', slot: 1, building: 'cafe' }).ok).toBe(true)
    expect(applyAction(withCafe(), { type: 'ameliorer', slot: 1 }).ok).toBe(true)
    expect(applyAction(small(), { type: 'acheterRations', food: 'fourrage', n: 10 }).ok).toBe(true)
    expect(applyAction(small(), { type: 'agrandirGardeManger' }).ok).toBe(true)
    expect(applyAction(emptyState(), { type: 'billet', price: 3 }).ok).toBe(true)
    expect(applyAction(emptyState({ village: { level: 1, clientsServed: 1200 }, missions: storyAt(4) }), { type: 'monterNiveau' }).ok).toBe(true)
  })
})

describe('rationCost', () => {
  const farm = (level: 1 | 2 | 3) => emptyState({ buildings: [{ slot: 0, type: 'ferme', level }] })
  it('prix affiché = prix payé, remise selon la ferme', () => {
    expect(rationCost(farm(1), 'fourrage', 10)).toBe(20)
    expect(rationCost(farm(2), 'fourrage', 10)).toBe(16)
    expect(rationCost(farm(3), 'viande', 50)).toBe(130)
  })
})

describe('relecture : Bourg et marchand', () => {
  it('refuse tout bâtiment sur un emplacement du Bourg (V1)', () => {
    const s = emptyState({ coins: 9999, village: { level: 3, clientsServed: 0 } })
    for (const slot of [4, 5]) {
      const r = buildBuilding(s, slot, 'cafe')
      expect(r).toEqual({ ok: false, reason: 'De nouveaux bâtiments arriveront bientôt ici.' })
    }
  })
  it('le passage de niveau renouvelle aussitôt le stock du marchand', () => {
    const before = levelUp(emptyState({ village: { level: 1, clientsServed: 30 * 40 }, missions: storyAt(4) }))
    expect(before.ok).toBe(true)
    if (!before.ok) return
    expect(before.state.merchant.restocks).toBe(1)
    expect(before.state.merchant.offers).toHaveLength(3 + 2)
    expect(before.state.merchant.restockAt).toBeGreaterThan(before.state.time)
  })
})
