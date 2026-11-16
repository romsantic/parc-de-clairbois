import { describe, it, expect } from 'vitest'
import { formatAutonomy, formatCountdown, formatGameTime, formatPerHour, reputationLabel } from '../../src/ui/format'

describe('formatAutonomy', () => {
  it('infini quand personne ne mange', () => {
    expect(formatAutonomy(Infinity)).toEqual({ text: '∞', level: 'ok' })
  })
  it('jours et heures au-delà de 24 h', () => {
    expect(formatAutonomy(30)).toEqual({ text: '1 j 6 h', level: 'ok' })
    expect(formatAutonomy(48.9)).toEqual({ text: '2 j', level: 'ok' })
  })
  it('attention sous 1 jour, urgent sous 6 h', () => {
    expect(formatAutonomy(20)).toEqual({ text: '20 h', level: 'attention' })
    expect(formatAutonomy(5)).toEqual({ text: '5 h', level: 'urgent' })
    expect(formatAutonomy(0)).toEqual({ text: '0 h', level: 'urgent' })
  })
})

describe('formatGameTime', () => {
  it('jour abrégé et heure, en français', () => {
    const t = new Date(2026, 10, 12, 14, 5).getTime() // jeudi 12 novembre 2026, 14:05 (heure locale)
    expect(formatGameTime(t)).toBe('jeu. 14:05')
  })
})

describe('formatPerHour', () => {
  it('arrondit à l’unité', () => {
    expect(formatPerHour(42.4, 379.6)).toBe('≈ 42 visiteurs/h · 380 pièces/h')
    expect(formatPerHour(0, 0)).toBe('≈ 0 visiteurs/h · 0 pièces/h')
  })
})

describe('reputationLabel', () => {
  it('bonne, moyenne, mauvaise', () => {
    expect(reputationLabel(1)).toBe('bonne')
    expect(reputationLabel(0.8)).toBe('bonne')
    expect(reputationLabel(0.79)).toBe('moyenne')
    expect(reputationLabel(0.5)).toBe('moyenne')
    expect(reputationLabel(0.49)).toBe('mauvaise')
    expect(reputationLabel(0)).toBe('mauvaise')
  })
})

describe('formatCountdown', () => {
  const H = 3_600_000, M = 60_000
  it('heures et minutes', () => {
    expect(formatCountdown(3 * H + 20 * M)).toBe('3 h 20')
    expect(formatCountdown(3 * H + 5 * M)).toBe('3 h 05')
    expect(formatCountdown(2 * H)).toBe('2 h')
  })
  it('minutes seules sous une heure, jamais négatif', () => {
    expect(formatCountdown(45 * M)).toBe('45 min')
    expect(formatCountdown(30_000)).toBe('1 min')
    expect(formatCountdown(-5)).toBe('0 min')
  })
})
