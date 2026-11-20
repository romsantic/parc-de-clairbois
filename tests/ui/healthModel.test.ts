import { describe, it, expect } from 'vitest'
import { animal, emptyState, employee, enclosure, sick, T0 } from '../sim/helpers'
import { centreStatus, healthHelp, healthLabel, vetCenterView } from '../../src/ui/healthModel'
import { HOUR_MS } from '../../src/data/tuning'
import type { Animal, GameState, Health } from '../../src/sim/types'

/** Un parc avec un centre de niveau `level` (0 = aucun) et `vets` vétérinaires. */
function world(level: number, vets: number, animals: Animal[] = [], over: Partial<GameState> = {}): GameState {
  const buildings: GameState['buildings'] = [{ slot: 0, type: 'ferme', level: 1 }]
  if (level > 0) buildings.push({ slot: 7, type: 'centreVeto', level })
  return emptyState({
    buildings, enclosures: [enclosure(1, 'mouton', 20, 20), enclosure(2, 'loup', 20, 20)], animals,
    staff: {
      employees: Array.from({ length: vets }, (_, i) => employee(i + 1, 'veterinaire', { hiredAt: T0 + i })),
      candidates: [], renewAt: T0 + 100 * 24 * HOUR_MS, renewals: 1, payDay: -1, coverAllUntil: Number.MAX_SAFE_INTEGER,
    },
    ...over,
  })
}
const mouton = (id: number, health: Health = { status: 'ok' }) => animal(id, 'mouton', 'F', 1, { health })
const loup = (id: number, health: Health) => animal(id, 'loup', 'M', 2, { health })

describe('healthLabel', () => {
  it('en forme', () => {
    const s = world(1, 1, [mouton(1)])
    expect(healthLabel(s, s.animals[0])).toEqual({ text: 'En forme', tone: 'vert' })
  })
  it('un malade non repéré s\'affiche « En forme »', () => {
    const s = world(1, 1, [mouton(1, sick(T0, { detectedAt: null }))])
    expect(healthLabel(s, s.animals[0])).toEqual({ text: 'En forme', tone: 'vert' })
  })
  it('malade repéré que personne ne peut soigner : maladie et stade, couleur selon le stade', () => {
    const s = world(0, 0, [loup(1, sick(T0, { disease: 'grippe', stage: 2 })), mouton(2, sick(T0, { stage: 1 })), mouton(3, sick(T0, { stage: 3 }))])
    expect(healthLabel(s, s.animals[0])).toEqual({ text: 'Grippe · grave', tone: 'orange' })
    expect(healthLabel(s, s.animals[1])).toEqual({ text: 'Indigestion · léger', tone: 'jaune' })
    expect(healthLabel(s, s.animals[2])).toEqual({ text: 'Indigestion · mortel', tone: 'rouge' })
  })
  it('en soin : temps restant', () => {
    const s = world(1, 1, [mouton(1, sick(T0, { careUntil: T0 + 80 * 60_000, vetId: 1 }))])
    expect(healthLabel(s, s.animals[0])).toEqual({ text: 'En soin (encore 1 h 20)', tone: 'bleu' })
  })
  it('en file d\'attente : rang (le plus grave d\'abord)', () => {
    const s = world(1, 1, [mouton(1, sick(T0, { stage: 1 })), mouton(2, sick(T0 + 1, { stage: 1 })), mouton(3, sick(T0, { stage: 2 }))])
    expect(healthLabel(s, s.animals[2]).text).toBe('En file d\'attente (1ᵉʳ)')
    expect(healthLabel(s, s.animals[0])).toEqual({ text: 'En file d\'attente (2ᵉ)', tone: 'jaune' })
    expect(healthLabel(s, s.animals[1]).text).toBe('En file d\'attente (3ᵉ)')
  })
  it('en quarantaine', () => {
    const s = world(3, 1, [loup(1, sick(T0, { disease: 'grippe', quarantined: true }))])
    expect(healthLabel(s, s.animals[0])).toEqual({ text: 'En quarantaine · Grippe · léger', tone: 'bleu' })
  })
})

describe('healthHelp', () => {
  it('rien pour un animal en forme, en soin, en quarantaine, non repéré ou en file normale', () => {
    const s = world(3, 1, [
      mouton(1), mouton(2, sick(T0, { detectedAt: null })), mouton(3, sick(T0, { careUntil: T0 + HOUR_MS, vetId: 1 })),
      loup(4, sick(T0, { disease: 'grippe', quarantined: true })), mouton(5, sick(T0)),
    ])
    for (const a of s.animals) expect(healthHelp(s, a)).toBeNull()
  })
  it('pas de centre', () => {
    const s = world(0, 0, [mouton(1, sick(T0))])
    expect(healthHelp(s, s.animals[0])).toBe('Personne ne peut le soigner : construis le centre vétérinaire au village et embauche un vétérinaire.')
  })
  it('centre sans vétérinaire', () => {
    const s = world(1, 0, [mouton(1, sick(T0))])
    expect(healthHelp(s, s.animals[0])).toBe('Personne ne peut le soigner : embauche un vétérinaire.')
  })
  it('centre trop petit', () => {
    const s = world(1, 1, [loup(1, sick(T0, { disease: 'grippe' }))])
    expect(healthHelp(s, s.animals[0])).toBe('Le centre doit être au niveau 3 pour soigner la grippe.')
  })
  it('caisse trop basse', () => {
    const s = world(1, 1, [loup(1, sick(T0, { disease: 'parasites', stage: 2 }))], { coins: 100 })
    expect(healthHelp(s, s.animals[0])).toBe('Le soin attend : il faut 625 pièces dans la caisse.')
  })
})

describe('vetCenterView', () => {
  it('pas de centre', () => {
    const v = vetCenterView(world(0, 0))
    expect(v).toMatchObject({ level: 0, treats: [], nextUnlock: 'Niveau 1 : parasites et indigestion', queue: [], vaccination: null })
    expect(v.vets).toBe('0 vétérinaire au travail sur 0 place')
  })
  it('centre 3, 2 vétérinaires, 3 en file, 1 en quarantaine', () => {
    const s = world(3, 2, [
      mouton(1, sick(T0, { stage: 1 })), mouton(2, sick(T0 + 1, { stage: 2 })), mouton(3, sick(T0 + 2, { stage: 1 })),
      loup(4, sick(T0, { disease: 'grippe', quarantined: true })),
    ])
    const v = vetCenterView(s)
    expect(v.level).toBe(3)
    expect(v.treats).toEqual(['Parasites', 'Indigestion', 'Blessure', 'Grippe'])
    expect(v.vets).toBe('2 vétérinaires au travail sur 2 places')
    expect(v.quarantine).toBe('1 / 2 places')
    expect(v.nextUnlock).toBe('Niveau 4 : vaccination des enclos')
    expect(v.vaccination).toBeNull()
    expect(v.queue.map((q) => q.name)).toEqual(['Bête2', 'Bête1', 'Bête4', 'Bête3'])
    expect(v.queue[2].label).toBe('En quarantaine · Grippe · léger')
    expect(v.queue[0].label).toBe('En file d\'attente (1ᵉʳ)')
  })
  it('niveau 5 : plus de suivant, vaccination disponible', () => {
    const v = vetCenterView(world(5, 1))
    expect(v.nextUnlock).toBeNull()
    expect(v.vaccination).not.toBeNull()
    expect(v.vets).toBe('1 vétérinaire au travail sur 3 places')
  })
  it('sans vétérinaire la file est vide (la fiche le dit autrement)', () => {
    expect(vetCenterView(world(1, 0, [mouton(1, sick(T0))])).queue).toEqual([])
  })
})

describe('centreStatus', () => {
  const base = (vets: number, sickCount: number): GameState => emptyState({
    buildings: [{ slot: 0, type: 'ferme', level: 1 }, { slot: 7, type: 'centreVeto', level: 1 }],
    enclosures: [enclosure(1, 'mouton')],
    animals: Array.from({ length: sickCount }, (_, i) => animal(i + 1, 'mouton', 'F', 1, { health: sick(T0) })),
    staff: { ...emptyState().staff, employees: Array.from({ length: vets }, (_, i) => employee(i + 1, 'veterinaire')) },
  })
  it('sans vétérinaire : « aucun vétérinaire »', () => { expect(centreStatus(base(0, 2))).toBe('aucun vétérinaire') })
  it('un vétérinaire et une file', () => { expect(centreStatus(base(1, 0))).toBe('1 vétérinaire · file : 0') })
  it('deux vétérinaires : pluriel', () => { expect(centreStatus(base(2, 0))).toBe('2 vétérinaires · file : 0') })
})
