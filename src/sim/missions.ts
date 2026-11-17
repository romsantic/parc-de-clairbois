import { SPECIES } from '../data/species'
import { STORY, TUTORIAL, type MissionDef, type Objective, type Reward } from '../data/missions'
import type { ActionResult } from './actions'
import { ageStage } from './animal'
import { incomePerHour } from './economy'
import { autonomyHours } from './feeding'
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

/** Définition d'une mission d'après sa piste et son identifiant (les quotidiennes viendront avec la tâche 3). */
export function missionDef(track: MissionTrack, id: string): MissionDef | undefined {
  if (track === 'tutoriel') return TUTORIAL.find((m) => m.id === id)
  if (track === 'histoire') return STORY.find((m) => m.id === id)
  return undefined
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
}

/** Appelé à la fin de chaque pas de simulation. Point d'extension : la tâche 3 y ajoute les quotidiennes. */
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
  // Les quotidiennes arrivent avec la tâche 3 : ajouter ici leur branche.
  if (track === 'quotidienne') return { ok: false, reason: 'Introuvable.' }
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
  updateMissions(s, []) // la suivante peut être réussie aussitôt (ex. café déjà construit)
  return { ok: true, state: s }
}

/** Passe les premiers pas : verse d'un coup les récompenses des étapes restantes, puis l'histoire démarre. */
export function skipTutorial(state: GameState): ActionResult {
  if (state.missions.tutorial.step >= TUTORIAL.length) return { ok: false, reason: 'Les premiers pas sont déjà terminés.' }
  const s = structuredClone(state)
  for (const def of TUTORIAL.slice(s.missions.tutorial.step)) giveReward(s, def.reward)
  finishTutorial(s)
  s.missions.tutorial.skipped = true
  updateMissions(s, [])
  return { ok: true, state: s }
}
