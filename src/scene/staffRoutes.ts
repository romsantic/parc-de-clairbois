import type { Employee, GameState } from '../sim/types'
import { SLOTS } from '../data/economy'
import { MAIRIE } from '../data/village'
import { STAFF_WALKERS } from '../data/visuals'
import type { RoutePoint } from './visitorRoutes'

/** Rayon du petit tour autour de la maison du personnel (ou de la mairie), en m. */
const HOME_RADIUS_M = 3

/** Boucle fermée autour d'un rectangle (décalée de `gap` vers l'extérieur) : un arrêt au milieu de deux côtés, tourné vers le centre. */
function loopAround(x0: number, z0: number, x1: number, z1: number, gap: number): RoutePoint[] {
  const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2
  const a = x0 - gap, b = x1 + gap, c = z0 - gap, d = z1 + gap
  const stop = (x: number, z: number): RoutePoint => ({ x, z, faceX: cx, faceZ: cz, always: true })
  return [
    { x: a, z: c }, stop(cx, c), { x: b, z: c },
    { x: b, z: d }, stop(cx, d), { x: a, z: d },
    { x: a, z: c },
  ]
}

/** Fait partir la boucle fermée d'un autre point (le dernier point répète le premier). */
function rotate(loop: RoutePoint[], slot: number): RoutePoint[] {
  const pts = loop.slice(0, -1)
  const k = ((slot % pts.length) + pts.length) % pts.length
  if (k === 0) return loop
  const r = [...pts.slice(k), ...pts.slice(0, k)]
  return [...r, r[0]]
}

/**
 * Trajet décoratif d'un employé (les règles n'en dépendent jamais) : tour de la clôture de son premier enclos
 * encore existant (`slot` : rang parmi ceux du même enclos, pour partir d'un autre point de la boucle) ; sans enclos, petit tour autour de la maison du personnel, sinon de la mairie.
 */
export function staffRoute(state: GameState, e: Employee, slot = 0): RoutePoint[] {
  const enc = e.encIds.map((id) => state.enclosures.find((x) => x.id === id)).find((x) => x !== undefined)
  if (enc) {
    const r = enc.rect
    return rotate(loopAround(r.x, r.z, r.x + r.w, r.z + r.d, STAFF_WALKERS.FENCE_GAP_M), slot)
  }
  const hasHouse = state.buildings.some((b) => b.type === 'personnel')
  const home = (hasHouse && SLOTS.find((s) => s.id === 6)) || MAIRIE
  const loop = loopAround(home.x, home.z, home.x, home.z, HOME_RADIUS_M)
  return loop.map((p) => (p.faceX === undefined ? p : { ...p, faceX: home.x, faceZ: home.z }))
}
