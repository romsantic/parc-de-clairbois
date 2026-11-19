import type { PathPoint } from '../sim/types'

type Seg = { a: PathPoint; b: PathPoint }

export interface PathGraph {
  nodes: PathPoint[]
  edges: { to: number; len: number }[][]
  /** Nœud le plus proche de p. */
  nodeAt(p: PathPoint): number
}

/** Deux points à moins de cette distance (m) sont le même nœud. */
const MERGE = 0.06

function paramOn(s: Seg, p: PathPoint): number {
  const dx = s.b.x - s.a.x, dz = s.b.z - s.a.z
  const len2 = dx * dx + dz * dz
  return len2 === 0 ? 0 : Math.max(0, Math.min(1, ((p.x - s.a.x) * dx + (p.z - s.a.z) * dz) / len2))
}

const at = (s: Seg, t: number): PathPoint => ({ x: s.a.x + (s.b.x - s.a.x) * t, z: s.a.z + (s.b.z - s.a.z) * t })

/** Paramètres (sur s1) où s1 en coupe un autre en son milieu. */
function crossingT(s1: Seg, s2: Seg): number | null {
  const rx = s1.b.x - s1.a.x, rz = s1.b.z - s1.a.z
  const qx = s2.b.x - s2.a.x, qz = s2.b.z - s2.a.z
  const den = rx * qz - rz * qx
  if (Math.abs(den) < 1e-12) return null
  const wx = s2.a.x - s1.a.x, wz = s2.a.z - s1.a.z
  const t = (wx * qz - wz * qx) / den
  const u = (wx * rz - wz * rx) / den
  return t >= 0 && t <= 1 && u >= 0 && u <= 1 ? t : null
}

/**
 * Graphe de marche : les segments sont coupés aux croisements, aux départs en milieu de segment
 * et aux points `extra` (projetés sur leur segment le plus proche).
 */
export function buildPathGraph(segs: Seg[], extra: PathPoint[]): PathGraph {
  const nodes: PathPoint[] = []
  const edges: { to: number; len: number }[][] = []
  const nodeAt = (p: PathPoint): number => {
    let best = -1, bd = Infinity
    nodes.forEach((n, i) => { const d = Math.hypot(n.x - p.x, n.z - p.z); if (d < bd) { bd = d; best = i } })
    return best
  }
  const addNode = (p: PathPoint): number => {
    const i = nodeAt(p)
    if (i >= 0 && Math.hypot(nodes[i].x - p.x, nodes[i].z - p.z) <= MERGE) return i
    nodes.push({ x: p.x, z: p.z }); edges.push([])
    return nodes.length - 1
  }

  const cuts: number[][] = segs.map(() => [0, 1])
  segs.forEach((s, i) => {
    segs.forEach((o, j) => {
      if (i === j) return
      const t = crossingT(s, o)
      if (t !== null) cuts[i].push(t)
      for (const p of [o.a, o.b]) {
        const q = at(s, paramOn(s, p))
        if (Math.hypot(q.x - p.x, q.z - p.z) <= MERGE) cuts[i].push(paramOn(s, p))
      }
    })
  })
  for (const p of extra) {
    let bi = -1, bd = Infinity
    segs.forEach((s, i) => { const q = at(s, paramOn(s, p)); const d = Math.hypot(q.x - p.x, q.z - p.z); if (d < bd) { bd = d; bi = i } })
    if (bi >= 0) cuts[bi].push(paramOn(segs[bi], p))
  }

  segs.forEach((s, i) => {
    const ids = cuts[i].sort((x, y) => x - y).map((t) => addNode(at(s, t)))
    for (let k = 0; k < ids.length - 1; k++) {
      const a = ids[k], b = ids[k + 1]
      if (a === b || edges[a].some((e) => e.to === b)) continue
      const len = Math.hypot(nodes[b].x - nodes[a].x, nodes[b].z - nodes[a].z)
      edges[a].push({ to: b, len }); edges[b].push({ to: a, len })
    }
  })
  return { nodes, edges, nodeAt }
}

/** Distances (m) depuis un nœud, et nœud précédent sur le plus court chemin (Dijkstra). */
export function dijkstra(g: PathGraph, from: number): { dist: number[]; prev: number[] } {
  const n = g.nodes.length
  const dist: number[] = new Array(n).fill(Infinity), prev: number[] = new Array(n).fill(-1)
  const done: boolean[] = new Array(n).fill(false)
  dist[from] = 0
  for (;;) {
    let u = -1
    for (let i = 0; i < n; i++) if (!done[i] && dist[i] < Infinity && (u < 0 || dist[i] < dist[u])) u = i
    if (u < 0) break
    done[u] = true
    for (const e of g.edges[u]) if (dist[u] + e.len < dist[e.to]) { dist[e.to] = dist[u] + e.len; prev[e.to] = u }
  }
  return { dist, prev }
}

/** Nœuds du plus court chemin de `from` à `to` (les deux compris) ; [] si inaccessible. */
export function shortestPath(g: PathGraph, from: number, to: number): number[] {
  if (from < 0 || to < 0 || from >= g.nodes.length || to >= g.nodes.length) return []
  const { dist, prev } = dijkstra(g, from)
  if (dist[to] === Infinity) return []
  const out = [to]
  while (out[0] !== from) out.unshift(prev[out[0]])
  return out
}
