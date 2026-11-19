import { ENTRANCE_ID, ENTRANCE_PATH, PATHS_TUNING, PATH_AREA } from '../data/paths'
import { ZONES } from '../data/zones'
import type { Enclosure, GameState, PathPoint, PathSegment, Rect } from './types'

type Seg = { a: PathPoint; b: PathPoint }

/** Tous les segments : l'entrée (toujours là) puis les chemins construits. */
export function allSegments(state: GameState): PathSegment[] {
  return [...ENTRANCE_PATH, ...state.paths]
}

/** Point d'un segment le plus proche de p. */
export function closestPoint(p: PathPoint, s: Seg): PathPoint {
  const dx = s.b.x - s.a.x, dz = s.b.z - s.a.z
  const len2 = dx * dx + dz * dz
  const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((p.x - s.a.x) * dx + (p.z - s.a.z) * dz) / len2))
  return { x: s.a.x + t * dx, z: s.a.z + t * dz }
}

/** Distance d'un point à un segment. */
export function pointSegmentDistance(p: PathPoint, s: Seg): number {
  const c = closestPoint(p, s)
  return Math.hypot(p.x - c.x, p.z - c.z)
}

function cross(o: PathPoint, a: PathPoint, b: PathPoint): number {
  return (a.x - o.x) * (b.z - o.z) - (a.z - o.z) * (b.x - o.x)
}

/** Les deux segments se coupent-ils (au sens strict) ? */
function segmentsCross(s1: Seg, s2: Seg): boolean {
  const d1 = cross(s2.a, s2.b, s1.a), d2 = cross(s2.a, s2.b, s1.b)
  const d3 = cross(s1.a, s1.b, s2.a), d4 = cross(s1.a, s1.b, s2.b)
  return ((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0))
}

/** Deux segments se touchent s'ils se coupent, ou si un bout de l'un est à moins de ON_PATH_EPS de l'autre. */
export function segmentsTouch(s1: Seg, s2: Seg): boolean {
  const eps = PATHS_TUNING.ON_PATH_EPS
  return segmentsCross(s1, s2)
    || pointSegmentDistance(s1.a, s2) <= eps || pointSegmentDistance(s1.b, s2) <= eps
    || pointSegmentDistance(s2.a, s1) <= eps || pointSegmentDistance(s2.b, s1) <= eps
}

/** Distance d'un rectangle à un segment : 0 si le segment entre dans le rectangle. */
export function rectSegmentDistance(r: Rect, s: Seg): number {
  const inside = (p: PathPoint) => p.x >= r.x && p.x <= r.x + r.w && p.z >= r.z && p.z <= r.z + r.d
  if (inside(s.a) || inside(s.b)) return 0
  const c = [{ x: r.x, z: r.z }, { x: r.x + r.w, z: r.z }, { x: r.x + r.w, z: r.z + r.d }, { x: r.x, z: r.z + r.d }]
  let best = Infinity
  for (let i = 0; i < 4; i++) {
    const edge = { a: c[i], b: c[(i + 1) % 4] }
    if (segmentsCross(s, edge)) return 0
    best = Math.min(best, pointSegmentDistance(s.a, edge), pointSegmentDistance(s.b, edge), pointSegmentDistance(edge.a, s), pointSegmentDistance(edge.b, s))
  }
  return best
}

/** Ids des segments reliés à l'entrée (parcours en largeur). */
export function reachableIds(state: GameState): Set<number> {
  const segs = allSegments(state)
  const seen = new Set<number>([ENTRANCE_ID])
  const queue: PathSegment[] = segs.filter((s) => s.id === ENTRANCE_ID)
  while (queue.length) {
    const cur = queue.shift()!
    for (const s of segs) {
      if (seen.has(s.id) || !segmentsTouch(cur, s)) continue
      seen.add(s.id)
      queue.push(s)
    }
  }
  return seen
}

// Mémoire d'une seule entrée, clé = chaîne des rects et des segments (jamais l'identité des objets :
// les tableaux peuvent être modifiés sur place).
let memoKey = ''
let memoValue: ReadonlySet<number> = new Set()

function signature(state: GameState): string {
  let k = ''
  for (const e of state.enclosures) k += `${e.id}:${e.rect.x},${e.rect.z},${e.rect.w},${e.rect.d};`
  k += '|'
  for (const p of state.paths) k += `${p.id}:${p.a.x},${p.a.z},${p.b.x},${p.b.z};`
  return k
}

/** Enclos reliés à l'entrée : à portée du bord d'un segment atteignable. */
export function linkedEnclosureIds(state: GameState): ReadonlySet<number> {
  const key = signature(state)
  if (key === memoKey) return memoValue
  const reach = reachableIds(state)
  const segs = allSegments(state).filter((s) => reach.has(s.id))
  const range = PATHS_TUNING.WIDTH_M / 2 + PATHS_TUNING.TOUCH_EXTRA_M
  const out = new Set<number>()
  for (const e of state.enclosures) {
    if (segs.some((s) => rectSegmentDistance(e.rect, s) <= range)) out.add(e.id)
  }
  memoKey = key
  memoValue = out
  return out
}

export function isLinked(state: GameState, encId: number): boolean {
  return linkedEnclosureIds(state).has(encId)
}

/** Point du réseau (tous segments) le plus proche de (x, z). */
export function nearestOnNetwork(state: GameState, x: number, z: number): { point: PathPoint; segId: number; d: number } | null {
  let best: { point: PathPoint; segId: number; d: number } | null = null
  for (const s of allSegments(state)) {
    const point = closestPoint({ x, z }, s)
    const d = Math.hypot(x - point.x, z - point.z)
    if (!best || d < best.d) best = { point, segId: s.id, d }
  }
  return best
}

/** Id du segment le plus proche à moins de `tol` (entrée comprise), sinon null. */
export function segmentAt(state: GameState, x: number, z: number, tol: number): number | null {
  const n = nearestOnNetwork(state, x, z)
  return n && n.d <= tol ? n.segId : null
}

const dist = (a: PathPoint, b: PathPoint) => Math.hypot(b.x - a.x, b.z - a.z)

/** Prix d'un segment : le mètre commencé est dû (petite tolérance pour les flottants). */
export function pathCost(a: PathPoint, b: PathPoint): number {
  return Math.ceil(dist(a, b) * PATHS_TUNING.COST_PER_M - 1e-9)
}

export type SegmentCheck = { ok: true; length: number; cost: number } | { ok: false; reason: string; cost: number }

/** Peut-on tracer ce segment ? Contrôles dans l'ordre ; `free` (chemin offert) ne saute que celui des pièces. */
export function checkSegment(state: GameState, a: PathPoint, b: PathPoint, opts: { free?: boolean } = {}): SegmentCheck {
  const length = dist(a, b)
  const cost = pathCost(a, b)
  const no = (reason: string): SegmentCheck => ({ ok: false, reason, cost })
  const eps = PATHS_TUNING.ON_PATH_EPS
  if (!allSegments(state).some((s) => pointSegmentDistance(a, s) <= eps)) return no("Un chemin doit partir d'un chemin existant.")
  if (length < PATHS_TUNING.MIN_LENGTH_M) return no('Trop court.')
  const east = PATH_AREA.x + PATH_AREA.w
  if (a.x > east || b.x > east) return no('La rivière ne se traverse que par le pont.')
  const inArea = (p: PathPoint) => p.x >= PATH_AREA.x && p.x <= east && p.z >= PATH_AREA.z && p.z <= PATH_AREA.z + PATH_AREA.d
  if (!inArea(a) || !inArea(b)) return no('Le chemin sort de la carte.')
  const seg = { a, b }
  const half = PATHS_TUNING.WIDTH_M / 2
  if (ZONES.some((z) => z.unlockLevel > state.village.level && rectSegmentDistance(z.rect, seg) < half)) return no('Cette zone est encore sous la brume.')
  if (state.enclosures.some((e) => rectSegmentDistance(e.rect, seg) < half)) return no('Il traverse un enclos.')
  if (!opts.free && state.coins < cost) return no(`Pas assez de pièces (il en faut ${cost}).`)
  return { ok: true, length, cost }
}

/** Ids des enclos reliés aujourd'hui et qui ne le seraient plus sans ce chemin. */
export function removalImpact(state: GameState, id: number): number[] {
  const before = [...linkedEnclosureIds(state)]
  const after = linkedEnclosureIds({ ...state, paths: state.paths.filter((p) => p.id !== id) })
  return before.filter((e) => !after.has(e))
}

type Plan = { segments: Seg[]; cost: number }
type SizedPlan = Plan & { length: number }

/** Points à 1,5 m de la clôture, sur les quatre côtés, tous les 0,5 m. */
function startPoints(r: Rect): PathPoint[] {
  const out: PathPoint[] = []
  const off = 1.5, step = 0.5
  for (let x = r.x; x <= r.x + r.w + 1e-9; x += step) out.push({ x, z: r.z - off }, { x, z: r.z + r.d + off })
  for (let z = r.z; z <= r.z + r.d + 1e-9; z += step) out.push({ x: r.x - off, z }, { x: r.x + r.w + off, z })
  return out
}

/** Meilleur plan (droit, sinon en L) et sa longueur, ou null. */
function bestPlan(state: GameState, enc: Enclosure): SizedPlan | null {
  const reach = reachableIds(state)
  const segs = allSegments(state).filter((s) => reach.has(s.id))
  const points = startPoints(enc.rect)
  const targetsOf = (p: PathPoint) => segs.flatMap((s) => [closestPoint(p, s), s.a, s.b])

  let straight: SizedPlan | null = null
  for (const p of points) {
    for (const t of targetsOf(p)) {
      if (straight && dist(t, p) >= straight.length) continue
      const c = checkSegment(state, t, p, { free: true })
      if (c.ok) straight = { segments: [{ a: t, b: p }], cost: c.cost, length: c.length }
    }
  }
  if (straight) return straight

  let best: SizedPlan | null = null
  for (const p of points) {
    for (const t of targetsOf(p)) {
      for (const c of [{ x: p.x, z: t.z }, { x: t.x, z: p.z }]) {
        const len = dist(t, c) + dist(c, p)
        if (best && len >= best.length) continue
        const first = checkSegment(state, t, c, { free: true })
        if (!first.ok) continue
        const next: GameState = { ...state, paths: [...state.paths, { id: state.nextId, a: t, b: c }] }
        const second = checkSegment(next, c, p, { free: true })
        if (second.ok) best = { segments: [{ a: t, b: c }, { a: c, b: p }], cost: first.cost + second.cost, length: len }
      }
    }
  }
  return best
}

/** Segments à poser pour relier un enclos ; null si rien n'est possible (liste vide s'il est déjà relié). */
export function linkPlan(state: GameState, encId: number): Plan | null {
  const enc = state.enclosures.find((e) => e.id === encId)
  if (!enc) return null
  if (isLinked(state, encId)) return { segments: [], cost: 0 }
  const plan = bestPlan(state, enc)
  return plan ? { segments: plan.segments, cost: plan.cost } : null
}

const GRID_STEP = 0.5
/** Au-delà de la marge minimale, les cases à moins de 1,5 m d'un obstacle coûtent plus cher : le trajet s'écarte des coins. */
const NEAR_M = 1.5
/** Poids de ce surcoût, essayés dans l'ordre jusqu'à ce que le trajet se réduise en segments valides. */
const NEAR_WEIGHTS = [2, 6, 0]

/** `free` : la case est libre ; `near` : 0 (loin des obstacles) à 1 (collée à la marge minimale). */
type Grid = { nx: number; nz: number; free: Uint8Array; near: Float32Array }
const cellPoint = (g: Grid, i: number): PathPoint => ({ x: PATH_AREA.x + (i % g.nx) * GRID_STEP, z: PATH_AREA.z + Math.floor(i / g.nx) * GRID_STEP })

/** Cases de 0,5 m où l'axe d'un chemin peut passer : mêmes marges que checkSegment (enclos, zones sous la brume). */
function freeGrid(state: GameState): Grid {
  const nx = Math.round(PATH_AREA.w / GRID_STEP) + 1, nz = Math.round(PATH_AREA.d / GRID_STEP) + 1
  const free = new Uint8Array(nx * nz)
  const half = PATHS_TUNING.WIDTH_M / 2
  const locked = ZONES.filter((z) => z.unlockLevel > state.village.level)
  const near = new Float32Array(nx * nz)
  const grid = { nx, nz, free, near }
  const rects = [...locked.map((z) => z.rect), ...state.enclosures.map((e) => e.rect)]
  for (let i = 0; i < free.length; i++) {
    const p = cellPoint(grid, i)
    const s = { a: p, b: p }
    let d = Infinity
    for (const r of rects) d = Math.min(d, rectSegmentDistance(r, s))
    free[i] = d < half ? 0 : 1
    near[i] = Math.max(0, Math.min(1, (half + NEAR_M - d) / NEAR_M))
  }
  return grid
}

/** Tas binaire minimal (file de priorité de l'A*). */
class MinHeap {
  private keys: number[] = []
  private vals: number[] = []
  get size() { return this.keys.length }
  push(key: number, val: number) {
    const k = this.keys, v = this.vals
    let i = k.length
    k.push(key); v.push(val)
    while (i > 0) {
      const p = (i - 1) >> 1
      if (k[p] <= key) break
      k[i] = k[p]; v[i] = v[p]; i = p
    }
    k[i] = key; v[i] = val
  }
  pop(): number {
    const k = this.keys, v = this.vals
    const top = v[0]
    const lastK = k.pop()!, lastV = v.pop()!
    const n = k.length
    if (n > 0) {
      let i = 0
      for (;;) {
        let c = 2 * i + 1
        if (c >= n) break
        if (c + 1 < n && k[c + 1] < k[c]) c++
        if (k[c] >= lastK) break
        k[i] = k[c]; v[i] = v[c]; i = c
      }
      k[i] = lastK; v[i] = lastV
    }
    return top
  }
}

/**
 * Plan de secours du chemin offert : recherche A* sur une grille de 0,5 m, puis la suite de cases est réduite
 * au moins de segments droits possible (chacun vérifié par checkSegment).
 */
function gridPlan(state: GameState, enc: Enclosure, grid: Grid): SizedPlan | null {
  for (const w of NEAR_WEIGHTS) {
    const plan = gridPlanWith(state, enc, grid, w)
    if (plan) return plan
  }
  return null
}

function gridPlanWith(state: GameState, enc: Enclosure, grid: Grid, nearWeight: number): SizedPlan | null {
  const { nx, nz, free, near } = grid
  const total = nx * nz
  const reach = reachableIds(state)
  const net = allSegments(state).filter((s) => reach.has(s.id))
  const range = PATHS_TUNING.WIDTH_M / 2 + PATHS_TUNING.TOUCH_EXTRA_M - 1e-6
  const toFence = (i: number) => { const p = cellPoint(grid, i); return rectSegmentDistance(enc.rect, { a: p, b: p }) }
  const isGoal = new Uint8Array(total)
  const h = new Float64Array(total)
  for (let i = 0; i < total; i++) {
    if (!free[i]) continue
    const d = toFence(i)
    h[i] = Math.max(0, d - range)
    if (d <= range) isGoal[i] = 1
  }
  const g = new Float64Array(total).fill(Infinity)
  const from = new Int32Array(total).fill(-1)
  const heap = new MinHeap()
  for (let i = 0; i < total; i++) {
    if (!free[i]) continue
    const p = cellPoint(grid, i)
    if (net.some((s) => pointSegmentDistance(p, s) <= GRID_STEP * Math.SQRT1_2 + 1e-9)) { g[i] = 0; heap.push(h[i], i) }
  }
  let goal = -1
  while (heap.size) {
    const cur = heap.pop()
    if (isGoal[cur]) { goal = cur; break }
    const cx = cur % nx, cz = Math.floor(cur / nx)
    for (let dx = -1; dx <= 1; dx++) {
      for (let dz = -1; dz <= 1; dz++) {
        if (!dx && !dz) continue
        const x = cx + dx, z = cz + dz
        if (x < 0 || z < 0 || x >= nx || z >= nz) continue
        const n = z * nx + x
        if (!free[n]) continue
        const ng = g[cur] + (dx && dz ? Math.SQRT2 : 1) * GRID_STEP * (1 + nearWeight * near[n])
        if (ng < g[n] - 1e-12) { g[n] = ng; from[n] = cur; heap.push(ng + h[n], n) }
      }
    }
  }
  if (goal < 0) return null
  const cells: PathPoint[] = []
  for (let i = goal; i >= 0; i = from[i]) cells.push(cellPoint(grid, i))
  cells.reverse()
  if (cells.length < 2) return null
  // Le premier point part du réseau lui-même (la case de départ peut en être à quelques décimètres).
  let begin = cells[0], bestD = Infinity
  for (const s of net) { const c = closestPoint(cells[0], s); const d = dist(c, cells[0]); if (d < bestD) { bestD = d; begin = c } }
  cells[0] = begin
  // Moins de segments possible : parcours en largeur sur les cases du trajet (un segment relie deux cases quand checkSegment l'accepte).
  const n = cells.length
  const prev = new Int32Array(n).fill(-1)
  const seen = new Uint8Array(n); seen[0] = 1
  const queue = [0]
  for (let q = 0; q < queue.length && !seen[n - 1]; q++) {
    const i = queue[q]
    // Un départ au milieu du trajet n'est pas encore sur le réseau : on le simule par un point posé là.
    const from = i === 0 ? state : { ...state, paths: [...state.paths, { id: state.nextId, a: cells[i], b: cells[i] }] }
    for (let j = n - 1; j > i; j--) {
      if (seen[j] || !checkSegment(from, cells[i], cells[j], { free: true }).ok) continue
      seen[j] = 1; prev[j] = i; queue.push(j)
      if (j === n - 1) break
    }
  }
  if (!seen[n - 1]) return null
  const chain: number[] = []
  for (let i = n - 1; i >= 0; i = prev[i]) chain.push(i)
  chain.reverse()
  const segments: Seg[] = []
  let cost = 0, length = 0, cur: GameState = state
  for (let k = 0; k + 1 < chain.length; k++) {
    const a = { ...cells[chain[k]] }, b = { ...cells[chain[k + 1]] }
    const c = checkSegment(cur, a, b, { free: true })
    if (!c.ok) return null
    segments.push({ a, b }); cost += c.cost; length += c.length
    cur = { ...cur, paths: [...cur.paths, { id: cur.nextId + segments.length, a, b }] }
  }
  return isLinked(cur, enc.id) ? { segments, cost, length } : null
}

/**
 * Chemin offert (vieilles parties) : relie gratuitement chaque enclos non relié, le plus facile d'abord ;
 * le réseau grandit à chaque ajout. Quand ni la ligne droite ni le L ne passent, une recherche sur grille prend le relais.
 * Ne modifie pas l'état reçu.
 */
export function giftPaths(state: GameState): { state: GameState; linked: number[]; stuck: number[] } {
  const s = structuredClone(state)
  const todo = s.enclosures.filter((e) => !isLinked(s, e.id)).map((e) => e.id)
  let grid: Grid | null = null
  for (;;) {
    const open = todo.filter((id) => !isLinked(s, id))
    if (open.length === 0) break
    let pick: SizedPlan | null = null
    for (const id of open) {
      const plan = bestPlan(s, s.enclosures.find((e) => e.id === id)!)
      if (plan && (!pick || plan.length < pick.length)) pick = plan
    }
    if (!pick) {
      grid ??= freeGrid(s) // ne dépend ni des chemins ni du niveau en cours : calculée une fois
      for (const id of open) {
        const plan = gridPlan(s, s.enclosures.find((e) => e.id === id)!, grid)
        if (plan && (!pick || plan.length < pick.length)) pick = plan
      }
    }
    if (!pick) break
    for (const seg of pick.segments) s.paths.push({ id: s.nextId++, a: { ...seg.a }, b: { ...seg.b } })
    if (open.filter((id) => !isLinked(s, id)).length === open.length) break // un tour qui ne relie rien de neuf : on arrête
  }
  return { state: s, linked: todo.filter((id) => isLinked(s, id)), stuck: todo.filter((id) => !isLinked(s, id)) }
}
