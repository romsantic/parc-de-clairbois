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

let dirtTexture: THREE.CanvasTexture | undefined

/**
 * Texture de terre battue dessinée une fois : grains clairs et sombres, deux ornières de
 * charrette, bords mangés par l'herbe. u = travers du chemin, v = le long (répété).
 */
function getDirtTexture(rng: () => number): THREE.CanvasTexture {
  if (dirtTexture) return dirtTexture
  const W = 128, H = 512
  const cv = document.createElement('canvas')
  cv.width = W; cv.height = H
  const g = cv.getContext('2d')!
  g.fillStyle = '#b8955f'
  g.fillRect(0, 0, W, H)
  // Grain de la terre
  for (let i = 0; i < 9000; i++) {
    const v = rng()
    g.fillStyle = v < 0.5 ? `rgba(120,88,52,${0.15 + rng() * 0.25})` : `rgba(222,198,150,${0.12 + rng() * 0.25})`
    const s = 1 + rng() * 3
    g.fillRect(rng() * W, rng() * H, s, s)
  }
  // Ornières de charrette, légèrement ondulées
  for (const u of [0.32, 0.68]) {
    for (let y = 0; y < H; y += 2) {
      const x = u * W + Math.sin((y / H) * Math.PI * 6) * 2.5
      g.fillStyle = 'rgba(105,76,45,0.28)'
      g.fillRect(x - 5, y, 10, 2)
      g.fillStyle = 'rgba(90,64,38,0.22)'
      g.fillRect(x - 2.5, y, 5, 2)
    }
  }
  // Herbe qui mord sur les bords
  for (let i = 0; i < 1600; i++) {
    const side = rng() < 0.5 ? 0 : 1
    const depth = Math.pow(rng(), 2.2) * W * 0.22
    const x = side ? W - depth : depth
    g.fillStyle = `rgba(${95 + rng() * 40},${140 + rng() * 40},${70 + rng() * 25},${0.55 + rng() * 0.4})`
    g.fillRect(x, rng() * H, 2 + rng() * 3, 3 + rng() * 6)
  }
  dirtTexture = new THREE.CanvasTexture(cv)
  dirtTexture.wrapS = THREE.ClampToEdgeWrapping
  dirtTexture.wrapT = THREE.RepeatWrapping
  dirtTexture.colorSpace = THREE.SRGBColorSpace
  dirtTexture.anisotropy = 4
  return dirtTexture
}

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
  const pos: number[] = [], col: number[] = [], uv: number[] = [], idx: number[] = []
  const lift = 0.05
  const U = [0, 0.16, 0.84, 1]
  let along = 0
  pts.forEach((p, i) => {
    if (i > 0) along += Math.hypot(p.x - pts[i - 1].x, p.z - pts[i - 1].z)
    const row = [outer[i].left, inner[i].left, inner[i].right, outer[i].right]
    row.forEach((q, k) => {
      pos.push(q.x, opts.ground(q.x, q.z) + lift, q.z)
      // Légère variation de teinte d'un endroit à l'autre ; bords transparents vers l'herbe.
      const shade = 0.9 + 0.1 * opts.rng()
      col.push(shade, shade, shade, k === 0 || k === 3 ? 0 : 1)
      uv.push(U[k], along / (width * 2.2))
    })
    if (i > 0) {
      const a = (i - 1) * 4, b = i * 4
      for (let k = 0; k < 3; k++) idx.push(a + k, b + k, a + k + 1, a + k + 1, b + k, b + k + 1)
    }
  })
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 4))
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2))
  geo.setIndex(idx)
  geo.computeVertexNormals()
  const mesh = new THREE.Mesh(
    geo,
    new THREE.MeshStandardMaterial({
      map: getDirtTexture(opts.rng),
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
