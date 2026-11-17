import { describe, it, expect } from 'vitest'
import { gazetteEdition, gazetteHeadline, formatDateFr } from '../../src/ui/gazetteModel'
import { summarize, type Summary } from '../../src/sim/summary'

const calm = (): Summary => summarize([])
const H = 3_600_000

describe('titre à la une', () => {
  it('une mort passe avant tout', () => {
    const s = { ...calm(), naissances: 2, pieces: 500, morts: [{ name: 'Pâquerette', species: 'mouton' as const }] }
    expect(gazetteHeadline(s)).toBe('Triste nouvelle : Pâquerette nous a quittés')
    expect(gazetteHeadline({ ...s, morts: [...s.morts, ...s.morts] })).toContain('2 animaux')
  })
  it('puis les naissances, puis les recettes, sinon une journée calme', () => {
    expect(gazetteHeadline({ ...calm(), naissances: 3, pieces: 500 })).toBe('3 naissances au parc !')
    expect(gazetteHeadline({ ...calm(), naissances: 1 })).toBe('Un heureux événement au parc !')
    expect(gazetteHeadline({ ...calm(), pieces: 1234.4 })).toBe('1 234 pièces dans la caisse')
    expect(gazetteHeadline(calm())).toBe('Une journée calme à Clairbois')
  })
})

describe('rubriques', () => {
  it('calme : seulement la caisse et la durée', () => {
    const e = gazetteEdition(calm(), 5 * H + 20 * 60_000)
    expect(e.absence).toBe('Tu étais absent 5 h 20')
    expect(e.items).toEqual([{ label: 'Caisse', text: '0 pièce gagnée · 0 visiteur' }])
  })
  it('arrondit, accorde et liste les noms', () => {
    const s = { ...calm(), pieces: 99.6, visiteurs: 1, naissances: 1, fourrage: 12.4, viande: 0.2, malades: 2, serie: 1,
      morts: [{ name: 'Rex', species: 'loup' as const }, { name: 'Lola', species: 'cochon' as const }], missions: ['Nettoyer l’enclos'], quotidiennesRenouvelees: true }
    const t = Object.fromEntries(gazetteEdition(s, H).items.map((i) => [i.label, i.text]))
    expect(t['Caisse']).toBe('100 pièces gagnées · 1 visiteur')
    expect(t['Naissances']).toBe('1 naissance')
    expect(t['Garde-manger']).toBe('Les animaux ont mangé 12 de fourrage.')
    expect(t['Santé']).toBe('2 animaux sont tombés malades.')
    expect(t['Disparus']).toBe('Rex, Lola')
    expect(t['Mission réussie']).toBe('Nettoyer l’enclos')
    expect(t['Missions du jour']).toBe('3 nouvelles missions du jour')
    expect(t['Série']).toBe('1 jour de suite')
  })
})

describe('date', () => {
  it('en français', () => {
    expect(formatDateFr(new Date(2026, 10, 17, 12).getTime())).toBe('mardi 17 novembre 2026')
    expect(formatDateFr(new Date(2026, 11, 1, 12).getTime())).toBe('mardi 1er décembre 2026')
  })
})
