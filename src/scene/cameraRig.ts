import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { MAP, type World } from './world'

export interface Orbit {
  azimuth: number
  /** Angle depuis la verticale : 0 = vue de dessus, π/2 = au ras du sol. */
  polar: number
  distance: number
}

export const CAMERA_LIMITS = { minDistance: 12, maxDistance: 60, minPolar: 0.35, maxPolar: 1.25 } as const

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))

export function clampOrbit(o: Orbit, limits: typeof CAMERA_LIMITS = CAMERA_LIMITS): Orbit {
  return {
    azimuth: o.azimuth,
    polar: clamp(o.polar, limits.minPolar, limits.maxPolar),
    distance: clamp(o.distance, limits.minDistance, limits.maxDistance),
  }
}

/**
 * Angle de la vue en biais suivante (dir = 1) ou précédente (dir = -1). Les vues en biais
 * sont à π/4 + k·π/2 (la vue de départ en fait partie) : depuis l'une d'elles, on tourne
 * d'exactement un quart de tour ; après une rotation à la main, on se recale sur la plus proche.
 */
export function quarterTurn(azimuth: number, dir: 1 | -1): number {
  const step = Math.PI / 2, base = Math.PI / 4, eps = 1e-6
  const k = (azimuth - base) / step
  const next = dir === 1 ? Math.floor(k + eps) + 1 : Math.ceil(k - eps) - 1
  return base + next * step
}

export interface CameraRig {
  rotateQuarter(dir: 1 | -1): void
  zoom(step: number): void
  update(dt: number): void
  /** Suspend la caméra (par exemple pendant qu’on tire un coin d’enclos). */
  setEnabled(on: boolean): void
}

export function createCameraRig(world: World, canvas: HTMLCanvasElement): CameraRig {
  const { camera } = world
  const controls = new OrbitControls(camera, canvas)
  controls.target.set(0, 0, 0)
  controls.minDistance = CAMERA_LIMITS.minDistance
  controls.maxDistance = CAMERA_LIMITS.maxDistance
  controls.minPolarAngle = CAMERA_LIMITS.minPolar
  controls.maxPolarAngle = CAMERA_LIMITS.maxPolar
  controls.enableDamping = true
  controls.dampingFactor = 0.08
  controls.screenSpacePanning = false
  controls.mouseButtons = { LEFT: THREE.MOUSE.ROTATE, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.PAN }
  controls.touches = { ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN }

  // Vue de départ : trois quarts, assez haute pour voir tout le domaine.
  const start = clampOrbit({ azimuth: Math.PI / 4, polar: 0.9, distance: 52 })
  camera.position.setFromSpherical(new THREE.Spherical(start.distance, start.polar, start.azimuth))
  controls.update()

  let turn: { from: number; to: number; t: number } | null = null
  const spherical = new THREE.Spherical()
  const offset = new THREE.Vector3()

  function setAzimuth(a: number) {
    offset.copy(camera.position).sub(controls.target)
    spherical.setFromVector3(offset)
    spherical.theta = a
    camera.position.copy(controls.target).add(offset.setFromSpherical(spherical))
  }

  return {
    setEnabled(on) { controls.enabled = on },
    rotateQuarter(dir) {
      const from = controls.getAzimuthalAngle()
      turn = { from, to: quarterTurn(from, dir), t: 0 }
    },
    zoom(step) {
      offset.copy(camera.position).sub(controls.target)
      const d = clamp(offset.length() * (step > 0 ? 0.8 : 1.25), CAMERA_LIMITS.minDistance, CAMERA_LIMITS.maxDistance)
      camera.position.copy(controls.target).add(offset.setLength(d))
    },
    update(dt) {
      if (turn) {
        turn.t = Math.min(1, turn.t + dt / 0.4)
        const e = 1 - (1 - turn.t) ** 3
        setAzimuth(turn.from + (turn.to - turn.from) * e)
        if (turn.t >= 1) turn = null
      }
      // On ne sort pas du domaine en déplaçant la vue.
      const t = controls.target
      const cx = clamp(t.x, -MAP.halfX, MAP.halfX) - t.x, cz = clamp(t.z, -MAP.halfZ, MAP.halfZ) - t.z
      if (cx || cz) { t.x += cx; t.z += cz; camera.position.x += cx; camera.position.z += cz }
      controls.update()
    },
  }
}
