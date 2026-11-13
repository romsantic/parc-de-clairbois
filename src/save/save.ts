import type { GameState } from '../sim/types'
import { CURRENT_VERSION, MIGRATIONS, type Migration } from './migrations'

export const SAVE_KEY = 'parc-clairbois:sauvegarde'
export const BROKEN_KEY = 'parc-clairbois:sauvegarde-illisible'

/** Ce dont la sauvegarde a besoin (le localStorage du navigateur convient). */
export interface Storage {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}

export type LoadResult =
  | { kind: 'aucune' }
  | { kind: 'ok'; state: GameState }
  | { kind: 'illisible' }
  | { kind: 'trop-recente'; version: number }

export function saveGame(store: Storage, state: GameState, nowMs: number): void {
  store.setItem(SAVE_KEY, JSON.stringify({ version: CURRENT_VERSION, savedAt: nowMs, state }))
}

/** Charge la partie, en appliquant les migrations. Une sauvegarde abîmée est mise de côté, jamais perdue. */
export function loadGame(store: Storage, migrations: Record<number, Migration> = MIGRATIONS): LoadResult {
  const raw = store.getItem(SAVE_KEY)
  if (raw === null) return { kind: 'aucune' }
  const broken = (): LoadResult => {
    if (store.getItem(BROKEN_KEY) === null) store.setItem(BROKEN_KEY, raw)
    return { kind: 'illisible' }
  }
  try {
    const data = JSON.parse(raw)
    let version = data?.version
    if (typeof version !== 'number') return broken()
    if (version > CURRENT_VERSION) return { kind: 'trop-recente', version }
    let state: unknown = data.state
    while (version < CURRENT_VERSION) {
      const m = migrations[version]
      if (!m) return broken()
      state = m(state)
      version++
    }
    return looksLikeGame(state) ? { kind: 'ok', state } : broken()
  } catch {
    return broken()
  }
}

function looksLikeGame(s: unknown): s is GameState {
  const g = s as GameState
  return !!g && typeof g.time === 'number' && typeof g.coins === 'number' && Array.isArray(g.animals)
    && Array.isArray(g.enclosures) && typeof g.pantry === 'object' && g.pantry !== null
}
