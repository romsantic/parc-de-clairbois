import { describe, it, expect } from 'vitest'
import { diffById } from '../../src/scene/diff'

describe('diffById', () => {
  it('trouve les ajoutés, les retirés et les gardés', () => {
    const next = [{ id: 2 }, { id: 3 }, { id: 4 }]
    const d = diffById(new Set([1, 2, 3]), next)
    expect(d.added.map((x) => x.id)).toEqual([4])
    expect(d.removed).toEqual([1])
    expect(d.kept.map((x) => x.id)).toEqual([2, 3])
  })
  it('rien à faire quand tout est déjà affiché', () => {
    const d = diffById(new Set([5]), [{ id: 5 }])
    expect(d.added).toEqual([])
    expect(d.removed).toEqual([])
  })
})
