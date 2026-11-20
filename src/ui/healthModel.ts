/** Santé des animaux et fiche du centre vétérinaire : fonctions pures (testées), sans DOM. */
import { DISEASES, STAGE_NAMES, VET_CENTER } from '../data/diseases'
import { careCost, careQueue, centerLevel, canTreat, quarantinePlaces, quarantineUsed, workingVets } from '../sim/vet'
import type { Animal, DiseaseId, GameState, Health } from '../sim/types'
import { formatCountdown } from './format'

export type HealthTone = 'vert' | 'jaune' | 'orange' | 'rouge' | 'bleu'
type Sick = Extract<Health, { status: 'malade' }>

const sickOf = (a: Animal): Sick | null => (a.health.status === 'malade' ? a.health : null)
const STAGE_TONES: HealthTone[] = ['jaune', 'orange', 'rouge']
const WITH_ARTICLE: Record<DiseaseId, string> = { parasites: 'les parasites', indigestion: "l'indigestion", blessure: 'les blessures', grippe: 'la grippe' }

const rank = (n: number) => (n === 1 ? '1ᵉʳ' : `${n}ᵉ`)
const diseaseText = (h: Sick) => `${DISEASES[h.disease].name} · ${STAGE_NAMES[h.stage - 1]}`
/** Rang (à partir de 1) dans la file d'attente, ou 0 si l'animal n'y est pas (ou si aucun vétérinaire ne travaille). */
const queueRank = (state: GameState, a: Animal): number =>
  workingVets(state).length === 0 ? 0 : careQueue(state).findIndex((x) => x.id === a.id) + 1

/** L'étiquette de santé d'un animal. Un malade non repéré s'affiche « En forme » : le joueur ne le sait pas encore. */
export function healthLabel(state: GameState, a: Animal): { text: string; tone: HealthTone } {
  const h = sickOf(a)
  if (!h || h.detectedAt === null) return { text: 'En forme', tone: 'vert' }
  if (h.quarantined) return { text: `En quarantaine · ${diseaseText(h)}`, tone: 'bleu' }
  if (h.careUntil !== null) return { text: `En soin (encore ${formatCountdown(h.careUntil - state.time)})`, tone: 'bleu' }
  const tone = STAGE_TONES[h.stage - 1]
  const r = queueRank(state, a)
  if (r > 0) return { text: `En file d'attente (${rank(r)})`, tone }
  return { text: diseaseText(h), tone }
}

/** La phrase sous l'animal quand son soin est bloqué ; null sinon. */
export function healthHelp(state: GameState, a: Animal): string | null {
  const h = sickOf(a)
  if (!h || h.detectedAt === null || h.quarantined || h.careUntil !== null) return null
  if (centerLevel(state) === 0) return 'Personne ne peut le soigner : construis le centre vétérinaire au village et embauche un vétérinaire.'
  if (workingVets(state).length === 0) return 'Personne ne peut le soigner : embauche un vétérinaire.'
  if (!canTreat(state, h.disease)) return `Le centre doit être au niveau ${DISEASES[h.disease].centerLevel} pour soigner ${WITH_ARTICLE[h.disease]}.`
  const cost = careCost(a)
  if (state.coins < cost) return `Le soin attend : il faut ${cost} pièces dans la caisse.`
  return null
}

const UNLOCKS = [
  'Niveau 1 : parasites et indigestion',
  'Niveau 2 : blessures',
  'Niveau 3 : grippe et quarantaine',
  'Niveau 4 : vaccination des enclos',
  'Niveau 5 : soins plus rapides et un vétérinaire de plus',
]
const plural = (n: number, one: string, many: string) => `${n} ${n >= 2 ? many : one}`

export interface VetCenterView {
  level: number
  treats: string[]
  nextUnlock: string | null
  vets: string
  queue: { name: string; label: string }[]
  quarantine: string
  vaccination: string | null
}

/** Ce que la fiche du centre vétérinaire affiche. */
export function vetCenterView(state: GameState): VetCenterView {
  const level = centerLevel(state)
  const places = level === 0 ? 0 : VET_CENTER.PLACES[level - 1]
  const working = workingVets(state).length
  return {
    level,
    treats: (Object.values(DISEASES)).filter((d) => d.centerLevel <= level).map((d) => d.name),
    nextUnlock: level >= UNLOCKS.length ? null : UNLOCKS[level],
    vets: `${plural(working, 'vétérinaire', 'vétérinaires')} au travail sur ${plural(places, 'place', 'places')}`,
    queue: working === 0 ? [] : careQueue(state).map((a) => ({ name: a.name, label: healthLabel(state, a).text })),
    quarantine: level < VET_CENTER.QUARANTINE_LEVEL ? `Pas avant le niveau ${VET_CENTER.QUARANTINE_LEVEL}` : `${quarantineUsed(state)} / ${plural(quarantinePlaces(state), 'place', 'places')}`,
    vaccination: level < VET_CENTER.VACCINE_LEVEL ? null : `Disponible dans chaque enclos (protège ${VET_CENTER.VACCINE_DAYS} jours)`,
  }
}
