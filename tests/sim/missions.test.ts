import { describe, expect, it } from 'vitest'
import { animal, emptyState, enclosure, storyAt, T0 } from './helpers'
import { applyAction, type Action } from '../../src/sim/actions'
import { advanceTo } from '../../src/sim/advance'
import { canLevelUp, missionGateOk } from '../../src/sim/village'
import { summarize } from '../../src/sim/summary'
import { claimMission, currentMission, giveReward, progress, skipTutorial, updateMissions } from '../../src/sim/missions'
import { STORY, TUTORIAL } from '../../src/data/missions'
import { MIGRATIONS } from '../../src/save/migrations'
import { DAY_MS } from '../../src/data/tuning'
import type { GameEvent, GameState } from '../../src/sim/types'

const ok = (s: GameState, a: Action): GameState => {
  const r = applyAction(s, a)
  if (!r.ok) throw new Error(r.reason)
  return r.state
}
const refus = (s: GameState, a: Action): string => {
  const r = applyAction(s, a)
  if (r.ok) throw new Error('action acceptée')
  return r.reason
}
const started = (over: Partial<GameState> = {}): GameState => {
  const s = emptyState(over)
  updateMissions(s, [])
  return s
}
const idOf = (s: GameState): string | undefined => currentMission(s)?.def.id

describe('données des missions', () => {
  it('9 premiers pas, 11 missions d\'histoire, portes aux bons index', () => {
    expect(TUTORIAL).toHaveLength(9)
    expect(STORY).toHaveLength(11)
    expect(STORY.findIndex((m) => m.gate === 2)).toBe(3)
    expect(STORY.findIndex((m) => m.gate === 3)).toBe(7)
    expect(STORY.findIndex((m) => m.gate === 'fin')).toBe(10)
  })
  it('les identifiants sont uniques', () => {
    const ids = [...TUTORIAL, ...STORY].map((m) => m.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
  it('les index de départ de palier de la migration v2 → v3 correspondent aux données', () => {
    const start = (level: number) => (MIGRATIONS[2]({ totalVisitors: 0, village: { level, clientsServed: 0 } }) as GameState).missions.story.index
    expect(start(1)).toBe(0)
    expect(start(2)).toBe(STORY.findIndex((m) => m.gate === 2) + 1)
    expect(start(3)).toBe(STORY.findIndex((m) => m.gate === 3) + 1)
  })
})

describe('premiers pas', () => {
  it('nouvelle partie : mission courante = premier pas n°1, non lue', () => {
    const s = started()
    const c = currentMission(s)!
    expect(c.track).toBe('tutoriel')
    expect(c.def.id).toBe(TUTORIAL[0].id)
    expect(c.mp).toMatchObject({ done: false, claimed: false })
    expect(s.missions.unread).toBe(true)
  })
  it('vu ficheEnclos réussit le pas n°1 sans verser la récompense ni démarrer le n°2', () => {
    const s = ok(started(), { type: 'vu', what: 'ficheEnclos' })
    expect(s.coins).toBe(1000)
    expect(idOf(s)).toBe(TUTORIAL[0].id)
    expect(currentMission(s)!.mp.done).toBe(true)
    expect(s.missions.tutorial.step).toBe(0)
  })
  it('recuperer verse 20 pièces et démarre le n°2 ; un second clic est refusé', () => {
    let s = ok(started(), { type: 'vu', what: 'ficheEnclos' })
    s = ok(s, { type: 'recuperer', track: 'tutoriel', id: TUTORIAL[0].id })
    expect(s.coins).toBe(1020)
    expect(idOf(s)).toBe(TUTORIAL[1].id)
    expect(currentMission(s)!.mp).toMatchObject({ done: false, claimed: false })
    expect(refus(s, { type: 'recuperer', track: 'tutoriel', id: TUTORIAL[0].id })).toBe('Récompense déjà récupérée.')
    expect(s.coins).toBe(1020)
  })
  it('recuperer sans identifiant vise la mission courante ; refus si elle n\'est pas réussie', () => {
    const s = started()
    expect(refus(s, { type: 'recuperer', track: 'tutoriel' })).toBe("Cette mission n'est pas encore réussie.")
    const t = ok(ok(s, { type: 'vu', what: 'ficheEnclos' }), { type: 'recuperer', track: 'tutoriel' })
    expect(t.coins).toBe(1020)
  })
  it('un identifiant qui n\'est pas la mission courante est refusé', () => {
    const s = ok(started(), { type: 'vu', what: 'ficheEnclos' })
    expect(refus(s, { type: 'recuperer', track: 'tutoriel', id: 'inconnue' })).toBe('Introuvable.')
  })
  it('acheter 10 puis 10 fourrages réussit le pas n°2', () => {
    let s = ok(ok(started(), { type: 'vu', what: 'ficheEnclos' }), { type: 'recuperer', track: 'tutoriel' })
    s = ok(s, { type: 'acheterRations', food: 'fourrage', n: 10 })
    expect(currentMission(s)!.mp.done).toBe(false)
    s = ok(s, { type: 'acheterRations', food: 'fourrage', n: 10 })
    expect(currentMission(s)!.mp.done).toBe(true)
  })
  it('un compteur ne compte que ce qui se passe après le début de la mission', () => {
    const s = emptyState()
    s.stats.counts.fourrageAchete = 50 // acheté avant
    s.missions.tutorial.step = 1
    updateMissions(s, [])
    expect(currentMission(s)!.mp.base).toBe(50)
    expect(currentMission(s)!.mp.done).toBe(false)
  })
  it('ancienne partie : café et 2 enclos déjà là → pas n°5 réussi aussitôt, n°6 réussi aussitôt après récupération', () => {
    const s = emptyState({
      buildings: [{ slot: 0, type: 'ferme', level: 1 }, { slot: 1, type: 'cafe', level: 1 }],
      enclosures: [enclosure(1, 'mouton'), enclosure(2, null)],
    })
    s.missions.tutorial.step = 4
    updateMissions(s, [])
    expect(idOf(s)).toBe('pas-cafe')
    expect(currentMission(s)!.mp.done).toBe(true)
    const t = ok(s, { type: 'recuperer', track: 'tutoriel' })
    expect(t.coins).toBe(1150)
    expect(idOf(t)).toBe('pas-enclos')
    expect(currentMission(t)!.mp.done).toBe(true)
    const u = ok(t, { type: 'recuperer', track: 'tutoriel' })
    expect(idOf(u)).toBe('pas-cochons')
    expect(currentMission(u)!.mp.done).toBe(false)
  })
  it('gestation : une femelle qui devient gestante réussit le pas n°8', () => {
    const s = emptyState()
    s.missions.tutorial.step = 7
    updateMissions(s, [])
    s.stats.counts.gestations += 1
    updateMissions(s, [])
    expect(currentMission(s)!.mp.done).toBe(true)
  })
  it('lireMission éteint le « ! » en silence', () => {
    const s = ok(started(), { type: 'lireMission' })
    expect(s.missions.unread).toBe(false)
    expect(idOf(s)).toBe(TUTORIAL[0].id)
  })
  it('un événement « mission » est émis une seule fois à la réussite', () => {
    const s = started()
    s.stats.counts.ficheEnclosVue = 1
    const ev: GameEvent[] = []
    updateMissions(s, ev)
    updateMissions(s, ev)
    expect(ev.filter((e) => e.kind === 'mission')).toEqual([{ kind: 'mission', at: s.time, track: 'tutoriel', id: TUTORIAL[0].id }])
  })
})

describe('passer les premiers pas', () => {
  const atStep3 = (): GameState => { const s = emptyState(); s.missions.tutorial.step = 2; updateMissions(s, []); return s }
  it('au pas n°3 : récompenses des pas 3 à 9 versées, histoire au palier 1', () => {
    const s = ok(atStep3(), { type: 'passerTutoriel' })
    expect(s.coins).toBe(1000 + 10 + 20 + 150 + 150 + 100 + 50)
    expect(s.pantry.fourrage).toBe(20)
    expect(s.missions.tutorial).toMatchObject({ step: 9, current: null, skipped: true })
    expect(idOf(s)).toBe(STORY[0].id)
    expect(currentMission(s)!.track).toBe('histoire')
  })
  it('un second passage est refusé', () => {
    const s = ok(atStep3(), { type: 'passerTutoriel' })
    expect(refus(s, { type: 'passerTutoriel' })).toBe('Les premiers pas sont déjà terminés.')
    expect(skipTutorial(s)).toEqual({ ok: false, reason: 'Les premiers pas sont déjà terminés.' })
  })
  it('la mission en cours déjà réussie mais pas récupérée est versée aussi, une seule fois', () => {
    const s = ok(started(), { type: 'vu', what: 'ficheEnclos' })
    const t = ok(s, { type: 'passerTutoriel' })
    expect(t.coins).toBe(1000 + 20 + 10 + 20 + 150 + 150 + 100 + 50)
  })
})

describe('histoire', () => {
  it('fin des premiers pas : l\'histoire commence au premier palier', () => {
    let s = emptyState()
    s.missions.tutorial.step = 8
    updateMissions(s, [])
    s.stats.counts.autonomieVue = 1
    updateMissions(s, [])
    s = ok(s, { type: 'recuperer', track: 'tutoriel' })
    expect(s.missions.tutorial.step).toBe(9)
    expect(idOf(s)).toBe(STORY[0].id)
    expect(s.missions.story.index).toBe(0)
  })
  it('tutoriel fini au niveau 2 : l\'histoire démarre au premier palier Village', () => {
    const s = emptyState({ village: { level: 2, clientsServed: 0 } })
    s.missions.tutorial.step = 8
    updateMissions(s, [])
    s.stats.counts.autonomieVue = 1
    updateMissions(s, [])
    const t = ok(s, { type: 'recuperer', track: 'tutoriel' })
    expect(t.missions.story.index).toBe(4)
    expect(idOf(t)).toBe(STORY[4].id)
  })
  it('une partie migrée au niveau 2 garde son index', () => {
    const s = emptyState({ village: { level: 2, clientsServed: 0 }, missions: storyAt(4) })
    s.missions.tutorial.step = 8
    updateMissions(s, [])
    s.stats.counts.autonomieVue = 1
    updateMissions(s, [])
    expect(ok(s, { type: 'recuperer', track: 'tutoriel' }).missions.story.index).toBe(4)
  })
  it('« Posséder 3 espèces » : réussie avec mouton + cochon + âne', () => {
    const s = emptyState({
      missions: storyAt(2),
      enclosures: [1, 2, 3].map((i) => enclosure(i, (['mouton', 'cochon', 'ane'] as const)[i - 1], 12, 10, { cleanedAt: T0 + 100 * DAY_MS })),
      animals: [animal(1, 'mouton', 'F', 1), animal(2, 'cochon', 'F', 2)],
    })
    updateMissions(s, [])
    expect(idOf(s)).toBe('hist-especes-3')
    expect(currentMission(s)!.mp.done).toBe(false)
    s.animals.push(animal(3, 'ane', 'F', 3))
    updateMissions(s, [])
    expect(currentMission(s)!.mp.done).toBe(true)
  })
  it('récupérer une mission d\'histoire verse sa récompense (pièces + fourrage) et passe à la suivante', () => {
    const s = emptyState({ missions: storyAt(0) })
    updateMissions(s, [])
    s.stats.counts.naissances = 1
    updateMissions(s, [])
    const t = ok(s, { type: 'recuperer', track: 'histoire' })
    expect(t.coins).toBe(1150)
    expect(t.pantry.fourrage).toBe(30)
    expect(idOf(t)).toBe(STORY[1].id)
    expect(refus(t, { type: 'recuperer', track: 'histoire', id: STORY[0].id })).toBe('Récompense déjà récupérée.')
  })
  it('la dernière mission faite : plus de mission courante', () => {
    const s = emptyState({ missions: storyAt(10), pantry: { fourrage: 0, viande: 0, capacity: 1000 } })
    s.buildings = []
    s.village = { level: 3, clientsServed: 150 * 30 }
    updateMissions(s, [])
    expect(idOf(s)).toBe('hist-habitants-150')
    expect(currentMission(s)!.mp.done).toBe(true)
    const t = ok(s, { type: 'recuperer', track: 'histoire' })
    expect(t.coins).toBe(6000)
    expect(currentMission(t)).toBeNull()
    expect(t.missions.story.index).toBe(11)
  })
  it('30 jours d\'absence : la mission réussie attend, rien n\'est versé, l\'histoire n\'avance pas', () => {
    const s = emptyState({
      missions: storyAt(2), ticketPrice: 0,
      pantry: { fourrage: 1e6, viande: 0, capacity: 1e7 },
      enclosures: [1, 2, 3].map((i) => enclosure(i, (['mouton', 'cochon', 'ane'] as const)[i - 1], 12, 10, { cleanedAt: T0 + 100 * DAY_MS })),
      animals: [animal(1, 'mouton', 'F', 1), animal(2, 'cochon', 'F', 2), animal(3, 'ane', 'F', 3)],
    })
    const r = advanceTo(s, T0 + 30 * DAY_MS)
    expect(r.state.missions.story.index).toBe(2)
    expect(currentMission(r.state)!.mp).toMatchObject({ done: true, claimed: false })
    // même absence sans mission d'histoire en cours : aucune pièce de plus ne vient de la mission (les quotidiennes, elles, se versent à minuit)
    const sans = advanceTo({ ...s, missions: storyAt(11) }, T0 + 30 * DAY_MS)
    expect(r.state.coins).toBe(sans.state.coins)
    expect(r.events.filter((e) => e.kind === 'mission' && e.track === 'histoire')).toHaveLength(1)
    expect(summarize(r.events).missions).toContain('Possède 3 espèces')
  })
})

describe('passage de niveau', () => {
  const at60 = (storyIndex: number, done = false) => {
    const s = emptyState({ village: { level: 1, clientsServed: 45 * 30 }, missions: storyAt(storyIndex) })
    if (storyIndex === 3) s.missions.story.current = { id: 'hist-visiteurs-20', base: 0, done, claimed: false }
    return s
  }
  it('60 habitants mais la mission du palier pas faite : refusé avec la raison', () => {
    expect(canLevelUp(at60(3))).toEqual({ ok: false, reason: "Il faut d'abord terminer la mission du palier." })
    expect(canLevelUp(at60(0))).toEqual({ ok: false, reason: "Il faut d'abord terminer la mission du palier." })
  })
  it('mission du palier réussie (même pas récupérée) : accepté ; au-delà : accepté', () => {
    expect(missionGateOk(at60(3, true), 2)).toBe(true)
    expect(canLevelUp(at60(3, true))).toEqual({ ok: true, level: 2 })
    expect(canLevelUp(at60(4))).toEqual({ ok: true, level: 2 })
  })
  it('porte du Bourg : mission « 100 habitants »', () => {
    expect(missionGateOk(emptyState({ missions: storyAt(7) }), 3)).toBe(false)
    expect(missionGateOk(emptyState({ missions: storyAt(8) }), 3)).toBe(true)
  })
})

describe('mesures', () => {
  const def = (id: string) => [...TUTORIAL, ...STORY].find((m) => m.id === id)!
  const mp = (id: string, base = 0) => ({ id, base, done: false, claimed: false })
  it('couple : une femelle et un mâle adultes', () => {
    const s = emptyState({ enclosures: [enclosure(1, 'cochon')], animals: [animal(1, 'cochon', 'F', 1)] })
    expect(progress(s, def('pas-cochons'), mp('pas-cochons'))).toEqual({ value: 1, target: 2 })
    s.animals.push(animal(2, 'cochon', 'M', 1))
    expect(progress(s, def('pas-cochons'), mp('pas-cochons'))).toEqual({ value: 2, target: 2 })
    s.animals[1].bornAt = T0 // un bébé ne compte pas
    expect(progress(s, def('pas-cochons'), mp('pas-cochons')).value).toBe(1)
  })
  it('enclos du biome, espèces par biome, habitants, visiteurs par heure', () => {
    const s = emptyState({
      enclosures: [enclosure(1, 'mouton'), enclosure(2, 'renard'), enclosure(3, 'cerf')],
      animals: [animal(1, 'mouton', 'F', 1), animal(2, 'renard', 'F', 2), animal(3, 'cerf', 'F', 3)],
    })
    expect(progress(s, def('pas-enclos'), mp('pas-enclos'))).toEqual({ value: 1, target: 2 })
    expect(progress(s, def('hist-foret'), mp('hist-foret'))).toEqual({ value: 2, target: 2 })
    expect(progress(s, def('hist-especes-3'), mp('hist-especes-3'))).toEqual({ value: 3, target: 3 })
    expect(progress(s, def('hist-habitants-100'), mp('hist-habitants-100'))).toEqual({ value: 15, target: 100 })
    expect(progress(s, def('hist-visiteurs-20'), mp('hist-visiteurs-20')).target).toBe(20)
  })
  it('naissanceDe : naissances des espèces citées depuis le début de la mission', () => {
    const s = emptyState()
    s.stats.birthsBySpecies = { loup: 1, mouton: 5 }
    const m = def('hist-loup-taureau')
    expect(progress(s, m, mp(m.id, 1)).value).toBe(0)
    s.stats.birthsBySpecies.taureau = 1
    expect(progress(s, m, mp(m.id, 1))).toEqual({ value: 1, target: 1 })
  })
  it('autonomie : sans animal (infinie) la cible est atteinte, valeur plafonnée', () => {
    const s = emptyState()
    expect(progress(s, def('hist-autonomie-2j'), mp('hist-autonomie-2j'))).toEqual({ value: 48, target: 48 })
  })
  it('une mission réussie ne recule jamais', () => {
    const s = emptyState()
    const m = def('hist-especes-3')
    expect(progress(s, m, { ...mp(m.id), done: true })).toEqual({ value: 3, target: 3 })
  })
})

describe('giveReward', () => {
  it('respecte la place du garde-manger et dit ce qui est perdu', () => {
    const s = emptyState({ pantry: { fourrage: 90, viande: 0, capacity: 100 } })
    expect(giveReward(s, { coins: 10, fourrage: 30 })).toEqual({ lost: 20 })
    expect(s.pantry.fourrage).toBe(100)
    expect(s.coins).toBe(1010)
  })
  it('fourrage puis viande se partagent la place restante', () => {
    const s = emptyState({ pantry: { fourrage: 0, viande: 0, capacity: 120 } })
    expect(giveReward(s, { fourrage: 100, viande: 50 })).toEqual({ lost: 30 })
    expect(s.pantry).toMatchObject({ fourrage: 100, viande: 20 })
  })
  it('claimMission : le garde-manger presque plein perd une partie du fourrage', () => {
    const s = emptyState({ missions: storyAt(0), pantry: { fourrage: 990, viande: 0, capacity: 1000 } })
    updateMissions(s, [])
    s.stats.counts.naissances = 1
    updateMissions(s, [])
    const r = claimMission(s, 'histoire')
    expect(r.ok && r.state.pantry.fourrage).toBe(1000)
  })
})

describe('résumé d\'absence : missions', () => {
  it('une mission réussie pendant l\'absence apparaît dans le résumé avec son titre', () => {
    const s = emptyState({
      enclosures: [enclosure(1, 'mouton')], animals: [animal(1, 'mouton', 'F', 1), animal(2, 'mouton', 'M', 1)],
      pantry: { fourrage: 500, viande: 0, capacity: 1000 },
    })
    s.missions.tutorial = { step: 7, current: { id: 'pas-gestation', base: 0, done: false, claimed: false }, skipped: false }
    const r = advanceTo(s, T0 + 5 * DAY_MS)
    expect(r.state.missions.tutorial.current?.done).toBe(true)
    expect(summarize(r.events, r.state).missions).toContain('Attends la première gestation')
  })
})
