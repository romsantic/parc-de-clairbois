import { describe, it, expect } from 'vitest'
import { happiness } from '../../src/sim/happiness'
import { HOUR_MS } from '../../src/data/tuning'
import { animal, emptyState, enclosure, T0 } from './helpers'

describe('happiness', () => {
  const pair = () => emptyState({ enclosures: [enclosure(1, 'mouton')], animals: [animal(1, 'mouton', 'F', 1), animal(2, 'mouton', 'M', 1)] })
  it('nourri, propre, à l’aise, en bonne santé et accompagné → 1', () => {
    const s = pair()
    expect(happiness(s, s.animals[0])).toBeCloseTo(1)
  })
  it('espèce sociale seule → × 0,6', () => {
    const s = emptyState({ enclosures: [enclosure(1, 'mouton')], animals: [animal(1, 'mouton', 'F', 1)] })
    expect(happiness(s, s.animals[0])).toBeCloseTo(0.6)
  })
  it('affamé → 0', () => {
    const s = pair()
    s.time = T0 + 12 * HOUR_MS
    s.enclosures[0].cleanedAt = s.time
    s.animals[1].lastFedAt = s.time
    expect(happiness(s, s.animals[0])).toBe(0)
  })
  it('malade, le reste parfait → 0,8', () => {
    const s = pair()
    s.animals[0].health = { status: 'malade', since: T0 }
    expect(happiness(s, s.animals[0])).toBeCloseTo(0.8)
  })
  it('enclos surpeuplé → l’espace baisse le bonheur', () => {
    const s = emptyState({ enclosures: [enclosure(1, 'mouton', 4, 10)], // capacité 2
      animals: [1, 2, 3, 4].map((i) => animal(i, 'mouton', i % 2 ? 'F' : 'M', 1)) })
    expect(happiness(s, s.animals[0])).toBeCloseTo(0.8 + 0.2 * 0.5)
  })
})
