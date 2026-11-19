import type { DiseaseId } from '../sim/types'

/** Une maladie : niveau du centre qui la soigne, durée du soin (h), durée de chaque stade (h : léger, grave, mortel). */
export interface DiseaseData {
  name: string
  centerLevel: 1 | 2 | 3
  careH: number
  stageH: [number, number, number]
  contagious: boolean
}

export const DISEASES: Record<DiseaseId, DiseaseData> = {
  parasites: { name: 'Parasites', centerLevel: 1, careH: 2, stageH: [24, 24, 12], contagious: false },
  indigestion: { name: 'Indigestion', centerLevel: 1, careH: 2, stageH: [24, 24, 12], contagious: false },
  blessure: { name: 'Blessure', centerLevel: 2, careH: 3, stageH: [24, 24, 12], contagious: false },
  grippe: { name: 'Grippe', centerLevel: 3, careH: 3, stageH: [18, 18, 12], contagious: true },
}

export const STAGE_NAMES = ['léger', 'grave', 'mortel'] as const

/** Apparition des maladies et prix des soins (étape 3, décisions D2 et D3). */
export const HEALTH_TUNING = {
  /** Parasites : chance par jour quand l'enclos est sale (propreté 0). */
  DIRTY_PARASITES_PER_DAY: 0.15,
  /** Indigestion : à coup sûr après autant d'heures sans manger. */
  INDIGESTION_AFTER_H: 24,
  /** Blessure : chance par jour dans un enclos surpeuplé. */
  OVERCROWD_INJURY_PER_DAY: 0.1,
  /** Blessure : chance par jour pour un prédateur qui partage son enclos avec un autre prédateur. */
  PREDATOR_FIGHT_PER_DAY: 0.02,
  PREDATORS: ['renard', 'loup'] as const,
  /** Grippe : chance par jour au hasard, à partir du niveau de village ci-dessous. */
  FLU_PER_DAY: 0.005,
  FLU_MIN_VILLAGE_LEVEL: 2,
  /** Grippe : chance de plus par jour et par malade contagieux du même enclos. */
  FLU_CONTAGION_PER_DAY: 0.25,
  /** Un animal aux parasites a son bonheur multiplié par ce nombre. */
  PARASITES_HAPPINESS: 0.7,
  /** Prix d'un soin, en part du prix de l'espèce, selon le stade. */
  CARE_PRICE_SHARE: [0.1, 0.25, 0.4],
  CARE_MIN_COST: 20,
}

/** Le centre vétérinaire : chiffres par niveau (tableaux de 5 valeurs, niveau 1 en premier). */
export const VET_CENTER = {
  /** Emplacement du village réservé au centre (la migration v5 -> v6 l'écrit en dur : un test les compare). */
  SLOT: 7,
  /** Vétérinaires qui travaillent en même temps. */
  PLACES: [2, 2, 2, 2, 3],
  /** Places de quarantaine. */
  QUARANTINE: [0, 0, 2, 3, 4],
  /** Multiplicateur de la durée des soins. */
  SPEED: [1, 1, 1, 1, 0.6],
  QUARANTINE_LEVEL: 3,
  VACCINE_LEVEL: 4,
  VACCINE_DAYS: 5,
  VACCINE_COST_PER_ANIMAL: 10,
  VACCINE_MIN_COST: 30,
  /** On peut revacciner quand il reste moins de ces heures de protection. */
  VACCINE_RENEW_BELOW_H: 24,
  /** Poids du vétérinaire dans le tirage des candidats, une fois le centre construit (soigneur et agent : poids inchangés). */
  CANDIDATE_WEIGHT: 0.2,
  /** Un vétérinaire expérimenté soigne plus vite : × (1 + LEVEL_SPEEDUP × (niveau − 1)). */
  LEVEL_SPEEDUP: 0.1,
  GIFT_VET_NAME: 'Élise Fontaine',
}
