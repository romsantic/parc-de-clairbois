import type { SpeciesId } from '../data/species'
import type { GameEvent } from './types'

export interface Summary {
  naissances: number
  morts: { name: string; species: SpeciesId }[]
  malades: number
  fourrage: number
  viande: number
}

/** Résumé de ce qui s'est passé (pendant une absence, par exemple). */
export function summarize(events: GameEvent[]): Summary {
  const s: Summary = { naissances: 0, morts: [], malades: 0, fourrage: 0, viande: 0 }
  for (const e of events) {
    if (e.kind === 'naissance') s.naissances++
    else if (e.kind === 'malade') s.malades++
    else if (e.kind === 'mort') s.morts.push({ name: e.name, species: e.species })
    else if (e.kind === 'repas') { s.fourrage += e.fourrage; s.viande += e.viande }
  }
  return s
}
