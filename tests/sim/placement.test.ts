import { describe, it, expect } from 'vitest'
import { checkPlacement, enclosureCost, resizeCost, snapRect, zoneAt, zoneAtPoint } from '../../src/sim/placement'
import { ZONES } from '../../src/data/zones'
import { emptyState, enclosure } from './helpers'

const R = (x: number, z: number, w: number, d: number) => ({ x, z, w, d })

describe('prix des enclos', () => {
  it('4 pièces par mètre de clôture + 1 par m²', () => {
    expect(enclosureCost(R(0, 0, 12, 10))).toBe(296)
  })
  it('agrandir coûte la différence, rétrécir ne coûte rien', () => {
    expect(resizeCost(R(0, 0, 12, 10), R(0, 0, 14, 10))).toBe(36) // 332 − 296
    expect(resizeCost(R(0, 0, 14, 10), R(0, 0, 12, 10))).toBe(0)
  })
})

describe('snapRect', () => {
  it('arrondit coins et côtés au demi-mètre', () => {
    expect(snapRect(R(1.26, 0, 6.2, 7.74))).toEqual(R(1.5, 0, 6, 7.5))
  })
})

describe('checkPlacement', () => {
  const free = emptyState()
  const withStart = emptyState({ enclosures: [enclosure(1, 'mouton', 12, 10, { rect: R(-26, -5, 12, 10) })] })

  it('accepte un enclos libre dans la prairie', () => {
    const r = checkPlacement(free, R(-20, -6, 12, 10))
    expect(r.ok && r.zone.id).toBe('prairie')
  })
  it('refuse un côté de moins de 6 m', () => {
    expect(checkPlacement(free, R(-20, -6, 5, 10))).toEqual({ ok: false, reason: 'Un côté doit faire au moins 6 m.' })
  })
  it('refuse un enclos à cheval sur deux zones', () => {
    expect(checkPlacement(free, R(-20, -12, 10, 8))).toEqual({ ok: false, reason: "L'enclos doit rester dans une zone." })
  })
  it('refuse une zone pas encore débloquée', () => {
    expect(checkPlacement(free, R(-20, -20, 10, 8))).toEqual({ ok: false, reason: 'Cette zone se débloque au niveau 2 du village.' })
    expect(checkPlacement(free, R(-20, 14, 10, 8))).toEqual({ ok: false, reason: 'Cette zone se débloque au niveau 3 du village.' })
  })
  it('refuse de chevaucher un autre enclos, sauf lui-même', () => {
    expect(checkPlacement(withStart, R(-20, -6, 12, 10))).toEqual({ ok: false, reason: 'Il chevauche un autre enclos.' })
    expect(checkPlacement(withStart, R(-26, -5, 14, 10), 1).ok).toBe(true)
  })
  it('accepte deux enclos qui se touchent sans se chevaucher', () => {
    expect(checkPlacement(withStart, R(-14, -5, 8, 8)).ok).toBe(true)
  })
  it('refuse de chevaucher un chemin', () => {
    expect(checkPlacement(free, R(-20, 2, 10, 7.5))).toEqual({ ok: false, reason: 'Il chevauche un chemin.' })
  })
})

describe('zoneAtPoint', () => {
  it('les zones se touchent : pas de trou entre la forêt et la prairie', () => {
    expect(zoneAtPoint(-10, -8.5)?.id).toBeDefined()
  })
  it("un clic sur l'allée ou juste au bord trouve la zone la plus proche", () => {
    expect(zoneAtPoint(-20, 10.5)?.id).toBe('prairie')
    expect(zoneAtPoint(-3, 0)?.id).toBe('prairie') // 1 m à l'est de la prairie
  })
  it('loin de toute zone : rien', () => {
    expect(zoneAtPoint(10, 0)).toBeNull()
  })
})

describe('checkPlacement selon le niveau du village', () => {
  const inForest = R(-30, -20, 12, 10)
  it("refuse la forêt au niveau 1 et l'accepte au niveau 2", () => {
    const zone = zoneAt(inForest)
    expect(zone?.id).toBe('foret')
    expect(checkPlacement(emptyState(), inForest).ok).toBe(false)
    expect(checkPlacement(emptyState({ village: { level: 2, clientsServed: 0 } }), inForest).ok).toBe(true)
  })
})

describe('zones', () => {
  it('la prairie se débloque au niveau 1, la forêt au 2, la montagne au 3', () => {
    expect(Object.fromEntries(ZONES.map((z) => [z.id, z.unlockLevel]))).toEqual({ foret: 2, prairie: 1, montagne: 3 })
  })
  it('zoneAt trouve la zone qui contient entièrement le rect', () => {
    expect(zoneAt(R(-20, -6, 6, 6))?.id).toBe('prairie')
    expect(zoneAt(R(-20, -12, 10, 8))).toBeNull()
  })
})

describe('allée parcourue par les promeneurs', () => {
  it("aucun enclos ne peut la traverser, ni à l'ouest des zones ni vers le pont", () => {
    for (const x of [-40, -34.5, -5, -3, 0])
      expect(checkPlacement(emptyState(), { x, z: 8.5, w: 6, d: 3 }).ok).toBe(false)
  })
})
