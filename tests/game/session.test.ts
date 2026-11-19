import { describe, it, expect } from 'vitest'
import { startSession, resume, restartState, giftFirstKeeper, STEP6_MARKER_KEY } from '../../src/game/session'
import { bigPark } from '../sim/helpers'
import { advanceTo } from '../../src/sim/advance'
import { summarize } from '../../src/sim/summary'
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

describe('billet et habitants après le rééquilibrage', () => {
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

describe("réglages de l'étape 6 : une seule fois", () => {
  const old = (ticket: number, clients = 0) => { const g = newGame(5, NOW); g.village = { level: 2, clientsServed: clients }; g.ticketPrice = ticket; return g }
  it('ancienne partie à prix très haut : même prix au chargement, sans message de billet, à chaque fois', () => {
    const m = memory()
    saveGame(m, old(14), NOW)
    const a = startSession(m, NOW)
    expect(a.state.ticketPrice).toBe(14)
    expect(a.priceNotice).toBeNull()
    saveGame(m, a.state, NOW)
    const b = startSession(m, NOW)
    expect(b.state.ticketPrice).toBe(14)
    expect(b.priceNotice).toBeNull()
  })
  it('1er chargement sans rien à changer : le repère est posé quand même', () => {
    const m = memory()
    saveGame(m, newGame(5, NOW), NOW)
    expect(startSession(m, NOW).priceNotice).toBeNull()
    expect(m.data[STEP6_MARKER_KEY]).toBeDefined()
  })
  it('partie neuve et recommencer : repère posé, jamais ajustée', () => {
    const m = memory()
    startSession(m, NOW)
    expect(m.data[STEP6_MARKER_KEY]).toBeDefined()
    const m2 = memory()
    restartState(m2, NOW)
    expect(m2.data[STEP6_MARKER_KEY]).toBeDefined()
  })
  it('habitants en baisse avec la nouvelle règle : message une seule fois, avec les deux nombres', () => {
    const m = memory()
    const g = old(5, 10_000); g.ticketPrice = fairPrice(g)
    saveGame(m, g, NOW)
    const a = startSession(m, NOW)
    expect(a.priceNotice).toContain('réorganisé')
    expect(a.priceNotice).toContain(`${population(a.state)} habitants`)
    saveGame(m, a.state, NOW)
    expect(startSession(m, NOW).priceNotice).toBeNull()
  })
  it('peu de clients (pas de baisse) : pas de message habitants', () => {
    const m = memory()
    const g = old(5, 20); g.ticketPrice = fairPrice(g)
    saveGame(m, g, NOW)
    expect(startSession(m, NOW).priceNotice).toBeNull()
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

describe('chemins : chemin offert aux anciennes parties', () => {
  const v3 = () => {
    const g = newGame(5, NOW)
    g.ticketPrice = fairPrice(g)
    g.enclosures.push({ id: 900, biome: 'prairie', species: null, rect: { x: -34, z: -8, w: 6, d: 6 }, cleanedAt: NOW })
    return g
  }
  const asV3 = (g: ReturnType<typeof newGame>) => { const s = structuredClone(g) as unknown as Record<string, unknown>; delete s.paths; s.version = 3; return s }
  it('sauvegarde v3 : enclos relié, message avec le nombre', () => {
    const m = memory()
    const g = v3()
    m.data[SAVE_KEY] = JSON.stringify({ version: 3, savedAt: NOW, state: asV3(g) })
    const r = startSession(m, NOW)
    expect(r.state.paths.length).toBeGreaterThan(1)
    expect(r.pathsNotice).toContain('Nouveau à Clairbois : les chemins !')
    expect(r.pathsNotice).toContain('offert un chemin à 2 enclos') // l'enclos de départ (sans chemin en v3) et le nouveau
    const again = startSession(m, NOW)
    expect(again.pathsNotice).toBeNull() // déjà réécrite en v4
  })
  it('sauvegarde v3 avec un seul enclos : « à 1 enclos »', () => {
    const m = memory()
    m.data[SAVE_KEY] = JSON.stringify({ version: 3, savedAt: NOW, state: asV3(newGame(5, NOW)) })
    const r = startSession(m, NOW)
    expect(r.pathsNotice).toContain('offert un chemin à 1 enclos')
    expect(r.pathsNotice).not.toContain('À relier')
  })
  it('sauvegarde v3 : les enclos enfermés sont nommés à la main (espèce, « Enclos vide »)', () => {
    const m = memory()
    const g = newGame(5, NOW)
    const sheep = g.enclosures[0]
    sheep.rect = { x: -20, z: -4, w: 3.5, d: 8 } // enfermé au milieu d'un anneau d'enclos
    const wall = (id: number, x: number, z: number, w: number, d: number) =>
      ({ id, biome: 'prairie' as const, species: null, rect: { x, z, w, d }, cleanedAt: NOW })
    g.enclosures.push(
      wall(900, -16, -4, 4, 8), // vide, enfermé lui aussi
      wall(901, -26, -12, 20, 8), wall(902, -26, 4, 20, 8), wall(903, -26, -12, 6, 24), wall(904, -12, -12, 6, 24),
    )
    g.nextId = 1000
    m.data[SAVE_KEY] = JSON.stringify({ version: 3, savedAt: NOW, state: asV3(g) })
    const r = startSession(m, NOW)
    expect(r.pathsNotice).toContain(' À relier toi-même : Mouton, Enclos vide.')
  })
  it('sauvegarde v4 : pas de message', () => {
    const m = memory()
    saveGame(m, v3(), NOW)
    expect(startSession(m, NOW).pathsNotice).toBeNull()
  })
  it('partie neuve : pas de message', () => {
    expect(startSession(memory(), NOW).pathsNotice).toBeNull()
  })
})

describe('le personnel : ancienne partie', () => {
  const asV4 = (g: ReturnType<typeof bigPark>) => { const s = structuredClone(g) as unknown as Record<string, unknown>; delete s.staff; s.version = 4; return s }
  const save = (g: ReturnType<typeof bigPark>, version: 4 | 5 = 4) => {
    const m = memory()
    m.data[SAVE_KEY] = JSON.stringify({ version, savedAt: g.time, state: version === 4 ? asV4(g) : g })
    return m
  }
  it('sauvegarde v4 : Léa arrive, le message le dit, et le rattrapage ne fait ni mort ni malade de plus', () => {
    const g = bigPark()
    const now = g.time + 3 * DAY_MS
    const r = startSession(save(g), now)
    const lea = r.state.staff.employees.find((e) => e.name === 'Léa')
    expect(lea).toBeDefined()
    expect(r.staffNotice).toContain('Margaux t\'envoie Léa')
    expect(r.staffNotice).toContain('attendent un soigneur')
    // même parc, sans personnel, tout suivi : référence
    const ref = advanceTo({ ...structuredClone(g), staff: { ...g.staff, employees: [], coverAllUntil: Number.MAX_SAFE_INTEGER } }, now)
    const refSum = summarize(ref.events, ref.state)
    expect(r.summary!.morts.length).toBeLessThanOrEqual(refSum.morts.length)
    expect(r.summary!.malades).toBeLessThanOrEqual(refSum.malades)
    expect(r.state.animals.filter((a) => a.health.status === 'malade').length)
      .toBeLessThanOrEqual(ref.state.animals.filter((a) => a.health.status === 'malade').length)
  })
  it('sauvegarde v5 : pas de message', () => {
    const m = save(bigPark(), 5)
    expect(startSession(m, bigPark().time + DAY_MS).staffNotice).toBeNull()
  })
  it('partie neuve : pas de message', () => {
    expect(startSession(memory(), NOW).staffNotice).toBeNull()
  })
  it('giftFirstKeeper : sans soigneur seulement', () => {
    const g = bigPark()
    g.staff.coverAllUntil = 0
    const a = giftFirstKeeper(g, 123_000)
    expect(a.staff.employees).toHaveLength(1)
    expect(a.staff.coverAllUntil).toBe(123_000)
    expect(giftFirstKeeper(a, 999_000)).toBe(a)
  })
})
