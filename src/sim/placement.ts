import { TUNING } from '../data/tuning'
import { PATHS, ZONES, type Zone } from '../data/zones'
import type { GameState, Rect } from './types'

const EPS = 1e-9

/** Prix d'un enclos : clôture au mètre + aménagement au m². */
export function enclosureCost(r: Rect): number {
  return TUNING.FENCE_COST_PER_M * 2 * (r.w + r.d) + TUNING.LAND_COST_PER_M2 * r.w * r.d
}

/** Agrandir : on paie la différence ; rétrécir : gratuit, sans remboursement. */
export function resizeCost(old: Rect, next: Rect): number {
  return Math.max(0, enclosureCost(next) - enclosureCost(old))
}

const half = (v: number) => Math.round(v * 2) / 2

/** Coins et côtés au demi-mètre. */
export function snapRect(r: Rect): Rect {
  return { x: half(r.x), z: half(r.z), w: half(r.w), d: half(r.d) }
}

const contains = (outer: Rect, r: Rect) =>
  r.x >= outer.x - EPS && r.z >= outer.z - EPS && r.x + r.w <= outer.x + outer.w + EPS && r.z + r.d <= outer.z + outer.d + EPS

/** Chevauchement strict : deux rects qui se touchent seulement ne se chevauchent pas. */
export const overlaps = (a: Rect, b: Rect) =>
  a.x < b.x + b.w - EPS && b.x < a.x + a.w - EPS && a.z < b.z + b.d - EPS && b.z < a.z + a.d - EPS

/** Zone qui contient entièrement le rect, s'il y en a une. */
export function zoneAt(r: Rect): Zone | null {
  return ZONES.find((z) => contains(z.rect, r)) ?? null
}

export type PlacementCheck = { ok: true; zone: Zone } | { ok: false; reason: string }

/** Peut-on poser (ou redimensionner, avec `ignoreId`) un enclos ici ? */
export function checkPlacement(state: GameState, r: Rect, ignoreId?: number): PlacementCheck {
  if (r.w < TUNING.MIN_SIDE_M - EPS || r.d < TUNING.MIN_SIDE_M - EPS)
    return { ok: false, reason: `Un côté doit faire au moins ${TUNING.MIN_SIDE_M} m.` }
  const zone = zoneAt(r)
  if (!zone) return { ok: false, reason: "L'enclos doit rester dans une zone." }
  if (zone.unlockLevel > TUNING.VILLAGE_LEVEL_V1)
    return { ok: false, reason: `Cette zone se débloque au niveau ${zone.unlockLevel} du village.` }
  if (state.enclosures.some((e) => e.id !== ignoreId && overlaps(e.rect, r)))
    return { ok: false, reason: 'Il chevauche un autre enclos.' }
  if (PATHS.some((p) => overlaps(p, r))) return { ok: false, reason: 'Il chevauche un chemin.' }
  return { ok: true, zone }
}
