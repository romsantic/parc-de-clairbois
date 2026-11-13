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
  it('tourne toujours d’exactement un quart de tour, même depuis la vue de départ en biais', () => {
    expect(quarterTurn(Math.PI / 4, 1)).toBeCloseTo((3 * Math.PI) / 4)
    expect(quarterTurn(Math.PI / 4, -1)).toBeCloseTo(-Math.PI / 4)
  })
  it('se recale sur la grille des vues en biais si la caméra a été tournée à la main', () => {
    expect(quarterTurn(0.9, 1)).toBeCloseTo((3 * Math.PI) / 4)
    expect(quarterTurn(0.9, -1)).toBeCloseTo(Math.PI / 4)
  })
})
