import type { GameState } from '../sim/types'
import { advanceTo } from '../sim/advance'
import { newGame } from '../sim/newGame'
import { saveGame, SAVE_KEY, type Storage } from '../save/save'
import { startSession } from './session'
import { mountDebugPanel } from '../ui/debugPanel'
import { showError, showNotice } from '../ui/errorScreen'

const SAVE_EVERY_MS = 30_000
export const RESET_BACKUP_KEY = `${SAVE_KEY}-avant-nouvelle-partie`

/**
 * Démarre la partie : chargement + rattrapage, horloge du jeu chaque seconde,
 * sauvegarde toutes les 30 s et dès que la page est cachée ou fermée.
 * Renvoie l'accès à l'état courant (la carte s'en servira à l'étape 3).
 */
export function runGame(store: Storage, storageOk = true): { get(): GameState } | null {
  const session = startSession(store, Date.now(), storageOk)
  if (session.problem === 'trop-recente') {
    showError("Cette sauvegarde vient d'une version plus récente du jeu. Recharge la page pour obtenir la dernière version.")
    return null
  }
  if (session.problem === 'migration-impossible') {
    showError("Ta sauvegarde n'a pas pu être mise à jour pour cette version du jeu. Elle est conservée telle quelle ; recharge la page plus tard.")
    return null
  }
  if (session.problem === 'illisible') {
    showNotice('Ta sauvegarde était abîmée ; une copie a été mise de côté et une nouvelle partie commence.')
  }
  if (!storageOk) showNotice('Ton navigateur bloque la sauvegarde : la partie ne sera pas conservée après fermeture.')

  let state = session.state
  let canSave = session.canSave
  let warnedError = false
  /** Avance de l'horloge du jeu sur l'heure réelle (boutons du panneau de test). */
  let testOffset = 0
  const now = () => Date.now() + testOffset

  const save = () => {
    if (!canSave) return
    const outcome = saveGame(store, state, Date.now(), session.owner, true)
    if (outcome === 'pris-ailleurs') {
      canSave = false
      showError('Ton parc est ouvert dans un autre onglet. Recharge cette page pour reprendre la partie ici.')
    } else if (outcome === 'trop-recente') {
      canSave = false
      showError("Une version plus récente du jeu a été ouverte. Recharge la page pour l'obtenir.")
    } else if (outcome === 'erreur' && !warnedError) {
      warnedError = true
      showNotice("La sauvegarde n'a pas pu être enregistrée (mémoire du navigateur pleine ?).")
    }
  }

  setInterval(() => { state = advanceTo(state, now()).state }, 1000)
  setInterval(save, SAVE_EVERY_MS)
  window.addEventListener('pagehide', save)
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') save() })
  // Un autre onglet vient de sauvegarder : on s'arrête tout de suite plutôt qu'au prochain essai.
  window.addEventListener('storage', (e) => { if (e.key === SAVE_KEY) save() })

  mountDebugPanel({
    get: () => state,
    set: (s) => { state = s; save() },
    advanceBy: (ms) => { testOffset += ms; state = advanceTo(state, now()).state; save() },
    reset: () => {
      const previous = store.getItem(SAVE_KEY)
      if (previous !== null) { try { store.setItem(RESET_BACKUP_KEY, previous) } catch { /* rien */ } }
      testOffset = 0
      state = newGame(Math.floor(Math.random() * 2 ** 32), Date.now())
      save()
    },
    summary: session.summary,
    skippedMs: session.skippedMs,
  })
  return { get: () => state }
}
