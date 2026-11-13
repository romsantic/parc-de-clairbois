import { describe, it, expect } from 'vitest'
import { cleanliness, capacity } from '../../src/sim/enclosure'
import { HOUR_MS } from '../../src/data/tuning'
import { enclosure, T0 } from './helpers'

describe('enclos', () => {
  it('la propreté passe de 1 à 0 en 24 h, puis reste à 0', () => {
    const e = enclosure(1, 'mouton')
    expect(cleanliness(e, T0)).toBe(1)
    expect(cleanliness(e, T0 + 12 * HOUR_MS)).toBeCloseTo(0.5)
    expect(cleanliness(e, T0 + 24 * HOUR_MS)).toBe(0)
    expect(cleanliness(e, T0 + 40 * HOUR_MS)).toBe(0)
  })
  it('capacité = surface ÷ espace par animal, arrondie vers le bas ; 0 sans espèce', () => {
    expect(capacity(enclosure(1, 'mouton', 12, 10))).toBe(6)
    expect(capacity(enclosure(1, 'loup', 11, 10))).toBe(3)
    expect(capacity(enclosure(1, null))).toBe(0)
  })
})
