/** Déambulation des animaux dans leur enclos. Fonctions pures, testées. */
export interface Bounds { minX: number; maxX: number; minZ: number; maxZ: number }
export interface Point { x: number; z: number }

export function pickWanderTarget(b: Bounds, rng: () => number, margin = 0.5): Point {
  return {
    x: b.minX + margin + rng() * (b.maxX - b.minX - 2 * margin),
    z: b.minZ + margin + rng() * (b.maxZ - b.minZ - 2 * margin),
  }
}

export function stepToward(pos: Point, target: Point, speed: number, dt: number): Point & { arrived: boolean } {
  const dx = target.x - pos.x, dz = target.z - pos.z
  const dist = Math.hypot(dx, dz), step = speed * dt
  if (dist <= step) return { x: target.x, z: target.z, arrived: true }
  return { x: pos.x + (dx / dist) * step, z: pos.z + (dz / dist) * step, arrived: false }
}

import { NIGHT } from '../data/visuals'

/** Durée d'une pause (s) : 2 à 6 s de jour, jusqu'à NIGHT.REST_FACTOR fois plus à pleine nuit (night 0..1). */
export function restDuration(rng: () => number, night: number): number {
  return (2 + rng() * 4) * (1 + night * (NIGHT.REST_FACTOR - 1))
}

/** Les animaux marchent plus doucement la nuit. */
export function walkSpeedFactor(night: number): number {
  return 1 - night * (1 - NIGHT.WALK_SPEED_FACTOR)
}
