import { describe, it, expect } from 'vitest'
import { emptyState, enclosure, T0 } from './helpers'
import { START_PATH } from '../../src/data/paths'
import { isLinked, reachableIds, segmentsTouch, rectSegmentDistance, segmentAt } from '../../src/sim/paths'
import { newGame } from '../../src/sim/newGame'

const seg = (id: number, ax: number, az: number, bx: number, bz: number) => ({ id, a: { x: ax, z: az }, b: { x: bx, z: bz } })

describe('liaison des enclos par les chemins', () => {
  it("enclos le long de l'allée relié", () => {
    const e = enclosure(1, 'mouton'); e.rect = { x: -30, z: 0, w: 8, d: 8.5 }
    expect(isLinked(emptyState({ enclosures: [e] }), 1)).toBe(true)
  })
  it('enclos loin de tout chemin non relié ; relié avec le chemin de départ', () => {
    const e = enclosure(1, 'mouton'); e.rect = { x: -26, z: -5, w: 12, d: 10 }
    expect(isLinked(emptyState({ enclosures: [e] }), 1)).toBe(false)
    expect(isLinked(emptyState({ enclosures: [e], paths: [{ id: 2, ...START_PATH }] }), 1)).toBe(true)
  })
  it('départ en milieu de segment', () => {
    const e = enclosure(1, 'mouton'); e.rect = { x: -36, z: 0, w: 6, d: 8 }
    const s = emptyState({ enclosures: [e], paths: [seg(2, -20, 10, -20, 0), seg(3, -20, 4, -28, 4)] })
    expect(reachableIds(s).has(3)).toBe(true)
    expect(isLinked(s, 1)).toBe(true)
  })
  it('croisement sans bout commun', () => {
    const s = emptyState({ paths: [seg(2, -20, 10, -20, -2), seg(3, -26, 2, -14, 2)] })
    expect(reachableIds(s).has(3)).toBe(true)
  })
  it("segment isolé : non atteignable, ne relie pas son enclos", () => {
    const e = enclosure(1, 'mouton'); e.rect = { x: -30, z: -20, w: 6, d: 6 }
    const s = emptyState({ enclosures: [e], paths: [seg(2, -27, -10, -27, -14)] })
    expect(reachableIds(s).has(2)).toBe(false)
    expect(isLinked(s, 1)).toBe(false)
  })
  it('cache à jour après modification sur place', () => {
    const e = enclosure(1, 'mouton'); e.rect = { x: -30, z: 0, w: 8, d: 8.5 }
    const s = emptyState({ enclosures: [e] })
    expect(isLinked(s, 1)).toBe(true)
    s.enclosures[0].rect.x -= 10
    s.enclosures[0].rect.z -= 20
    expect(isLinked(s, 1)).toBe(false)
  })
  it('géométrie : segments et rectangles', () => {
    expect(segmentsTouch(seg(1, 0, 0, 0, 5), seg(2, 0, 5.02, 4, 5.02))).toBe(true)
    expect(segmentsTouch(seg(1, 0, 0, 0, 5), seg(2, 1, 0, 1, 5))).toBe(false)
    expect(rectSegmentDistance({ x: 0, z: 0, w: 4, d: 4 }, seg(1, -2, 2, 6, 2))).toBe(0)
    expect(rectSegmentDistance({ x: 0, z: 0, w: 4, d: 4 }, seg(1, 7, 0, 7, 4))).toBeCloseTo(3)
  })
  it('segmentAt trouve le chemin le plus proche', () => {
    const s = emptyState({ paths: [seg(2, -20, 10, -20, 0)] })
    expect(segmentAt(s, -19.5, 5, 1)).toBe(2)
    expect(segmentAt(s, -10, 0, 1)).toBeNull()
    expect(segmentAt(s, -30, 10.3, 1)).toBe(-1)
  })
  it('nouvelle partie : v4, un segment de départ, enclos des moutons relié', () => {
    const g = newGame(1, T0)
    expect(g.version).toBe(4)
    expect(g.paths).toHaveLength(1)
    expect(g.paths[0]).toMatchObject(START_PATH)
    expect(isLinked(g, g.enclosures[0].id)).toBe(true)
  })
})
