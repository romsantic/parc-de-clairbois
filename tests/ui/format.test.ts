import { describe, it, expect } from 'vitest'
import { formatAutonomy, formatGameTime } from '../../src/ui/format'

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
