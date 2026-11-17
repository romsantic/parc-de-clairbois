import type { SpeciesId } from '../data/species'
import type { GameEvent } from './types'
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
}

/** Résumé de ce qui s'est passé (pendant une absence, par exemple). */
export function summarize(events: GameEvent[]): Summary {
  const s: Summary = { naissances: 0, morts: [], malades: 0, fourrage: 0, viande: 0, pieces: 0, visiteurs: 0, missions: [] }
  for (const e of events) {
    if (e.kind === 'naissance') s.naissances++
    else if (e.kind === 'malade') s.malades++
    else if (e.kind === 'mort') s.morts.push({ name: e.name, species: e.species })
    else if (e.kind === 'repas') { s.fourrage += e.fourrage; s.viande += e.viande }
    else if (e.kind === 'recettes') { s.pieces += e.billets + e.village; s.visiteurs += e.visiteurs }
    else if (e.kind === 'mission') s.missions.push(missionDef(e.track, e.id)?.title ?? e.id)
  }
  return s
}
