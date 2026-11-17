import type { SpeciesId } from '../data/species'
import type { GameEvent, GameState } from './types'
import { missionDef } from './missions'

export interface Summary {
  naissances: number
  morts: { name: string; species: SpeciesId }[]
  malades: number
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
}

/** Résumé de ce qui s'est passé (pendant une absence, par exemple). */
export function summarize(events: GameEvent[], state?: GameState): Summary {
  const s: Summary = { naissances: 0, morts: [], malades: 0, fourrage: 0, viande: 0, pieces: 0, visiteurs: 0, missions: [], missionsVersees: [], quotidiennesRenouvelees: false, serie: state?.missions.daily.streak ?? 0 }
  for (const e of events) {
    if (e.kind === 'naissance') s.naissances++
    else if (e.kind === 'malade') s.malades++
    else if (e.kind === 'mort') s.morts.push({ name: e.name, species: e.species })
    else if (e.kind === 'repas') { s.fourrage += e.fourrage; s.viande += e.viande }
    else if (e.kind === 'recettes') { s.pieces += e.billets + e.village; s.visiteurs += e.visiteurs }
    else if (e.kind === 'quotidiennes') s.quotidiennesRenouvelees = true
    else if (e.kind === 'missionVersee') s.missionsVersees.push(missionDef('quotidienne', e.id)?.title ?? e.id)
    else if (e.kind === 'mission') s.missions.push(missionDef(e.track, e.id)?.title ?? e.id)
  }
  return s
}
