import type { Building, GameState } from '../sim/types'
import { SLOTS } from '../data/economy'
import { ENTRANCE_PATH } from '../data/paths'
import { villagePaths } from '../data/zones'
import { WALK_ROUTE } from '../data/visuals'
import { allSegments, closestPoint, linkedEnclosureIds, reachableIds } from '../sim/paths'
import { buildPathGraph, dijkstra, shortestPath } from './pathGraph'
import { BRIDGE_Z, BRIDGE_DECK_Y, BRIDGE_HALF_SPAN } from './decor'

/** Point d'un trajet. Avec `faceX/faceZ` : arrêt possible, en regardant ce point. */
export interface RoutePoint { x: number; z: number; faceX?: number; faceZ?: number; always?: boolean }

/** Bout de la route, hors de la carte : les promeneurs y apparaissent et y disparaissent. */
export const ROUTE_START_X = -36

/** Abscisse du pont : là où la rivière croise l'allée du zoo (même calcul que le décor). */
export function bridgeX(riverDistance: (x: number, z: number) => number): number {
  let bx = 0, best = Infinity
  for (let x = -2; x <= 10; x += 0.1) { const d = riverDistance(x, BRIDGE_Z); if (d < best) { best = d; bx = x } }
  return bx
}

/** Les deux chemins du village sous forme de polylignes qui partent toutes de la sortie du pont. */
function villageLines(bx: number): { x: number; z: number }[][] {
  const [main, branch] = villagePaths(bx)
  const fork = main.findIndex((p) => p.x === branch[0].x && p.z === branch[0].z)
  return [main, [...main.slice(0, fork + 1), ...branch.slice(1)]]
}

function nearestOn(line: { x: number; z: number }[], px: number, pz: number) {
  let best = { d: Infinity, i: 0, x: 0, z: 0 }
  for (let i = 0; i < line.length - 1; i++) {
    const a = line[i], b = line[i + 1]
    const dx = b.x - a.x, dz = b.z - a.z
    const t = Math.max(0, Math.min(1, ((px - a.x) * dx + (pz - a.z) * dz) / (dx * dx + dz * dz || 1)))
    const x = a.x + dx * t, z = a.z + dz * t
    const d = Math.hypot(px - x, pz - z)
    if (d < best.d) best = { d, i, x, z }
  }
  return best
}

/** Chemin jusqu'au café (point du chemin le plus proche de lui), qui le regarde ; null sans café. */
export function cafeRoute(buildings: Building[], bx: number): RoutePoint[] | null {
  const cafe = buildings.find((b) => b.type === 'cafe')
  const slot = cafe && SLOTS.find((s) => s.id === cafe.slot)
  if (!slot) return null
  let best: { d: number; i: number; x: number; z: number; line: { x: number; z: number }[] } | null = null
  for (const line of villageLines(bx)) {
    const n = nearestOn(line, slot.x, slot.z)
    if (!best || n.d < best.d) best = { ...n, line }
  }
  if (!best) return null
  return [
    ...best.line.slice(0, best.i + 1).map((p) => ({ x: p.x, z: p.z })),
    { x: best.x, z: best.z, faceX: slot.x, faceZ: slot.z, always: true },
  ]
}

/**
 * Prépare les trajets sur le réseau réel (le graphe n'est construit qu'une fois) : renvoie une fonction qui,
 * à chaque appel, tire un trajet propre à un promeneur. Bout de la route → jusqu'à MAX_STOPS arrêts devant
 * des enclos occupés et reliés (du plus proche au plus lointain) → bout de l'allée → pont → chemin du village
 * → café (ou bout du chemin sans café) → retour par le même chemin.
 */
export function networkPlan(state: GameState, bx: number): (rng: () => number) => RoutePoint[] {
  const reach = reachableIds(state)
  const segs = allSegments(state).filter((s) => reach.has(s.id))
  const linked = linkedEnclosureIds(state)
  const occupied = new Set(state.animals.map((a) => a.enclosureId))
  const stops: RoutePoint[] = []
  for (const e of state.enclosures) {
    if (!occupied.has(e.id) || !linked.has(e.id)) continue
    const c = { x: e.rect.x + e.rect.w / 2, z: e.rect.z + e.rect.d / 2 }
    let best: { x: number; z: number } | null = null, bd = Infinity
    for (const s of segs) {
      const p = closestPoint(c, s)
      const d = Math.hypot(c.x - p.x, c.z - p.z)
      if (d < bd) { bd = d; best = p }
    }
    if (best) stops.push({ x: best.x, z: best.z, faceX: c.x, faceZ: c.z })
  }
  const g = buildPathGraph(segs, stops)
  const entrance = ENTRANCE_PATH[0]
  const start = g.nodeAt(entrance.a), end = g.nodeAt(entrance.b)
  const { dist } = dijkstra(g, start)
  const ordered = stops
    .map((p) => ({ p, node: g.nodeAt(p) }))
    .filter((c) => dist[c.node] < Infinity)
  const village = cafeRoute(state.buildings, bx) ?? villageLines(bx)[0].map((p) => ({ x: p.x, z: p.z }))

  return (rng) => {
    const pool = [...ordered]
    const picked: typeof ordered = []
    while (picked.length < WALK_ROUTE.MAX_STOPS && pool.length) picked.push(pool.splice(Math.floor(rng() * pool.length), 1)[0])
    picked.sort((a, b) => dist[a.node] - dist[b.node])
    const out: RoutePoint[] = [{ x: ROUTE_START_X, z: BRIDGE_Z }]
    let at = start
    const go = (to: number, face?: RoutePoint) => {
      const path = shortestPath(g, at, to)
      for (const n of path.slice(1)) out.push({ x: g.nodes[n].x, z: g.nodes[n].z })
      if (face) out[out.length - 1] = { x: face.x, z: face.z, faceX: face.faceX, faceZ: face.faceZ }
      if (path.length) at = to
    }
    for (const c of picked) go(c.node, c.p)
    go(end)
    const tail: RoutePoint[] = [{ x: bx - WALK_ROUTE.BRIDGE_APPROACH, z: BRIDGE_Z }, { x: bx + WALK_ROUTE.BRIDGE_APPROACH, z: BRIDGE_Z }, ...village]
    for (const p of tail) {
      const last = out[out.length - 1]
      if (p.faceX === undefined && Math.hypot(last.x - p.x, last.z - p.z) < 0.01) continue
      out.push(p)
    }
    const back = out.slice(0, -1).reverse().map((p) => ({ x: p.x, z: p.z }))
    return [...out, ...back]
  }
}

/** Un trajet de promeneur sur le réseau réel (voir networkPlan). */
export function networkRoute(state: GameState, bx: number, rng: () => number): RoutePoint[] {
  return networkPlan(state, bx)(rng)
}

/** Hauteur des pieds : celle du sol, ou celle du tablier sur le pont (rampe douce depuis chaque berge). */
export function walkHeight(x: number, z: number, bx: number, ground: (x: number, z: number) => number): number {
  const g = Math.max(ground(x, z), -0.05)
  if (Math.abs(z - BRIDGE_Z) > 1.4) return g
  const t = Math.max(0, Math.min(1, (BRIDGE_HALF_SPAN - Math.abs(x - bx)) / WALK_ROUTE.DECK_RAMP))
  return g + (BRIDGE_DECK_Y - g) * t
}

/** Comme walkHeight, avec mémoire : le sol n'est interrogé qu'une fois par case de HEIGHT_CELL mètres (les trajets sont toujours les mêmes). */
export function cachedWalkHeight(bx: number, ground: (x: number, z: number) => number): (x: number, z: number) => number {
  const cell = WALK_ROUTE.HEIGHT_CELL
  const memo = new Map<string, number>()
  return (x, z) => {
    const cx = Math.round(x / cell), cz = Math.round(z / cell)
    const key = `${cx},${cz}`
    let h = memo.get(key)
    if (h === undefined) { h = walkHeight(cx * cell, cz * cell, bx, ground); memo.set(key, h) }
    return h
  }
}
