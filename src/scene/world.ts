import * as THREE from 'three'
import { sunForHour } from './sun'
import { hourFromLocation } from './clock'
import type { LoadedModel } from './loadModels'
import type { ModelKey } from '../assets/manifest'

/** Taille du domaine (unités ≈ mètres). Le centre de la carte est (0, 0). */
export const MAP = { halfX: 34, halfZ: 24 }

export interface World {
  scene: THREE.Scene
  camera: THREE.PerspectiveCamera
  renderer: THREE.WebGLRenderer
  models: Map<ModelKey, LoadedModel>
  /** Hauteur du sol en (x, z), pour poser les objets dessus. */
  groundHeight(x: number, z: number): number
  /** Distance au centre de la rivière (pour ne rien planter dedans). */
  riverDistance(x: number, z: number): number
  setHour(hour: number): void
  update(dt: number): void
  resize(): void
}

/** Le terrain dépasse largement le domaine jouable : ses bords se perdent dans la brume. */
const GROUND = { halfX: 120, halfZ: 100 }

/**
 * Tracé de la rivière : du nord au sud, entre le zoo (ouest) et le village (est).
 * Elle part et sort au-delà des bords du terrain, pour ne jamais s'arrêter à l'écran.
 */
const RIVER = new THREE.CatmullRomCurve3([
  new THREE.Vector3(-6, 0, -GROUND.halfZ - 10),
  new THREE.Vector3(2, 0, -60),
  new THREE.Vector3(-2, 0, -35),
  new THREE.Vector3(1, 0, -12),
  new THREE.Vector3(5, 0, -3),
  new THREE.Vector3(2, 0, 7),
  new THREE.Vector3(6, 0, 16),
  new THREE.Vector3(2, 0, 38),
  new THREE.Vector3(9, 0, 65),
  new THREE.Vector3(4, 0, GROUND.halfZ + 10),
])
const RIVER_POINTS = RIVER.getSpacedPoints(500)
const RIVER_HALF_WIDTH = 2.2

export function riverDistance(x: number, z: number): number {
  let best = Infinity
  for (const p of RIVER_POINTS) best = Math.min(best, (p.x - x) ** 2 + (p.z - z) ** 2)
  return Math.sqrt(best)
}

/** Petites ondulations du terrain, creusées le long de la rivière. */
function groundHeight(x: number, z: number): number {
  return heightAt(x, z, riverDistance(x, z))
}

/** Même calcul, quand la distance à la rivière est déjà connue (évite de la recalculer). */
function heightAt(x: number, z: number, d: number): number {
  const hills = 0.35 * Math.sin(x * 0.21) * Math.cos(z * 0.17) + 0.2 * Math.sin(x * 0.53 + z * 0.41)
  const bed = d < RIVER_HALF_WIDTH + 2 ? -0.9 * (1 - d / (RIVER_HALF_WIDTH + 2)) ** 1.5 : 0
  const edgeFlatten = Math.min(1, d / (RIVER_HALF_WIDTH + 4))
  return hills * edgeFlatten + bed
}

function makeGround(): THREE.Mesh {
  const geo = new THREE.PlaneGeometry(GROUND.halfX * 2, GROUND.halfZ * 2, 180, 150)
  geo.rotateX(-Math.PI / 2)
  const pos = geo.attributes.position as THREE.BufferAttribute
  const colors: number[] = []
  const grass = new THREE.Color('#7db35a'), grassDark = new THREE.Color('#5f9a45')
  const sand = new THREE.Color('#d9c38d'), c = new THREE.Color()
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i)
    const d = riverDistance(x, z)
    pos.setY(i, heightAt(x, z, d))
    const n = 0.5 + 0.5 * Math.sin(x * 1.7 + z * 2.3) * Math.cos(x * 0.9 - z * 1.3)
    c.copy(grass).lerp(grassDark, n * 0.6)
    if (d < RIVER_HALF_WIDTH + 1.4) c.lerp(sand, Math.min(1, (RIVER_HALF_WIDTH + 1.4 - d) / 1.2))
    colors.push(c.r, c.g, c.b)
  }
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
  const ground = new THREE.Mesh(
    geo.toNonIndexed(),
    new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 1 }),
  )
  ground.geometry.computeVertexNormals()
  ground.receiveShadow = true
  return ground
}

function makeRiver(): { mesh: THREE.Mesh; update: (t: number) => void } {
  const segs = RIVER_POINTS.length - 1
  const geo = new THREE.BufferGeometry()
  const base: number[] = []
  for (let i = 0; i <= segs; i++) {
    const p = RIVER_POINTS[i], tan = RIVER.getTangentAt(i / segs)
    const nx = -tan.z, nz = tan.x
    for (const side of [-1, 1]) base.push(p.x + nx * RIVER_HALF_WIDTH * side, -0.32, p.z + nz * RIVER_HALF_WIDTH * side)
  }
  const idx: number[] = []
  for (let i = 0; i < segs; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2) }
  geo.setAttribute('position', new THREE.Float32BufferAttribute(base.slice(), 3))
  geo.setIndex(idx)
  geo.computeVertexNormals()
  const mesh = new THREE.Mesh(
    geo,
    new THREE.MeshStandardMaterial({ color: '#4c9fd6', roughness: 0.15, metalness: 0.1, transparent: true, opacity: 0.88, flatShading: true, side: THREE.DoubleSide }),
  )
  mesh.receiveShadow = true
  const pos = geo.attributes.position as THREE.BufferAttribute
  return {
    mesh,
    update(t) {
      for (let i = 0; i < pos.count; i++) {
        const x = base[i * 3], z = base[i * 3 + 2]
        pos.setY(i, -0.32 + 0.05 * Math.sin(t * 1.6 + z * 0.9 + x * 0.4))
      }
      pos.needsUpdate = true // les normales sont inutiles : le matériau est en flatShading
    },
  }
}

function makeSky(): { mesh: THREE.Mesh; set: (top: string, bottom: string) => void } {
  const uniforms = { top: { value: new THREE.Color() }, bottom: { value: new THREE.Color() } }
  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(400, 32, 16),
    new THREE.ShaderMaterial({
      uniforms,
      side: THREE.BackSide,
      depthWrite: false,
      vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
      fragmentShader: 'uniform vec3 top; uniform vec3 bottom; varying vec3 vP; void main(){ float t = smoothstep(-0.05, 0.6, vP.y); gl_FragColor = vec4(mix(bottom, top, t), 1.0); }',
    }),
  )
  return { mesh, set: (t, b) => { uniforms.top.value.set(t); uniforms.bottom.value.set(b) } }
}

export function createWorld(canvas: HTMLCanvasElement, models: Map<ModelKey, LoadedModel>): World {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio))
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFSoftShadowMap
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.05
  renderer.outputColorSpace = THREE.SRGBColorSpace

  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(38, 1, 0.5, 900)

  const sky = makeSky()
  scene.add(sky.mesh)
  scene.fog = new THREE.Fog('#d6ecf8', 60, 140)

  const hemi = new THREE.HemisphereLight('#dcefff', '#5d7a3c', 1)
  scene.add(hemi)
  const sun = new THREE.DirectionalLight('#fff3dc', 2.4)
  sun.castShadow = true
  sun.shadow.mapSize.set(2048, 2048)
  Object.assign(sun.shadow.camera, { left: -45, right: 45, top: 40, bottom: -40, near: 1, far: 200 })
  sun.shadow.bias = -0.0004
  sun.shadow.normalBias = 0.03
  scene.add(sun, sun.target)

  scene.add(makeGround())
  const river = makeRiver()
  scene.add(river.mesh)

  let time = 0, sinceClock = 0
  const world: World = {
    scene, camera, renderer, models, groundHeight, riverDistance,
    setHour(hour) {
      const s = sunForHour(hour)
      const el = THREE.MathUtils.degToRad(Math.max(s.elevation, 12)) // la nuit, la lune éclaire d'en haut
      const az = THREE.MathUtils.degToRad(s.azimuth + 200)
      sun.position.set(Math.cos(el) * Math.sin(az) * 80, Math.sin(el) * 80, Math.cos(el) * Math.cos(az) * 80)
      const night = s.elevation < 0
      sun.color.set(night ? '#9fb4ff' : s.elevation < 15 ? '#ffd2a0' : '#fff3dc')
      sun.intensity = 2.6 * s.intensity
      hemi.intensity = 0.35 + 0.75 * s.intensity
      sky.set(s.skyTop, s.skyBottom)
      ;(scene.fog as THREE.Fog).color.set(s.skyBottom)
    },
    update(dt) {
      time += dt
      river.update(time)
      // La lumière suit l'heure réelle : on la recalcule une fois par minute.
      sinceClock += dt
      if (sinceClock >= 60) {
        sinceClock = 0
        const c = hourFromLocation(location.search, new Date())
        if (!c.forced) world.setHour(c.hour)
      }
    },
    resize() {
      const w = canvas.clientWidth, h = canvas.clientHeight
      renderer.setSize(w, h, false)
      camera.aspect = w / h
      camera.updateProjectionMatrix()
    },
  }
  // ?heure=14 dans l'adresse force l'heure (pratique pour tester le jour et la nuit)
  world.setHour(hourFromLocation(location.search, new Date()).hour)
  world.resize()
  return world
}
