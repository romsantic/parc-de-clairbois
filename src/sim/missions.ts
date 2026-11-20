import { SPECIES } from '../data/species'
import { DAILY_LEGACY, DAILY_POOL, MISSIONS_TUNING, STORY, TUTORIAL, type DailyCondition, type MissionDef, type Objective, type Reward } from '../data/missions'
import { DAY_MS, HOUR_MS } from '../data/tuning'
import { VET_CENTER } from '../data/diseases'
import type { ActionResult } from './actions'
import { ageStage } from './animal'
import { careCoverage } from './care'
import { incomePerHour, parkPace } from './economy'
import { autonomyHours } from './feeding'
import { sellPrice } from './merchant'
import { careQueue, centerLevel, workingVets } from './vet'
import { random } from './random'
import { population } from './village'
import type { GameEvent, GameState, MissionProgress } from './types'

export type MissionTrack = 'tutoriel' | 'histoire' | 'quotidienne'
export interface Measure { value: number; target: number }

type ObjectiveOf<K extends Objective['kind']> = Extract<Objective, { kind: K }>
type Measurer<K extends Objective['kind']> = {
  /** Valeur de départ retenue quand la mission commence (compteurs cumulés) ; 0 par défaut. */
  base?: (state: GameState, o: ObjectiveOf<K>) => number
  measure: (state: GameState, o: ObjectiveOf<K>, mp: MissionProgress) => Measure
}

const speciesPresent = (state: GameState) => new Set(state.animals.map((a) => a.species))
const births = (state: GameState, species: readonly string[]): number =>
  species.reduce((n, id) => n + (state.stats.birthsBySpecies[id as keyof typeof state.stats.birthsBySpecies] ?? 0), 0)

/**
 * Une ligne par sorte d'objectif : ajouter une sorte de mission = ajouter une ligne ici
 * (et son type dans `Objective`, data/missions.ts).
 */
const MEASURES: { [K in Objective['kind']]: Measurer<K> } = {
  compteur: {
    base: (s, o) => s.stats.counts[o.stat],
    measure: (s, o, mp) => ({ value: s.stats.counts[o.stat] - mp.base, target: o.n }),
  },
  compteurs: {
    base: (s, o) => o.stats.reduce((n, k) => n + s.stats.counts[k], 0),
    measure: (s, o, mp) => ({ value: o.stats.reduce((n, k) => n + s.stats.counts[k], 0) - mp.base, target: o.n }),
  },
  batiment: {
    measure: (s, o) => ({ value: s.buildings.some((b) => b.type === o.building && b.level >= (o.level ?? 1)) ? 1 : 0, target: 1 }),
  },
  especes: {
    measure: (s, o) => ({
      value: [...speciesPresent(s)].filter((id) => !o.biome || SPECIES[id].biome === o.biome).length,
      target: o.n,
    }),
  },
  couple: {
    // Une femelle et un mâle adultes de l'espèce : 1 point chacun.
    measure: (s, o) => {
      const adults = s.animals.filter((a) => a.species === o.species && ageStage(a, s.time) === 'adulte')
      return { value: (adults.some((a) => a.sex === 'F') ? 1 : 0) + (adults.some((a) => a.sex === 'M') ? 1 : 0), target: 2 }
    },
  },
  enclos: {
    measure: (s, o) => ({ value: s.enclosures.filter((e) => e.biome === o.biome).length, target: o.n }),
  },
  visiteursH: {
    measure: (s, o) => ({ value: incomePerHour(s).visiteurs, target: o.n }),
  },
  habitants: {
    measure: (s, o) => ({ value: population(s), target: o.n }),
  },
  autonomie: {
    // Infinity (personne ne mange) compte comme atteint ; la valeur affichée est plafonnée à la cible.
    measure: (s, o) => ({ value: Math.min(autonomyHours(s), o.hours), target: o.hours }),
  },
  naissanceDe: {
    base: (s, o) => births(s, o.species),
    measure: (s, o, mp) => ({ value: births(s, o.species) - mp.base, target: 1 }),
  },
}

/** Avancée d'une mission ; une mission réussie ne recule jamais. */
export function progress(state: GameState, def: MissionDef, mp: MissionProgress): Measure {
  const m = (MEASURES[def.objective.kind] as Measurer<Objective['kind']>).measure(state, def.objective as never, mp)
  return mp.done ? { value: m.target, target: m.target } : m
}

function baseOf(state: GameState, def: MissionDef): number {
  const m = MEASURES[def.objective.kind] as Measurer<Objective['kind']>
  return m.base ? m.base(state, def.objective as never) : 0
}

/** Première mission d'histoire d'un palier (1 : tout au début ; sinon juste après la mission-porte du palier d'avant). */
export function storyStart(level: 1 | 2 | 3): number {
  return level === 1 ? 0 : STORY.findIndex((m) => m.gate === level) + 1
}

/** Une quotidienne telle qu'elle a été tirée : cible et récompense gardées avec la mission (ou, anciennes parties, lues dans « quot-pieces#2 »). */
function dailyDef(id: string, mp?: Pick<MissionProgress, 'n' | 'reward'>): MissionDef | undefined {
  const [poolId, lv] = id.split('#')
  const pool = DAILY_POOL.find((p) => p.id === poolId)
  if (!pool) return undefined
  let n: number
  let reward: Reward
  if (lv === undefined) {
    if (mp?.n === undefined || mp.reward === undefined) return undefined
    n = mp.n
    reward = mp.reward
  } else {
    const level = Number(lv)
    const old = DAILY_LEGACY[poolId]
    if (!Number.isInteger(level) || level < 1 || !old) return undefined
    n = old.n * (old.targetScale ? level : 1)
    reward = {}
    for (const f of ['coins', 'fourrage', 'viande'] as const) if (old.reward[f] !== undefined) reward[f] = old.reward[f]! * level
  }
  const o = pool.objective
  const objective: Objective = o.kind === 'compteur' || o.kind === 'compteurs' ? { ...o, n } : o
  const title = (n === 1 && pool.titleOne ? pool.titleOne : pool.title).replace('{n}', String(n))
  return { id, title, text: pool.text, giver: pool.giver, objective, reward }
}

/** Définition d'une mission d'après sa piste et son identifiant (`mp` : la quotidienne tirée, qui porte sa cible et sa récompense). */
export function missionDef(track: MissionTrack, id: string, mp?: MissionProgress): MissionDef | undefined {
  if (track === 'tutoriel') return TUTORIAL.find((m) => m.id === id)
  if (track === 'histoire') return STORY.find((m) => m.id === id)
  return dailyDef(id, mp)
}

/** Numéro du jour local (change à minuit, heure de l'appareil). */
export function dayKey(time: number, utcOffsetMin: number): number {
  return Math.floor((time + utcOffsetMin * 60_000) / DAY_MS)
}

const POSSIBLE: Record<DailyCondition, (s: GameState) => boolean> = {
  toujours: () => true,
  ferme: (s) => s.buildings.some((b) => b.type === 'ferme'),
  animalVendable: (s) => s.animals.some((a) => a.health.status === 'ok' && sellPrice(s, a) !== null),
  couple: (s) => {
    const { covered } = careCoverage(s)
    return s.enclosures.some((e) => {
      const adults = s.animals.filter((a) => a.enclosureId === e.id && ageStage(a, s.time) === 'adulte')
      return adults.some((a) => a.sex === 'F' && covered.has(a.id)) && adults.some((a) => a.sex === 'M')
    })
  },
  // Un malade à faire soigner (dans la file ou déjà en soin) et un vétérinaire au travail.
  malade: (s) => workingVets(s).length > 0
    && (careQueue(s).length > 0 || s.animals.some((a) => a.health.status === 'malade' && a.health.careUntil !== null)),
  // Un enclos occupé, pas protégé de la grippe (ou bientôt plus), un vétérinaire et un centre qui vaccine.
  vaccinable: (s) => centerLevel(s) >= VET_CENTER.VACCINE_LEVEL && workingVets(s).length > 0
    && s.enclosures.some((e) => s.animals.some((a) => a.enclosureId === e.id)
      && (e.vaccinatedUntil === null || e.vaccinatedUntil - s.time <= VET_CENTER.VACCINE_RENEW_BELOW_H * HOUR_MS)),
}

/** Tire les quotidiennes du jour parmi celles possibles (hasard de la partie, donc reproductible). */
function drawDaily(state: GameState): MissionProgress[] {
  const possible = DAILY_POOL.filter((p) => POSSIBLE[p.possible](state))
  const pace = parkPace(state)
  const list: MissionProgress[] = []
  while (list.length < MISSIONS_TUNING.DAILY_COUNT && possible.length > 0) {
    const [pool] = possible.splice(Math.floor(random(state) * possible.length), 1)
    const n = pool.target(pace)
    list.push({ id: pool.id, base: baseOf(state, pool as MissionDef), done: false, claimed: false, n, reward: pool.reward(pace, n) })
  }
  return list
}

/**
 * Quotidiennes : change de jour (verse d'office les réussies non récupérées, règle la série, tire les nouvelles),
 * puis mesure celles du jour. Rien tant que les premiers pas ne sont ni finis ni passés.
 */
function dailyStep(state: GameState, events: GameEvent[]): void {
  const m = state.missions
  if (m.tutorial.step < TUTORIAL.length) return
  const d = dayKey(state.time, state.utcOffsetMin)
  const daily = m.daily
  // Seulement vers un jour plus grand : une horloge reculée ou un voyage vers l'ouest ne renouvelle rien.
  if (d > daily.dayKey) {
    const prev = daily.dayKey
    for (const mp of daily.list) {
      const def = dailyDef(mp.id, mp)
      if (mp.done && !mp.claimed && def) {
        giveReward(state, def.reward)
        events.push({ kind: 'missionVersee', at: state.time, id: mp.id, title: def.title })
      }
    }
    // La série est comptée au moment où le jour devient complet : elle survit seulement au passage direct d'un jour complet au suivant.
    if (prev !== -1 && !(d === prev + 1 && daily.lastFullDay === prev)) daily.streak = 0
    daily.dayKey = d
    daily.list = drawDaily(state)
    events.push({ kind: 'quotidiennes', at: state.time })
    m.unread = true
  }
  for (const mp of daily.list) {
    if (mp.done) continue
    const def = dailyDef(mp.id, mp)
    if (!def) continue
    const p = progress(state, def, mp)
    if (p.value >= p.target) {
      mp.done = true
      events.push({ kind: 'mission', at: state.time, track: 'quotidienne', id: mp.id, title: def.title })
    }
  }
  if (daily.list.length > 0 && daily.list.every((mp) => mp.done) && daily.lastFullDay !== d) {
    daily.lastFullDay = d
    daily.streak++
    if (daily.streak % MISSIONS_TUNING.STREAK_DAYS === 0) daily.coupons++
  }
}

export function currentMission(state: GameState): { track: 'tutoriel' | 'histoire'; def: MissionDef; mp: MissionProgress } | null {
  const m = state.missions
  if (m.tutorial.step < TUTORIAL.length) {
    return m.tutorial.current ? { track: 'tutoriel', def: TUTORIAL[m.tutorial.step], mp: m.tutorial.current } : null
  }
  if (m.story.index < STORY.length) {
    return m.story.current ? { track: 'histoire', def: STORY[m.story.index], mp: m.story.current } : null
  }
  return null
}

/** Démarre la mission si besoin, puis la marque réussie quand son objectif est atteint (sans verser la récompense). */
function advance(state: GameState, events: GameEvent[], track: 'tutoriel' | 'histoire', def: MissionDef,
  slot: { current: MissionProgress | null }): void {
  if (!slot.current) {
    slot.current = { id: def.id, base: baseOf(state, def), done: false, claimed: false }
    state.missions.unread = true
  }
  const mp = slot.current
  if (mp.done) return
  const p = progress(state, def, mp)
  if (p.value >= p.target) {
    mp.done = true
    events.push({ kind: 'mission', at: state.time, track, id: def.id })
  }
}

/** Fin des premiers pas : l'histoire commence au palier du niveau actuel du village (jamais en arrière). */
function finishTutorial(state: GameState): void {
  const m = state.missions
  m.tutorial.step = TUTORIAL.length
  m.tutorial.current = null
  m.story.index = Math.max(m.story.index, storyStart(state.village.level))
  m.story.current = null
}

/** Mesure la mission courante (premiers pas, puis histoire) et démarre la suivante si besoin. En place. */
export function updateMissions(state: GameState, events: GameEvent[]): void {
  const m = state.missions
  if (m.tutorial.step < TUTORIAL.length) advance(state, events, 'tutoriel', TUTORIAL[m.tutorial.step], m.tutorial)
  else if (m.story.index < STORY.length) advance(state, events, 'histoire', STORY[m.story.index], m.story)
  dailyStep(state, events)
}

/** Appelé à la fin de chaque pas de simulation. (premiers pas, histoire, quotidiennes). */
export function missionsStep(state: GameState, events: GameEvent[]): void {
  updateMissions(state, events)
}

/** Verse la récompense ; la nourriture s'arrête au garde-manger plein (le reste est perdu, `lost`). En place. */
export function giveReward(state: GameState, reward: Reward): { lost: number } {
  state.coins += reward.coins ?? 0
  const p = state.pantry
  let lost = 0
  for (const food of ['fourrage', 'viande'] as const) {
    const n = reward[food] ?? 0
    const place = Math.max(0, p.capacity - p.fourrage - p.viande)
    const given = Math.min(n, place)
    p[food] += given
    lost += n - given
  }
  return { lost }
}

/** Le joueur récupère la récompense d'une mission réussie, une seule fois ; la suivante démarre. */
export function claimMission(state: GameState, track: MissionTrack, id?: string): ActionResult {
  if (track === 'quotidienne') {
    const mp = id === undefined ? undefined : state.missions.daily.list.find((x) => x.id === id)
    const def = id === undefined || !mp ? undefined : dailyDef(id, mp)
    if (!mp || !def) return { ok: false, reason: 'Introuvable.' }
    if (mp.claimed) return { ok: false, reason: 'Récompense déjà récupérée.' }
    if (!mp.done) return { ok: false, reason: "Cette mission n'est pas encore réussie." }
    const s = structuredClone(state)
    giveReward(s, def.reward)
    s.missions.daily.list.find((x) => x.id === id)!.claimed = true
    return { ok: true, state: s }
  }
  const m = state.missions
  const tuto = track === 'tutoriel'
  const defs = tuto ? TUTORIAL : STORY
  const index = tuto ? m.tutorial.step : m.story.index
  const mp = tuto ? m.tutorial.current : m.story.current
  if (id !== undefined && id !== mp?.id) {
    // Une mission déjà passée a forcément été récupérée (c'est ce qui fait avancer la piste).
    const past = defs.findIndex((d) => d.id === id)
    return past >= 0 && past < index ? { ok: false, reason: 'Récompense déjà récupérée.' } : { ok: false, reason: 'Introuvable.' }
  }
  if (!mp || index >= defs.length) return { ok: false, reason: 'Introuvable.' }
  if (mp.claimed) return { ok: false, reason: 'Récompense déjà récupérée.' }
  if (!mp.done) return { ok: false, reason: "Cette mission n'est pas encore réussie." }
  const s = structuredClone(state)
  giveReward(s, defs[index].reward)
  if (tuto) {
    s.missions.tutorial.step++
    s.missions.tutorial.current = null
    if (s.missions.tutorial.step >= TUTORIAL.length) finishTutorial(s)
  } else {
    s.missions.story.index++
    s.missions.story.current = null
  }
  return { ok: true, state: s }
}

/** Passe les premiers pas : verse d'un coup les récompenses des étapes restantes, puis l'histoire démarre. */
export function skipTutorial(state: GameState): ActionResult {
  if (state.missions.tutorial.step >= TUTORIAL.length) return { ok: false, reason: 'Les premiers pas sont déjà terminés.' }
  const s = structuredClone(state)
  for (const def of TUTORIAL.slice(s.missions.tutorial.step)) giveReward(s, def.reward)
  finishTutorial(s)
  s.missions.tutorial.skipped = true
  return { ok: true, state: s }
}
