import { describe, it, expect } from 'vitest'
import { sunForHour, nightAmount } from '../../src/scene/sun'

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

describe('nightAmount', () => {
  it('0 en plein jour, 1 en pleine nuit', () => {
    expect(nightAmount(12)).toBe(0)
    expect(nightAmount(9)).toBe(0)
    expect(nightAmount(23)).toBe(1)
    expect(nightAmount(0)).toBe(1)
    expect(nightAmount(19)).toBeGreaterThanOrEqual(0.95)
  })
  it('transition douce au crépuscule et à l’aube', () => {
    for (const h of [18, 6]) {
      expect(nightAmount(h)).toBeGreaterThan(0.05)
      expect(nightAmount(h)).toBeLessThan(0.95)
    }
    expect(nightAmount(17.5)).toBeLessThan(nightAmount(18))
    expect(nightAmount(18)).toBeLessThan(nightAmount(18.5))
    expect(nightAmount(6.5)).toBeLessThan(nightAmount(6))
  })
  it('reste entre 0 et 1 et boucle sur 24 h', () => {
    for (let h = -2; h < 30; h += 0.25) {
      const n = nightAmount(h)
      expect(n).toBeGreaterThanOrEqual(0)
      expect(n).toBeLessThanOrEqual(1)
    }
    expect(nightAmount(25)).toBeCloseTo(nightAmount(1))
  })
})
