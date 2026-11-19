import { describe, it, expect } from 'vitest'
import { saveGame, loadGame, SAVE_KEY, BROKEN_KEY, type Storage } from '../../src/save/save'
import { newGame } from '../../src/sim/newGame'

function memory(init: Record<string, string> = {}): Storage & { data: Record<string, string> } {
  const data = { ...init }
  return { data, getItem: (k) => (k in data ? data[k] : null), setItem: (k, v) => { data[k] = v } }
}
const g = newGame(3, 1_800_000_000_000)

describe('sauvegarde : ne jamais perdre la partie', () => {
  it("un onglet ne sauvegarde pas par-dessus la partie qu'un autre onglet a reprise", () => {
    const m = memory()
    expect(saveGame(m, g, 1, 'onglet-A')).toBe('ok')
    expect(saveGame(m, { ...g, coins: 1 }, 2, 'onglet-B')).toBe('ok') // B reprend la main (au chargement)
    expect(saveGame(m, { ...g, coins: 999 }, 3, 'onglet-A', true)).toBe('pris-ailleurs')
    expect(JSON.parse(m.data[SAVE_KEY]).state.coins).toBe(1)
  })
  it("un vieil onglet n'écrase pas une sauvegarde d'une version plus récente", () => {
    const raw = JSON.stringify({ version: 5, savedAt: 1, owner: 'onglet-B', state: {} })
    const m = memory({ [SAVE_KEY]: raw })
    expect(saveGame(m, g, 3, 'onglet-A', true)).toBe('trop-recente')
    expect(m.data[SAVE_KEY]).toBe(raw)
  })
  it('mémoire pleine : signalé, sans planter', () => {
    const full: Storage = { getItem: () => null, setItem: () => { throw new Error('QuotaExceededError') } }
    expect(saveGame(full, g, 1, 'onglet-A')).toBe('erreur')
  })
  it('une deuxième sauvegarde abîmée est mise de côté elle aussi', () => {
    const m = memory({ [SAVE_KEY]: 'cassé 2', [BROKEN_KEY]: 'cassé 1' })
    expect(loadGame(m, undefined, 42).kind).toBe('illisible')
    expect(m.data[BROKEN_KEY]).toBe('cassé 1')
    expect(m.data[`${BROKEN_KEY}:42`]).toBe('cassé 2')
  })
  it('refuse une partie incohérente (espèce inconnue, garde-manger incomplet)', () => {
    const bad1 = { ...g, animals: [{ ...g.animals[0], species: 'licorne' }] }
    const bad2 = { ...g, pantry: { viande: 0, capacity: 200 } }
    for (const state of [bad1, bad2]) {
      const m = memory({ [SAVE_KEY]: JSON.stringify({ version: 1, savedAt: 1, state }) })
      expect(loadGame(m).kind).toBe('illisible')
    }
  })
  it("une migration manquante n'efface pas la partie : elle est signalée", () => {
    const m = memory({ [SAVE_KEY]: JSON.stringify({ version: 0, savedAt: 1, state: g }) })
    expect(loadGame(m, {})).toEqual({ kind: 'migration-impossible', version: 0 })
  })
})

describe('sauvegarde v2 abîmée (relecture)', () => {
  const g0 = newGame(3, 1_800_000_000_000)
  const cases: Record<string, (g: any) => void> = { // eslint-disable-line @typescript-eslint/no-explicit-any
    'type de bâtiment inconnu': (g) => { g.buildings[0].type = 'chateau' },
    'niveau de bâtiment 4': (g) => { g.buildings[0].level = 4 },
    'emplacement inconnu': (g) => { g.buildings[0].slot = 42 },
    'emplacement en double': (g) => { g.buildings.push({ slot: 0, type: 'cafe', level: 1 }) },
    'offre d’espèce inconnue': (g) => { g.merchant.offers[0].species = 'licorne' },
    'offre au prix NaN': (g) => { g.merchant.offers[0].price = null },
    'offre au sexe inconnu': (g) => { g.merchant.offers[0].sex = 'X' },
    'billet négatif': (g) => { g.ticketPrice = -1 },
    'réputation hors bornes': (g) => { g.reputation = 1.5 },
    'niveau de village 4': (g) => { g.village.level = 4 },
    'premiers pas : étape -1': (g) => { g.missions.tutorial.step = -1 },
    'premiers pas : étape 2,5': (g) => { g.missions.tutorial.step = 2.5 },
    'premiers pas : étape 10': (g) => { g.missions.tutorial.step = 10 },
    'histoire : index -1': (g) => { g.missions.story.index = -1 },
    'histoire : index 2,5': (g) => { g.missions.story.index = 2.5 },
    'histoire : index trop grand': (g) => { g.missions.story.index = 1000 },
    'compteur manquant': (g) => { delete g.stats.counts.nettoyages },
    'compteur NaN': (g) => { g.stats.counts.soins = null },
    'naissances par espèce non finies': (g) => { g.stats.birthsBySpecies = { mouton: 'beaucoup' } },
    'mission courante sans id': (g) => { g.missions.tutorial.current = { base: 0, done: false, claimed: false } },
    'mission courante : done non booléen': (g) => { g.missions.story.current = { id: 'x', base: 0, done: 1, claimed: false } },
    'quotidienne sans id': (g) => { g.missions.daily.list = [{ base: 0, done: false, claimed: false }] },
    'quotidienne : base non finie': (g) => { g.missions.daily.list = [{ id: 'a#1', base: null, done: false, claimed: false }] },
    'quotidienne : claimed absent': (g) => { g.missions.daily.list = [{ id: 'a#1', base: 0, done: false }] },
    'quotidienne : élément nul': (g) => { g.missions.daily.list = [null] },
    'quotidienne : cible nulle': (g) => { g.missions.daily.list = [{ id: 'quot-pieces', base: 0, done: false, claimed: false, n: 0, reward: { coins: 30 } }] },
    'quotidienne : cible non finie': (g) => { g.missions.daily.list = [{ id: 'quot-pieces', base: 0, done: false, claimed: false, n: 'beaucoup', reward: { coins: 30 } }] },
    'quotidienne neuve : cible absente': (g) => { g.missions.daily.list = [{ id: 'quot-pieces', base: 0, done: false, claimed: false, reward: { coins: 30 } }] },
    'quotidienne neuve : récompense absente': (g) => { g.missions.daily.list = [{ id: 'quot-pieces', base: 0, done: false, claimed: false, n: 150 }] },
    'quotidienne : récompense non objet': (g) => { g.missions.daily.list = [{ id: 'quot-pieces', base: 0, done: false, claimed: false, n: 150, reward: 30 }] },
    'quotidienne : récompense négative': (g) => { g.missions.daily.list = [{ id: 'quot-pieces', base: 0, done: false, claimed: false, n: 150, reward: { coins: -5 } }] },
    'quotidienne : récompense inconnue': (g) => { g.missions.daily.list = [{ id: 'quot-pieces', base: 0, done: false, claimed: false, n: 150, reward: { diamants: 5 } }] },
    'jour des quotidiennes non fini': (g) => { g.missions.daily.dayKey = null },
    'série non finie': (g) => { g.missions.daily.streak = 'x' },
    'bons non finis': (g) => { g.missions.daily.coupons = undefined },
    'unread non booléen': (g) => { g.missions.unread = 1 },
    'paths absent': (g) => { delete g.paths },
    'paths non tableau': (g) => { g.paths = 'x' },
    "segment portant l'id de l'entrée": (g) => { g.paths = [{ id: -1, a: { x: 1, z: 2 }, b: { x: 1, z: 5 } }] },
    'segments aux ids en double': (g) => { g.paths = [{ id: 7, a: { x: 1, z: 2 }, b: { x: 1, z: 5 } }, { id: 7, a: { x: 2, z: 2 }, b: { x: 2, z: 5 } }] },
    'segment sans coordonnée valide': (g) => { g.paths = [{ id: 1, a: { x: 'a' }, b: { x: 1, z: 2 } }] },
  }
  for (const [name, corrupt] of Object.entries(cases)) {
    it(`met de côté une partie avec : ${name}`, () => {
      const g = structuredClone(g0) as any // eslint-disable-line @typescript-eslint/no-explicit-any
      corrupt(g)
      const m = memory({ [SAVE_KEY]: JSON.stringify({ version: 4, savedAt: 1, state: g }) })
      expect(loadGame(m).kind).toBe('illisible')
      expect(m.data[BROKEN_KEY]).toBeDefined()
    })
  }
  it('une partie en cours de mission, avec quotidiennes, reste lisible', () => {
    const g = structuredClone(g0) as any // eslint-disable-line @typescript-eslint/no-explicit-any
    g.missions.tutorial = { step: 3, current: { id: 'pas-billet', base: 0, done: true, claimed: false }, skipped: false }
    g.missions.daily.list = [{ id: 'quot-pieces#1', base: 4, done: false, claimed: false }]
    const m = memory({ [SAVE_KEY]: JSON.stringify({ version: 4, savedAt: 1, state: g }) })
    expect(loadGame(m).kind).toBe('ok')
  })
  it('une quotidienne tirée (cible et récompense gardées) reste lisible', () => {
    const g = structuredClone(g0) as any // eslint-disable-line @typescript-eslint/no-explicit-any
    g.missions.daily.list = [{ id: 'quot-pieces', base: 4, done: false, claimed: false, n: 1350, reward: { coins: 450, fourrage: 25 } }]
    const m = memory({ [SAVE_KEY]: JSON.stringify({ version: 4, savedAt: 1, state: g }) })
    const r = loadGame(m)
    expect(r.kind).toBe('ok')
    if (r.kind === 'ok') expect(r.state.missions.daily.list[0]).toMatchObject({ n: 1350, reward: { coins: 450, fourrage: 25 } })
  })
  it('une partie neuve reste lisible', () => {
    const m = memory({ [SAVE_KEY]: JSON.stringify({ version: 4, savedAt: 1, state: g0 }) })
    expect(loadGame(m).kind).toBe('ok')
  })
})

describe('copie de la sauvegarde v1', () => {
  const raw = JSON.stringify({ version: 1, savedAt: 1, state: { version: 1, time: 5, animals: [], coins: 1, rng: 1, nextId: 1, pantry: { fourrage: 0, viande: 0, capacity: 200 }, enclosures: [] } })
  it('écrit le texte brut sous la clé -v1, une seule fois', () => {
    const m = memory({ [SAVE_KEY]: raw })
    expect(loadGame(m).kind).toBe('ok')
    expect(m.data[`${SAVE_KEY}-v1`]).toBe(raw)
    m.data[`${SAVE_KEY}-v1`] = 'copie existante'
    loadGame(m)
    expect(m.data[`${SAVE_KEY}-v1`]).toBe('copie existante')
  })
  it('pas de copie pour une partie déjà au format courant', () => {
    const m = memory()
    saveGame(m, g, 1)
    loadGame(m)
    expect(m.data[`${SAVE_KEY}-v2`]).toBeUndefined()
  })
})
