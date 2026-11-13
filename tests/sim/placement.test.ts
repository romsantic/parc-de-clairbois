import { describe, it, expect } from 'vitest'
import { checkPlacement, enclosureCost, resizeCost, snapRect, zoneAt } from '../../src/sim/placement'
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

describe('zones', () => {
  it('la prairie se débloque au niveau 1, la forêt au 2, la montagne au 3', () => {
    expect(Object.fromEntries(ZONES.map((z) => [z.id, z.unlockLevel]))).toEqual({ foret: 2, prairie: 1, montagne: 3 })
  })
  it('zoneAt trouve la zone qui contient entièrement le rect', () => {
    expect(zoneAt(R(-20, -6, 6, 6))?.id).toBe('prairie')
    expect(zoneAt(R(-20, -12, 10, 8))).toBeNull()
  })
})
