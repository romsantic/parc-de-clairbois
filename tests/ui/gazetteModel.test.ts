import { emptyState, enclosure, animal } from '../sim/helpers'
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
    expect(t['Garde-manger']).toBe('Les animaux ont mangé 12 fourrages.')
    expect(t['Santé']).toBe('2 animaux sont tombés malades.')
    expect(t['Disparus']).toBe('Rex, Lola')
    expect(t['Mission réussie']).toBe('Nettoyer l’enclos')
    expect(t['Missions du jour']).toBe('3 nouvelles missions du jour')
    expect(t['Série']).toBe('1 jour de suite')
  })
})

describe("missions versées d'office", () => {
  it('« (récompense versée) » au lieu de « (à récupérer) »', () => {
    const s = { ...calm(), missions: ['Nettoyer 2 fois', 'Vendre un animal'], missionsVersees: ['Nettoyer 2 fois'] }
    const t = gazetteEdition(s, H).items.filter((i) => i.label === 'Mission réussie').map((i) => i.text)
    expect(t).toEqual(['Nettoyer 2 fois (récompense versée)', 'Vendre un animal'])
  })
})

describe('date', () => {
  it('en français', () => {
    expect(formatDateFr(new Date(2026, 10, 17, 12).getTime())).toBe('mardi 17 novembre 2026')
    expect(formatDateFr(new Date(2026, 11, 1, 12).getTime())).toBe('mardi 1er décembre 2026')
  })
})

describe('garde-manger', () => {
  const eaten = { ...summarize([]), fourrage: 25, viande: 3 }
  it('pluriels corrects', () => {
    const t = gazetteEdition(eaten, H).items.find((i) => i.label === 'Garde-manger')!.text
    expect(t).toBe('Les animaux ont mangé 25 fourrages et 3 viandes.')
    expect(gazetteEdition({ ...eaten, fourrage: 1, viande: 0 }, H).items.find((i) => i.label === 'Garde-manger')!.text).toBe('Les animaux ont mangé 1 fourrage.')
  })
  it('sans animal : plus aucun animal à nourrir, jamais « ∞ »', () => {
    const t = gazetteEdition(eaten, H, emptyState()).items.find((i) => i.label === 'Garde-manger')!.text
    expect(t).toBe('Les animaux ont mangé 25 fourrages et 3 viandes. Plus aucun animal à nourrir.')
  })
  it('avec des animaux : l\'autonomie restante', () => {
    const s = emptyState({ enclosures: [enclosure(1, 'mouton')], animals: [animal(1, 'mouton', 'F', 1)], pantry: { fourrage: 100, viande: 0, capacity: 1000 } })
    expect(gazetteEdition(eaten, H, s).items.find((i) => i.label === 'Garde-manger')!.text).toMatch(/Il reste .+ d'autonomie\.$/)
  })
})

describe('personnel : résumé', () => {
  it('salaires payés, dus et montées de niveau', () => {
    const s = summarize([
      { kind: 'paie', at: H, due: 100, paid: 80 },
      { kind: 'paie', at: 2 * H, due: 20, paid: 20 },
      { kind: 'niveauEmploye', at: 2 * H, employeeId: 1, name: 'Léa', level: 2 },
    ])
    expect(s.salaires).toBe(100)
    expect(s.salairesDus).toBe(120)
    expect(s.niveaux).toEqual([{ name: 'Léa', level: 2 }])
  })
  it('sans événement : zéro', () => {
    expect(summarize([])).toMatchObject({ salaires: 0, salairesDus: 0, niveaux: [] })
  })
})

describe('personnel : Gazette', () => {
  const staffItems = (s: Summary) => gazetteEdition(s, H).items.filter((i) => i.label === 'Personnel').map((i) => i.text)
  it('salaires versés et montées de niveau', () => {
    const s = { ...calm(), salaires: 120, salairesDus: 120, niveaux: [{ name: 'Léa', level: 2 as const }] }
    expect(staffItems(s)).toEqual(['Salaires versés : 120 pièces.', 'Léa passe au niveau 2.'])
  })
  it('sans salaire ni montée : pas de rubrique', () => {
    expect(staffItems(calm())).toEqual([])
  })
  it('caisse vide : dit combien de salaires manquent', () => {
    const s = { ...calm(), salaires: 75, salairesDus: 120 }
    expect(staffItems(s)).toEqual(['Salaires versés : 75 pièces.', 'Caisse vide à minuit : il manque 45 pièces de salaires.'])
  })
  it('à la une : caisse vide après les morts, avant les naissances', () => {
    const debt = { ...calm(), salaires: 0, salairesDus: 40, naissances: 2 }
    expect(gazetteHeadline(debt)).toBe('Caisse vide : les salaires n’ont pas été payés en entier')
    expect(gazetteHeadline({ ...debt, morts: [{ name: 'Rex', species: 'loup' as const }] })).toBe('Triste nouvelle : Rex nous a quittés')
    expect(gazetteHeadline({ ...calm(), salaires: 40, salairesDus: 40, naissances: 2 })).toBe('2 naissances au parc !')
  })
})
