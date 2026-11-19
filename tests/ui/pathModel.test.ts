import { describe, it, expect } from 'vitest'
import { emptyState, enclosure } from '../sim/helpers'
import { pathWarning } from '../../src/ui/pathModel'
import { removalImpact } from '../../src/sim/paths'

const seg = (id: number, ax: number, az: number, bx: number, bz: number) => ({ id, a: { x: ax, z: az }, b: { x: bx, z: bz } })
const at = (id: number, species: 'mouton' | 'cochon' | null, x: number, z: number) => {
  const e = enclosure(id, species); e.rect = { x, z, w: 6, d: 6 }; return e
}

describe('avertissement de destruction d’un chemin', () => {
  it('aucun enclos coupé : seulement « Non remboursé. »', () => {
    const s = emptyState({ paths: [seg(2, -20, 10, -20, 0)] })
    expect(pathWarning(s, 2)).toBe('Non remboursé.')
  })
  it('un enclos coupé : « 1 enclos ne sera plus visité »', () => {
    const s = emptyState({ enclosures: [at(1, 'mouton', -26, -8)], paths: [seg(2, -20, 10, -20, -2)] })
    expect(removalImpact(s, 2)).toEqual([1])
    expect(pathWarning(s, 2)).toBe('Non remboursé. 1 enclos ne sera plus visité : Mouton.')
  })
  it('deux enclos coupés (dont un vide) : noms séparés par une virgule', () => {
    const s = emptyState({ enclosures: [at(1, 'mouton', -26, -8), at(3, null, -19, -8)], paths: [seg(2, -20, 10, -20, -2)] })
    expect(removalImpact(s, 2).length).toBe(2)
    expect(pathWarning(s, 2)).toBe('Non remboursé. 2 enclos ne seront plus visités : Mouton, Enclos vide.')
  })
})
