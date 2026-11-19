import { JOBS, STAFF_TUNING, FIRST_KEEPER } from '../data/staff'
import type { Employee, GameState, JobId, StaffLevel } from './types'

/** Niveau d'un employé, déduit de ses heures d'expérience (jamais stocké). */
export function employeeLevel(e: Employee): StaffLevel {
  let level = 1
  STAFF_TUNING.XP_LEVEL_H.forEach((h, i) => { if (e.xpH >= h) level = i + 1 })
  return level as StaffLevel
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
