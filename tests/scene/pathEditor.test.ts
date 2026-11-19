import { describe, it, expect } from 'vitest'
import { snapEnd } from '../../src/scene/pathEditor'
import { emptyState } from '../sim/helpers'

const seg = (id: number, ax: number, az: number, bx: number, bz: number) => ({ id, a: { x: ax, z: az }, b: { x: bx, z: bz } })

describe('snapEnd', () => {
  const start = { x: -20, z: 10 }
  it('accroche le point du réseau le plus proche à moins de snap', () => {
    const s = emptyState({ paths: [seg(2, -20, 10, -20, 0)] })
    const r = snapEnd(s, { x: -19, z: 3.2 }, start, 2)
    expect(r.x).toBeCloseTo(-20); expect(r.z).toBeCloseTo(3.2)
  })
  it('arrondit au demi-mètre quand rien n’est assez près', () => {
    const s = emptyState({ paths: [seg(2, -20, 10, -20, 0)] })
    expect(snapEnd(s, { x: -10.3, z: 3.8 }, start, 2)).toEqual({ x: -10.5, z: 4 })
  })
  it('n’accroche jamais le départ lui-même', () => {
    const s = emptyState({ paths: [] })
    // entrée : segment z = 10 ; le départ est son point (-20, 10)
    // le point du réseau le plus proche est le départ : on l'ignore et on arrondit
    expect(snapEnd(s, { x: -20.02, z: 10.01 }, start, 2)).toEqual({ x: -20, z: 10 })
    // un peu plus loin sur l'entrée : on s'y accroche, sans retomber sur le départ
    expect(snapEnd(s, { x: -18.5, z: 10.4 }, start, 2)).toEqual({ x: -18.5, z: 10 })
  })
  it('accroche l’entrée aussi', () => {
    const s = emptyState({ paths: [] })
    expect(snapEnd(s, { x: -30, z: 11.2 }, { x: -20, z: 0 }, 2)).toEqual({ x: -30, z: 10 })
  })
})
