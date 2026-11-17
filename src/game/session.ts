import type { GameState } from '../sim/types'
import { newGame } from '../sim/newGame'
import { advanceTo } from '../sim/advance'
import { restock } from '../sim/merchant'
import { summarize, type Summary } from '../sim/summary'
import { MISSIONS_TUNING } from '../data/missions'
import { HOUR_MS } from '../data/tuning'
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
  const r = advanceTo(start, nowMs)
  if (r.state.merchant.restocks === 0 && r.state.merchant.offers.length === 0) {
    // Partie migrée de la v1 chargée avant le premier pas : le marchand a déjà son premier stock.
    r.state = structuredClone(r.state)
    restock(r.state)
  }
  const canSave = saveGame(store, r.state, nowMs, owner) === 'ok'
  return { ...base, state: r.state, summary: summarize(r.events, r.state), skippedMs: r.skippedMs, absentMs: loaded.savedAt === undefined ? 0 : Math.max(0, nowMs - loaded.savedAt), problem: null, canSave }
}

/**
 * Rattrapage d'un onglet repris sans rechargement (écran verrouillé puis rouvert) : met l'heure locale à jour,
 * avance le jeu jusqu'à `nowMs`, et rend de quoi ouvrir La Gazette si le jeu a avancé d'au moins
 * `GAZETTE_MIN_ABSENCE_H` d'un coup (mesuré sur l'heure du jeu, avant et après).
 */
export function resume(state: GameState, nowMs: number): { state: GameState; news: { summary: Summary; absentMs: number } | null } {
  const before = state.time
  const r = advanceTo({ ...state, utcOffsetMin: localOffset(nowMs) }, nowMs)
  const gapMs = r.state.time - before
  const news = gapMs >= MISSIONS_TUNING.GAZETTE_MIN_ABSENCE_H * HOUR_MS ? { summary: summarize(r.events, r.state), absentMs: gapMs } : null
  return { state: r.state, news }
}
