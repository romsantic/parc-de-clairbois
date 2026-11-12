import { describe, it, expect } from 'vitest'
import { createRng } from '../../src/core/rng'

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
