import { describe, it, expect } from 'vitest'
import { createRng, nextRandom } from '../../src/core/rng'

describe('nextRandom', () => {
  it('est pur et rejoue la même suite que createRng', () => {
    const r = createRng(42)
    let s = 42
    for (let i = 0; i < 5; i++) {
      const [v, n] = nextRandom(s)
      expect(v).toBe(r())
      s = n
    }
    expect(nextRandom(42)).toEqual(nextRandom(42))
  })
})

describe('createRng', () => {
  it('donne la même suite pour la même graine', () => {
    const a = createRng(42), b = createRng(42)
    expect([a(), a(), a()]).toEqual([b(), b(), b()])
  })
  it('donne des suites différentes pour des graines différentes', () => {
    expect(createRng(1)()).not.toBe(createRng(2)())
  })
  it('reste dans [0, 1)', () => {
    const r = createRng(7)
    for (let i = 0; i < 10_000; i++) {
      const x = r()
      expect(x).toBeGreaterThanOrEqual(0)
      expect(x).toBeLessThan(1)
    }
  })
})
