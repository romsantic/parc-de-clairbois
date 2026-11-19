import type { StatKey, Stats } from './types'

/** Tous les compteurs, dans l'ordre de `StatKey` (écrit une seule fois, ici). */
export const STAT_KEYS: StatKey[] = [
  'nettoyages', 'fourrageAchete', 'viandeAchetee', 'ventes', 'achatsAnimaux', 'naissances', 'gestations',
  'visiteurs', 'piecesGagnees', 'soins', 'billetsRegles', 'ficheEnclosVue', 'autonomieVue', 'ameliorations',
  'vaccinations',
]

export function emptyStats(): Stats {
  const counts = {} as Stats['counts']
  for (const k of STAT_KEYS) counts[k] = 0
  return { counts, birthsBySpecies: {} }
}

/** Ajoute n à un compteur (en place). */
export function bump(stats: Stats, key: StatKey, n = 1): void {
  stats.counts[key] += n
}
