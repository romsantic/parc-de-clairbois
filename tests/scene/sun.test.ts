import { describe, it, expect } from 'vitest'
import { sunForHour } from '../../src/scene/sun'

describe('sunForHour', () => {
  it('soleil haut à midi', () => {
    expect(sunForHour(12).elevation).toBeCloseTo(60, 0)
  })
  it("soleil à l'horizon vers 6 h et 18 h", () => {
    expect(Math.abs(sunForHour(6).elevation)).toBeLessThan(5)
    expect(Math.abs(sunForHour(18).elevation)).toBeLessThan(5)
  })
  it('nuit sombre mais jamais noire', () => {
    const n = sunForHour(0)
    expect(n.intensity).toBeLessThanOrEqual(0.2)
    expect(n.intensity).toBeGreaterThan(0)
  })
  it('boucle sur 24 h, y compris en négatif', () => {
    expect(sunForHour(25)).toEqual(sunForHour(1))
    expect(sunForHour(-1)).toEqual(sunForHour(23))
  })
  it('donne des couleurs hexadécimales', () => {
    const s = sunForHour(9.5)
    expect(s.skyTop).toMatch(/^#[0-9a-f]{6}$/)
    expect(s.skyBottom).toMatch(/^#[0-9a-f]{6}$/)
  })
})
