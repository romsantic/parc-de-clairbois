import { emptyState, enclosure, animal, employee, sick, T0 } from '../sim/helpers'
import { describe, it, expect } from 'vitest'
import { gazetteEdition, gazetteHeadline, formatDateFr } from '../../src/ui/gazetteModel'
import { summarize, type Summary } from '../../src/sim/summary'
import type { GameEvent, GameState } from '../../src/sim/types'

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

describe('résumé : santé (étape 3)', () => {
  const ev = (...e: GameEvent[]) => summarize(e)
  const malade = (disease: 'grippe' | 'parasites' | 'indigestion' | 'blessure'): GameEvent => ({ kind: 'malade', at: 1, animalId: 1, disease })
  it('compte repérages, maladies, soins et leur coût, et la cause des morts', () => {
    const s = ev(malade('grippe'), malade('parasites'), malade('grippe'),
      { kind: 'soigne', at: 2, animalId: 1, disease: 'grippe', cost: 100 }, { kind: 'soigne', at: 3, animalId: 2, disease: 'parasites', cost: 20 },
      { kind: 'mort', at: 4, animalId: 3, name: 'Noisette', species: 'mouton', cause: 'grippe' }, { kind: 'mort', at: 5, animalId: 4, name: 'Bête2', species: 'loup' })
    expect(s.malades).toBe(3)
    expect(s.maladies).toEqual({ grippe: 2, parasites: 1 })
    expect(s.soignes).toBe(2)
    expect(s.soinsCout).toBe(120)
    expect(s.morts).toEqual([{ name: 'Noisette', species: 'mouton', cause: 'grippe' }, { name: 'Bête2', species: 'loup' }])
  })
  it('calme : tout à zéro', () => {
    expect(calm()).toMatchObject({ soignes: 0, soinsCout: 0, maladies: {}, malades: 0 })
  })
})

describe('Gazette : rubrique Santé (étape 3)', () => {
  const santé = (s: Summary, state?: GameState) => gazetteEdition(s, H, state).items.filter((i) => i.label === 'Santé').map((i) => i.text)
  const withDiseases = (m: Summary['maladies']): Summary => ({ ...calm(), maladies: m, malades: Object.values(m).reduce((a, b) => a + (b ?? 0), 0) })
  it('0 malade : rien', () => {
    expect(santé(calm())).toEqual([])
  })
  it('1 malade : « Un animal est tombé malade (indigestion). »', () => {
    expect(santé(withDiseases({ indigestion: 1 }))).toEqual(['Un animal est tombé malade (indigestion).'])
  })
  it('plusieurs malades : détail par maladie', () => {
    expect(santé(withDiseases({ grippe: 1, parasites: 1 }))).toEqual(['2 animaux sont tombés malades (1 grippe, 1 parasites).'])
    expect(santé(withDiseases({ parasites: 3, blessure: 1 }))).toEqual(['4 animaux sont tombés malades (3 parasites, 1 blessure).'])
  })
  it('soins : seulement s’il y en a eu', () => {
    expect(santé({ ...calm(), soignes: 3, soinsCout: 240 })).toEqual(['Le vétérinaire a soigné 3 animaux pour 240 pièces.'])
    expect(santé({ ...calm(), soignes: 1, soinsCout: 20 })).toEqual(['Le vétérinaire a soigné 1 animal pour 20 pièces.'])
  })
  const park = (over: Partial<GameState>, n = 1, health = sick(T0)): GameState => emptyState({
    enclosures: [enclosure(1, 'mouton')],
    animals: Array.from({ length: n }, (_, i) => animal(i + 1, 'mouton', 'F', 1, { health: { ...health } })),
    ...over,
  })
  const centre = (level: number, vets: number): Partial<GameState> => ({
    buildings: [{ slot: 0, type: 'ferme', level: 1 }, ...(level > 0 ? [{ slot: 7, type: 'centreVeto' as const, level }] : [])],
    staff: { ...emptyState().staff, employees: Array.from({ length: vets }, (_, i) => employee(i + 1, 'veterinaire')) },
  })
  it('file d’attente au centre', () => {
    expect(santé(calm(), park(centre(1, 1), 2))).toEqual(['File d’attente au centre : 2 animaux.'])
    expect(santé(calm(), park(centre(1, 1), 1))).toEqual(['File d’attente au centre : 1 animal.'])
    expect(santé(calm(), park(centre(1, 1), 0))).toEqual([])
  })
  it('personne ne peut soigner : sans centre ou sans vétérinaire', () => {
    expect(santé(calm(), park(centre(0, 0), 1))).toEqual(['Personne ne peut soigner 1 animal : il faut le centre vétérinaire et un vétérinaire.'])
    expect(santé(calm(), park(centre(1, 0), 2))).toEqual(['Personne ne peut soigner 2 animaux : il faut embaucher un vétérinaire.'])
    expect(santé(calm(), park(centre(1, 0), 1))).toEqual(['Personne ne peut soigner 1 animal : il faut embaucher un vétérinaire.'])
  })
  it('centre trop petit : « attend que le centre passe au niveau 3 »', () => {
    const flu = sick(T0, { disease: 'grippe' })
    expect(santé(calm(), park(centre(1, 1), 1, flu))).toEqual(['1 animal attend que le centre passe au niveau 3.'])
    expect(santé(calm(), park(centre(2, 1), 2, flu))).toEqual(['2 animaux attendent que le centre passe au niveau 3.'])
  })
  it('un malade non repéré n’est ni en file ni sans soin', () => {
    expect(santé(calm(), park(centre(0, 0), 1, sick(T0, { detectedAt: null })))).toEqual([])
  })
  it('l’ordre : maladies, soins, file', () => {
    const s: Summary = { ...withDiseases({ parasites: 1 }), soignes: 1, soinsCout: 20 }
    expect(santé(s, park(centre(1, 1), 1))).toEqual(['Un animal est tombé malade (parasites).', 'Le vétérinaire a soigné 1 animal pour 20 pièces.', 'File d’attente au centre : 1 animal.'])
  })
  it('Disparus : la cause entre parenthèses quand on la connaît', () => {
    const s = { ...calm(), morts: [{ name: 'Noisette', species: 'mouton' as const, cause: 'grippe' as const }, { name: 'Bête2', species: 'loup' as const, cause: 'indigestion' as const }, { name: 'Rex', species: 'loup' as const }] }
    const t = Object.fromEntries(gazetteEdition(s, H).items.map((i) => [i.label, i.text]))
    expect(t['Disparus']).toBe('Noisette (grippe), Bête2 (indigestion), Rex')
  })
})
