import { describe, it, expect } from 'vitest'
import { clampOrbit, quarterTurn, clampFocus, focusEase, CAMERA_LIMITS } from '../../src/scene/cameraRig'
import { MAP } from '../../src/scene/world'

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

describe('focusOn : point visé et progression', () => {
  it('garde un point à l’intérieur de la carte tel quel', () => {
    expect(clampFocus(3, -4)).toEqual({ x: 3, z: -4 })
  })
  it('ramène un point hors carte aux bornes de la caméra', () => {
    expect(clampFocus(999, -999)).toEqual({ x: MAP.halfX, z: -MAP.halfZ })
  })
  it('la glissade part de 0, finit à 1 et ralentit à l’arrivée', () => {
    expect(focusEase(0)).toBe(0)
    expect(focusEase(1)).toBe(1)
    expect(focusEase(0.5)).toBeGreaterThan(0.5)
    expect(focusEase(2)).toBe(1)
  })
})
