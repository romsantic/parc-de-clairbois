import * as THREE from 'three'
import type { Point } from './wander'

export interface Edge { left: Point; right: Point }

/** Bords gauche et droit d'un ruban qui suit le tracé, perpendiculaires à la tangente locale. */
export function ribbonEdges(points: Point[], halfWidth: number): Edge[] {
  if (points.length < 2) return []
  return points.map((p, i) => {
    const a = points[Math.max(0, i - 1)], b = points[Math.min(points.length - 1, i + 1)]
    const tx = b.x - a.x, tz = b.z - a.z, len = Math.hypot(tx, tz) || 1
    const nx = -tz / len, nz = tx / len
    return {
      left: { x: p.x + nx * halfWidth, z: p.z + nz * halfWidth },
      right: { x: p.x - nx * halfWidth, z: p.z - nz * halfWidth },
    }
  })
}

export interface PathOptions {
  width?: number
  ground: (x: number, z: number) => number
  rng: () => number
}

const DIRT = new THREE.Color('#c4a674'), DIRT_DARK = new THREE.Color('#a98b5c'), GRASS_EDGE = new THREE.Color('#9fb867')

/**
 * Chemin de terre posé sur le relief : tracé lissé, centre clair et tassé, bords qui se
 * fondent dans l'herbe, quelques cailloux. Réutilisable pour les routes construites plus tard.
 */
export function createPath(control: Point[], opts: PathOptions): THREE.Group {
  const width = opts.width ?? 2.2
  const curve = new THREE.CatmullRomCurve3(control.map((p) => new THREE.Vector3(p.x, 0, p.z)), false, 'centripetal')
  const n = Math.max(2, Math.ceil(curve.getLength() / 0.4))
  const pts = curve.getSpacedPoints(n).map((v) => ({ x: v.x, z: v.z }))
  const group = new THREE.Group()

  // Le ruban a 4 colonnes de sommets : herbe | terre | terre | herbe, pour un bord adouci.
  const outer = ribbonEdges(pts, width / 2 + 0.45)
  const inner = ribbonEdges(pts, width / 2 - 0.1)
  const pos: number[] = [], col: number[] = [], idx: number[] = []
  const lift = 0.05
  const c = new THREE.Color()
  pts.forEach((_, i) => {
    const row = [outer[i].left, inner[i].left, inner[i].right, outer[i].right]
    row.forEach((p, k) => {
      pos.push(p.x, opts.ground(p.x, p.z) + lift, p.z)
      if (k === 0 || k === 3) c.copy(GRASS_EDGE)
      else c.copy(DIRT).lerp(DIRT_DARK, 0.25 + 0.5 * opts.rng()) // terre irrégulière
      col.push(c.r, c.g, c.b, k === 0 || k === 3 ? 0 : 1)
    })
    if (i > 0) {
      const a = (i - 1) * 4, b = i * 4
      for (let k = 0; k < 3; k++) idx.push(a + k, b + k, a + k + 1, a + k + 1, b + k, b + k + 1)
    }
  })
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 4))
  geo.setIndex(idx)
  geo.computeVertexNormals()
  const mesh = new THREE.Mesh(
    geo,
    new THREE.MeshStandardMaterial({
      vertexColors: true, transparent: true, roughness: 1, side: THREE.DoubleSide,
      polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2, depthWrite: false,
    }),
  )
  mesh.receiveShadow = true
  mesh.renderOrder = 1
  group.add(mesh)

  // Cailloux le long des bords
  const stoneMat = new THREE.MeshStandardMaterial({ color: '#9a958a', roughness: 1, flatShading: true })
  const stoneGeo = new THREE.DodecahedronGeometry(0.14, 0)
  for (let i = 0; i < pts.length; i += 3) {
    if (opts.rng() > 0.45) continue
    const e = opts.rng() < 0.5 ? inner[i].left : inner[i].right
    const s = new THREE.Mesh(stoneGeo, stoneMat)
    const k = 0.6 + opts.rng() * 0.9
    s.scale.set(k, k * 0.6, k)
    s.position.set(e.x + (opts.rng() - 0.5) * 0.5, opts.ground(e.x, e.z) + 0.05, e.z + (opts.rng() - 0.5) * 0.5)
    s.rotation.set(opts.rng() * 3, opts.rng() * 3, opts.rng() * 3)
    s.castShadow = true
    group.add(s)
  }
  return group
}
