import { TUNING, HOUR_MS } from '../data/tuning'
import { STAFF_TUNING } from '../data/staff'
import type { Employee, GameEvent, GameState } from './types'
import { employeeLevel } from './staff'

// Attention : ce module n'importe pas `enclosure.ts` (qui l'importe, pour `Roster.covered`).

/** Efficacité du personnel : réduite quand la caisse est dans le rouge. */
export function efficiency(state: GameState): number {
  return state.coins < 0 ? STAFF_TUNING.DEBT_EFFICIENCY : 1
}

/** Nombre d'animaux qu'un soigneur suit. */
export function keeperCapacity(state: GameState, e: Employee): number {
  return Math.floor(STAFF_TUNING.KEEPER_ANIMALS[employeeLevel(e) - 1] * efficiency(state))
}

/** Nombre d'enclos qu'un agent d'entretien nettoie. */
export function cleanerCapacity(state: GameState, e: Employee): number {
  return Math.floor(STAFF_TUNING.CLEANER_ENCLOSURES[employeeLevel(e) - 1] * efficiency(state))
}

/** Propreté d'un enclos (même formule que `cleanliness` de enclosure.ts). */
const cleanOf = (cleanedAt: number, now: number): number =>
  Math.max(0, Math.min(1, 1 - (now - cleanedAt) / HOUR_MS / TUNING.DIRTY_AFTER_H))

const byId = (a: { id: number }, b: { id: number }): number => a.id - b.id

type Rows = Map<number, { animals: number; covered: number }>

interface Coverage {
  covered: Set<number>
  byEnclosure: Rows
  /** Animaux suivis par chaque soigneur (id de l'employé). */
  used: Map<number, number>
}

/** Qui suit quoi, sans tenir compte du délai de grâce. */
function realCoverage(state: GameState): Coverage {
  const ids = new Map<number, number[]>()
  for (const a of state.animals) {
    const list = ids.get(a.enclosureId)
    if (list) list.push(a.id)
    else ids.set(a.enclosureId, [a.id])
  }
  for (const list of ids.values()) list.sort((x, y) => x - y)
  const covered = new Set<number>()
  const byEnclosure: Rows = new Map()
  for (const [id, list] of ids) byEnclosure.set(id, { animals: list.length, covered: 0 })
  const used = new Map<number, number>()
  for (const k of state.staff.employees.filter((e) => e.job === 'soigneur').sort(byId)) {
    let free = keeperCapacity(state, k)
    for (const encId of k.encIds) {
      if (free <= 0) break
      const list = ids.get(encId)
      if (!list) continue
      const row = byEnclosure.get(encId)!
      for (const animalId of list) {
        if (free <= 0) break
        if (covered.has(animalId)) continue
        covered.add(animalId)
        row.covered++
        free--
        used.set(k.id, (used.get(k.id) ?? 0) + 1)
      }
    }
  }
  return { covered, byEnclosure, used }
}

/** Animaux suivis par un soigneur, au total et par enclos. Pendant le délai de grâce (V1), tous le sont. */
export function careCoverage(state: GameState): { covered: Set<number>; byEnclosure: Rows } {
  if (state.time <= state.staff.coverAllUntil) {
    const covered = new Set<number>()
    const byEnclosure: Rows = new Map()
    for (const a of state.animals) {
      covered.add(a.id)
      const row = byEnclosure.get(a.enclosureId)
      if (row) { row.animals++; row.covered++ } else byEnclosure.set(a.enclosureId, { animals: 1, covered: 1 })
    }
    return { covered, byEnclosure }
  }
  const { covered, byEnclosure } = realCoverage(state)
  return { covered, byEnclosure }
}

/** Un pas de soins : l'enclos mal suivi se salit plus vite, puis les agents nettoient ce qui est sale. */
export function careStep(state: GameState, _events: GameEvent[]): void {
  const now = state.time
  const { byEnclosure } = careCoverage(state)
  const floor = now - TUNING.DIRTY_AFTER_H * HOUR_MS
  for (const enc of state.enclosures) {
    const row = byEnclosure.get(enc.id)
    if (!row || row.animals === 0) continue
    const u = 1 - row.covered / row.animals
    if (u <= 0 || enc.cleanedAt <= floor) continue
    enc.cleanedAt = Math.max(floor, enc.cleanedAt - TUNING.STEP_MS * (STAFF_TUNING.UNCOVERED_DIRT_FACTOR - 1) * u)
  }
  const existing = new Map(state.enclosures.map((e) => [e.id, e]))
  for (const agent of state.staff.employees.filter((e) => e.job === 'entretien').sort(byId)) {
    for (const encId of agent.encIds.slice(0, cleanerCapacity(state, agent))) {
      const enc = existing.get(encId)
      if (enc && cleanOf(enc.cleanedAt, now) < STAFF_TUNING.CLEAN_BELOW) enc.cleanedAt = now
    }
  }
}

/** Enclos peuplés, dans l'ordre de la liste ou du plus au moins peuplé. */
function populated(state: GameState, populousFirst: boolean): number[] {
  const counts = new Map<number, number>()
  for (const a of state.animals) counts.set(a.enclosureId, (counts.get(a.enclosureId) ?? 0) + 1)
  const ids = state.enclosures.filter((e) => counts.has(e.id)).map((e) => e.id)
  if (populousFirst) ids.sort((x, y) => counts.get(y)! - counts.get(x)! || x - y)
  return ids
}

function fill(state: GameState, order: number[]): void {
  const keepers = state.staff.employees.filter((e) => e.job === 'soigneur').sort(byId)
  for (const encId of order) {
    for (;;) {
      const cov = realCoverage(state)
      const row = cov.byEnclosure.get(encId)
      if (!row || row.covered >= row.animals) break
      let best: Employee | null = null
      let bestFree = 0
      for (const k of keepers) {
        if (k.encIds.includes(encId)) continue
        const free = keeperCapacity(state, k) - (cov.used.get(k.id) ?? 0)
        if (free > bestFree) { best = k; bestFree = free }
      }
      if (!best) break
      best.encIds.push(encId)
    }
  }
  const agents = state.staff.employees.filter((e) => e.job === 'entretien').sort(byId)
  for (const encId of order) {
    if (agents.some((g) => g.encIds.includes(encId))) continue
    let best: Employee | null = null
    let bestFree = 0
    for (const g of agents) {
      const free = cleanerCapacity(state, g) - g.encIds.length
      if (free > bestFree) { best = g; bestFree = free }
    }
    if (best) best.encIds.push(encId)
  }
}

/** Comble les trous en place, sans jamais retirer un enclos qui existe encore. */
export function assignGaps(state: GameState): void {
  const alive = new Set(state.enclosures.map((e) => e.id))
  for (const e of state.staff.employees) e.encIds = e.encIds.filter((id) => alive.has(id))
  fill(state, populated(state, false))
}

/** Redistribue tout : on vide les affectations, puis on sert les enclos du plus peuplé au moins peuplé. */
export function redistribute(state: GameState): void {
  for (const e of state.staff.employees) if (e.job === 'soigneur' || e.job === 'entretien') e.encIds = []
  fill(state, populated(state, true))
}
