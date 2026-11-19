import { ENTRANCE_ID, ENTRANCE_PATH, PATHS_TUNING } from '../data/paths'
import type { GameState, PathPoint, PathSegment, Rect } from './types'

type Seg = { a: PathPoint; b: PathPoint }

/** Tous les segments : l'entrée (toujours là) puis les chemins construits. */
export function allSegments(state: GameState): PathSegment[] {
  return [...ENTRANCE_PATH, ...state.paths]
}

/** Distance d'un point à un segment. */
export function pointSegmentDistance(p: PathPoint, s: Seg): number {
  const dx = s.b.x - s.a.x, dz = s.b.z - s.a.z
  const len2 = dx * dx + dz * dz
  const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((p.x - s.a.x) * dx + (p.z - s.a.z) * dz) / len2))
  return Math.hypot(p.x - (s.a.x + t * dx), p.z - (s.a.z + t * dz))
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
let memoValue: Set<number> = new Set()

function signature(state: GameState): string {
  let k = ''
  for (const e of state.enclosures) k += `${e.id}:${e.rect.x},${e.rect.z},${e.rect.w},${e.rect.d};`
  k += '|'
  for (const p of state.paths) k += `${p.id}:${p.a.x},${p.a.z},${p.b.x},${p.b.z};`
  return k
}

/** Enclos reliés à l'entrée : à portée du bord d'un segment atteignable. */
export function linkedEnclosureIds(state: GameState): Set<number> {
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
    const dx = s.b.x - s.a.x, dz = s.b.z - s.a.z
    const len2 = dx * dx + dz * dz
    const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((x - s.a.x) * dx + (z - s.a.z) * dz) / len2))
    const point = { x: s.a.x + t * dx, z: s.a.z + t * dz }
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
