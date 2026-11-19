import { describe, it, expect } from 'vitest'
import { staffRoute } from '../../src/scene/staffRoutes'
import { STAFF_WALKERS } from '../../src/data/visuals'
import { SLOTS } from '../../src/data/economy'
import { MAIRIE } from '../../src/data/village'
import type { Building, Employee, Enclosure } from '../../src/sim/types'
import { emptyState } from '../sim/helpers'

const enc = (id: number, x: number, z: number, w = 8, d = 6): Enclosure =>
  ({ id, biome: 'prairie', species: 'lion' as never, rect: { x, z, w, d }, cleanedAt: 0 })
const emp = (encIds: number[]): Employee => ({ id: 1, name: 'Léa', job: 'soigneur', xpH: 0, hiredAt: 0, encIds })
const house = SLOTS.find((s) => s.id === 6)!
const withHouse: { buildings: Building[] } = { buildings: [{ slot: 6, type: 'personnel', level: 1 }] }

describe('staffRoute', () => {
  it('boucle autour du premier enclos existant, à au moins 1 m à l\'extérieur de la clôture', () => {
    const e = enc(7, -30, 2.5)
    const s = emptyState({ enclosures: [e] })
    const r = staffRoute(s, emp([99, 7]))
    expect(r.length).toBeGreaterThanOrEqual(4)
    for (const p of r) {
      const dx = Math.max(e.rect.x - p.x, 0, p.x - (e.rect.x + e.rect.w))
      const dz = Math.max(e.rect.z - p.z, 0, p.z - (e.rect.z + e.rect.d))
      expect(Math.hypot(dx, dz)).toBeGreaterThanOrEqual(1)
    }
  })

  it('deux employés sur le même enclos partent de points différents', () => {
    const s = emptyState({ enclosures: [enc(7, -30, 2.5)] })
    const a = staffRoute(s, emp([7]), 0), b = staffRoute(s, emp([7]), 1)
    expect([a[0].x, a[0].z]).not.toEqual([b[0].x, b[0].z])
    expect([b[0].x, b[0].z]).toEqual([b[b.length - 1].x, b[b.length - 1].z])
  })

  it('a au moins un arrêt tourné vers le centre de l\'enclos', () => {
    const e = enc(7, -30, 2.5)
    const r = staffRoute(emptyState({ enclosures: [e] }), emp([7]))
    const stops = r.filter((p) => p.faceX !== undefined)
    expect(stops.length).toBeGreaterThan(0)
    for (const p of stops) { expect(p.faceX).toBeCloseTo(-26); expect(p.faceZ).toBeCloseTo(5.5); expect(p.always).toBe(true) }
  })

  it('sans enclos : petit tour à moins de 6 m de la maison du personnel', () => {
    const r = staffRoute(emptyState(withHouse), emp([]))
    expect(r.length).toBeGreaterThanOrEqual(3)
    for (const p of r) expect(Math.hypot(p.x - house.x, p.z - house.z)).toBeLessThan(6)
  })

  it('sans enclos ni maison : autour de la mairie', () => {
    const r = staffRoute(emptyState({ buildings: [] }), emp([]))
    for (const p of r) expect(Math.hypot(p.x - MAIRIE.x, p.z - MAIRIE.z)).toBeLessThan(6)
  })

  it('enclos supprimé : repli sur la maison', () => {
    const r = staffRoute(emptyState(withHouse), emp([7]))
    for (const p of r) expect(Math.hypot(p.x - house.x, p.z - house.z)).toBeLessThan(6)
  })

  it('le décalage vaut FENCE_GAP_M', () => {
    const e = enc(7, 0, 0, 10, 4)
    const r = staffRoute(emptyState({ enclosures: [e] }), emp([7]))
    expect(r[0].x).toBeCloseTo(-STAFF_WALKERS.FENCE_GAP_M)
  })
})
