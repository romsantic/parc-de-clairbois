/** Ce que l'interface affiche des missions : fonctions pures (testées), sans DOM. */
import { ECONOMY, SLOTS } from '../data/economy'
import { MISSIONS_TUNING, STORY, STORY_DONE_MESSAGE, TUTORIAL, type HighlightId, type MissionDef } from '../data/missions'
import { MAIRIE } from '../data/village'
import { DAY_MS } from '../data/tuning'
import { ZONES } from '../data/zones'
import { currentMission, dayKey, missionDef, progress, type MissionTrack } from '../sim/missions'
import { canLevelUp, missionGateOk, population } from '../sim/village'
import type { GameState, MissionProgress, Rect } from '../sim/types'
import { formatProgress, formatReward } from './format'

/** Une mission prête à être affichée. */
export interface MissionLine {
  track: MissionTrack
  id: string
  title: string
  giver: string
  text: string
  /** « 12/20 » */
  progress: string
  reward: string
  done: boolean
  claimed: boolean
}

function line(state: GameState, track: MissionTrack, def: MissionDef, mp: MissionProgress): MissionLine {
  const p = progress(state, def, mp)
  return {
    track, id: def.id, title: def.title, giver: def.giver, text: def.text,
    progress: formatProgress(p.value, p.target), reward: formatReward(def.reward), done: mp.done, claimed: mp.claimed,
  }
}

/** Mission courante (premiers pas ou histoire), ou null. */
export function currentLine(state: GameState): MissionLine | null {
  const cur = currentMission(state)
  return cur ? line(state, cur.track, cur.def, cur.mp) : null
}

/** Les quotidiennes du jour (vide avant la fin des premiers pas). */
export function dailyLines(state: GameState): MissionLine[] {
  const out: MissionLine[] = []
  for (const mp of state.missions.daily.list) {
    const def = missionDef('quotidienne', mp.id, mp)
    if (def) out.push(line(state, 'quotidienne', def, mp))
  }
  return out
}

/** Quotidiennes réussies sur le nombre tiré (« ☀ 1/3 ») ; null s'il n'y en a pas. */
export function dailyCount(state: GameState): { done: number; total: number } | null {
  const list = state.missions.daily.list
  return list.length === 0 ? null : { done: list.filter((m) => m.done).length, total: list.length }
}

/** Plus aucune mission d'histoire à faire. */
export function storyEnded(state: GameState): boolean {
  return state.missions.tutorial.step >= TUTORIAL.length && state.missions.story.index >= STORY.length
}

export const storyEndMessage = STORY_DONE_MESSAGE

/** Élément à mettre en évidence : celui de la mission en cours, tant qu'elle n'est pas réussie. */
export function highlightFor(state: GameState): HighlightId | null {
  const cur = currentMission(state)
  return cur && !cur.mp.done ? cur.def.highlight ?? null : null
}

/** Le « ! » doré se montre pour une mission non lue ou tant que durent les premiers pas. */
export function markerVisible(state: GameState): boolean {
  return state.missions.unread || state.missions.tutorial.step < TUTORIAL.length
}

const center = (r: Rect) => ({ x: r.x + r.w / 2, z: r.z + r.d / 2 })
const inside = (x: number, z: number, r: Rect, m: number) => x > r.x - m && x < r.x + r.w + m && z > r.z - m && z < r.z + r.d + m

/** Centre de la prairie hors des enclos : le point libre (maille de 2 m) le plus proche du centre de la zone. */
export function prairieSpot(state: GameState): { x: number; z: number } {
  const rect = ZONES.find((z) => z.id === 'prairie')!.rect
  const c = center(rect)
  let best: { x: number; z: number } | null = null
  let bestD = Infinity
  for (let x = rect.x + 2; x < rect.x + rect.w - 1; x += 2) {
    for (let z = rect.z + 2; z < rect.z + rect.d - 1; z += 2) {
      if (state.enclosures.some((e) => inside(x, z, e.rect, 1.5))) continue
      const d = Math.hypot(x - c.x, z - c.z)
      if (d < bestD) { bestD = d; best = { x, z } }
    }
  }
  return best ?? c
}

/** Premier emplacement débloqué sans bâtiment (hors emplacements réservés). */
export function freeSlot(state: GameState): { x: number; z: number; id: number } | null {
  return SLOTS.find((s) => !s.only && s.unlockLevel <= state.village.level && !state.buildings.some((b) => b.slot === s.id)) ?? null
}

/**
 * Où mettre le « ! » : au-dessus de la cible tant que la mission n'est pas réussie, même si le
 * joueur l'a déjà choisie ; null = au-dessus de la mairie.
 */
export function markerPosition(state: GameState, id: HighlightId | null): { x: number; z: number } | null {
  switch (id) {
    case 'detailsEnclos':
    case 'nettoyer': {
      const enc = state.enclosures.find((e) => e.species === 'mouton') ?? state.enclosures[0]
      if (!enc) return null
      return center(enc.rect)
    }
    case 'ferme': {
      const ferme = state.buildings.find((b) => b.type === 'ferme')
      const slot = ferme && SLOTS.find((s) => s.id === ferme.slot)
      if (!slot) return null
      return { x: slot.x, z: slot.z }
    }
    case 'emplacementLibre': {
      const slot = freeSlot(state)
      return slot ? { x: slot.x, z: slot.z } : null
    }
    case 'emplacementCentre': {
      const slot = SLOTS.find((s) => s.only === 'centreVeto')
      return slot ? { x: slot.x, z: slot.z } : null
    }
    case 'prairie': return prairieSpot(state)
    default: return null
  }
}

/** « Il faut d'abord terminer la mission : … » pour le palier ; vide si ce palier n'a pas de mission. */
export function gateMissionText(level: 2 | 3): string {
  const gate = STORY.find((m) => m.gate === level)
  return gate ? `Il faut d'abord terminer la mission : ${gate.title}` : ''
}

/** Raison affichée quand le village ne peut pas monter de niveau ; vide s'il le peut. */
export function levelBlockReason(state: GameState): string {
  const c = canLevelUp(state)
  if (c.ok) return ''
  const level = (state.village.level + 1) as 2 | 3
  if (population(state) >= ECONOMY.LEVEL_POPULATION[level] && !missionGateOk(state, level)) {
    const text = gateMissionText(level)
    if (text) return text
  }
  return c.reason
}

/** Millisecondes jusqu'au prochain minuit local. */
export function msUntilNextDay(time: number, utcOffsetMin: number): number {
  return (dayKey(time, utcOffsetMin) + 1) * DAY_MS - utcOffsetMin * 60_000 - time
}

/** Texte de la série : « Série : 3 jours · un bon −25 % tous les 7 jours ». */
export function streakText(streak: number): string {
  const pct = Math.round(MISSIONS_TUNING.COUPON_DISCOUNT * 100)
  return `Série : ${streak} jour${streak > 1 ? 's' : ''} · un bon −${pct} % tous les ${MISSIONS_TUNING.STREAK_DAYS} jours`
}

/** Quelle bannière montrer d'après la mission courante avant/après. `prev` undefined = tout premier affichage. */
export function bannerFor(
  prev: { id: string; done: boolean } | undefined,
  cur: { id: string; done: boolean } | null,
  unread: boolean,
): 'nouvelle' | 'reussie' | null {
  if (!cur) return null
  if (!prev) return unread ? 'nouvelle' : null
  if (prev.id !== cur.id) return cur.done ? 'reussie' : 'nouvelle'
  return !prev.done && cur.done ? 'reussie' : null
}

/** Où se trouve le « ! » à l'écran (cible ou mairie) ; null s'il est caché. */
export function markerSpot(state: GameState): { x: number; z: number } | null {
  if (!markerVisible(state)) return null
  return markerPosition(state, highlightFor(state)) ?? { x: MAIRIE.x, z: MAIRIE.z }
}
