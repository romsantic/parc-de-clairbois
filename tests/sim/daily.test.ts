import { describe, expect, it } from 'vitest'
import { animal, bigPark, crowdedPark, emptyState, enclosure, storyAt, T0 } from './helpers'
import { applyAction, type Action } from '../../src/sim/actions'
import { advanceTo, step } from '../../src/sim/advance'
import { claimMission, dayKey, missionDef, updateMissions } from '../../src/sim/missions'
import { summarize } from '../../src/sim/summary'
import { DAILY_POOL, DAILY_TUNING, MISSIONS_TUNING, niceRound, type ParkPace } from '../../src/data/missions'
import { parkPace } from '../../src/sim/economy'
import { newGame } from '../../src/sim/newGame'
import { loadGame, SAVE_KEY } from '../../src/save/save'
import { DAY_MS, HOUR_MS } from '../../src/data/tuning'
import type { GameEvent, GameState } from '../../src/sim/types'

const ok = (s: GameState, a: Action): GameState => {
  const r = applyAction(s, a)
  if (!r.ok) throw new Error(r.reason)
  return r.state
}
/** Partie dont les premiers pas sont finis : le premier tirage a lieu au premier update. */
const withDaily = (over: Partial<GameState> = {}): GameState => {
  const s = emptyState({ missions: storyAt(0), ...over })
  updateMissions(s, [])
  return s
}
const ids = (s: GameState) => s.missions.daily.list.map((m) => m.id)
const poolId = (id: string) => id.split('#')[0]
/** Fait avancer jusqu'au prochain minuit local. */
const toMidnight = (s: GameState): { state: GameState; events: GameEvent[] } => {
  const next = (dayKey(s.time, s.utcOffsetMin) + 1) * DAY_MS - s.utcOffsetMin * 60_000
  const r = advanceTo(s, next)
  return { state: r.state, events: r.events }
}
/** Réussit les 3 quotidiennes en trichant sur la mesure. */
const finishAll = (s: GameState): void => {
  for (const mp of s.missions.daily.list) mp.done = true
  updateMissions(s, [])
}
const count = (e: GameEvent[]) => e.filter((x) => x.kind === 'quotidiennes').length

describe('dayKey', () => {
  it('23 h 50 et 0 h 10 locales (offset +60) : jours consécutifs', () => {
    const minuitLocal = Math.floor(T0 / DAY_MS) * DAY_MS + DAY_MS - 60 * 60_000 // minuit local = 23 h UTC
    expect(dayKey(minuitLocal - 10 * 60_000, 60) + 1).toBe(dayKey(minuitLocal + 10 * 60_000, 60))
  })
  it('un fuseau différent décale minuit', () => {
    const t = Math.floor(T0 / DAY_MS) * DAY_MS + 23.5 * HOUR_MS // 23 h 30 UTC
    expect(dayKey(t, 0)).not.toBe(dayKey(t, 60))
  })
})

describe('tirage', () => {
  it('avant la fin des premiers pas : aucune quotidienne', () => {
    const s = emptyState()
    updateMissions(s, [])
    for (let i = 0; i < 5; i++) step(s)
    expect(s.missions.daily.list).toEqual([])
  })
  it('premier tirage : 3 missions différentes, série intacte', () => {
    const s = withDaily()
    expect(s.missions.daily.list).toHaveLength(3)
    expect(new Set(ids(s)).size).toBe(3)
    expect(s.missions.daily.dayKey).toBe(dayKey(s.time, 0))
    expect(s.missions.daily.streak).toBe(0)
  })
  it('chaque quotidienne retrouve sa définition : cible et récompense tirées', () => {
    const s = withDaily({ village: { level: 2, clientsServed: 0 } })
    for (const mp of s.missions.daily.list) {
      const def = missionDef('quotidienne', mp.id, mp)!
      expect(def.title).toBeTruthy()
      expect(def.title).not.toMatch(/[{}#]/)
      expect(mp.n).toBeGreaterThan(0)
      expect(def.reward).toEqual(mp.reward)
    }
  })
  it('la définition ne change pas quand le parc grandit en cours de journée', () => {
    const s = withDaily()
    const avant = s.missions.daily.list.map((m) => JSON.stringify(missionDef('quotidienne', m.id, m)))
    Object.assign(s, bigPark(), { missions: s.missions })
    s.village.level = 3
    updateMissions(s, [])
    expect(s.missions.daily.list.map((m) => JSON.stringify(missionDef('quotidienne', m.id, m)))).toEqual(avant)
  })
  it('un pas qui franchit minuit renouvelle une seule fois', () => {
    const s = withDaily()
    const r = toMidnight(s)
    expect(count(r.events)).toBe(1)
    expect(r.state.missions.daily.dayKey).toBe(dayKey(s.time, 0) + 1)
    const encore = advanceTo(r.state, r.state.time + 3 * HOUR_MS)
    expect(count(encore.events)).toBe(0)
    expect(ids(encore.state)).toEqual(ids(r.state))
  })
  it('un fuseau différent décale minuit', () => {
    const a = withDaily({ utcOffsetMin: 0 })
    const b = withDaily({ utcOffsetMin: 600 })
    expect(count(advanceTo(a, a.time + DAY_MS).events)).toBe(1)
    expect(count(advanceTo(b, b.time + DAY_MS).events)).toBe(1)
    // à 14 h UTC (heure du test fixe), le jour local de b a un autre moment de bascule que celui de a
    const minuitA = (dayKey(a.time, 0) + 1) * DAY_MS
    const minuitB = (dayKey(b.time, 600) + 1) * DAY_MS - 600 * 60_000
    expect(minuitA).not.toBe(minuitB)
    expect(count(advanceTo(a, Math.min(minuitA, minuitB)).events) + count(advanceTo(b, Math.min(minuitA, minuitB)).events)).toBe(1)
  })
  it('même graine : même tirage', () => {
    expect(ids(withDaily())).toEqual(ids(withDaily()))
  })
  it("sans animal vendable, « Vendre un animal » n'est jamais tirée (50 graines)", () => {
    const vendre = DAILY_POOL.find((p) => p.possible === 'animalVendable')!.id
    for (let rng = 1; rng <= 50; rng++) expect(ids(withDaily({ rng })).map(poolId)).not.toContain(vendre)
  })
  it('sans ferme, animal malade ni couple : aucune mission conditionnelle', () => {
    const cond = DAILY_POOL.filter((p) => p.possible !== 'toujours').map((p) => p.id)
    for (let rng = 1; rng <= 50; rng++) {
      for (const id of ids(withDaily({ rng, buildings: [] }))) expect(cond).not.toContain(poolId(id))
    }
  })
  it('avec un animal vendable, un couple, un malade et une ferme, toutes peuvent sortir', () => {
    const vues = new Set<string>()
    for (let rng = 1; rng <= 120; rng++) {
      const s = withDaily({
        rng, enclosures: [enclosure(1, 'mouton'), enclosure(2, 'cochon')],
        animals: [animal(1, 'mouton', 'F', 1), animal(2, 'mouton', 'M', 1), animal(3, 'cochon', 'F', 2, { health: { status: 'malade', since: T0 } })],
      })
      for (const id of ids(s)) vues.add(poolId(id))
    }
    for (const p of DAILY_POOL) expect(vues.has(p.id)).toBe(true)
  })
  it("un animal malade n'est pas vendable", () => {
    const vendre = DAILY_POOL.find((p) => p.possible === 'animalVendable')!.id
    for (let rng = 1; rng <= 40; rng++) {
      const s = withDaily({ rng, enclosures: [enclosure(1, 'mouton')], animals: [animal(1, 'mouton', 'F', 1, { health: { status: 'malade', since: T0 } })] })
      expect(ids(s).map(poolId)).not.toContain(vendre)
    }
  })
})

describe('mesure et récupération', () => {
  const find = (s: GameState, pool: string) => s.missions.daily.list.find((m) => poolId(m.id) === pool)!
  const targetOf = (s: GameState, pool: string) => find(s, pool).n!
  const withMission = (pool: string): GameState => {
    for (let rng = 1; rng < 300; rng++) {
      const s = withDaily({ rng, enclosures: [enclosure(1, 'mouton')], animals: [animal(1, 'mouton', 'F', 1), animal(2, 'mouton', 'M', 1)] })
      if (s.missions.daily.list.some((m) => poolId(m.id) === pool)) return s
    }
    throw new Error('introuvable ' + pool)
  }
  it('« Nettoyer 2 fois » : réussie après 2 nettoyages, récompense non versée', () => {
    let s = withMission('quot-nettoyer')
    s.enclosures[0].cleanedAt = T0 - 10 * DAY_MS
    s = ok(s, { type: 'nettoyer', encId: 1 })
    expect(find(s, 'quot-nettoyer').done).toBe(false)
    s.enclosures[0].cleanedAt = T0 - 10 * DAY_MS
    const avant = s.coins
    s = ok(s, { type: 'nettoyer', encId: 1 })
    expect(find(s, 'quot-nettoyer').done).toBe(true)
    expect(find(s, 'quot-nettoyer').claimed).toBe(false)
    expect(s.coins).toBeLessThan(avant) // seul le coût du nettoyage est retiré
  })
  it('« Acheter des rations » compte fourrage et viande ensemble', () => {
    let s = withMission('quot-rations')
    const n = targetOf(s, 'quot-rations')
    s = ok(s, { type: 'acheterRations', food: 'fourrage', n: 10 })
    expect(find(s, 'quot-rations').done).toBe(false)
    s = ok(s, { type: 'acheterRations', food: 'viande', n: n - 10 })
    expect(find(s, 'quot-rations').done).toBe(true)
  })
  it('recuperer verse une seule fois', () => {
    let s = withMission('quot-achat')
    const id = find(s, 'quot-achat').id
    find(s, 'quot-achat').done = true
    const coins = s.coins
    s = ok(s, { type: 'recuperer', track: 'quotidienne', id })
    expect(s.coins).toBe(coins + (find(s, 'quot-achat').reward!.coins ?? 0))
    expect(find(s, 'quot-achat').claimed).toBe(true)
    expect(applyAction(s, { type: 'recuperer', track: 'quotidienne', id })).toEqual({ ok: false, reason: 'Récompense déjà récupérée.' })
  })
  it('recuperer refuse une quotidienne pas réussie ou inconnue', () => {
    const s = withMission('quot-achat')
    const id = find(s, 'quot-achat').id
    expect(claimMission(s, 'quotidienne', id)).toEqual({ ok: false, reason: "Cette mission n'est pas encore réussie." })
    expect(claimMission(s, 'quotidienne', 'zzz')).toEqual({ ok: false, reason: 'Introuvable.' })
    expect(claimMission(s, 'quotidienne')).toEqual({ ok: false, reason: 'Introuvable.' })
  })
  it('un événement « mission » (quotidienne) est émis à la réussite', () => {
    const s = withMission('quot-achat')
    s.stats.counts.achatsAnimaux += 1
    const ev: GameEvent[] = []
    updateMissions(s, ev)
    updateMissions(s, ev)
    expect(ev.filter((e) => e.kind === 'mission' && e.track === 'quotidienne')).toHaveLength(1)
    for (const t of summarize(ev, s).missions) expect(t).not.toMatch(/#/)
  })
})

describe('série et bon de réduction', () => {
  it('3 réussies → série 1 (une seule fois)', () => {
    const s = withDaily()
    finishAll(s)
    finishAll(s)
    expect(s.missions.daily.streak).toBe(1)
    expect(s.missions.daily.lastFullDay).toBe(s.missions.daily.dayKey)
  })
  it('une réussie non récupérée puis minuit : récompense versée une fois', () => {
    const s = withDaily({ ticketPrice: 0, reputation: 0 })
    const mp = s.missions.daily.list[0]
    mp.done = true
    const def = missionDef('quotidienne', mp.id, mp)!
    const avant = { c: s.coins, f: s.pantry.fourrage }
    const r = toMidnight(s).state
    const gagne = r.coins - avant.c
    expect(gagne).toBeGreaterThanOrEqual(def.reward.coins ?? 0)
    expect(r.pantry.fourrage - avant.f).toBeGreaterThanOrEqual(def.reward.fourrage ?? 0)
    // le jour suivant : l'ancienne mission n'est plus dans la liste, rien n'est reversé
    const r2 = toMidnight(r).state
    expect(r2.coins - r.coins).toBeLessThan((def.reward.coins ?? 0) + 1000)
    expect(r2.missions.daily.list.some((m) => m.id === mp.id && m.claimed)).toBe(false)
  })
  it("minuit à l'envers : une horloge qui recule ne renouvelle rien et ne touche pas à la série", () => {
    let s = withDaily()
    s.missions.daily.streak = 2
    s.missions.daily.lastFullDay = s.missions.daily.dayKey
    finishAll(s)
    s = toMidnight(s).state
    expect(s.missions.daily.streak).toBe(2)
    const list = structuredClone(s.missions.daily.list)
    const key = s.missions.daily.dayKey
    s.utcOffsetMin = -60 // l'horloge recule d'une heure : on revient au jour d'avant
    s = advanceTo(s, s.time + 10 * 60_000).state
    expect(s.missions.daily.dayKey).toBe(key)
    expect(s.missions.daily.list).toEqual(list)
    expect(s.missions.daily.streak).toBe(2)
    s.utcOffsetMin = 0 // elle avance de nouveau
    s = advanceTo(s, s.time + 10 * 60_000).state
    expect(s.missions.daily.list).toEqual(list)
    expect(s.missions.daily.streak).toBe(2)
  })
  it("une récompense versée d'office à minuit est annoncée (événement et résumé)", () => {
    const s = withDaily({ ticketPrice: 0, reputation: 0 })
    s.missions.daily.list[0].done = true
    s.missions.daily.list[1].done = true
    s.missions.daily.list[1].claimed = true
    const r = toMidnight(s)
    const versees = r.events.filter((e) => e.kind === 'missionVersee')
    const mp0 = s.missions.daily.list[0]
    const titre = missionDef('quotidienne', mp0.id, mp0)!.title
    expect(versees).toEqual([{ kind: 'missionVersee', at: expect.any(Number), id: mp0.id, title: titre }])
    expect(summarize(r.events, r.state).missionsVersees).toEqual([titre])
    expect(summarize([]).missionsVersees).toEqual([])
  })
  it('jour suivant non terminé puis minuit → série 0', () => {
    let s = withDaily()
    finishAll(s)
    s = toMidnight(s).state
    expect(s.missions.daily.streak).toBe(1) // jour complet : la série continue
    s = toMidnight(s).state // ce jour-là n'a pas été terminé
    expect(s.missions.daily.streak).toBe(0)
  })
  it('7 jours complets → un bon ; la série continue', () => {
    let s = withDaily()
    for (let d = 0; d < 7; d++) {
      finishAll(s)
      if (d < 6) s = toMidnight(s).state
    }
    expect(s.missions.daily.streak).toBe(7)
    expect(s.missions.daily.coupons).toBe(1)
    s = toMidnight(s).state
    expect(s.missions.daily.streak).toBe(7)
    expect(s.missions.daily.coupons).toBe(1)
  })
  it("un jour d'absence complet casse la série", () => {
    let s = withDaily()
    finishAll(s)
    s = advanceTo(s, s.time + 2 * DAY_MS + HOUR_MS).state
    expect(s.missions.daily.streak).toBe(0)
  })
  it('pas de bon avant le 7ᵉ jour', () => {
    let s = withDaily()
    for (let d = 0; d < 3; d++) { finishAll(s); s = toMidnight(s).state }
    expect(s.missions.daily.coupons).toBe(0)
    expect(MISSIONS_TUNING.STREAK_DAYS).toBe(7)
  })
  it("30 jours d'absence : au plus 30 renouvellements, série 0, moins de 2 s", () => {
    const s = withDaily()
    finishAll(s)
    const t0 = Date.now()
    const r = advanceTo(s, s.time + 30 * DAY_MS)
    expect(Date.now() - t0).toBeLessThan(2000)
    expect(count(r.events)).toBeLessThanOrEqual(30)
    expect(count(r.events)).toBeGreaterThan(0)
    expect(r.state.missions.daily.streak).toBe(0)
    expect(r.state.missions.daily.list).toHaveLength(3)
  })
})

describe('summary', () => {
  it('quotidiennesRenouvelees et serie', () => {
    const s = withDaily()
    finishAll(s)
    const r = toMidnight(s)
    const sum = summarize(r.events, r.state)
    expect(sum.quotidiennesRenouvelees).toBe(true)
    expect(sum.serie).toBe(r.state.missions.daily.streak)
    expect(summarize([]).quotidiennesRenouvelees).toBe(false)
    expect(summarize([]).serie).toBe(0)
  })
})

describe('chiffres ronds', () => {
  it('arrondit selon la taille du nombre', () => {
    expect(niceRound(147)).toBe(150)
    expect(niceRound(1234)).toBe(1250)
    expect(niceRound(42)).toBe(40)
    expect(niceRound(7345)).toBe(7300)
    expect(niceRound(23456)).toBe(23500)
  })
  it('jamais 0, même pour 0, un négatif ou NaN', () => {
    for (const x of [0, -50, NaN, 0.4]) expect(niceRound(x)).toBeGreaterThan(0)
  })
  it('un résultat arrondi reste rond (idempotent)', () => {
    for (const x of [3, 33, 147, 480, 777, 1999, 4321, 12345]) expect(niceRound(niceRound(x))).toBe(niceRound(x))
  })
})

describe('quotidiennes réglées sur le parc', () => {
  const pace = (over: Partial<ParkPace> = {}): ParkPace => ({ visitorsPerH: 0, coinsPerH: 0, rationsPerDay: 0, enclosures: 0, animals: 0, ...over })
  const entry = (id: string) => DAILY_POOL.find((p) => p.id === id)!
  const drawn = (s: GameState, id: string) => {
    const p = parkPace(s), d = entry(id), n = d.target(p), reward = d.reward(p, n)
    return { n, reward, title: missionDef('quotidienne', id, { id, base: 0, done: false, claimed: false, n, reward })!.title }
  }
  const start = (): GameState => ({ ...newGame(1, T0), missions: storyAt(0) })

  it('parc de départ : proche de ce que le jeu proposait', () => {
    const s = start()
    expect(drawn(s, 'quot-nettoyer').n).toBe(2)
    expect(drawn(s, 'quot-visiteurs').n).toBe(50)
    expect(drawn(s, 'quot-rations').n).toBe(30)
    expect(drawn(s, 'quot-vendre').n).toBe(1)
    expect(drawn(s, 'quot-pieces').n).toBe(300)
  })
  it('gros parc : tout grandit, rations et nettoyages compris', () => {
    const p0 = parkPace(start()), p1 = parkPace(bigPark()), p2 = parkPace(crowdedPark())
    for (const id of ['quot-visiteurs', 'quot-pieces', 'quot-rations']) {
      expect(entry(id).target(p1)).toBeGreaterThan(entry(id).target(p0))
      expect(entry(id).target(p2)).toBeGreaterThanOrEqual(entry(id).target(p1))
    }
    expect(entry('quot-visiteurs').target(p1)).toBeGreaterThan(5 * entry('quot-visiteurs').target(p0))
    expect(entry('quot-pieces').target(p1)).toBeGreaterThan(5 * entry('quot-pieces').target(p0))
    // une demi-journée de ce que mangent les animaux
    expect(Math.abs(entry('quot-rations').target(p1) - DAILY_TUNING.RATIONS_DAY_SHARE * p1.rationsPerDay)).toBeLessThanOrEqual(5)
    expect(entry('quot-rations').target(p2)).toBeGreaterThanOrEqual(150) // parc bondé : ~390 rations par jour
    expect(entry('quot-nettoyer').target(p1)).toBe(DAILY_TUNING.CLEAN_MAX)
    expect(entry('quot-vendre').target(p1)).toBe(DAILY_TUNING.TRADE_MANY)
    expect(entry('quot-pieces').reward(p1, 1).coins).toBeGreaterThan(entry('quot-pieces').reward(p0, 1).coins!)
    expect(entry('quot-rations').reward(p2, 1).fourrage).toBeGreaterThan(entry('quot-rations').reward(p0, 1).fourrage!)
  })
  it('la récompense en pièces vaut environ une heure de recettes, un peu plus pour ce qui coûte', () => {
    const p = parkPace(bigPark())
    const pieces = entry('quot-pieces').reward(p, 1).coins!
    expect(Math.abs(pieces - p.coinsPerH)).toBeLessThanOrEqual(50)
    expect(entry('quot-achat').reward(p, 1).coins!).toBeGreaterThan(pieces)
    expect(entry('quot-rations').reward(p, 1).coins).toBeUndefined() // le fermier paie en nourriture
    expect(entry('quot-rations').reward(p, 1).fourrage).toBeGreaterThan(0)
  })
  it("parc à l'arrêt (0 visiteur) : cibles minimales, jamais 0, récompense d'au moins 30", () => {
    for (const p of [pace(), pace({ visitorsPerH: NaN })]) {
      for (const d of DAILY_POOL) {
        const n = d.target(p)
        expect(n).toBeGreaterThan(0)
        const r = d.reward(p, n)
        expect(Math.max(r.coins ?? 0, r.fourrage ?? 0)).toBeGreaterThan(0)
        if (r.coins !== undefined) expect(r.coins).toBeGreaterThanOrEqual(DAILY_TUNING.REWARD_MIN)
      }
      expect(entry('quot-visiteurs').target(p)).toBe(DAILY_TUNING.MIN_VISITORS)
      expect(entry('quot-nettoyer').target(p)).toBe(DAILY_TUNING.CLEAN_MIN)
    }
  })
  it('les cibles sont des chiffres ronds', () => {
    for (const s of [start(), bigPark(), crowdedPark()]) {
      const p = parkPace(s)
      for (const id of ['quot-visiteurs', 'quot-pieces', 'quot-rations']) {
        const n = entry(id).target(p)
        expect(niceRound(n)).toBe(n)
      }
    }
  })
  it('vendre / acheter : 1 animal, 2 au-delà de 20 animaux ; titres au singulier et au pluriel', () => {
    expect(entry('quot-vendre').target(pace({ animals: 20 }))).toBe(1)
    expect(entry('quot-vendre').target(pace({ animals: 21 }))).toBe(2)
    expect(drawn(start(), 'quot-vendre').title).toBe('Vends un animal')
    expect(drawn(bigPark(), 'quot-vendre').title).toBe('Vends 2 animaux')
    expect(drawn(start(), 'quot-achat').title).toBe('Achète un animal')
    expect(drawn(bigPark(), 'quot-achat').title).toBe('Achète 2 animaux')
    expect(drawn(bigPark(), 'quot-visiteurs').title).toMatch(/^Accueille \d+ visiteurs$/)
  })
  it('le tirage garde cible et récompense avec la mission, et la mesure suit la cible tirée', () => {
    let trouve = false
    for (let rng = 1; rng < 60 && !trouve; rng++) {
      const s = emptyState({ ...bigPark(), rng, missions: storyAt(0) })
      updateMissions(s, [])
      const mp = s.missions.daily.list.find((m) => m.id === 'quot-visiteurs')
      if (!mp) continue
      trouve = true
      const def = missionDef('quotidienne', mp.id, mp)!
      expect(def.objective).toMatchObject({ kind: 'compteur', n: mp.n })
      expect(mp.n).toBe(entry('quot-visiteurs').target(parkPace(bigPark())))
      expect(def.reward).toEqual(entry('quot-visiteurs').reward(parkPace(bigPark()), mp.n!))
    }
    expect(trouve).toBe(true)
  })
  it('même graine, même parc : même tirage (cibles et récompenses comprises)', () => {
    const a = emptyState({ ...bigPark(), missions: storyAt(0) }), b = emptyState({ ...bigPark(), missions: storyAt(0) })
    updateMissions(a, []); updateMissions(b, [])
    expect(a.missions.daily.list).toEqual(b.missions.daily.list)
  })
  it('à minuit, un parc grandi donne de nouvelles cibles', () => {
    const s = withDaily() // parc vide : cibles minimales
    expect(s.missions.daily.list.every((m) => (m.reward?.coins ?? 0) <= DAILY_TUNING.REWARD_MIN)).toBe(true)
    Object.assign(s, { ...bigPark(), time: s.time, rng: s.rng, missions: s.missions })
    const apres = toMidnight(s).state.missions.daily.list
    expect(apres.some((m) => (m.reward?.coins ?? 0) > 200 || (m.reward?.fourrage ?? 0) > 15)).toBe(true)
  })
})

describe('anciennes quotidiennes (partie v3, « quot-pieces#2 »)', () => {
  it('restent lues telles quelles : cible et récompense × niveau', () => {
    const mp = { id: 'quot-pieces#2', base: 0, done: false, claimed: false }
    const def = missionDef('quotidienne', mp.id, mp)!
    expect(def.title).toBe('Gagne 600 pièces')
    expect(def.objective).toMatchObject({ n: 600 })
    expect(def.reward).toEqual({ coins: 60 })
    expect(missionDef('quotidienne', 'quot-vendre#1')!.title).toBe('Vends un animal')
    expect(missionDef('quotidienne', 'quot-rations#3')!.reward).toEqual({ fourrage: 45 })
  })
  it('une quotidienne inconnue ou sans cible est ignorée sans planter', () => {
    expect(missionDef('quotidienne', 'zzz#1')).toBeUndefined()
    expect(missionDef('quotidienne', 'quot-pieces#0')).toBeUndefined()
    expect(missionDef('quotidienne', 'quot-pieces')).toBeUndefined()
  })
  it('une partie v3 avec des « #2 » se charge, se mesure et se récupère', () => {
    const g = structuredClone(withDaily({ village: { level: 2, clientsServed: 0 } })) as GameState
    g.missions.daily.list = [{ id: 'quot-achat#2', base: g.stats.counts.achatsAnimaux, done: false, claimed: false }]
    const mem: Record<string, string> = { [SAVE_KEY]: JSON.stringify({ version: 5, savedAt: 1, state: g }) }
    const r = loadGame({ getItem: (k) => mem[k] ?? null, setItem: (k, v) => { mem[k] = v } })
    expect(r.kind).toBe('ok')
    if (r.kind !== 'ok') return
    let s = r.state
    s.stats.counts.achatsAnimaux += 1
    updateMissions(s, [])
    expect(s.missions.daily.list[0].done).toBe(true)
    const coins = s.coins
    s = ok(s, { type: 'recuperer', track: 'quotidienne', id: 'quot-achat#2' })
    expect(s.coins).toBe(coins + 80)
  })
})
