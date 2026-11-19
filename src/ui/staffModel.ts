/** Textes du personnel (fiches, liste des candidats, en-tête, dette, soins) : fonctions pures, testées, sans DOM. */
import { JOBS } from '../data/staff'
import { careCoverage, cleanerCapacity, keeperCapacity } from '../sim/care'
import { dailyWages, employeeLevel, staffCap, wage } from '../sim/staff'
import type { Candidate, Employee, GameState, JobId, StaffLevel } from '../sim/types'
import { formatThousands } from './format'

const plural = (n: number, one: string, many: string) => `${formatThousands(n)} ${n < 2 ? one : many}`
const perDay = (n: number) => `${plural(n, 'pièce', 'pièces')}/jour`
/** Nom du métier avec l'apostrophe typographique des textes. */
const jobName = (job: JobId): string => JOBS[job].name.replace("'", '’')

/** Les étoiles d'un niveau : « ★★ ». */
export function stars(level: StaffLevel): string {
  return '★'.repeat(level)
}

/** Animaux que suit chaque soigneur : mêmes règles que `careCoverage` (soigneurs par id, capacité remplie enclos par enclos). */
function followedCounts(state: GameState): Map<number, number> {
  const byEnclosure = new Map<number, number[]>()
  for (const a of state.animals) {
    const list = byEnclosure.get(a.enclosureId)
    if (list) list.push(a.id)
    else byEnclosure.set(a.enclosureId, [a.id])
  }
  for (const list of byEnclosure.values()) list.sort((x, y) => x - y)
  const taken = new Set<number>()
  const counts = new Map<number, number>()
  for (const k of state.staff.employees.filter((e) => e.job === 'soigneur').sort((a, b) => a.id - b.id)) {
    let free = keeperCapacity(state, k)
    let n = 0
    for (const encId of k.encIds) {
      if (free <= 0) break
      for (const animalId of byEnclosure.get(encId) ?? []) {
        if (free <= 0) break
        if (taken.has(animalId)) continue
        taken.add(animalId)
        free--
        n++
      }
    }
    counts.set(k.id, n)
  }
  return counts
}

/** Fiche d'un employé : « Léa — Soigneur ★★ » et « 12/14 animaux suivis · 72 pièces/jour ». */
export function employeeLine(state: GameState, e: Employee): { title: string; detail: string } {
  const level = employeeLevel(e)
  const title = `${e.name} — ${jobName(e.job)} ${stars(level)}`
  const pay = perDay(wage(e.job, level))
  if (e.job === 'soigneur') {
    const followed = followedCounts(state).get(e.id) ?? 0
    return { title, detail: `${followed}/${keeperCapacity(state, e)} animaux suivis · ${pay}` }
  }
  if (e.job === 'entretien') {
    const existing = e.encIds.filter((id) => state.enclosures.some((x) => x.id === id)).length
    return { title, detail: `${existing}/${cleanerCapacity(state, e)} enclos · ${pay}` }
  }
  return { title, detail: pay }
}

/** Ligne d'un candidat à l'embauche : « Hugo — Agent d’entretien ★ · 40 pièces/jour ». */
export function candidateLine(c: Candidate): string {
  return `${c.name} — ${jobName(c.job)} ${stars(c.level)} · ${perDay(wage(c.job, c.level))}`
}

/** En-tête du personnel : « Personnel 2/3 · salaires 100 pièces/jour ». */
export function staffHeader(state: GameState): string {
  return `Personnel ${state.staff.employees.length}/${staffCap(state)} · salaires ${perDay(dailyWages(state))}`
}

/** Bandeau de dette ; vide quand la caisse n'est pas dans le rouge. */
export function debtLine(state: GameState): string {
  if (state.coins >= 0) return ''
  return `Dette : ${plural(Math.ceil(-state.coins), 'pièce', 'pièces')}. Tes employés travaillent moitié moins bien, et tu ne peux ni acheter ni construire tant qu’elle n’est pas remboursée.`
}

/** Avertissement d'un enclos dont des animaux ne sont suivis par personne ; vide sinon. */
export function careWarning(state: GameState, encId: number): string {
  const row = careCoverage(state).byEnclosure.get(encId)
  const n = row ? row.animals - row.covered : 0
  if (n <= 0) return ''
  if (n === 1) return '1 animal sans soigneur : pas de petit pour lui.'
  return `${plural(n, 'animal', 'animaux')} sans soigneur : l’enclos se salit plus vite et ils n’auront pas de petits.`
}

/** Qui s'occupe de l'enclos : « Soigneur : Léa · Entretien : Hugo » ; « Soigneur : personne » s'il n'y a aucun soigneur. */
export function encStaffNames(state: GameState, encId: number): string {
  const names = (job: JobId) => {
    const list = state.staff.employees.filter((e) => e.job === job && e.encIds.includes(encId))
    return { list, text: list.length ? list.map((e) => e.name).join(', ') : 'personne' }
  }
  const keepers = names('soigneur')
  const cleaners = names('entretien')
  const parts = [`Soigneur : ${keepers.text}`]
  if (cleaners.list.length) parts.push(`Entretien : ${cleaners.text}`)
  return parts.join(' · ')
}

/** Case « Personnel » de la barre du haut : « 2/3 », et si elle doit attirer l'œil (animaux non suivis ou dette). */
export function staffCell(state: GameState): { text: string; alert: boolean } {
  const { covered } = careCoverage(state)
  const unfollowed = state.animals.some((a) => !covered.has(a.id))
  return { text: `${state.staff.employees.length}/${staffCap(state)}`, alert: unfollowed || state.coins < 0 }
}
