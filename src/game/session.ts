import type { GameState } from '../sim/types'
import { newGame } from '../sim/newGame'
import { advanceTo } from '../sim/advance'
import { restock } from '../sim/merchant'
import { summarize, type Summary } from '../sim/summary'
import { updateMissions } from '../sim/missions'
import { loadGame, saveGame, type Storage } from '../save/save'

export interface Session {
  state: GameState
  /** Ce qui s'est passé pendant l'absence (null pour une nouvelle partie). */
  summary: Summary | null
  /** Temps d'absence au-delà de 30 jours, non rejoué. */
  skippedMs: number
  /** Temps écoulé depuis la dernière sauvegarde (0 pour une nouvelle partie ou si on ne le sait pas). */
  absentMs: number
  problem: 'illisible' | 'trop-recente' | 'migration-impossible' | null
  /** Faux si sauvegarder écraserait une partie qu'on ne sait pas lire, ou si le stockage manque. */
  canSave: boolean
  /** Identifiant de cet onglet : seul lui sauvegarde tant qu'aucun autre n'a repris la partie. */
  owner: string
}

const newOwner = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
const localOffset = (nowMs: number): number => -new Date(nowMs).getTimezoneOffset()
const freshGame = (nowMs: number): GameState => ({ ...newGame(newSeed(), nowMs), utcOffsetMin: localOffset(nowMs) })
const newSeed = () => Math.floor(Math.random() * 2 ** 32)

/** Charge la partie (ou en crée une), rattrape le temps d'absence et prend la main sur la sauvegarde. */
export function startSession(store: Storage, nowMs: number, storageOk = true): Session {
  const owner = newOwner()
  const base = { summary: null, skippedMs: 0, absentMs: 0, owner }
  if (!storageOk) return { ...base, state: freshGame(nowMs), problem: null, canSave: false }
  const loaded = loadGame(store, undefined, nowMs)
  if (loaded.kind === 'trop-recente' || loaded.kind === 'migration-impossible') {
    return { ...base, state: freshGame(nowMs), problem: loaded.kind, canSave: false }
  }
  if (loaded.kind !== 'ok') {
    const state = freshGame(nowMs)
    const canSave = saveGame(store, state, nowMs, owner) === 'ok'
    return { ...base, state, problem: loaded.kind === 'illisible' ? 'illisible' : null, canSave }
  }
  const start = structuredClone(loaded.state)
  start.utcOffsetMin = localOffset(nowMs) // l'heure locale, avant le rattrapage
  const doneBefore = new Set(doneMissions(start).map((m) => m.key))
  const r = advanceTo(start, nowMs)
  if (r.state.merchant.restocks === 0 && r.state.merchant.offers.length === 0) {
    // Partie migrée de la v1 chargée avant le premier pas : le marchand a déjà son premier stock.
    r.state = structuredClone(r.state)
    restock(r.state)
  }
  // Missions réussies pendant l'absence : on mesure une dernière fois, puis on rattrape toute mission
  // devenue réussie sans événement correspondant, pour que le résumé n'en oublie aucune.
  r.state = structuredClone(r.state)
  updateMissions(r.state, r.events)
  const reported = new Set(r.events.flatMap((e) => (e.kind === 'mission' ? [`${e.track}:${e.id}`] : [])))
  for (const m of doneMissions(r.state)) {
    if (!doneBefore.has(m.key) && !reported.has(m.key)) r.events.push({ kind: 'mission', at: r.state.time, track: m.track, id: m.id })
  }
  const canSave = saveGame(store, r.state, nowMs, owner) === 'ok'
  return { ...base, state: r.state, summary: summarize(r.events, r.state), skippedMs: r.skippedMs, absentMs: loaded.savedAt === undefined ? 0 : Math.max(0, nowMs - loaded.savedAt), problem: null, canSave }
}

type Track = 'tutoriel' | 'histoire' | 'quotidienne'
/** Missions marquées réussies dans l'état (mission courante des premiers pas ou de l'histoire, quotidiennes). */
function doneMissions(s: GameState): { key: string; track: Track; id: string }[] {
  const list: { key: string; track: Track; id: string }[] = []
  const add = (track: Track, mp: { id: string; done: boolean } | null) => { if (mp?.done) list.push({ key: `${track}:${mp.id}`, track, id: mp.id }) }
  add('tutoriel', s.missions.tutorial.current)
  add('histoire', s.missions.story.current)
  for (const mp of s.missions.daily.list) add('quotidienne', mp)
  return list
}
