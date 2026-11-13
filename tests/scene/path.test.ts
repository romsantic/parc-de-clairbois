import { describe, it, expect } from 'vitest'
import { ribbonEdges } from '../../src/scene/path'

describe('ribbonEdges', () => {
  it('écarte les bords de la demi-largeur, perpendiculairement au tracé', () => {
    const e = ribbonEdges([{ x: 0, z: 0 }, { x: 10, z: 0 }], 1)
    expect(e).toHaveLength(2)
    expect(e[0].left.x).toBeCloseTo(0); expect(Math.abs(e[0].left.z)).toBeCloseTo(1)
    expect(e[0].right.z).toBeCloseTo(-e[0].left.z)
  })
  it('suit les virages (bord perpendiculaire à la tangente locale)', () => {
    const e = ribbonEdges([{ x: 0, z: 0 }, { x: 0, z: 5 }, { x: 0, z: 10 }], 2)
    expect(Math.abs(e[1].left.x)).toBeCloseTo(2)
    expect(e[1].left.z).toBeCloseTo(5)
  })
  it('refuse un tracé de moins de deux points', () => {
    expect(ribbonEdges([{ x: 0, z: 0 }], 1)).toEqual([])
  })
})
