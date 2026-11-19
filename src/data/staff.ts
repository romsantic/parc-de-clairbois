import type { JobId } from '../sim/types'

/** Les métiers du personnel. `open` : recrutable dès le départ ; `wage` : salaire journalier au niveau 1. */
export const JOBS: Record<JobId, { name: string; open: boolean; wage: number }> = {
  soigneur: { name: 'Soigneur', open: true, wage: 60 },
  entretien: { name: "Agent d'entretien", open: true, wage: 40 },
  veterinaire: { name: 'Vétérinaire', open: false, wage: 80 },
  fermier: { name: 'Fermier', open: false, wage: 50 },
  animateur: { name: 'Animateur', open: false, wage: 60 },
}

export const STAFF_TUNING = {
  /** Heures d'expérience pour atteindre les niveaux 1 à 5. */
  XP_LEVEL_H: [0, 72, 168, 336, 672],
  WAGE_PER_LEVEL: 0.2,
  KEEPER_ANIMALS: [12, 14, 16, 18, 20],
  CLEANER_ENCLOSURES: [4, 5, 6, 7, 8],
  CLEAN_BELOW: 0.5,
  UNCOVERED_DIRT_FACTOR: 2,
  UNCOVERED_HAPPINESS: 0.7,
  DEBT_EFFICIENCY: 0.5,
  CAP_NO_HOUSE: 3,
  CAP_BY_HOUSE_LEVEL: [6, 10, 15],
  CANDIDATES: 4,
  RENEW_H: 12,
  CANDIDATE_LEVELS: [[1, 0.6], [2, 0.3], [3, 0.1]],
  CANDIDATE_JOBS: [['soigneur', 0.6], ['entretien', 0.4]],
}

/** Le premier employé, offert au départ. */
export const FIRST_KEEPER = { name: 'Léa', job: 'soigneur' as const }
