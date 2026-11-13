import type { GameState } from '../sim/types'
import { newGame } from '../sim/newGame'
import { advanceTo } from '../sim/advance'
import { summarize, type Summary } from '../sim/summary'
import { loadGame, saveGame, type Storage } from '../save/save'

export interface Session {
  state: GameState
  /** Ce qui s'est passé pendant l'absence (null pour une nouvelle partie). */
  summary: Summary | null
  /** Temps d'absence au-delà de 30 jours, non rejoué. */
  skippedMs: number
  problem: 'illisible' | 'trop-recente' | 'migration-impossible' | null
  /** Faux si sauvegarder écraserait une partie qu'on ne sait pas lire, ou si le stockage manque. */
  canSave: boolean
  /** Identifiant de cet onglet : seul lui sauvegarde tant qu'aucun autre n'a repris la partie. */
  owner: string
}

const newOwner = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
const newSeed = () => Math.floor(Math.random() * 2 ** 32)

/** Charge la partie (ou en crée une), rattrape le temps d'absence et prend la main sur la sauvegarde. */
export function startSession(store: Storage, nowMs: number, storageOk = true): Session {
  const owner = newOwner()
  const base = { summary: null, skippedMs: 0, owner }
  if (!storageOk) return { ...base, state: newGame(newSeed(), nowMs), problem: null, canSave: false }
  const loaded = loadGame(store, undefined, nowMs)
  if (loaded.kind === 'trop-recente' || loaded.kind === 'migration-impossible') {
    return { ...base, state: newGame(newSeed(), nowMs), problem: loaded.kind, canSave: false }
  }
  if (loaded.kind !== 'ok') {
    const state = newGame(newSeed(), nowMs)
    const canSave = saveGame(store, state, nowMs, owner) === 'ok'
    return { ...base, state, problem: loaded.kind === 'illisible' ? 'illisible' : null, canSave }
  }
  const r = advanceTo(loaded.state, nowMs)
  const canSave = saveGame(store, r.state, nowMs, owner) === 'ok'
  return { ...base, state: r.state, summary: summarize(r.events), skippedMs: r.skippedMs, problem: null, canSave }
}
