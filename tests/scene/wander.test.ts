import { describe, it, expect } from 'vitest'
import { pickWanderTarget, stepToward } from '../../src/scene/wander'
import { createRng } from '../../src/core/rng'

const b = { minX: -5, maxX: 5, minZ: -3, maxZ: 3 }

describe('pickWanderTarget', () => {
  it("reste dans l'enclos, avec la marge", () => {
    const r = createRng(1)
    for (let i = 0; i < 1000; i++) {
      const t = pickWanderTarget(b, r, 0.5)
      expect(t.x).toBeGreaterThanOrEqual(-4.5)
      expect(t.x).toBeLessThanOrEqual(4.5)
      expect(t.z).toBeGreaterThanOrEqual(-2.5)
      expect(t.z).toBeLessThanOrEqual(2.5)
    }
  })
})

describe('stepToward', () => {
  it('avance de speed × dt sans dépasser la cible', () => {
    expect(stepToward({ x: 0, z: 0 }, { x: 10, z: 0 }, 2, 1)).toEqual({ x: 2, z: 0, arrived: false })
    expect(stepToward({ x: 0, z: 0 }, { x: 1, z: 0 }, 2, 1)).toEqual({ x: 1, z: 0, arrived: true })
  })
  it('déjà sur la cible : arrivé, sans bouger', () => {
    expect(stepToward({ x: 3, z: 3 }, { x: 3, z: 3 }, 2, 1)).toEqual({ x: 3, z: 3, arrived: true })
  })
})
