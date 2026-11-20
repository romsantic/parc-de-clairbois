import type { GameState } from '../sim/types'
import { newGame } from '../sim/newGame'
import { advanceTo } from '../sim/advance'
import { restock } from '../sim/merchant'
import { summarize, type Summary } from '../sim/summary'
import { MISSIONS_TUNING } from '../data/missions'
import { HOUR_MS } from '../data/tuning'
import { population, newcomers } from '../sim/village'
import { giftPaths } from '../sim/paths'
import { assignGaps, careCoverage } from '../sim/care'
import { firstKeeper, renewCandidates } from '../sim/staff'
import { SPECIES } from '../data/species'
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
  /** Message à montrer une fois (habitants recomptés avec la nouvelle règle) ; null sinon. */
  priceNotice: string | null
  /** Message à montrer une fois (chemins offerts à une ancienne partie) ; null sinon. */
  pathsNotice: string | null
  /** Message à montrer une fois (première soigneuse offerte à une ancienne partie) ; null sinon. */
  staffNotice: string | null
  /** Message à montrer une fois (centre vétérinaire et vétérinaire offerts à une ancienne partie) ; null sinon. */
  healthNotice: string | null
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

const markStep6 = (store: Storage): void => { try { store.setItem(STEP6_MARKER_KEY, '1') } catch { /* rien */ } }
const step6Done = (store: Storage): boolean => { try { return store.getItem(STEP6_MARKER_KEY) !== null } catch { return false } }

/**
 * Après le rééquilibrage de l'étape 6, une seule fois par partie (repère dans le stockage) : message si les habitants baissent
 * avec la nouvelle règle. Le prix du billet n'est JAMAIS changé au chargement : c'est le joueur qui le décide.
 */
export function applyStep6Adjustments(store: Storage, state: GameState): string | null {
  if (step6Done(store)) return null
  const oldPop = population(state) - newcomers(state.village.clientsServed) + Math.floor(state.village.clientsServed / OLD_CLIENTS_PER_NEWCOMER)
  const newPop = population(state)
  markStep6(store)
  const parts: string[] = []
  if (oldPop > newPop) parts.push(`Clairbois s'est réorganisé : le village compte maintenant ${newPop} habitants (au lieu de ${oldPop}). Ton niveau et tes missions réussies sont gardés.`)
  return parts.length ? parts.join(' ') : null
}

/** Texte du chemin offert : null s'il n'y a rien à dire (aucun enclos relié, aucun resté seul). */
function pathsMessage(state: GameState, linked: number[], stuck: number[]): string | null {
  if (linked.length === 0 && stuck.length === 0) return null
  const n = linked.length
  let msg = `Nouveau à Clairbois : les chemins ! Les visiteurs ne voient que les enclos reliés à l'allée. Margaux a offert un chemin à ${n} enclos.`
  if (stuck.length > 0) {
    const names = stuck.map((id) => {
      const e = state.enclosures.find((x) => x.id === id)
      return e && e.species ? SPECIES[e.species].name : 'Enclos vide'
    })
    msg += ` À relier toi-même : ${names.join(', ')}.`
  }
  return msg
}

/** Offre Léa à une partie sans soigneur : elle prend les enclos libres, et tous les animaux comptent comme suivis jusqu'à `nowMs` (le rattrapage de l'absence se fait sans pénalité). */
export function giftFirstKeeper(state: GameState, nowMs: number): GameState {
  if (state.staff.employees.some((e) => e.job === 'soigneur')) return state
  const s = structuredClone(state)
  s.staff.employees.push(firstKeeper(s, []))
  assignGaps(s)
  if (s.staff.candidates.length === 0) renewCandidates(s) // des candidats dès le retour, sans attendre 10 minutes
  s.staff.coverAllUntil = nowMs
  return s
}

/** Texte de la première soigneuse offerte ; ajoute le nombre d'animaux qui attendent un soigneur. */
function staffMessage(state: GameState): string {
  let msg = "Nouveau à Clairbois : le personnel ! Margaux t'envoie Léa, ta première soigneuse. Sans soigneur, un enclos se salit plus vite et ses animaux n'ont plus de petits. Embauche la suite dans le volet Personnel (icône en haut)."
  const followed = careCoverage({ ...state, staff: { ...state.staff, coverAllUntil: 0 } }).covered.size // sans le délai de grâce
  const waiting = state.animals.length - followed
  if (waiting > 0) msg += ` Léa ne peut suivre que ${followed} ${followed === 1 ? 'animal' : 'animaux'} : ${waiting} ${waiting === 1 ? 'animal attend' : 'animaux attendent'} un soigneur.`
  return msg
}

/** Texte du centre vétérinaire offert ; `sick` : les malades déjà confiés à la vétérinaire au chargement. */
function healthMessage(sick: number): string {
  let msg = "Nouveau à Clairbois : le centre vétérinaire ! Margaux l'a fait construire et Élise Fontaine, vétérinaire, soigne maintenant les malades toute seule."
  if (sick > 0) msg += sick === 1 ? ' 1 animal malade lui a été confié.' : ` ${sick} animaux malades lui ont été confiés.`
  return msg
}

/** Charge la partie (ou en crée une), rattrape le temps d'absence et prend la main sur la sauvegarde. */
export function startSession(store: Storage, nowMs: number, storageOk = true): Session {
  const owner = newOwner()
  const base = { summary: null, skippedMs: 0, absentMs: 0, owner, priceNotice: null as string | null, pathsNotice: null as string | null, staffNotice: null as string | null, healthNotice: null as string | null }
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
  let start = structuredClone(loaded.state)
  let pathsNotice: string | null = null
  if (loaded.fromVersion < 4) { // avant le rattrapage : l'absence se passe avec les enclos déjà reliés
    const g = giftPaths(start)
    start = g.state
    pathsNotice = pathsMessage(g.state, g.linked, g.stuck)
  }
  let staffNotice: string | null = null
  if (loaded.fromVersion < 5) { // avant le rattrapage : l'absence se passe sans pénalité
    start = giftFirstKeeper(start, nowMs)
    staffNotice = staffMessage(start)
  }
  let healthNotice: string | null = null
  if (loaded.fromVersion < 6) { // la migration a déjà offert le centre et la vétérinaire : on compte les malades avant le rattrapage
    healthNotice = healthMessage(start.animals.filter((a) => a.health.status === 'malade').length)
  }
  start.utcOffsetMin = localOffset(nowMs) // l'heure locale, avant le rattrapage
  const notice = applyStep6Adjustments(store, start) // avant le rattrapage : l'absence ne se passe pas à un prix démesuré
  const r = advanceTo(start, nowMs)
  if (r.state.staff.coverAllUntil > 0) { r.state = structuredClone(r.state); r.state.staff.coverAllUntil = 0 } // la grâce est finie : les nouvelles règles jouent tout de suite
  if (r.state.merchant.restocks === 0 && r.state.merchant.offers.length === 0) {
    // Partie migrée de la v1 chargée avant le premier pas : le marchand a déjà son premier stock.
    r.state = structuredClone(r.state)
    restock(r.state)
  }
  const canSave = saveGame(store, r.state, nowMs, owner) === 'ok'
  return { ...base, state: r.state, summary: summarize(r.events, r.state), skippedMs: r.skippedMs, absentMs: loaded.savedAt === undefined ? 0 : Math.max(0, nowMs - loaded.savedAt), problem: null, canSave, priceNotice: notice, pathsNotice, staffNotice, healthNotice }
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
