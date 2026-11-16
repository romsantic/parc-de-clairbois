import type { GameState } from '../sim/types'
import { advanceTo } from '../sim/advance'
import { newGame } from '../sim/newGame'
import { saveGame, SAVE_KEY, type Storage } from '../save/save'
import { startSession } from './session'
import { mountDebugPanel } from '../ui/debugPanel'
import { showError, showNotice } from '../ui/errorScreen'
import { mountTopBar } from '../ui/topBar'
import { flash, toast } from '../ui/feedback'
import { applyAction, type Action } from '../sim/actions'
import { BUILDINGS } from '../data/economy'
import { SPECIES } from '../data/species'

const SAVE_EVERY_MS = 30_000
export const RESET_BACKUP_KEY = `${SAVE_KEY}-avant-nouvelle-partie`

/**
 * Démarre la partie : chargement + rattrapage, horloge du jeu chaque seconde,
 * sauvegarde toutes les 30 s et dès que la page est cachée ou fermée.
 * Renvoie l'accès à l'état courant (la carte s'en servira à l'étape 3).
 */
export interface Game {
  get(): GameState
  dispatch(action: Action, from?: HTMLElement | null): boolean
}

export function runGame(store: Storage, storageOk = true): Game | null {
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
  const topBar = mountTopBar(() => state)
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
  /**
   * Toutes les actions du joueur passent par ici : on applique, on sauvegarde, et on le montre
   * (bouton vert ou rouge, ressources qui s'allument, message court).
   */
  function dispatch(action: Action, from?: HTMLElement | null): boolean {
    const before = state
    const r = applyAction(state, action)
    flash(from, r.ok)
    if (!r.ok) { toast(r.reason, false); return false }
    state = r.state
    save()
    const dc = state.coins - before.coins
    if (dc) topBar.pulse('coins', dc)
    const df = state.pantry.fourrage - before.pantry.fourrage
    if (df) topBar.pulse('fourrage', df)
    const dv = state.pantry.viande - before.pantry.viande
    if (dv) topBar.pulse('viande', dv)
    toast(successMessage(action, state, before), true)
    return true
  }

  return { get: () => state, dispatch }
}

/** Message de réussite ; `s` est l'état après l'action, `before` celui d'avant. */
function successMessage(a: Action, s: GameState, before: GameState): string {
  switch (a.type) {
    case 'nettoyer': return 'Enclos nettoyé'
    case 'soignerTout': return 'Les animaux malades sont soignés'
    case 'soigner': return 'Animal soigné'
    case 'construire': return 'Nouvel enclos construit'
    case 'redimensionner': return 'Enclos redimensionné'
    case 'renommer': return 'Nom changé'
    case 'batir': return `${BUILDINGS[a.building].name} construit`
    case 'ameliorer': {
      const b = s.buildings.find((x) => x.slot === a.slot)
      return b ? `${BUILDINGS[b.type].name} amélioré (niveau ${b.level})` : 'Bâtiment amélioré'
    }
    case 'acheterRations': return `+${a.n} ${a.food} dans le garde-manger`
    case 'agrandirGardeManger': return `Garde-manger agrandi (${s.pantry.capacity} places)`
    case 'billet': return `Billet à ${a.price} pièces`
    case 'acheterAnimal': {
      const offer = before.merchant.offers.find((o) => o.id === a.offerId)
      return `${offer ? SPECIES[offer.species].name : 'Animal'} acheté`
    }
    case 'vendre': return `Animal vendu (+${s.coins - before.coins})`
    case 'monterNiveau': return s.village.level === 3 ? 'Clairbois devient un bourg !' : 'Clairbois devient un village !'
  }
}
