import { describe, it, expect } from 'vitest'
import { SLOTS } from '../../src/data/economy'
import { VILLAGE_PATHS } from '../../src/data/zones'

function distToSegment(px: number, pz: number, a: { x: number; z: number }, b: { x: number; z: number }) {
  const dx = b.x - a.x, dz = b.z - a.z
  const t = Math.max(0, Math.min(1, ((px - a.x) * dx + (pz - a.z) * dz) / (dx * dx + dz * dz)))
  return Math.hypot(px - a.x - t * dx, pz - a.z - t * dz)
}

describe('emplacements du village', () => {
  it('sont 6, avec des ids 0..5', () => {
    expect(SLOTS.map((s) => s.id)).toEqual([0, 1, 2, 3, 4, 5])
  })
  it('sont espacés d\'au moins 9 m', () => {
    for (const a of SLOTS) for (const b of SLOTS)
      if (a.id < b.id) expect(Math.hypot(a.x - b.x, a.z - b.z), `${a.id}-${b.id}`).toBeGreaterThanOrEqual(9)
  })
  it('sont à au moins 4,5 m de chaque chemin du village', () => {
    for (const s of SLOTS)
      for (const path of VILLAGE_PATHS)
        for (let i = 0; i < path.length - 1; i++)
          expect(distToSegment(s.x, s.z, path[i], path[i + 1]), `slot ${s.id}`).toBeGreaterThanOrEqual(4.5)
  })
  it('restent visibles : x entre 8 et 24', () => {
    for (const s of SLOTS) { expect(s.x).toBeGreaterThanOrEqual(8); expect(s.x).toBeLessThanOrEqual(24) }
  })
})
