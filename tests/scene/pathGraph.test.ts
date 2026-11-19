import { describe, it, expect } from 'vitest'
import { buildPathGraph, shortestPath } from '../../src/scene/pathGraph'

const seg = (ax: number, az: number, bx: number, bz: number) => ({ a: { x: ax, z: az }, b: { x: bx, z: bz } })

describe('graphe des chemins', () => {
  it('croisement : deux segments en X donnent 5 nœuds, le plus court passe par le croisement', () => {
    const g = buildPathGraph([seg(-10, -10, 10, 10), seg(-10, 10, 10, -10)], [])
    expect(g.nodes).toHaveLength(5)
    const path = shortestPath(g, g.nodeAt({ x: -10, z: -10 }), g.nodeAt({ x: 10, z: 10 }))
    expect(path).toHaveLength(3)
    expect(g.nodes[path[1]]).toMatchObject({ x: 0, z: 0 })
  })
  it('départ en milieu de segment et point extra coupent le segment', () => {
    const g = buildPathGraph([seg(0, 0, 10, 0), seg(5, 0, 5, 6)], [{ x: 2, z: 1 }])
    expect(g.nodes).toHaveLength(5)
    expect(g.nodes.some((n) => Math.abs(n.x - 2) < 1e-9 && n.z === 0)).toBe(true)
  })
  it('inaccessible : segment isolé', () => {
    const g = buildPathGraph([seg(0, 0, 10, 0), seg(0, 20, 10, 20)], [])
    expect(shortestPath(g, g.nodeAt({ x: 0, z: 0 }), g.nodeAt({ x: 10, z: 20 }))).toEqual([])
  })
})
