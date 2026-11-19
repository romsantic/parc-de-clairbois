import type { GameState, MissionProgress } from '../sim/types'
import { SPECIES } from '../data/species'
import { BUILDINGS, SLOTS } from '../data/economy'
import { TUTORIAL, STORY } from '../data/missions'
import { STAT_KEYS } from '../sim/stats'
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
  | { kind: 'ok'; state: GameState; savedAt?: number }
  | { kind: 'illisible' }
  | { kind: 'trop-recente'; version: number }
  | { kind: 'migration-impossible'; version: number }

export type SaveOutcome = 'ok' | 'pris-ailleurs' | 'trop-recente' | 'erreur'

/**
 * Écrit la partie. `owner` identifie l'onglet qui joue. Avec `guard`, on vérifie d'abord
 * qu'aucun autre onglet n'a repris la partie et qu'aucune version plus récente du jeu
 * n'a sauvegardé entre-temps : dans ces cas, on n'écrit rien.
 */
export function saveGame(store: Storage, state: GameState, nowMs: number, owner = 'inconnu', guard = false): SaveOutcome {
  try {
    if (guard) {
      const raw = store.getItem(SAVE_KEY)
      if (raw !== null) {
        let stored: { version?: unknown; owner?: unknown } | null = null
        try { stored = JSON.parse(raw) } catch { stored = null }
        if (stored && typeof stored.version === 'number' && stored.version > CURRENT_VERSION) return 'trop-recente'
        if (stored && typeof stored.owner === 'string' && stored.owner !== owner) return 'pris-ailleurs'
      }
    }
    store.setItem(SAVE_KEY, JSON.stringify({ version: CURRENT_VERSION, savedAt: nowMs, owner, state }))
    return 'ok'
  } catch {
    return 'erreur' // mémoire pleine, stockage bloqué…
  }
}

/** Charge la partie, en appliquant les migrations. Une sauvegarde abîmée est mise de côté, jamais perdue. */
export function loadGame(store: Storage, migrations: Record<number, Migration> = MIGRATIONS, nowMs = Date.now()): LoadResult {
  const raw = store.getItem(SAVE_KEY)
  if (raw === null) return { kind: 'aucune' }
  const broken = (): LoadResult => {
    // La première copie va sous BROKEN_KEY ; les suivantes sous BROKEN_KEY:<date>, sans rien écraser.
    const key = store.getItem(BROKEN_KEY) === null ? BROKEN_KEY : `${BROKEN_KEY}:${nowMs}`
    try { store.setItem(key, raw) } catch { /* stockage plein : la sauvegarde d'origine reste en place */ }
    return { kind: 'illisible' }
  }
  let data: { version?: unknown; state?: unknown }
  try { data = JSON.parse(raw) } catch { return broken() }
  let version = data?.version
  if (typeof version !== 'number') return broken()
  if (version > CURRENT_VERSION) return { kind: 'trop-recente', version }
  const from = version
  if (from < CURRENT_VERSION && store.getItem(`${SAVE_KEY}-v${from}`) === null) {
    // Copie de la partie d'origine avant qu'elle soit réécrite au nouveau format (jamais écrasée).
    try { store.setItem(`${SAVE_KEY}-v${from}`, raw) } catch { /* stockage plein : tant pis */ }
  }
  let state: unknown = data.state
  try {
    while (version < CURRENT_VERSION) {
      const m = migrations[version]
      if (!m) return { kind: 'migration-impossible', version: from }
      state = m(state)
      version++
    }
  } catch {
    return { kind: 'migration-impossible', version: from }
  }
  const savedAt = (data as { savedAt?: unknown }).savedAt
  return looksLikeGame(state) ? { kind: 'ok', state, savedAt: typeof savedAt === 'number' && Number.isFinite(savedAt) ? savedAt : undefined } : broken()
}

const finite = (x: unknown) => typeof x === 'number' && Number.isFinite(x)
const intBetween = (x: unknown, min: number, max: number) => typeof x === 'number' && Number.isInteger(x) && x >= min && x <= max
/** Une mission en cours : id texte, valeur de départ finie, réussie et récupérée vrai/faux. */
function validProgress(x: unknown, drawnDaily = false): boolean {
  const mp = x as MissionProgress | null
  if (!mp || typeof mp !== 'object' || typeof mp.id !== 'string' || !finite(mp.base) || typeof mp.done !== 'boolean' || typeof mp.claimed !== 'boolean') return false
  // Quotidienne tirée : cible (nombre fini > 0) et récompense (nombres finis >= 0) facultatives, mais saines si présentes.
  // Quotidienne au format neuf (id sans « # ») : cible et récompense obligatoires.
  if (drawnDaily && !mp.id.includes('#') && (mp.n === undefined || mp.reward === undefined)) return false
  if (mp.n !== undefined && !(finite(mp.n) && mp.n > 0)) return false
  if (mp.reward !== undefined) {
    const r = mp.reward as unknown
    if (!r || typeof r !== 'object' || Array.isArray(r)) return false
    for (const [k, v] of Object.entries(r)) if (!['coins', 'fourrage', 'viande'].includes(k) || !finite(v) || (v as number) < 0) return false
  }
  return true
}

/** Vérifie qu'une partie chargée est cohérente avant de la faire tourner. */
function looksLikeGame(s: unknown): s is GameState {
  const g = s as GameState
  if (!g || !finite(g.time) || !finite(g.coins) || !finite(g.rng) || !finite(g.nextId)) return false
  const p = g.pantry
  if (!p || !finite(p.fourrage) || !finite(p.viande) || !finite(p.capacity)) return false
  if (!Array.isArray(g.enclosures) || !Array.isArray(g.animals)) return false
  for (const e of g.enclosures) {
    if (!e || !finite(e.id) || !finite(e.cleanedAt) || !e.rect) return false
    if (e.species !== null && !(e.species in SPECIES)) return false
  }
  for (const a of g.animals) {
    if (!a || !(a.species in SPECIES) || !finite(a.bornAt) || !finite(a.lastFedAt) || !a.health) return false
    if (a.lastBirthAt !== null && !finite(a.lastBirthAt)) return false
  }
  const v = g.village
  if (!v || ![1, 2, 3].includes(v.level) || !finite(v.clientsServed)) return false
  if (!finite(g.ticketPrice) || g.ticketPrice < 0 || !finite(g.reputation) || g.reputation < 0 || g.reputation > 1 || !finite(g.totalVisitors)) return false
  if (!Array.isArray(g.buildings)) return false
  const slots = new Set<number>()
  for (const b of g.buildings) {
    if (!b || !(b.type in BUILDINGS) || ![1, 2, 3].includes(b.level) || !SLOTS.some((x) => x.id === b.slot) || slots.has(b.slot)) return false
    slots.add(b.slot)
  }
  const m = g.merchant
  if (!m || !finite(m.restockAt) || !finite(m.restocks) || !Array.isArray(m.offers)) return false
  for (const o of m.offers) {
    if (!o || !finite(o.id) || !finite(o.price) || !(o.species in SPECIES) || !['F', 'M'].includes(o.sex) || !['jeune', 'adulte'].includes(o.stage)) return false
  }
  const st = g.stats
  if (!st || !st.counts || typeof st.counts !== 'object' || !st.birthsBySpecies || typeof st.birthsBySpecies !== 'object') return false
  for (const k of STAT_KEYS) if (!finite(st.counts[k])) return false
  for (const n of Object.values(st.counts)) if (!finite(n)) return false
  for (const n of Object.values(st.birthsBySpecies)) if (!finite(n)) return false
  if (!Array.isArray(g.paths)) return false
  for (const p of g.paths) {
    if (!p || !finite(p.id) || !p.a || !p.b || !finite(p.a.x) || !finite(p.a.z) || !finite(p.b.x) || !finite(p.b.z)) return false
  }
  const ms = g.missions
  if (!ms || !ms.tutorial || !intBetween(ms.tutorial.step, 0, TUTORIAL.length) || !ms.story || !intBetween(ms.story.index, 0, STORY.length)) return false
  if (ms.tutorial.current !== null && !validProgress(ms.tutorial.current)) return false
  if (ms.story.current !== null && !validProgress(ms.story.current)) return false
  const d = ms.daily
  if (!d || !finite(d.dayKey) || !Array.isArray(d.list) || !finite(d.streak) || !finite(d.coupons)) return false
  if (!d.list.every((m) => validProgress(m, true))) return false
  if (d.lastFullDay !== null && !finite(d.lastFullDay)) return false
  if (typeof ms.unread !== 'boolean' || !finite(g.utcOffsetMin)) return false
  return true
}
