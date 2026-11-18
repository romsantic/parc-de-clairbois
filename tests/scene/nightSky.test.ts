import { describe, it, expect } from 'vitest'
import * as THREE from 'three'
import { moonDirection, skyDirection } from '../../src/scene/nightSky'
import { CAMERA_LIMITS } from '../../src/scene/cameraRig'
import { NIGHT } from '../../src/data/visuals'
import { START_AZIMUTH } from '../../src/scene/cameraRig'

function frustumAt(azimuth: number, polar: number, aspect: number): THREE.Frustum {
  const cam = new THREE.PerspectiveCamera(38, aspect, 0.5, 900)
  cam.position.setFromSpherical(new THREE.Spherical(50, polar, azimuth))
  cam.lookAt(0, 0, 0)
  cam.updateMatrixWorld(true)
  return new THREE.Frustum().setFromProjectionMatrix(new THREE.Matrix4().multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse))
}

describe('lune et étoiles', () => {
  it('la direction est unitaire', () => {
    const d = skyDirection(1.2, 10)
    expect(Math.hypot(...d)).toBeCloseTo(1)
  })
  it('la lune est dans le champ à l’inclinaison maximale, depuis la vue de départ (téléphone et ordinateur)', () => {
    for (const aspect of [16 / 9, 9 / 19]) {
      const f = frustumAt(START_AZIMUTH, CAMERA_LIMITS.maxPolar, aspect)
      const d = moonDirection(START_AZIMUTH) // le ciel suit la caméra : on le mesure depuis elle
      const cam = new THREE.Vector3().setFromSpherical(new THREE.Spherical(50, CAMERA_LIMITS.maxPolar, START_AZIMUTH))
      const p = cam.clone().add(new THREE.Vector3(...d).multiplyScalar(NIGHT.MOON_DISTANCE))
      expect(f.containsPoint(p)).toBe(true)
    }
  })
  it('une étoile à 5° dans le même cap est visible aussi', () => {
    const f = frustumAt(START_AZIMUTH, CAMERA_LIMITS.maxPolar, 16 / 9)
    const cam = new THREE.Vector3().setFromSpherical(new THREE.Spherical(50, CAMERA_LIMITS.maxPolar, START_AZIMUTH))
    const p = cam.add(new THREE.Vector3(...skyDirection(START_AZIMUTH + Math.PI, 5)).multiplyScalar(NIGHT.STAR_RADIUS))
    expect(f.containsPoint(p)).toBe(true)
  })
})

import { setNightGlow, windowMat, lanternMat } from '../../src/scene/materials'
describe('setNightGlow', () => {
  it('éteint le jour, allume la nuit', () => {
    setNightGlow(0)
    expect(windowMat.emissiveIntensity).toBe(0)
    expect(lanternMat.emissiveIntensity).toBeCloseTo(NIGHT.LANTERN_DAY)
    setNightGlow(1)
    expect(windowMat.emissiveIntensity).toBeCloseTo(NIGHT.WINDOW_GLOW)
    expect(lanternMat.emissiveIntensity).toBeCloseTo(NIGHT.LANTERN_GLOW)
  })
})
