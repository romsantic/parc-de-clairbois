import { JOBS, STAFF_TUNING, FIRST_KEEPER } from '../data/staff'
import { STAFF_NAMES } from '../data/names'
import { TUNING, HOUR_MS } from '../data/tuning'
import type { Candidate, Employee, GameEvent, GameState, JobId, StaffLevel } from './types'
import { assignGaps } from './care'
import { dayKey } from './missions'
import { random } from './random'

/** Niveau d'un employé, déduit de ses heures d'expérience (jamais stocké). */
export function employeeLevel(e: Employee): StaffLevel {
  let level = 1
  STAFF_TUNING.XP_LEVEL_H.forEach((h, i) => { if (e.xpH >= h) level = i + 1 })
  return level as StaffLevel
}

/** Nombre maximum d'employés : 3 sans maison du personnel, sinon selon le niveau de la maison. */
export function staffCap(state: GameState): number {
  const house = state.buildings.find((b) => b.type === 'personnel')
  return house ? STAFF_TUNING.CAP_BY_HOUSE_LEVEL[house.level - 1] : STAFF_TUNING.CAP_NO_HOUSE
}

/** Salaire journalier d'un métier à un niveau. */
export function wage(job: JobId, level: StaffLevel): number {
  return Math.round(JOBS[job].wage * (1 + STAFF_TUNING.WAGE_PER_LEVEL * (level - 1)))
}

/** Total des salaires journaliers de tous les employés. */
export function dailyWages(state: GameState): number {
  return state.staff.employees.reduce((sum, e) => sum + wage(e.job, employeeLevel(e)), 0)
}

/** Le premier soigneur (Léa, niveau 1) : prend le prochain id ; c'est à l'appelant de l'ajouter au personnel. */
export function firstKeeper(state: GameState, encIds: number[]): Employee {
  return { id: state.nextId++, name: FIRST_KEEPER.name, job: FIRST_KEEPER.job, xpH: 0, hiredAt: state.time, encIds: [...encIds] }
}

/** Tire une valeur dans une table [valeur, poids]. */
function pick<T>(state: GameState, table: ReadonlyArray<readonly [T, number]>): T {
  const total = table.reduce((s, [, w]) => s + w, 0)
  let r = random(state) * total
  for (const [v, w] of table) { r -= w; if (r < 0) return v }
  return table[table.length - 1][0]
}

/** Tire une nouvelle liste de candidats, en place. Le premier tirage garantit un soigneur et un agent d'entretien. */
export function renewCandidates(state: GameState, events?: GameEvent[]): void {
  const jobs = STAFF_TUNING.CANDIDATE_JOBS.filter(([j]) => JOBS[j as JobId].open) as [JobId, number][]
  const list: Candidate[] = []
  for (let i = 0; i < STAFF_TUNING.CANDIDATES; i++) {
    let job = pick(state, jobs)
    if (state.staff.renewals === 0) {
      if (i === 0) job = 'soigneur'
      else if (i === 1) job = 'entretien'
    }
    const level = pick(state, STAFF_TUNING.CANDIDATE_LEVELS as unknown as [number, number][]) as StaffLevel
    const name = STAFF_NAMES[Math.floor(random(state) * STAFF_NAMES.length)]
    list.push({ id: state.nextId++, name, job, level })
  }
  state.staff.candidates = list
  state.staff.renewals++
  state.staff.renewAt = state.time + STAFF_TUNING.RENEW_H * HOUR_MS
  events?.push({ kind: 'candidats', at: state.time })
}

/** Un pas : expérience, paie de minuit (la dette est plafonnée à une journée), candidats, puis affectations après une naissance. */
export function staffStep(state: GameState, events: GameEvent[]): void {
  const st = state.staff
  for (const e of st.employees) {
    const before = employeeLevel(e)
    e.xpH += TUNING.STEP_MS / HOUR_MS
    const after = employeeLevel(e)
    if (after !== before) events.push({ kind: 'niveauEmploye', at: state.time, employeeId: e.id, name: e.name, level: after })
  }
  const d = dayKey(state.time, state.utcOffsetMin)
  if (st.payDay === -1) st.payDay = d
  else if (d > st.payDay) {
    st.payDay = d
    const due = dailyWages(state)
    const next = Math.max(state.coins - due, -due)
    const paid = Math.min(due, Math.max(0, state.coins)) // ce qui sort réellement de la caisse ; le reste est de la dette
    state.coins = next
    if (due > 0) events.push({ kind: 'paie', at: state.time, due, paid })
  }
  if (state.time >= st.renewAt) renewCandidates(state, events)
  if (events.some((e) => e.kind === 'naissance')) assignGaps(state)
}
