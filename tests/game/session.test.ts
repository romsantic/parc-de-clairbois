import { describe, it, expect } from 'vitest'
import { startSession, resume, adjustTicketAfterLoad } from '../../src/game/session'
import { saveGame, loadGame, SAVE_KEY, type Storage } from '../../src/save/save'
import { newGame } from '../../src/sim/newGame'
import { DAY_MS } from '../../src/data/tuning'
import { fairPrice } from '../../src/sim/economy'
import { population } from '../../src/sim/village'
import { updateMissions } from '../../src/sim/missions'
import { STORY } from '../../src/data/missions'

function memory(init: Record<string, string> = {}): Storage & { data: Record<string, string> } {
  const data = { ...init }
  return { data, getItem: (k) => (k in data ? data[k] : null), setItem: (k, v) => { data[k] = v } }
}
const NOW = 1_800_000_000_000

describe('billet après le rééquilibrage', () => {
  it('niveau 2 à 14 pièces : remis au prix juste, avec message', () => {
    const g = newGame(5, NOW)
    g.village.level = 2
    g.ticketPrice = 14
    const fair = fairPrice(g)
    expect(adjustTicketAfterLoad(g)).toBe(fair)
    expect(g.ticketPrice).toBe(fair)
    const m = memory()
    const old = newGame(5, NOW); old.village.level = 2; old.ticketPrice = 14
    saveGame(m, old, NOW)
    const r = startSession(m, NOW)
    expect(r.state.ticketPrice).toBe(fairPrice(r.state))
    expect(r.priceNotice).toContain('prix juste')
  })
  it('dans 1,5 x le prix juste : intouché ; partie neuve : intouchée', () => {
    const g = newGame(5, NOW)
    g.ticketPrice = Math.floor(1.5 * fairPrice(g))
    const before = g.ticketPrice
    expect(adjustTicketAfterLoad(g)).toBeNull()
    expect(g.ticketPrice).toBe(before)
    const f = newGame(7, NOW)
    expect(adjustTicketAfterLoad(f)).toBeNull()
    const m = memory()
    expect(startSession(m, NOW).priceNotice).toBeNull()
  })
  it('ancienne partie niveau 2, 10 000 clients, porte faite : reste niveau 2, mission faite, habitants avec la nouvelle règle', () => {
    const g = newGame(5, NOW)
    g.village = { level: 2, clientsServed: 10_000 }
    const gate = STORY.findIndex((x) => x.gate === 3)
    g.missions.story = { index: gate, current: { id: STORY[gate].id, base: 0, done: true, claimed: false } }
    const oldPop = 10 + 5 * g.buildings.reduce((s, b) => s + b.level, 0) + Math.floor(10_000 / 30)
    const m = memory()
    saveGame(m, g, NOW)
    const r = startSession(m, NOW)
    expect(r.state.village.level).toBe(2)
    expect(r.state.missions.story.index).toBe(gate)
    expect(r.state.missions.story.current?.done).toBe(true)
    updateMissions(r.state, [])
    expect(r.state.missions.story.current?.done).toBe(true)
    const pop = population(r.state)
    expect(pop).toBeGreaterThan(0)
    expect(pop).toBeLessThan(oldPop)
  })
})

describe('startSession', () => {
  it('sans sauvegarde : nouvelle partie, aussitôt sauvegardée', () => {
    const m = memory()
    const r = startSession(m, NOW)
    expect(r.problem).toBeNull()
    expect(r.canSave).toBe(true)
    expect(r.state.animals).toHaveLength(2)
    expect(loadGame(m).kind).toBe('ok')
  })
  it('avec une sauvegarde de la veille : rattrape la journée et donne un résumé', () => {
    const m = memory()
    const g = newGame(5, NOW - DAY_MS)
    saveGame(m, g, NOW - DAY_MS)
    const r = startSession(m, NOW)
    expect(r.state.time).toBe(g.time + DAY_MS)
    expect(r.summary).not.toBeNull()
  })
  it('sauvegarde plus récente : on ne sauvegarde surtout pas par-dessus', () => {
    const raw = JSON.stringify({ version: 9, savedAt: 1, state: {} })
    const m = memory({ [SAVE_KEY]: raw })
    const r = startSession(m, NOW)
    expect(r.problem).toBe('trop-recente')
    expect(r.canSave).toBe(false)
    expect(m.data[SAVE_KEY]).toBe(raw)
  })
  it("prend la main sur la sauvegarde : les autres onglets n'écriront plus par-dessus", () => {
    const m = memory()
    const r = startSession(m, NOW)
    expect(JSON.parse(m.data[SAVE_KEY]).owner).toBe(r.owner)
    expect(startSession(m, NOW).owner).not.toBe(r.owner)
  })
  it('migration impossible : la partie est gardée intacte et on ne sauvegarde pas', () => {
    const raw = JSON.stringify({ version: 0, savedAt: 1, state: {} })
    const m = memory({ [SAVE_KEY]: raw })
    const r = startSession(m, NOW)
    expect(r.problem).toBe('migration-impossible')
    expect(r.canSave).toBe(false)
    expect(m.data[SAVE_KEY]).toBe(raw)
  })
  it('stockage indisponible : on joue sans sauvegarder', () => {
    const r = startSession(memory(), NOW, false)
    expect(r.canSave).toBe(false)
    expect(r.problem).toBeNull()
  })
  it('signale le temps non rejoué au-delà de 30 jours', () => {
    const m = memory()
    saveGame(m, newGame(5, NOW - 100 * DAY_MS), NOW - 100 * DAY_MS)
    expect(startSession(m, NOW).skippedMs).toBeGreaterThan(60 * DAY_MS)
  })
  it("mesure l'absence depuis la dernière sauvegarde (0 pour une nouvelle partie)", () => {
    expect(startSession(memory(), NOW).absentMs).toBe(0)
    const m = memory()
    saveGame(m, newGame(5, NOW - 5 * 3_600_000), NOW - 5 * 3_600_000)
    expect(startSession(m, NOW).absentMs).toBe(5 * 3_600_000)
  })
  it("une mission réussie pendant l'absence figure dans le résumé", () => {
    const m = memory()
    const g = newGame(5, NOW - 5 * 3_600_000)
    g.missions.tutorial = { step: 4, current: null, skipped: false } // « Construire le café » : le café existe déjà
    g.buildings.push({ slot: 1, type: 'cafe', level: 1 })
    saveGame(m, g, NOW - 5 * 3_600_000)
    const r = startSession(m, NOW)
    expect(r.state.missions.tutorial.current?.done).toBe(true)
    expect(r.summary?.missions).toHaveLength(1)
  })
  it('sauvegarde abîmée : nouvelle partie, problème signalé', () => {
    const r = startSession(memory({ [SAVE_KEY]: 'zut' }), NOW)
    expect(r.problem).toBe('illisible')
    expect(r.canSave).toBe(true)
  })
})

describe('relecture : marchand après migration', () => {
  it("une partie v1 chargée quelques minutes après sa sauvegarde trouve déjà le premier stock", () => {
    const v1 = { version: 1, time: NOW - 60_000, rng: 7, coins: 10, nextId: 5,
      pantry: { fourrage: 1, viande: 0, capacity: 200 }, enclosures: [], animals: [] }
    const m = memory({ [SAVE_KEY]: JSON.stringify({ version: 1, savedAt: NOW - 60_000, state: v1 }) })
    const r = startSession(m, NOW)
    expect(r.problem).toBeNull()
    expect(r.state.merchant.offers.length).toBeGreaterThan(0)
    expect(r.state.merchant.restocks).toBe(1)
  })
})

describe('resume (onglet repris sans rechargement)', () => {
  it('une longue pause : le résumé et la durée sont rendus', () => {
    const g = newGame(5, NOW)
    const r = resume(g, NOW + 5 * 3_600_000)
    expect(r.state.time).toBe(g.time + 5 * 3_600_000)
    expect(r.news).not.toBeNull()
    expect(r.news!.absentMs).toBe(5 * 3_600_000)
    expect(r.news!.summary.pieces).toBeGreaterThanOrEqual(0)
  })
  it('un simple pas de la boucle : pas de Gazette', () => {
    const g = newGame(5, NOW)
    const r = resume(g, NOW + 20 * 60_000)
    expect(r.state.time).toBe(g.time + 20 * 60_000)
    expect(r.news).toBeNull()
  })
  it("l'heure locale est remise à jour (changement d'heure)", () => {
    const g = { ...newGame(5, NOW), utcOffsetMin: 12345 }
    expect(resume(g, NOW + 60_000).state.utcOffsetMin).toBe(-new Date(NOW + 60_000).getTimezoneOffset())
  })
})
