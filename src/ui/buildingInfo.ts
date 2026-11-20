/** Ce que la fiche d'un bâtiment, de la mairie ou d'un décor du village affiche : fonctions pures (testées), sans DOM. */
import { staffCap } from '../sim/staff'
import { BUILDINGS, ECONOMY, FARM, SLOTS, maxBuildingLevel } from '../data/economy'
import { BUILDING_ROLE, INFO_LABELS, MAIRIE_INFO } from '../data/buildingInfo'
import { VILLAGE_PROPS } from '../data/village'
import { buildingIncomePerHour, visibleSpecies, spendPerClient } from '../sim/economy'
import { canLevelUp, missionGateOk, population } from '../sim/village'
import type { GameState } from '../sim/types'
import { formatAmount, formatCoins } from './format'
import { gateMissionText } from './missionModel'
import { vetCenterView } from './healthModel'

export type InfoTarget = { kind: 'emplacement'; slot: number } | { kind: 'decor'; index: number }

export interface InfoRow { label: string; value: string }

export interface BuildingInfo {
  /** Nom fixe (le volet l'affiche en en-tête) ; le niveau et les chiffres sont dans `rows`. */
  title: string
  /** Une phrase : à quoi ça sert. */
  role: string
  rows: InfoRow[]
  /** Mairie : ce qui manque pour le niveau suivant (habitants, mission). */
  missing: string[]
  /** Mairie : texte du bouton qui ouvre le volet du village ; null ailleurs. */
  villageButton: string | null
  /** Centre vétérinaire : les premiers de la file d'attente (« Rex · En soin… », « et 3 autres »). */
  queue: string[]
  /** Centre vétérinaire : le bouton Améliorer (prix compris) ; null ailleurs ou au niveau maximum. */
  upgrade: { label: string; cost: number } | null
}

/** Combien de malades de la file la fiche du centre détaille. */
const QUEUE_SHOWN = 5

/** « 1,5 pièce » : la dépense d'un client est souvent fractionnaire. */
const spendText = (n: number) => `${formatAmount(n)} pièce${n >= 2 ? 's' : ''}`
const pct = (x: number) => `${Math.round(x * 100)} %`

/** Fiche d'un bâtiment construit, de la mairie ou d'un décor ; null pour un emplacement libre ou une cible inconnue. */
export function buildingInfo(state: GameState, target: InfoTarget): BuildingInfo | null {
  if (target.kind === 'decor') return decorInfo(state, target.index)
  const b = state.buildings.find((x) => x.slot === target.slot)
  if (!b || !SLOTS.some((x) => x.id === target.slot)) return null
  const d = BUILDINGS[b.type]
  const i = b.level - 1
  const rows: InfoRow[] = [{ label: INFO_LABELS.level, value: `${b.level}/${maxBuildingLevel(b.type)}` }]
  let queue: string[] = []
  if (b.type === 'ferme') {
    const free = FARM.freeFourragePerDay[i]
    rows.push(
      { label: INFO_LABELS.freeFood, value: free ? `${free} par jour` : 'aucun' },
      { label: INFO_LABELS.discount, value: FARM.discount[i] ? pct(FARM.discount[i]) : 'aucune' },
      { label: INFO_LABELS.pantry, value: `${state.pantry.capacity} places` },
    )
  } else if (b.type === 'personnel') {
    rows.push({ label: INFO_LABELS.staff, value: `${state.staff.employees.length} sur ${staffCap(state)} places` })
  } else if (b.type === 'centreVeto') {
    const v = vetCenterView(state)
    rows.push(
      { label: INFO_LABELS.treats, value: v.treats.join(', ') },
      { label: INFO_LABELS.vets, value: v.vets },
      { label: INFO_LABELS.quarantine, value: v.quarantine },
    )
    if (v.vaccination) rows.push({ label: INFO_LABELS.vaccination, value: v.vaccination })
    rows.push({ label: INFO_LABELS.next, value: v.nextUnlock ?? INFO_LABELS.maxLevel })
    queue = v.queue.slice(0, QUEUE_SHOWN).map((q) => `${q.name} · ${q.label}`)
    if (v.queue.length > QUEUE_SHOWN) queue.push(`et ${v.queue.length - QUEUE_SHOWN} autre${v.queue.length - QUEUE_SHOWN > 1 ? 's' : ''}`)
  } else {
    const flow = buildingIncomePerHour(state, target.slot)
    const especes = visibleSpecies(state)
    rows.push(
      { label: INFO_LABELS.income, value: `≈ ${formatCoins(flow.pieces)} par heure` },
      { label: INFO_LABELS.clients, value: `≈ ${formatAmount(flow.clients)} par heure (maximum ${d.maxClientsPerH[i]})` },
      { label: INFO_LABELS.spend, value: spendText(spendPerClient(b.type, b.level, especes)) },
    )
  }
  const cost = d.upgradeCost[i]
  rows.push({ label: INFO_LABELS.upgrade, value: cost === undefined ? INFO_LABELS.maxLevel : `${formatCoins(cost)} pour le niveau ${b.level + 1}` })
  const upgrade = b.type === 'centreVeto' && cost !== undefined ? { label: `Améliorer (${formatCoins(cost)})`, cost } : null
  return { title: d.name, role: BUILDING_ROLE[b.type], rows, missing: [], villageButton: null, queue, upgrade }
}

function decorInfo(state: GameState, index: number): BuildingInfo | null {
  const v = VILLAGE_PROPS[index]
  if (!v) return null
  if (v.key !== 'mairie') return { title: v.name, role: v.sentence, rows: [], missing: [], villageButton: null, queue: [], upgrade: null }
  const level = state.village.level
  const pop = population(state)
  const rows: InfoRow[] = [
    { label: INFO_LABELS.villageLevel, value: `${ECONOMY.LEVEL_NAMES[level - 1]} (niveau ${level}/3)` },
    { label: INFO_LABELS.population, value: String(pop) },
  ]
  const missing: string[] = []
  if (level >= 3) {
    rows.push({ label: INFO_LABELS.next, value: MAIRIE_INFO.maxLevel })
  } else {
    const target = (level + 1) as 2 | 3
    const needed = ECONOMY.LEVEL_POPULATION[target]
    rows.push({ label: INFO_LABELS.next, value: `${ECONOMY.LEVEL_NAMES[target - 1]} à ${needed} habitants` })
    if (pop < needed) missing.push(`Il faut ${needed} habitants (encore ${needed - pop}).`)
    if (!missionGateOk(state, target)) {
      const text = gateMissionText(target)
      if (text) missing.push(text)
    }
    if (missing.length === 0 && canLevelUp(state).ok) missing.push(MAIRIE_INFO.ready)
  }
  return { title: MAIRIE_INFO.title, role: MAIRIE_INFO.role, rows, missing, villageButton: MAIRIE_INFO.openVillage, queue: [], upgrade: null }
}
