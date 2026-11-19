import { describe, it, expect } from 'vitest'
import { emptyState } from '../sim/helpers'
import { newGame } from '../../src/sim/newGame'
import { MAIRIE } from '../../src/data/village'
import { SLOTS } from '../../src/data/economy'
import { STORY, TUTORIAL } from '../../src/data/missions'
import { bannerFor, currentLine, dailyCount, freeSlot, highlightFor, levelBlockReason, markerPosition, markerSpot, markerVisible,
  msUntilNextDay, prairieSpot, streakText } from '../../src/ui/missionModel'
import { updateMissions } from '../../src/sim/missions'
import type { GameState } from '../../src/sim/types'

const fresh = (): GameState => {
  const s = newGame(1, Date.UTC(2026, 10, 17, 12))
  updateMissions(s, [])
  return s
}

describe('currentLine / highlightFor', () => {
  it('nouvelle partie : premier pas, avancée 0/1, détails à mettre en évidence', () => {
    const s = fresh()
    const l = currentLine(s)!
    expect(l.id).toBe(TUTORIAL[0].id)
    expect(l.progress).toBe('0/1')
    expect(l.reward).toBe('20 pièces')
    expect(highlightFor(s)).toBe('detailsEnclos')
  })
  it('mission réussie : plus de mise en évidence', () => {
    const s = fresh()
    s.missions.tutorial.current!.done = true
    expect(highlightFor(s)).toBeNull()
    expect(currentLine(s)!.done).toBe(true)
  })
})

describe('markerPosition', () => {
  it("détails/nettoyer : au-dessus de l'enclos des moutons même quand il est sélectionné", () => {
    const s = fresh()
    const enc = s.enclosures[0]
    expect(markerPosition(s, 'detailsEnclos')).toEqual({ x: enc.rect.x + enc.rect.w / 2, z: enc.rect.z + enc.rect.d / 2 })
    expect(markerPosition(s, 'nettoyer')).toEqual({ x: enc.rect.x + enc.rect.w / 2, z: enc.rect.z + enc.rect.d / 2 })
  })
  it("ferme : sur son emplacement même s'il est sélectionné", () => {
    const s = emptyState({ buildings: [{ slot: 1, type: 'ferme', level: 1 }] })
    const slot = SLOTS.find((x) => x.id === 1)!
    expect(markerPosition(s, 'ferme')).toEqual({ x: slot.x, z: slot.z })
    expect(markerPosition(emptyState({ buildings: [] }), 'ferme')).toBeNull()
  })
  it('emplacement libre : le premier débloqué sans bâtiment', () => {
    const s = emptyState({ buildings: [{ slot: 0, type: 'ferme', level: 1 }] })
    expect(freeSlot(s)!.id).toBe(1)
    expect(markerPosition(s, 'emplacementLibre')).toEqual({ x: SLOTS[1].x, z: SLOTS[1].z })
  })
  it("emplacement libre : jamais l'emplacement réservé à la maison du personnel", () => {
    const s = emptyState({ buildings: [{ slot: 0, type: 'ferme', level: 1 }, { slot: 1, type: 'cafe', level: 1 }] })
    expect(freeSlot(s)).toBeNull()
  })
  it('prairie : un point de la prairie hors des enclos', () => {
    const s = fresh()
    const p = prairieSpot(s)
    expect(p.x).toBeGreaterThanOrEqual(-34); expect(p.x).toBeLessThanOrEqual(-4)
    expect(p.z).toBeGreaterThanOrEqual(-8); expect(p.z).toBeLessThanOrEqual(10)
    const e = s.enclosures[0].rect
    expect(p.x > e.x && p.x < e.x + e.w && p.z > e.z && p.z < e.z + e.d).toBe(false)
    expect(markerPosition(s, 'prairie')).toEqual(p)
  })
  it('les autres cibles laissent le « ! » sur la mairie', () => {
    for (const id of ['billet', 'marchand', 'autonomie', null] as const) expect(markerPosition(fresh(), id)).toBeNull()
  })
})

describe('« ! » et mission réussie', () => {
  it('mission réussie : plus de cible, le « ! » retourne sur la mairie (null)', () => {
    const s = fresh()
    s.missions.tutorial.current!.done = true
    expect(markerPosition(s, highlightFor(s))).toBeNull()
  })
})

describe('markerSpot', () => {
  it("cible de la mission tant qu'elle n'est pas réussie, mairie ensuite, rien si le « ! » est caché", () => {
    const s = fresh()
    const enc = s.enclosures[0]
    expect(markerSpot(s)).toEqual({ x: enc.rect.x + enc.rect.w / 2, z: enc.rect.z + enc.rect.d / 2 })
    s.missions.tutorial.current!.done = true
    expect(markerSpot(s)).toEqual({ x: MAIRIE.x, z: MAIRIE.z })
    s.missions.tutorial.step = TUTORIAL.length
    s.missions.unread = false
    expect(markerSpot(s)).toBeNull()
  })
})

describe('markerVisible', () => {
  it('visible pendant les premiers pas ou si non lu, sinon caché', () => {
    const s = fresh()
    s.missions.unread = false
    expect(markerVisible(s)).toBe(true)
    s.missions.tutorial.step = TUTORIAL.length
    expect(markerVisible(s)).toBe(false)
    s.missions.unread = true
    expect(markerVisible(s)).toBe(true)
  })
})

describe('levelBlockReason', () => {
  it('nomme la mission-porte quand seuls les habitants suffisent', () => {
    const s = emptyState()
    s.village.clientsServed = 100000
    s.missions.story.index = 0
    expect(levelBlockReason(s)).toBe(`Il faut d'abord terminer la mission : ${STORY.find((m) => m.gate === 2)!.title}`)
  })
  it('sinon garde la raison des habitants', () => {
    expect(levelBlockReason(emptyState())).toMatch(/habitants/)
  })
})

describe('dailyCount / streakText / msUntilNextDay', () => {
  it('rien sans quotidiennes', () => {
    expect(dailyCount(emptyState())).toBeNull()
  })
  it('compte les réussies', () => {
    const s = emptyState()
    s.missions.daily.list = [{ id: 'a', base: 0, done: true, claimed: false }, { id: 'b', base: 0, done: false, claimed: false }]
    expect(dailyCount(s)).toEqual({ done: 1, total: 2 })
  })
  it('texte de la série', () => {
    expect(streakText(1)).toBe('Série : 1 jour · un bon −25 % tous les 7 jours')
    expect(streakText(3)).toBe('Série : 3 jours · un bon −25 % tous les 7 jours')
  })
  it('minuit local suivant', () => {
    const t = Date.UTC(2026, 10, 17, 22, 30) // 23 h 30 à +60
    expect(msUntilNextDay(t, 60)).toBe(30 * 60_000)
    expect(msUntilNextDay(t, 0)).toBe(90 * 60_000)
  })
})

describe('bannerFor', () => {
  const m = (id: string, done = false) => ({ id, done })
  it('premier affichage : seulement si non lue', () => {
    expect(bannerFor(undefined, m('a'), true)).toBe('nouvelle')
    expect(bannerFor(undefined, m('a'), false)).toBeNull()
    expect(bannerFor(undefined, null, true)).toBeNull()
  })
  it("nouvelle mission quand l'id change", () => {
    expect(bannerFor(m('a', true), m('b'), false)).toBe('nouvelle')
  })
  it('réussie quand elle passe réussie, une seule fois', () => {
    expect(bannerFor(m('a'), m('a', true), false)).toBe('reussie')
    expect(bannerFor(m('a', true), m('a', true), false)).toBeNull()
    expect(bannerFor(m('a'), m('a'), false)).toBeNull()
  })
})
