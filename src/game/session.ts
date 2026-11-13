import type { GameState } from '../sim/types'
import { newGame } from '../sim/newGame'
import { advanceTo } from '../sim/advance'
import { summarize, type Summary } from '../sim/summary'
import { loadGame, saveGame, type Storage } from '../save/save'

export interface Session {
  state: GameState
  /** Ce qui s'est passé pendant l'absence (null pour une nouvelle partie). */
  summary: Summary | null
  problem: 'illisible' | 'trop-recente' | null
  /** Faux si sauvegarder écraserait une partie plus récente. */
  canSave: boolean
}

/** Charge la partie (ou en crée une), rattrape le temps d'absence et sauvegarde. */
export function startSession(store: Storage, nowMs: number): Session {
  const loaded = loadGame(store)
  const fresh = () => newGame(Math.floor(Math.random() * 2 ** 32), nowMs)
  if (loaded.kind === 'trop-recente') return { state: fresh(), summary: null, problem: 'trop-recente', canSave: false }
  if (loaded.kind !== 'ok') {
    const state = fresh()
    saveGame(store, state, nowMs)
    return { state, summary: null, problem: loaded.kind === 'illisible' ? 'illisible' : null, canSave: true }
  }
  const r = advanceTo(loaded.state, nowMs)
  saveGame(store, r.state, nowMs)
  return { state: r.state, summary: summarize(r.events), problem: null, canSave: true }
}
