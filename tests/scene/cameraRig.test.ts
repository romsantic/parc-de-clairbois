import { describe, it, expect } from 'vitest'
import { clampOrbit, quarterTurn, CAMERA_LIMITS } from '../../src/scene/cameraRig'

describe('clampOrbit', () => {
  it('ne passe jamais sous le sol ni au zénith', () => {
    expect(clampOrbit({ azimuth: 0, polar: 2, distance: 30 }).polar).toBe(CAMERA_LIMITS.maxPolar)
    expect(clampOrbit({ azimuth: 0, polar: 0, distance: 30 }).polar).toBe(CAMERA_LIMITS.minPolar)
  })
  it('borne le zoom', () => {
    expect(clampOrbit({ azimuth: 0, polar: 1, distance: 5 }).distance).toBe(12)
    expect(clampOrbit({ azimuth: 0, polar: 1, distance: 99 }).distance).toBe(60)
  })
  it("ne touche pas à l'azimut", () => {
    expect(clampOrbit({ azimuth: 7.5, polar: 1, distance: 30 }).azimuth).toBe(7.5)
  })
})

describe('quarterTurn', () => {
  it('va au quart de tour suivant', () => {
    expect(quarterTurn(0, 1)).toBeCloseTo(Math.PI / 2)
    expect(quarterTurn(0.3, 1)).toBeCloseTo(Math.PI / 2)
    expect(quarterTurn(0.3, -1)).toBeCloseTo(0)
  })
  it('depuis un quart exact, passe au suivant dans les deux sens', () => {
    expect(quarterTurn(Math.PI / 2, -1)).toBeCloseTo(0)
    expect(quarterTurn(-Math.PI / 2, -1)).toBeCloseTo(-Math.PI)
  })
})
