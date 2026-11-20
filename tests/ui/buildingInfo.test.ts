import { describe, it, expect } from 'vitest'
import { animal, emptyState, enclosure } from '../sim/helpers'
import { buildingInfo } from '../../src/ui/buildingInfo'
import { buildingIncomePerHour } from '../../src/sim/economy'
import { BUILDINGS, SLOTS } from '../../src/data/economy'
import { VILLAGE_PROPS } from '../../src/data/village'
import { formatAmount, formatCoins } from '../../src/ui/format'
import type { GameState } from '../../src/sim/types'

const park = (over: Partial<GameState> = {}): GameState => emptyState({
  enclosures: [enclosure(1, 'mouton')],
  animals: [animal(1, 'mouton', 'F', 1), animal(2, 'mouton', 'M', 1)],
  village: { level: 2, clientsServed: 0 },
  buildings: [
    { slot: 0, type: 'ferme', level: 1 },
    { slot: 1, type: 'cafe', level: 1 },
    { slot: 2, type: 'boutique', level: 2 },
    { slot: 3, type: 'auberge', level: 3 },
  ],
  ...over,
})
const row = (info: ReturnType<typeof buildingInfo>, label: string) => info!.rows.find((r) => r.label === label)?.value

describe('fiche d\'un bâtiment', () => {
  it('café : niveau, revenus, clients et maximum, prix de l\'amélioration', () => {
    const s = park()
    const info = buildingInfo(s, { kind: 'emplacement', slot: 1 })!
    const f = buildingIncomePerHour(s, 1)
    expect(info.title).toBe('Café')
    expect(row(info, 'Niveau')).toBe('1/3')
    expect(info.role.length).toBeGreaterThan(10)
    expect(row(info, 'Rapporte')).toBe(`≈ ${formatCoins(f.pieces)} par heure`)
    expect(row(info, 'Clients')).toBe(`≈ ${formatAmount(f.clients)} par heure (maximum ${BUILDINGS.cafe.maxClientsPerH[0]})`)
    expect(row(info, 'Dépense par client')).toBe('1,5 pièce')
    expect(row(info, 'Amélioration')).toBe('600 pièces pour le niveau 2')
    expect(info.villageButton).toBeNull()
  })
  it('boutique niveau 2 : la dépense par client suit le nombre d\'espèces (dépense divisée par deux à la tâche 5)', () => {
    const s = park()
    const info = buildingInfo(s, { kind: 'emplacement', slot: 2 })!
    // 1 espèce : (1 + 0,5 × 1) × 0,6 = 0,9
    expect(row(info, 'Dépense par client')).toBe('0,9 pièce')
    expect(row(info, 'Amélioration')).toBe(`${formatCoins(3000)} pour le niveau 3`)
    expect(info.title).toBe('Boutique')
    expect(row(info, 'Niveau')).toBe('2/3')
  })
  it('boutique : une espèce dans un enclos non relié ne compte pas dans la dépense par client', () => {
    const s = park()
    s.enclosures.push(enclosure(2, 'cochon', 6, 6, { rect: { x: -34, z: -8, w: 6, d: 6 } }))
    s.animals.push(animal(3, 'cochon', 'F', 2), animal(4, 'cochon', 'M', 2))
    const info = buildingInfo(s, { kind: 'emplacement', slot: 2 })!
    expect(row(info, 'Dépense par client')).toBe('0,9 pièce') // toujours 1 espèce visible
  })
  it('auberge au niveau maximum', () => {
    const info = buildingInfo(park(), { kind: 'emplacement', slot: 3 })!
    expect(row(info, 'Amélioration')).toBe('Niveau maximum')
    expect(row(info, 'Clients')).toContain('maximum 15')
  })
  it('sans visiteur ni animal : zéro revenu, pas de NaN', () => {
    const s = park({ animals: [], enclosures: [] })
    const info = buildingInfo(s, { kind: 'emplacement', slot: 1 })!
    expect(row(info, 'Rapporte')).toBe('≈ 0 pièce par heure')
    expect(JSON.stringify(info)).not.toContain('NaN')
  })
  it('ferme : remise, fourrage offert, garde-manger, amélioration (pas de clients)', () => {
    const info = buildingInfo(park(), { kind: 'emplacement', slot: 0 })!
    expect(info.title).toBe('Ferme')
    expect(row(info, 'Niveau')).toBe('1/3')
    expect(row(info, 'Fourrage offert')).toBe('aucun')
    expect(row(info, 'Remise sur les rations')).toBe('aucune')
    expect(row(info, 'Garde-manger')).toBe('1000 places')
    expect(row(info, 'Clients')).toBeUndefined()
    expect(row(info, 'Amélioration')).toBe('400 pièces pour le niveau 2')
    const s = park({ buildings: [{ slot: 0, type: 'ferme', level: 3 }] })
    const max = buildingInfo(s, { kind: 'emplacement', slot: 0 })!
    expect(row(max, 'Fourrage offert')).toBe('15 par jour')
    expect(row(max, 'Remise sur les rations')).toBe('35 %')
  })
  it('emplacement libre ou inconnu : pas de fiche', () => {
    const s = park()
    expect(buildingInfo(s, { kind: 'emplacement', slot: 5 })).toBeNull()
    expect(buildingInfo(s, { kind: 'emplacement', slot: 99 })).toBeNull()
    expect(SLOTS.length).toBeGreaterThan(4)
  })
})

describe('fiche de la mairie', () => {
  const mairie = VILLAGE_PROPS.findIndex((v) => v.key === 'mairie')
  it('titre, niveau, habitants et ce qui manque (habitants ET mission)', () => {
    const s = park({ village: { level: 1, clientsServed: 0 }, buildings: [{ slot: 0, type: 'ferme', level: 1 }] })
    const info = buildingInfo(s, { kind: 'decor', index: mairie })!
    expect(info.title).toBe('Mairie de Clairbois — Margaux, la maire')
    expect(row(info, 'Village')).toBe('Hameau (niveau 1/3)')
    expect(row(info, 'Habitants')).toBe('15') // 10 de départ + 5 par niveau de bâtiment (la ferme, niveau 1)
    expect(row(info, 'Prochain niveau')).toBe('Village à 40 habitants')
    expect(info.missing).toHaveLength(2)
    expect(info.missing[0]).toMatch(/^Il faut 40 habitants \(encore \d+\)\.$/)
    expect(info.missing[1]).toMatch(/^Il faut d'abord terminer la mission : /)
    expect(info.villageButton).toBe('Ouvrir le volet du village')
  })
  it('habitants suffisants, mission faite : prêt', () => {
    const s = park({ village: { level: 1, clientsServed: 100_000 } })
    s.missions.story = { index: 99, current: null }
    const info = buildingInfo(s, { kind: 'decor', index: mairie })!
    expect(info.missing).toEqual(['Tout est prêt pour passer au niveau suivant.'])
  })
  it('bourg : niveau maximum, plus rien à demander', () => {
    const info = buildingInfo(park({ village: { level: 3, clientsServed: 0 } }), { kind: 'decor', index: mairie })!
    expect(row(info, 'Prochain niveau')).toBe('Clairbois est un bourg : le niveau maximum.')
    expect(info.missing).toEqual([])
  })
})

describe('maisons et décors', () => {
  it('une phrase, sans ligne ni action', () => {
    const i = VILLAGE_PROPS.findIndex((v) => v.key === 'puits')
    const info = buildingInfo(park(), { kind: 'decor', index: i })!
    expect(info.title).toBe('Puits')
    expect(info.role).toBe(VILLAGE_PROPS[i].sentence)
    expect(info.rows).toEqual([])
    expect(info.villageButton).toBeNull()
  })
  it('chaque décor du village a un nom et une phrase', () => {
    VILLAGE_PROPS.forEach((_v, index) => {
      const info = buildingInfo(park(), { kind: 'decor', index })!
      expect(info.title.length).toBeGreaterThan(2)
      expect(info.role.length).toBeGreaterThan(10)
    })
    expect(VILLAGE_PROPS.filter((v) => v.key.startsWith('maison')).every((v) => v.name === "Maison d'habitant")).toBe(true)
    expect(buildingInfo(park(), { kind: 'decor', index: 999 })).toBeNull()
  })
})

describe('fiche du centre vétérinaire', () => {
  const centre = (level: number, animals: GameState['animals'] = []) => park({
    buildings: [{ slot: 0, type: 'ferme', level: 1 }, { slot: 7, type: 'centreVeto', level }], animals,
  })
  it('niveau, maladies soignées, quarantaine, prochain niveau et bouton Améliorer', () => {
    const info = buildingInfo(centre(1), { kind: 'emplacement', slot: 7 })!
    expect(info.title).toBe('Centre vétérinaire')
    expect(row(info, 'Niveau')).toBe('1/5')
    expect(row(info, 'Soigne')).toBe('Parasites, Indigestion')
    expect(row(info, 'Quarantaine')).toBe('Pas avant le niveau 3')
    expect(row(info, 'Prochain niveau')).toBe('Niveau 2 : blessures')
    expect(info.upgrade).toEqual({ label: 'Améliorer (500 pièces)', cost: 500 })
  })
  it('niveau maximum : pas de bouton', () => {
    const info = buildingInfo(centre(5), { kind: 'emplacement', slot: 7 })!
    expect(info.upgrade).toBeNull()
    expect(row(info, 'Prochain niveau')).toBe('Niveau maximum')
    expect(row(info, 'Vaccination')).toBeDefined()
  })
  it('la file montre 5 malades puis « et N autres »', () => {
    const sickOnes = Array.from({ length: 8 }, (_, i) => animal(10 + i, 'mouton', 'F', 1, {
      health: { status: 'malade', disease: 'indigestion', stage: 1, stageSince: 0, detectedAt: 0, careUntil: null, vetId: null, quarantined: false },
    }))
    const s = centre(1, sickOnes)
    s.staff.employees.push({ id: 1, name: 'V', job: 'veterinaire', xpH: 0, hiredAt: 0, encIds: [] })
    const info = buildingInfo(s, { kind: 'emplacement', slot: 7 })!
    expect(info.queue).toHaveLength(6)
    expect(info.queue[5]).toBe('et 3 autres')
  })
  it('les autres bâtiments n\'ont ni file ni bouton Améliorer dans la fiche', () => {
    const info = buildingInfo(park(), { kind: 'emplacement', slot: 1 })!
    expect(info.queue).toEqual([])
    expect(info.upgrade).toBeNull()
  })
})
