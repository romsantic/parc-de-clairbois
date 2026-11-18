import * as THREE from 'three'
import type { ModelKey } from '../assets/manifest'
import { ZONES, PATHS, villagePaths } from '../data/zones'
import { SLOTS } from '../data/economy'
import { VILLAGE_PROPS, MAIRIE, MARKER } from '../data/village'
import type { World } from './world'
import { fitHeight } from './animalActor'
import { prepareStatic } from './materials'
import { createPath, type PathStyle } from './path'
import { createRng } from '../core/rng'

/** Pont et allée du zoo : à la hauteur du couloir de chemin des données (z = 10). */
export const BRIDGE_Z = 10
/** Dessus des planches du pont (les promeneurs y posent les pieds). */
export const BRIDGE_DECK_Y = 0.36
/** Demi-longueur du tablier (planches de bx − 3,3 à bx + 3,3). */
export const BRIDGE_HALF_SPAN = 3.3

/**
 * Décor fixe : village, pont, chemins, marqueur de mission, arbres et rochers.
 * Les zones du zoo restent libres de toute décoration (on y pose les enclos).
 */
export function buildDecor(world: World, rng: () => number): {
  update(dt: number): void
  setPathLevel(level: number): void
  /** Place le « ! » au-dessus d'un point de la carte ; null = au-dessus de la mairie. */
  setMarker(pos: { x: number; z: number } | null): void
  setMarkerVisible(v: boolean): void
} {
  const { scene, models, groundHeight, riverDistance } = world
  const occupied: { x: number; z: number; r: number }[] = []

  function place(key: ModelKey, x: number, z: number, opts: { height?: number; rot?: number; r?: number } = {}) {
    const src = models.get(key)
    if (!src) return undefined
    const obj = src.scene.clone(true)
    prepareStatic(obj)
    if (opts.height) fitHeight(obj, opts.height)
    obj.rotation.y = opts.rot ?? 0
    obj.position.set(x, groundHeight(x, z), z)
    scene.add(obj)
    occupied.push({ x, z, r: opts.r ?? 1.5 })
    return obj
  }

  const inRect = (x: number, z: number, r: { x: number; z: number; w: number; d: number }, m: number) =>
    x > r.x - m && x < r.x + r.w + m && z > r.z - m && z < r.z + r.d + m
  const free = (x: number, z: number, r: number) =>
    riverDistance(x, z) > 4 + r &&
    !ZONES.some((zn) => inRect(x, z, zn.rect, r + 0.5)) &&
    !PATHS.some((p) => inRect(x, z, p, r)) &&
    SLOTS.every((s) => Math.hypot(s.x - x, s.z - z) > 5) &&
    occupied.every((o) => Math.hypot(o.x - x, o.z - z) > o.r + r)

  // ---------- Le village, de l'autre côté de la rivière ----------
  let mairie: THREE.Object3D | undefined
  for (const v of VILLAGE_PROPS) {
    const obj = place(v.key, v.x, v.z, { height: v.height, rot: v.rot, r: v.r })
    if (v === MAIRIE) mairie = obj
  }

  // ---------- Pont de bois là où l'allée croise la rivière ----------
  for (const sl of SLOTS) occupied.push({ x: sl.x, z: sl.z, r: 3.4 })
  const BZ = BRIDGE_Z
  let bx = 0, best = Infinity
  for (let x = -2; x <= 10; x += 0.1) { const d = riverDistance(x, BZ); if (d < best) { best = d; bx = x } }
  const wood = new THREE.MeshStandardMaterial({ color: '#8a5a3a', roughness: 0.9, flatShading: true })
  const woodLight = new THREE.MeshStandardMaterial({ color: '#9c6a45', roughness: 0.9, flatShading: true })
  for (let i = 0; i < 13; i++) {
    const plank = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.16, 2.6), i % 2 ? wood : woodLight)
    plank.position.set(bx - 3.3 + i * 0.55, BRIDGE_DECK_Y - 0.08 + (i % 3) * 0.015, BZ)
    plank.castShadow = plank.receiveShadow = true
    scene.add(plank)
  }
  for (const side of [-1, 1]) {
    const beam = new THREE.Mesh(new THREE.BoxGeometry(7.6, 0.22, 0.22), wood)
    beam.position.set(bx, 0.12, BZ + side * 1.05)
    scene.add(beam)
    const rail = new THREE.Mesh(new THREE.BoxGeometry(7.5, 0.12, 0.12), wood)
    rail.position.set(bx, 0.95, BZ + side * 1.2)
    rail.castShadow = true
    scene.add(rail)
    for (const px of [-3.4, 0, 3.4]) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.8, 0.15), wood)
      post.position.set(bx + px, 0.6, BZ + side * 1.2)
      post.castShadow = true
      scene.add(post)
    }
  }
  occupied.push({ x: bx, z: BZ, r: 4 })

  // ---------- Chemins de terre : allée du zoo, pont, village ----------
  const paths = [
    [{ x: -36, z: BZ }, { x: -20, z: BZ }, { x: -8, z: BZ }, { x: bx - 3.5, z: BZ }],
    ...villagePaths(bx),
  ]
  for (const p of paths) {
    for (let i = 0; i < p.length - 1; i++)
      for (let k = 0; k <= 4; k++)
        occupied.push({ x: p[i].x + ((p[i + 1].x - p[i].x) * k) / 4, z: p[i].z + ((p[i + 1].z - p[i].z) * k) / 4, r: 1.8 })
  }

  // Les chemins changent d'allure avec le niveau du village : on les reconstruit à chaque changement.
  let pathGroups: THREE.Group[] = []
  function setPathLevel(level: number) {
    for (const g of pathGroups) {
      scene.remove(g)
      const mats = new Set<THREE.Material>()
      g.traverse((o) => {
        const m = o as THREE.Mesh
        if (!m.isMesh) return
        m.geometry.dispose()
        for (const mat of Array.isArray(m.material) ? m.material : [m.material]) mats.add(mat)
      })
      mats.forEach((m) => { if (!m.userData.keep) m.dispose() }) // les textures en cache restent partagées
    }
    const style = Math.min(3, Math.max(1, Math.round(level) || 1)) as PathStyle
    const pRng = createRng(4242) // même rendu à chaque reconstruction
    pathGroups = paths.map((p, i) => {
      const g = createPath(p, {
        ground: (x, z) => Math.max(groundHeight(x, z), -0.05), rng: pRng,
        style, lanterns: i < 2, // allée du zoo et chemin de la place
      })
      scene.add(g)
      return g
    })
  }

  // ---------- Marqueur de mission « ! » au-dessus de la mairie ----------
  const marker = new THREE.Group()
  const gold = new THREE.MeshStandardMaterial({ color: '#f2b13a', emissive: '#a8660a', emissiveIntensity: 0.6, roughness: 0.4 })
  const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.16, 1.3, 8), gold)
  bar.position.y = 0.95
  marker.add(bar, new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 8), gold))
  const mairieBase = (mairie ? new THREE.Box3().setFromObject(mairie).max.y : MARKER.FALLBACK_TOP_Y) + MARKER.OVER_MAIRIE
  let markerBase = mairieBase
  marker.position.set(MAIRIE.x, markerBase, MAIRIE.z)
  scene.add(marker)
  let markerAt: string | null = null
  function setMarker(pos: { x: number; z: number } | null) {
    const key = pos ? `${pos.x},${pos.z}` : null
    if (key === markerAt) return
    markerAt = key
    const x = pos ? pos.x : MAIRIE.x, z = pos ? pos.z : MAIRIE.z
    markerBase = pos ? groundHeight(x, z) + MARKER.OVER_GROUND : mairieBase
    marker.position.set(x, markerBase, z)
  }

  // ---------- Nature, hors des zones du zoo ----------
  const trees: ModelKey[] = ['arbre1', 'arbre2', 'arbre3', 'bouleau', 'saule']
  const pick = <T,>(a: T[]) => a[Math.floor(rng() * a.length)]
  type Area = { minX: number; maxX: number; minZ: number; maxZ: number }
  const scatter = (keys: ModelKey[], count: number, area: Area, h: [number, number], r: number) => {
    for (let i = 0, tries = 0; i < count && tries < count * 40; tries++) {
      const x = area.minX + rng() * (area.maxX - area.minX), z = area.minZ + rng() * (area.maxZ - area.minZ)
      if (!free(x, z, r)) continue
      place(pick(keys), x, z, { height: h[0] + rng() * (h[1] - h[0]), rot: rng() * Math.PI * 2, r })
      i++
    }
  }
  const all: Area = { minX: -46, maxX: 36, minZ: -34, maxZ: 32 }
  scatter(['sapin1', 'sapin2'], 26, { minX: -46, maxX: -2, minZ: -36, maxZ: -24 }, [5, 7.5], 1.6) // lisière au nord
  scatter(['sapin1', 'sapin2'], 10, { minX: -48, maxX: -35, minZ: -24, maxZ: 24 }, [5, 7.5], 1.6) // à l'ouest
  scatter(trees, 26, all, [3.8, 6], 1.8)
  scatter(['buisson', 'buissonBaies'], 34, all, [0.9, 1.5], 0.8)
  scatter(['rocher', 'rocherMousse'], 16, all, [0.6, 1.4], 0.8)
  scatter(['fleurs', 'plante'], 40, all, [0.4, 0.7], 0.4)
  scatter(['herbe', 'herbe2'], 80, all, [0.35, 0.6], 0.2)
  scatter(['souche'], 4, all, [0.5, 0.7], 0.6)
  for (let i = 0; i < 8; i++) {
    const z = -18 + rng() * 34
    let x = 0, bestD = Infinity
    for (let t = -4; t <= 10; t += 0.2) { const d = riverDistance(t, z); if (d < bestD) { bestD = d; x = t } }
    const n = models.get('nenuphar')?.scene.clone(true)
    if (!n) continue
    prepareStatic(n)
    fitHeight(n, 0.12)
    n.position.set(x + (rng() - 0.5) * 2.4, -0.27, z)
    n.rotation.y = rng() * 6.28
    scene.add(n)
  }

  let t = 0
  return {
    update(dt) {
      t += dt
      marker.position.y = markerBase + Math.sin(t * 2.2) * 0.25
      marker.rotation.y = t * 1.2
    },
    setPathLevel,
    setMarker,
    setMarkerVisible(v) { marker.visible = v },
  }
}
