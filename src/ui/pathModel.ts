import type { GameState } from '../sim/types'
import { SPECIES } from '../data/species'
import { removalImpact } from '../sim/paths'

/** Ligne rouge d'un enclos que les visiteurs ne peuvent pas atteindre. */
export const NO_PATH_TEXT = 'Pas de chemin : les visiteurs ne le voient pas'

/** Texte d'avertissement avant de détruire un chemin : pas de remboursement, enclos qui perdent leur lien. */
export function pathWarning(state: GameState, id: number): string {
  const names = removalImpact(state, id).map((encId) => {
    const sp = state.enclosures.find((e) => e.id === encId)?.species
    return sp ? SPECIES[sp].name : 'Enclos vide'
  })
  if (names.length === 0) return 'Non remboursé.'
  const count = names.length === 1 ? '1 enclos ne sera plus visité' : `${names.length} enclos ne seront plus visités`
  return `Non remboursé. ${count} : ${names.join(', ')}.`
}
