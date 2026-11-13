import type { GameState } from '../sim/types'
import { advanceTo } from '../sim/advance'
import { newGame } from '../sim/newGame'
import { saveGame, type Storage } from '../save/save'
import { startSession } from './session'
import { mountDebugPanel } from '../ui/debugPanel'
import { showError, showNotice } from '../ui/errorScreen'

const SAVE_EVERY_MS = 30_000

/**
 * Démarre la partie : chargement + rattrapage, horloge du jeu chaque seconde,
 * sauvegarde toutes les 30 s et dès que la page est cachée ou fermée.
 * Renvoie l'accès à l'état courant (la carte s'en servira à l'étape 3).
 */
export function runGame(store: Storage): { get(): GameState } | null {
  const session = startSession(store, Date.now())
  if (session.problem === 'trop-recente') {
    showError("Cette sauvegarde vient d'une version plus récente du jeu. Recharge la page pour obtenir la dernière version.")
    return null
  }
  if (session.problem === 'illisible') {
    showNotice('Ta sauvegarde était abîmée ; une copie a été mise de côté et une nouvelle partie commence.')
  }

  let state = session.state
  /** Avance de l'horloge du jeu sur l'heure réelle (boutons du panneau de test). */
  let testOffset = 0
  const now = () => Date.now() + testOffset
  const save = () => { if (session.canSave) saveGame(store, state, Date.now()) }

  setInterval(() => { state = advanceTo(state, now()).state }, 1000)
  setInterval(save, SAVE_EVERY_MS)
  window.addEventListener('pagehide', save)
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') save() })

  mountDebugPanel({
    get: () => state,
    set: (s) => { state = s; save() },
    advanceBy: (ms) => { testOffset += ms; state = advanceTo(state, now()).state; save() },
    reset: () => { testOffset = 0; state = newGame(Math.floor(Math.random() * 2 ** 32), Date.now()); save() },
    summary: session.summary,
  })
  return { get: () => state }
}
