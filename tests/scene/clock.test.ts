import { describe, it, expect } from 'vitest'
import { hourFromLocation } from '../../src/scene/clock'

const now = new Date(2026, 10, 13, 17, 30) // 17 h 30

describe('hourFromLocation', () => {
  it("prend l'heure réelle sans paramètre", () => {
    expect(hourFromLocation('', now)).toEqual({ hour: 17.5, forced: false })
  })
  it('force l’heure avec ?heure=14', () => {
    expect(hourFromLocation('?heure=14', now)).toEqual({ hour: 14, forced: true })
    expect(hourFromLocation('?heure=0', now)).toEqual({ hour: 0, forced: true })
  })
  it('ignore une valeur vide, invalide ou infinie', () => {
    for (const s of ['?heure=', '?heure=abc', '?heure=Infinity', '?heure=1e999'])
      expect(hourFromLocation(s, now)).toEqual({ hour: 17.5, forced: false })
  })
  it("ne confond pas un autre paramètre qui contient « heure= »", () => {
    expect(hourFromLocation('?theure=5', now)).toEqual({ hour: 17.5, forced: false })
  })
})
