import type { Animal, Building, Enclosure } from '../sim/types'
import { SLOTS } from '../data/economy'
import { villagePaths } from '../data/zones'
import { WALKERS } from '../data/visuals'
import { BRIDGE_Z } from './decor'

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

/** Arrêts devant les enclos occupés, sur l'allée du zoo, triés d'ouest en est. */
export function alleyStops(enclosures: Enclosure[], animals: Animal[], bx: number): RoutePoint[] {
  const occupied = new Set(animals.map((a) => a.enclosureId))
  const out: RoutePoint[] = []
  for (const e of enclosures) {
    if (!occupied.has(e.id)) continue
    const r = e.rect
    const gap = r.z + r.d <= BRIDGE_Z ? BRIDGE_Z - (r.z + r.d) : Math.max(0, r.z - BRIDGE_Z)
    if (gap > WALKERS.STOP_MAX_GAP) continue
    const cx = r.x + r.w / 2
    out.push({ x: Math.min(bx - 5, Math.max(-33, cx)), z: BRIDGE_Z, faceX: cx, faceZ: r.z + r.d / 2 })
  }
  return out.sort((a, b) => a.x - b.x)
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
 * Trajet complet : bout de la route → allée du zoo (arrêts devant les enclos occupés) → pont →
 * chemin du village → café (ou bout du chemin sans café) → retour par le même chemin.
 */
export function buildRoute(bx: number, alley: RoutePoint[], cafe: RoutePoint[] | null): RoutePoint[] {
  const village = cafe ?? villageLines(bx)[0].map((p) => ({ x: p.x, z: p.z }))
  const out: RoutePoint[] = [
    { x: ROUTE_START_X, z: BRIDGE_Z },
    ...alley,
    { x: bx - 3.5, z: BRIDGE_Z },
    { x: bx + 3.5, z: BRIDGE_Z },
    ...village,
  ]
  const back = out.slice(0, -1).reverse().map((p) => ({ x: p.x, z: p.z }))
  return [...out, ...back]
}
