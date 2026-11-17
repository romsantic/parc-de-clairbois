import { describe, it, expect } from 'vitest'
import { formatAbsence, formatAutonomy, formatCountdown, formatGameTime, formatPerHour, formatProgress, formatReward, reputationLabel } from '../../src/ui/format'

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

describe('formatReward', () => {
  it('pièces, fourrage, viande, séparés par « + »', () => {
    expect(formatReward({ coins: 150, fourrage: 30 })).toBe('150 pièces + 30 fourrages')
    expect(formatReward({ fourrage: 100, viande: 50 })).toBe('100 fourrages + 50 viandes')
    expect(formatReward({ viande: 50, coins: 150, fourrage: 30 })).toBe('150 pièces + 30 fourrages + 50 viandes')
  })
  it('saute les éléments absents ou à 0', () => {
    expect(formatReward({ fourrage: 20 })).toBe('20 fourrages')
    expect(formatReward({ coins: 0, fourrage: 0, viande: 0 })).toBe('')
  })
  it('singulier pour 1', () => {
    expect(formatReward({ coins: 1 })).toBe('1 pièce')
    expect(formatReward({ fourrage: 1 })).toBe('1 fourrage')
    expect(formatReward({ viande: 1 })).toBe('1 viande')
  })
  it('milliers séparés par une espace insécable fine', () => {
    expect(formatReward({ coins: 1000 })).toBe('1 000 pièces')
    expect(formatReward({ coins: 5000 })).toBe('5 000 pièces')
    expect(formatReward({ coins: 150 })).toBe('150 pièces')
  })
  it('récompense vide', () => {
    expect(formatReward({})).toBe('')
  })
})

describe('formatProgress', () => {
  it('valeur sur cible', () => {
    expect(formatProgress(12, 20)).toBe('12/20')
  })
  it('arrondi vers le bas', () => {
    expect(formatProgress(12.7, 20)).toBe('12/20')
  })
  it('borné entre 0 et la cible', () => {
    expect(formatProgress(25, 20)).toBe('20/20')
    expect(formatProgress(-3, 5)).toBe('0/5')
    expect(formatProgress(Infinity, 48)).toBe('48/48')
  })
})

describe('formatAbsence', () => {
  const H = 3_600_000, M = 60_000, D = 24 * H
  it('minutes sous une heure, arrondies vers le bas', () => {
    expect(formatAbsence(45 * M)).toBe('45 min')
    expect(formatAbsence(45 * M + 59_000)).toBe('45 min')
    expect(formatAbsence(0)).toBe('0 min')
  })
  it('heures et minutes sous un jour', () => {
    expect(formatAbsence(3 * H + 20 * M)).toBe('3 h 20')
    expect(formatAbsence(3 * H + 5 * M)).toBe('3 h 05')
    expect(formatAbsence(3 * H)).toBe('3 h')
  })
  it('jours, minutes ignorées au-delà d’un jour', () => {
    expect(formatAbsence(D)).toBe('1 jour')
    expect(formatAbsence(2 * D)).toBe('2 jours')
    expect(formatAbsence(D + 5 * H)).toBe('1 jour et 5 h')
    expect(formatAbsence(2 * D + 5 * H + 40 * M)).toBe('2 jours et 5 h')
  })
})
