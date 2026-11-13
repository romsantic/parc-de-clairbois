import { describe, it, expect } from 'vitest'
import { ageStage, satiety, isHungry } from '../../src/sim/animal'
import { HOUR_MS } from '../../src/data/tuning'
import { animal, T0 } from './helpers'

const MIN = 60_000

describe('animal', () => {
  it("âge d'un mouton (gestation 2 h) : bébé, jeune, adulte", () => {
    const a = animal(1, 'mouton', 'F', 1, { bornAt: T0 })
    expect(ageStage(a, T0 + 2 * HOUR_MS - MIN)).toBe('bebe')
    expect(ageStage(a, T0 + 2 * HOUR_MS)).toBe('jeune')
    expect(ageStage(a, T0 + 4 * HOUR_MS)).toBe('adulte')
  })
  it('la satiété tombe à 0 en 12 h sans manger ; affamé à partir de 12 h', () => {
    const a = animal(1, 'mouton', 'F', 1)
    expect(satiety(a, T0)).toBe(1)
    expect(satiety(a, T0 + 6 * HOUR_MS)).toBeCloseTo(0.5)
    expect(satiety(a, T0 + 12 * HOUR_MS)).toBe(0)
    expect(satiety(a, T0 + 30 * HOUR_MS)).toBe(0)
    expect(isHungry(a, T0 + 12 * HOUR_MS - MIN)).toBe(false)
    expect(isHungry(a, T0 + 12 * HOUR_MS)).toBe(true)
  })
})
