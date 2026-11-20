import type { SpeciesId } from '../data/species'
import type { DiseaseId, GameEvent, GameState, StaffLevel } from './types'
import { missionDef } from './missions'

export interface Summary {
  naissances: number
  morts: { name: string; species: SpeciesId; cause?: DiseaseId }[]
  /** Maladies repérées pendant la période (le repérage, pas l'apparition). */
  malades: number
  /** Les mêmes, par maladie. */
  maladies: Partial<Record<DiseaseId, number>>
  /** Soins commencés par le vétérinaire, et pièces dépensées. */
  soignes: number
  soinsCout: number
  fourrage: number
  viande: number
  pieces: number
  visiteurs: number
  /** Titres des missions réussies pendant la période. */
  missions: string[]
  /** Titres des quotidiennes dont la récompense a été versée d'office à minuit. */
  missionsVersees: string[]
  /** De nouvelles quotidiennes ont été tirées. */
  quotidiennesRenouvelees: boolean
  /** Série de jours (lue dans l'état final ; 0 sans état). */
  serie: number
  /** Salaires réellement payés pendant la période. */
  salaires: number
  /** Salaires dus pendant la période (payés ou non). */
  salairesDus: number
  /** Montées de niveau des employés pendant la période. */
  niveaux: { name: string; level: StaffLevel }[]
}

/** Résumé de ce qui s'est passé (pendant une absence, par exemple). */
export function summarize(events: GameEvent[], state?: GameState): Summary {
  const s: Summary = { naissances: 0, morts: [], malades: 0, maladies: {}, soignes: 0, soinsCout: 0, fourrage: 0, viande: 0, pieces: 0, visiteurs: 0, missions: [], missionsVersees: [], quotidiennesRenouvelees: false, serie: state?.missions.daily.streak ?? 0, salaires: 0, salairesDus: 0, niveaux: [] }
  for (const e of events) {
    if (e.kind === 'naissance') s.naissances++
    else if (e.kind === 'malade') { s.malades++; s.maladies[e.disease] = (s.maladies[e.disease] ?? 0) + 1 }
    else if (e.kind === 'soigne') { s.soignes++; s.soinsCout += e.cost }
    else if (e.kind === 'mort') s.morts.push({ name: e.name, species: e.species, ...(e.cause ? { cause: e.cause } : {}) })
    else if (e.kind === 'repas') { s.fourrage += e.fourrage; s.viande += e.viande }
    else if (e.kind === 'recettes') { s.pieces += e.billets + e.village; s.visiteurs += e.visiteurs }
    else if (e.kind === 'quotidiennes') s.quotidiennesRenouvelees = true
    else if (e.kind === 'missionVersee') s.missionsVersees.push(e.title ?? missionDef('quotidienne', e.id)?.title ?? e.id)
    else if (e.kind === 'mission') s.missions.push(e.title ?? missionDef(e.track, e.id)?.title ?? e.id)
    else if (e.kind === 'paie') { s.salaires += e.paid; s.salairesDus += e.due }
    else if (e.kind === 'niveauEmploye') s.niveaux.push({ name: e.name, level: e.level })
  }
  return s
}
