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

/**
 * Positions de lanternes : le premier point, puis un point toutes les `every` unités de
 * longueur cumulée le long du tracé (les points renvoyés sont ceux du tracé).
 */
export function lanternPositions(points: Point[], every: number): Point[] {
  if (points.length === 0) return []
  const out: Point[] = [points[0]]
  let along = 0, next = every
  for (let i = 1; i < points.length; i++) {
    along += Math.hypot(points[i].x - points[i - 1].x, points[i].z - points[i - 1].z)
    if (along >= next - 1e-6) { out.push(points[i]); next += every }
  }
  return out
}

/** Niveau d'allure du chemin : 1 terre battue, 2 gravier, 3 pavés avec lanternes. */
export type PathStyle = 1 | 2 | 3

export interface PathOptions {
  width?: number
  /** Allure du chemin (1 par défaut : terre battue). */
  style?: PathStyle
  /** Pose des lanternes (style 3 seulement). */
  lanterns?: boolean
  ground: (x: number, z: number) => number
  rng: () => number
}

const textures = new Map<PathStyle, THREE.CanvasTexture>()

/**
 * Texture de terre battue dessinée une fois : grains clairs et sombres, deux ornières de
 * charrette, bords mangés par l'herbe. u = travers du chemin, v = le long (répété).
 */
function drawDirt(g: CanvasRenderingContext2D, W: number, H: number, rng: () => number) {
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
}

/** Gravier clair : grain fin gris-beige, sans ornières, herbe plus discrète sur les bords. */
function drawGravel(g: CanvasRenderingContext2D, W: number, H: number, rng: () => number) {
  g.fillStyle = '#cfc6b2'
  g.fillRect(0, 0, W, H)
  for (let i = 0; i < 16000; i++) {
    const v = rng()
    g.fillStyle = v < 0.4 ? `rgba(140,132,118,${0.2 + rng() * 0.3})` : v < 0.8 ? `rgba(238,230,212,${0.2 + rng() * 0.3})` : `rgba(190,170,140,${0.2 + rng() * 0.25})`
    const s = 1 + rng() * 2
    g.fillRect(rng() * W, rng() * H, s, s)
  }
  for (let i = 0; i < 900; i++) {
    const side = rng() < 0.5 ? 0 : 1
    const depth = Math.pow(rng(), 2.4) * W * 0.18
    g.fillStyle = `rgba(${95 + rng() * 40},${140 + rng() * 40},${70 + rng() * 25},${0.5 + rng() * 0.4})`
    g.fillRect(side ? W - depth : depth, rng() * H, 2 + rng() * 3, 3 + rng() * 5)
  }
}

/** Pavés : rangées décalées de pierres arrondies gris et ocre, joints sombres. */
function drawCobble(g: CanvasRenderingContext2D, W: number, H: number, rng: () => number) {
  g.fillStyle = '#4e4a44' // joints
  g.fillRect(0, 0, W, H)
  const rowH = 32, cols = 4
  const cw = W / cols
  for (let r = 0; r < H / rowH; r++) {
    const off = r % 2 ? cw / 2 : 0
    for (let c = -1; c <= cols; c++) {
      const x = c * cw + off, y = r * rowH
      const ochre = rng() < 0.35
      const l = 52 + rng() * 22
      g.fillStyle = ochre ? `hsl(${32 + rng() * 8},${28 + rng() * 10}%,${l}%)` : `hsl(${35 + rng() * 15},${5 + rng() * 6}%,${l - 4}%)`
      const px = x + 2, py = y + 2, pw = cw - 4, ph = rowH - 4, rad = 7
      g.beginPath()
      g.moveTo(px + rad, py)
      g.arcTo(px + pw, py, px + pw, py + ph, rad)
      g.arcTo(px + pw, py + ph, px, py + ph, rad)
      g.arcTo(px, py + ph, px, py, rad)
      g.arcTo(px, py, px + pw, py, rad)
      g.closePath()
      g.fill()
      // Petit éclat de lumière sur le haut du pavé
      g.fillStyle = 'rgba(255,248,230,0.12)'
      g.fillRect(px + 4, py + 2, pw - 8, 3)
    }
  }
  for (let i = 0; i < 500; i++) {
    const side = rng() < 0.5 ? 0 : 1
    const depth = Math.pow(rng(), 3) * W * 0.12
    g.fillStyle = `rgba(${95 + rng() * 40},${140 + rng() * 40},${70 + rng() * 25},${0.5 + rng() * 0.4})`
    g.fillRect(side ? W - depth : depth, rng() * H, 2 + rng() * 3, 3 + rng() * 6)
  }
}

function getPathTexture(style: PathStyle, rng: () => number): THREE.CanvasTexture {
  const cached = textures.get(style)
  if (cached) return cached
  const W = 128, H = 512
  const cv = document.createElement('canvas')
  cv.width = W; cv.height = H
  const g = cv.getContext('2d')!
  if (style === 2) drawGravel(g, W, H, rng)
  else if (style === 3) drawCobble(g, W, H, rng)
  else drawDirt(g, W, H, rng)
  const tex = new THREE.CanvasTexture(cv)
  tex.wrapS = THREE.ClampToEdgeWrapping
  tex.wrapT = THREE.RepeatWrapping
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 4
  textures.set(style, tex)
  return tex
}

/**
 * Chemin de terre posé sur le relief : tracé lissé, centre clair et tassé, bords qui se
 * fondent dans l'herbe, quelques cailloux. Réutilisable pour les routes construites plus tard.
 */
export function createPath(control: Point[], opts: PathOptions): THREE.Group {
  const width = opts.width ?? 2.2
  const style: PathStyle = opts.style ?? 1
  const curve = new THREE.CatmullRomCurve3(control.map((p) => new THREE.Vector3(p.x, 0, p.z)), false, 'centripetal')
  const n = Math.max(2, Math.ceil(curve.getLength() / 0.4))
  const pts = curve.getSpacedPoints(n).map((v) => ({ x: v.x, z: v.z }))
  const group = new THREE.Group()

  // Le ruban a 4 colonnes de sommets : herbe | terre | terre | herbe, pour un bord adouci.
  const outer = ribbonEdges(pts, width / 2 + (style === 3 ? 0.3 : 0.45))
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
      map: getPathTexture(style, opts.rng),
      vertexColors: true, transparent: true, roughness: 1, side: THREE.DoubleSide,
      polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2, depthWrite: false,
    }),
  )
  mesh.receiveShadow = true
  mesh.renderOrder = 1
  group.add(mesh)

  // Cailloux le long des bords : épars pour la terre, en bordure bien alignée pour le gravier
  const stoneMat = new THREE.MeshStandardMaterial({ color: '#9a958a', roughness: 1, flatShading: true })
  const stoneGeo = new THREE.DodecahedronGeometry(style === 2 ? 0.09 : 0.14, 0)
  if (style === 2) {
    for (let i = 0; i < pts.length; i += 2) {
      for (const e of [inner[i].left, inner[i].right]) {
        const s = new THREE.Mesh(stoneGeo, stoneMat)
        const k = 0.85 + opts.rng() * 0.4
        s.scale.set(k, k * 0.65, k)
        s.position.set(e.x + (opts.rng() - 0.5) * 0.08, opts.ground(e.x, e.z) + 0.05, e.z + (opts.rng() - 0.5) * 0.08)
        s.rotation.set(opts.rng() * 3, opts.rng() * 3, opts.rng() * 3)
        s.castShadow = true
        group.add(s)
      }
    }
  } else {
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
  }

  // Lanternes (pavés) : poteau sombre + petite boîte émissive, une de chaque côté en alternance
  if (style === 3 && opts.lanterns) {
    const lampEdges = ribbonEdges(pts, width / 2 + 0.55)
    const postMat = new THREE.MeshStandardMaterial({ color: '#3a2e26', roughness: 0.8, flatShading: true })
    const glowMat = new THREE.MeshStandardMaterial({ color: '#ffe3a8', emissive: '#ffcf7a', emissiveIntensity: 1.2, roughness: 0.5 })
    const postGeo = new THREE.CylinderGeometry(0.05, 0.07, 1.6, 6)
    const capGeo = new THREE.BoxGeometry(0.28, 0.06, 0.28)
    const boxGeo = new THREE.BoxGeometry(0.22, 0.28, 0.22)
    lanternPositions(pts, 8).forEach((p, n) => {
      const e = lampEdges[pts.indexOf(p)]
      const q = n % 2 ? e.right : e.left
      const y = opts.ground(q.x, q.z)
      const post = new THREE.Mesh(postGeo, postMat)
      post.position.set(q.x, y + 0.8, q.z)
      post.castShadow = true
      const box = new THREE.Mesh(boxGeo, glowMat)
      box.position.set(q.x, y + 1.74, q.z)
      const cap = new THREE.Mesh(capGeo, postMat)
      cap.position.set(q.x, y + 1.92, q.z)
      group.add(post, box, cap)
    })
  }
  return group
}
