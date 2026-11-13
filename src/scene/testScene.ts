import * as THREE from 'three'
import type { ModelKey } from '../assets/manifest'
import type { World } from './world'
import { MAP } from './world'
import { AnimalActor, fitHeight } from './animalActor'
import type { Bounds } from './wander'
import { createPath } from './path'

/**
 * Scène de test de l'étape 1 : le zoo à l'ouest de la rivière, le village à l'est.
 * Sert uniquement à valider le rendu ; l'étape 3 placera les objets d'après l'état du jeu.
 */
export function buildTestScene(world: World, rng: () => number): { update(dt: number): void } {
  const { scene, models, groundHeight, riverDistance } = world
  const actors: AnimalActor[] = []
  const occupied: { x: number; z: number; r: number }[] = []

  /** Matériaux mats et ombres pour les objets OBJ (exportés très brillants). */
  function prepare(obj: THREE.Object3D) {
    obj.traverse((o) => {
      const mesh = o as THREE.Mesh
      if (!mesh.isMesh) return
      mesh.castShadow = true
      mesh.receiveShadow = true
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
      const conv = mats.map((m) => {
        // Les .mtl de Blender 2.79 contiennent des couleurs déjà linéaires ; MTLLoader les
        // ré-assombrit en les croyant sRGB. On annule cette conversion.
        const c = ((m as THREE.MeshPhongMaterial).color ?? new THREE.Color('#ffffff')).clone().convertLinearToSRGB()
        return new THREE.MeshStandardMaterial({ color: c, roughness: 0.92, metalness: 0, flatShading: true })
      })
      mesh.material = Array.isArray(mesh.material) ? conv : conv[0]
    })
  }

  function place(key: ModelKey, x: number, z: number, opts: { height?: number; rot?: number; r?: number } = {}) {
    const src = models.get(key)
    if (!src) return undefined
    const obj = src.scene.clone(true)
    prepare(obj)
    if (opts.height) fitHeight(obj, opts.height)
    obj.rotation.y = opts.rot ?? 0
    obj.position.set(x, groundHeight(x, z), z)
    scene.add(obj)
    occupied.push({ x, z, r: opts.r ?? 1.5 })
    return obj
  }

  const free = (x: number, z: number, r: number) =>
    riverDistance(x, z) > 4 + r && occupied.every((o) => Math.hypot(o.x - x, o.z - z) > o.r + r)

  // ---------- Le zoo : quatre enclos clôturés ----------
  const fenceLen = (() => {
    const f = models.get('cloture')?.scene.clone(true)
    if (!f) return 2
    fitHeight(f, 1.1)
    const s = new THREE.Box3().setFromObject(f).getSize(new THREE.Vector3())
    return Math.max(s.x, s.z)
  })()

  function enclosure(b: Bounds) {
    occupied.push({ x: (b.minX + b.maxX) / 2, z: (b.minZ + b.maxZ) / 2, r: Math.max(b.maxX - b.minX, b.maxZ - b.minZ) / 2 + 1 })
    const side = (x0: number, z0: number, x1: number, z1: number) => {
      const len = Math.hypot(x1 - x0, z1 - z0), n = Math.max(1, Math.round(len / fenceLen))
      const rot = Math.atan2(x1 - x0, z1 - z0) + Math.PI / 2
      for (let i = 0; i < n; i++) {
        const t = (i + 0.5) / n
        const x = x0 + (x1 - x0) * t, z = z0 + (z1 - z0) * t
        const obj = models.get('cloture')!.scene.clone(true)
        prepare(obj)
        fitHeight(obj, 1.1)
        obj.scale.x *= len / n / fenceLen
        obj.rotation.y = rot
        obj.position.set(x, groundHeight(x, z), z)
        scene.add(obj)
      }
    }
    side(b.minX, b.minZ, b.maxX, b.minZ)
    side(b.maxX, b.minZ, b.maxX, b.maxZ)
    side(b.maxX, b.maxZ, b.minX, b.maxZ)
    side(b.minX, b.maxZ, b.minX, b.minZ)
    // Herbe plus tendre à l'intérieur
    const pad = new THREE.Mesh(
      new THREE.PlaneGeometry(b.maxX - b.minX - 0.4, b.maxZ - b.minZ - 0.4),
      new THREE.MeshStandardMaterial({ color: '#8cc265', roughness: 1, transparent: true, opacity: 0.55 }),
    )
    pad.rotation.x = -Math.PI / 2
    pad.position.set((b.minX + b.maxX) / 2, 0.06 + groundHeight((b.minX + b.maxX) / 2, (b.minZ + b.maxZ) / 2), (b.minZ + b.maxZ) / 2)
    pad.receiveShadow = true
    scene.add(pad)
  }

  function herd(key: ModelKey, n: number, b: Bounds, height: number) {
    const m = models.get(key)
    if (!m) return
    for (let i = 0; i < n; i++) {
      const a = new AnimalActor(m, b, rng, height * (0.9 + rng() * 0.15), groundHeight)
      scene.add(a.object)
      actors.push(a)
    }
  }

  const E1: Bounds = { minX: -27, maxX: -15, minZ: -17, maxZ: -7 }
  const E2: Bounds = { minX: -27, maxX: -16, minZ: -3, maxZ: 7 }
  const E3: Bounds = { minX: -12, maxX: -4, minZ: -17, maxZ: -7 }
  const E4: Bounds = { minX: -12, maxX: -5, minZ: -2, maxZ: 6 }
  for (const b of [E1, E2, E3, E4]) enclosure(b)
  herd('alpaga', 3, E1, 2.4)
  herd('ane', 2, E2, 2.1)
  herd('biche', 2, E3, 2.1)
  herd('cerf', 1, E3, 2.6)
  herd('renard', 2, E4, 1.0)
  place('foin', -17, -9, { height: 1.2, r: 0.1 })
  place('foin', -18, 5, { height: 1.2, r: 0.1 })

  // ---------- Le village, de l'autre côté de la rivière ----------
  const mairie = place('mairie', 17, -3, { height: 7, rot: -Math.PI / 2, r: 3.5 })
  place('maison1', 12, -12, { height: 3.6, rot: 0.2, r: 3 })
  place('maison2', 21, -12, { height: 3.8, rot: -0.3, r: 3 })
  place('maison3', 25, 2, { height: 3.6, rot: -Math.PI / 2, r: 3 })
  place('maison2', 11, 15, { height: 3.6, rot: Math.PI + 0.4, r: 3 })
  place('auberge', 22, 11, { height: 4.6, rot: Math.PI + 0.3, r: 4 })
  place('moulin', 29, -14, { height: 7, rot: -0.6, r: 3.5 })
  place('ecurie', 28, 15, { height: 3.2, rot: Math.PI, r: 3 })
  place('puits', 13, 0, { height: 2.2, r: 1.2 })
  place('etal', 18, 5, { height: 2.6, rot: Math.PI, r: 1.5 })
  place('tonneau', 19.8, 5.5, { height: 1, r: 0.5 })
  place('charrette', 10, 4, { height: 1.8, rot: 0.8, r: 1.5 })
  place('banc', 15, 3.5, { height: 0.9, rot: Math.PI, r: 0.8 })

  // Pont de bois là où le chemin croise la rivière
  const BZ = 10.8
  let bx = 0, best = Infinity
  for (let x = -2; x <= 10; x += 0.1) { const d = riverDistance(x, BZ); if (d < best) { best = d; bx = x } }
  const wood = new THREE.MeshStandardMaterial({ color: '#8a5a3a', roughness: 0.9, flatShading: true })
  const woodLight = new THREE.MeshStandardMaterial({ color: '#9c6a45', roughness: 0.9, flatShading: true })
  for (let i = 0; i < 13; i++) {
    const plank = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.16, 2.6), i % 2 ? wood : woodLight)
    plank.position.set(bx - 3.3 + i * 0.55, 0.28 + (i % 3) * 0.015, BZ)
    plank.castShadow = plank.receiveShadow = true
    scene.add(plank)
  }
  for (const side of [-1, 1]) {
    const beam = new THREE.Mesh(new THREE.BoxGeometry(7.6, 0.22, 0.22), wood)
    beam.position.set(bx, 0.12, BZ + side * 1.05)
    scene.add(beam)
  }
  for (const side of [-1, 1]) {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(7.5, 0.12, 0.12), wood)
    rail.position.set(bx, 0.95, 10.8 + side * 1.2)
    rail.castShadow = true
    scene.add(rail)
    for (const px of [-3.4, 0, 3.4]) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.8, 0.15), wood)
      post.position.set(bx + px, 0.6, 10.8 + side * 1.2)
      post.castShadow = true
      scene.add(post)
    }
  }
  occupied.push({ x: bx, z: BZ, r: 4 })

  // Chemins de terre : l'allée du zoo, puis jusqu'au pont et au cœur du village
  const paths = [
    [{ x: -13.6, z: -18 }, { x: -13.6, z: -5 }, { x: -13.8, z: 4 }, { x: -12.5, z: 10 }],
    [{ x: -22, z: 11 }, { x: -12.5, z: 10 }, { x: -6, z: 10.6 }, { x: bx - 3.5, z: BZ }],
    [{ x: bx + 3.5, z: BZ }, { x: bx + 7, z: 10 }, { x: 11, z: 6 }, { x: 14, z: 2 }, { x: 17, z: 0.5 }],
    [{ x: 14, z: 2 }, { x: 19, z: 7.5 }, { x: 21, z: 9.5 }],
  ]
  for (const p of paths) {
    scene.add(createPath(p, { ground: (x, z) => Math.max(groundHeight(x, z), -0.05), rng }))
    for (let i = 0; i < p.length - 1; i++)
      for (let k = 0; k <= 4; k++)
        occupied.push({ x: p[i].x + ((p[i + 1].x - p[i].x) * k) / 4, z: p[i].z + ((p[i + 1].z - p[i].z) * k) / 4, r: 1.8 })
  }

  // Marqueur de mission « ! » au-dessus de la mairie
  const marker = new THREE.Group()
  const gold = new THREE.MeshStandardMaterial({ color: '#f2b13a', emissive: '#a8660a', emissiveIntensity: 0.6, roughness: 0.4 })
  const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.16, 1.3, 8), gold)
  bar.position.y = 0.95
  const dot = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 8), gold)
  marker.add(bar, dot)
  const markerBase = (mairie ? new THREE.Box3().setFromObject(mairie).max.y : 9) + 1.4
  marker.position.set(17, markerBase, -3)
  scene.add(marker)

  // ---------- Nature : bosquets, rochers, fleurs ----------
  const trees: ModelKey[] = ['arbre1', 'arbre2', 'arbre3', 'bouleau', 'saule']
  const pines: ModelKey[] = ['sapin1', 'sapin2']
  const pick = <T,>(a: T[]) => a[Math.floor(rng() * a.length)]
  const scatter = (keys: ModelKey[], count: number, area: Bounds, h: [number, number], r: number) => {
    for (let i = 0, tries = 0; i < count && tries < count * 30; tries++) {
      const x = area.minX + rng() * (area.maxX - area.minX), z = area.minZ + rng() * (area.maxZ - area.minZ)
      if (!free(x, z, r)) continue
      place(pick(keys), x, z, { height: h[0] + rng() * (h[1] - h[0]), rot: rng() * Math.PI * 2, r })
      i++
    }
  }
  const all: Bounds = { minX: -MAP.halfX, maxX: MAP.halfX, minZ: -MAP.halfZ, maxZ: MAP.halfZ }
  scatter(pines, 18, { minX: -MAP.halfX, maxX: -2, minZ: -MAP.halfZ, maxZ: -18 }, [5, 7.5], 1.6) // forêt au nord du zoo
  scatter(trees, 22, all, [3.8, 6], 1.8)
  scatter(['buisson', 'buissonBaies'], 30, all, [0.9, 1.5], 0.8)
  scatter(['rocher', 'rocherMousse'], 14, all, [0.6, 1.4], 0.8)
  scatter(['fleurs', 'plante'], 40, all, [0.4, 0.7], 0.4)
  scatter(['herbe', 'herbe2'], 70, all, [0.35, 0.6], 0.2)
  scatter(['souche'], 4, all, [0.5, 0.7], 0.6)
  // Nénuphars au bord de l'eau
  for (let i = 0; i < 8; i++) {
    const z = -18 + rng() * 34
    let x = 0, bestD = Infinity
    for (let t = -4; t <= 10; t += 0.2) { const d = riverDistance(t, z); if (d < bestD) { bestD = d; x = t } }
    const n = models.get('nenuphar')?.scene.clone(true)
    if (!n) continue
    prepare(n)
    fitHeight(n, 0.12)
    n.scale.multiplyScalar(1)
    n.position.set(x + (rng() - 0.5) * 2.4, -0.27, z)
    n.rotation.y = rng() * 6.28
    scene.add(n)
  }

  let t = 0
  return {
    update(dt) {
      t += dt
      for (const a of actors) a.update(dt)
      marker.position.y = markerBase + Math.sin(t * 2.2) * 0.25
      marker.rotation.y = t * 1.2
    },
  }
}
