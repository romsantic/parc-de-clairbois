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

/**
 * Chemin offert (vieilles parties) : relie gratuitement chaque enclos non relié, le plus facile d'abord ;
 * le réseau grandit à chaque ajout. Ne modifie pas l'état reçu.
 */
export function giftPaths(state: GameState): { state: GameState; linked: number[]; stuck: number[] } {
  const s = structuredClone(state)
  const todo = s.enclosures.filter((e) => !isLinked(s, e.id)).map((e) => e.id)
  for (;;) {
    let pick: SizedPlan | null = null
    for (const id of todo) {
      if (isLinked(s, id)) continue
      const plan = bestPlan(s, s.enclosures.find((e) => e.id === id)!)
      if (plan && (!pick || plan.length < pick.length)) pick = plan
    }
    if (!pick) break
    for (const seg of pick.segments) s.paths.push({ id: s.nextId++, a: { ...seg.a }, b: { ...seg.b } })
  }
  return { state: s, linked: todo.filter((id) => isLinked(s, id)), stuck: todo.filter((id) => !isLinked(s, id)) }
}
