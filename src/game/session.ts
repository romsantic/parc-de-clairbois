import type { GameState } from '../sim/types'
import { newGame } from '../sim/newGame'
import { advanceTo } from '../sim/advance'
import { restock } from '../sim/merchant'
import { fairPrice } from '../sim/economy'
import { ECONOMY } from '../data/economy'
import { summarize, type Summary } from '../sim/summary'
import { MISSIONS_TUNING } from '../data/missions'
import { HOUR_MS } from '../data/tuning'
import { population, newcomers } from '../sim/village'
import { loadGame, saveGame, SAVE_KEY, type Storage } from '../save/save'

/** Copie de la partie effacée par « Recommencer à zéro ». */
export const RESET_BACKUP_KEY = `${SAVE_KEY}-avant-nouvelle-partie`

/** Marqué une fois les réglages de l'étape 6 (billet, habitants) appliqués à une partie : ils ne se rejouent pas à chaque chargement. */
export const STEP6_MARKER_KEY = `${SAVE_KEY}-reglages-etape6`
/** Ancienne règle des nouveaux venus (avant l'étape 6) : un habitant pour 30 clients servis. Figée ici, sert à comparer. */
const OLD_CLIENTS_PER_NEWCOMER = 30

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
  /** Message à montrer une fois si le billet d'une ancienne partie a été remis au prix juste. */
  priceNotice: string | null
  /** Identifiant de cet onglet : seul lui sauvegarde tant qu'aucun autre n'a repris la partie. */
  owner: string
}

const newOwner = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
const localOffset = (nowMs: number): number => -new Date(nowMs).getTimezoneOffset()
const freshGame = (nowMs: number): GameState => ({ ...newGame(newSeed(), nowMs), utcOffsetMin: localOffset(nowMs) })
/** Vrai si le joueur a dépassé le tout début : premiers pas entamés, passés, ou une mission récupérée. */
export function hasProgressed(s: GameState): boolean {
  const m = s.missions
  return m.tutorial.step > 0 || m.tutorial.skipped || m.story.index > 0 || m.tutorial.current?.claimed === true
}
/** Recommencer à zéro : garde une copie de la partie actuelle puis rend une partie neuve (à sauvegarder par l'appelant). */
export function restartState(store: Storage, nowMs: number, replaced?: GameState): GameState {
  const previous = store.getItem(SAVE_KEY)
  // Une partie qui n'a pas avancé ne remplace pas la copie : on ne perd pas le vrai parc en recommençant deux fois.
  if (previous !== null && (!replaced || hasProgressed(replaced) || store.getItem(RESET_BACKUP_KEY) === null)) { try { store.setItem(RESET_BACKUP_KEY, previous) } catch { /* rien */ } }
  markStep6(store)
  return freshGame(nowMs)
}
const newSeed = () => Math.floor(Math.random() * 2 ** 32)

/**
 * Après le rééquilibrage de l'étape 6 : un billet réglé sur les anciens prix peut valoir plusieurs fois le nouveau prix juste
 * (plus aucun visiteur). S'il dépasse 1,5 x le prix juste, il y est remis (modifie `state`) ; rend le nouveau prix, sinon null.
 */
export function adjustTicketAfterLoad(state: GameState): number | null {
  const fair = fairPrice(state)
  if (state.ticketPrice <= ECONOMY.REPUTATION_DROP_ABOVE * fair) return null
  state.ticketPrice = fair
  return fair
}

const markStep6 = (store: Storage): void => { try { store.setItem(STEP6_MARKER_KEY, '1') } catch { /* rien */ } }
const step6Done = (store: Storage): boolean => { try { return store.getItem(STEP6_MARKER_KEY) !== null } catch { return false } }

/**
 * Réglages de l'étape 6, une seule fois par partie (repère dans le stockage) : billet remis au prix juste s'il est démesuré,
 * et message si les habitants baissent avec la nouvelle règle. Modifie `state` ; rend le message à montrer, ou null.
 */
export function applyStep6Adjustments(store: Storage, state: GameState): string | null {
  if (step6Done(store)) return null
  const oldPop = population(state) - newcomers(state.village.clientsServed) + Math.floor(state.village.clientsServed / OLD_CLIENTS_PER_NEWCOMER)
  const newPop = population(state)
  const fair = adjustTicketAfterLoad(state)
  markStep6(store)
  const parts: string[] = []
  if (fair !== null) parts.push(`Les prix ont changé : ton billet est revenu au prix juste (${fair} pièces).`)
  if (oldPop > newPop) parts.push(`Clairbois s'est réorganisé : le village compte maintenant ${newPop} habitants (au lieu de ${oldPop}). Ton niveau et tes missions réussies sont gardés.`)
  return parts.length ? parts.join(' ') : null
}

/** Charge la partie (ou en crée une), rattrape le temps d'absence et prend la main sur la sauvegarde. */
export function startSession(store: Storage, nowMs: number, storageOk = true): Session {
  const owner = newOwner()
  const base = { summary: null, skippedMs: 0, absentMs: 0, owner, priceNotice: null as string | null }
  if (!storageOk) return { ...base, state: freshGame(nowMs), problem: null, canSave: false }
  const loaded = loadGame(store, undefined, nowMs)
  if (loaded.kind === 'trop-recente' || loaded.kind === 'migration-impossible') {
    return { ...base, state: freshGame(nowMs), problem: loaded.kind, canSave: false }
  }
  if (loaded.kind !== 'ok') {
    const state = freshGame(nowMs)
    const canSave = saveGame(store, state, nowMs, owner) === 'ok'
    if (canSave) markStep6(store)
    return { ...base, state, problem: loaded.kind === 'illisible' ? 'illisible' : null, canSave }
  }
  const start = structuredClone(loaded.state)
  start.utcOffsetMin = localOffset(nowMs) // l'heure locale, avant le rattrapage
  const notice = applyStep6Adjustments(store, start) // avant le rattrapage : l'absence ne se passe pas à un prix démesuré
  const r = advanceTo(start, nowMs)
  if (r.state.merchant.restocks === 0 && r.state.merchant.offers.length === 0) {
    // Partie migrée de la v1 chargée avant le premier pas : le marchand a déjà son premier stock.
    r.state = structuredClone(r.state)
    restock(r.state)
  }
  const canSave = saveGame(store, r.state, nowMs, owner) === 'ok'
  return { ...base, state: r.state, summary: summarize(r.events, r.state), skippedMs: r.skippedMs, absentMs: loaded.savedAt === undefined ? 0 : Math.max(0, nowMs - loaded.savedAt), problem: null, canSave, priceNotice: notice }
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
