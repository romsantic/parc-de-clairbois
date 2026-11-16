import type { BuildingType } from '../sim/types'

/** Réglages de l'économie (étape 4). Tous les chiffres vivent ici, faciles à changer après avoir joué. */
export const ECONOMY = {
  /** Visiteurs par heure pour 1 point d'attrait, bonheur 1, prix juste, réputation 1. */
  VISITORS_PER_APPEAL: 4,
  /** Bonus d'attrait par animal supplémentaire de la même espèce : × (1 + 0,5 × √(n − 1)). */
  APPEAL_EXTRA_FACTOR: 0.5,
  /** Prix juste = arrondi de FAIR_BASE + FAIR_PER_LEVEL × (niveau − 1) + FAIR_PER_APPEAL × attrait. */
  FAIR_BASE: 4,
  FAIR_PER_LEVEL: 2,
  FAIR_PER_APPEAL: 0.4,
  /** Multiplicateur de visiteurs selon [prix / prix juste, multiplicateur] ; 1,3 sous le premier point, 0 après le dernier. */
  PRICE_CURVE: [[0.5, 1.3], [1, 1], [1.5, 0.6], [2, 0.25], [3, 0]] as [number, number][],
  /** Bonus de visiteurs quand l'auberge est construite. */
  AUBERGE_VISITOR_BONUS: 1.2,
  /** Réputation : les visiteurs sont × (REPUTATION_BASE + (1 − REPUTATION_BASE) × réputation). */
  REPUTATION_BASE: 0.5,
  /** Au-dessus de ce rapport prix / prix juste, la réputation baisse. */
  REPUTATION_DROP_ABOVE: 1.5,
  REPUTATION_DROP_PER_H: 0.02,
  REPUTATION_GAIN_PER_H: 0.01,
  /** Un nouvel habitant pour autant de clients servis. */
  CLIENTS_PER_NEWCOMER: 30,
  BASE_POPULATION: 10,
  RESIDENTS_PER_LEVEL: 5,
  /** Habitants requis pour passer au niveau 2 puis 3. */
  LEVEL_POPULATION: { 2: 50, 3: 150 } as Record<2 | 3, number>,
  LEVEL_NAMES: ['Hameau', 'Village', 'Bourg'],
  /** Boutique : dépense par client = (BOUTIQUE_BASE + BOUTIQUE_PER_SPECIES × espèces) × multiplicateur du niveau. */
  BOUTIQUE_BASE: 1,
  BOUTIQUE_PER_SPECIES: 0.5,
}

export interface BuildingData {
  name: string
  /** Avec article, pour les messages (« un café »). */
  withArticle: string
  /** Niveau du village requis pour construire. */
  unlockLevel: 1 | 2 | 3
  /** null : déjà construit au départ. */
  buildCost: number | null
  /** Coût pour passer au niveau 2 puis 3. */
  upgradeCost: [number, number]
  /** Part des visiteurs qui viennent ici. */
  share: number
  /** Pièces par client, par niveau (boutique : multiplicateur du niveau). */
  spend: [number, number, number]
  /** Clients maximum par heure, par niveau. */
  maxClientsPerH: [number, number, number]
}

export const BUILDINGS: Record<BuildingType, BuildingData> = {
  ferme: { name: 'Ferme', withArticle: 'une ferme', unlockLevel: 1, buildCost: null, upgradeCost: [400, 1000], share: 0, spend: [0, 0, 0], maxClientsPerH: [0, 0, 0] },
  cafe: { name: 'Café', withArticle: 'un café', unlockLevel: 1, buildCost: 300, upgradeCost: [600, 1200], share: 0.4, spend: [3, 4, 5], maxClientsPerH: [10, 25, 50] },
  boutique: { name: 'Boutique', withArticle: 'une boutique', unlockLevel: 2, buildCost: 800, upgradeCost: [1500, 3000], share: 0.3, spend: [1, 1.25, 1.5], maxClientsPerH: [10, 25, 50] },
  auberge: { name: 'Auberge', withArticle: 'une auberge', unlockLevel: 2, buildCost: 1200, upgradeCost: [2500, 5000], share: 0.1, spend: [8, 10, 12], maxClientsPerH: [4, 8, 15] },
}

export const FARM = {
  foodPrice: { fourrage: 2, viande: 4 },
  /** Remise sur les rations par niveau de la ferme. */
  discount: [0, 0.2, 0.35],
  freeFourragePerDay: [0, 6, 15],
}

/** Marchand d'animaux : renouvellement, composition du stock, prix de revente. */
export const MERCHANT = {
  RESTOCK_H: 6,
  /** Nombre d'offres = BASE_STOCK + niveau du village. */
  BASE_STOCK: 3,
  ADULT_SHARE: 0.7,
  /** Prix d'un jeune à l'achat, en part du prix de l'adulte. */
  YOUNG_BUY_SHARE: 0.65,
  SELL_YOUNG: 0.4,
  SELL_ADULT: 0.6,
}

/**
 * Emplacements de bâtiments, côté village (x > 8) : à plus de 4 m de la rivière, des chemins,
 * de la mairie et des maisons restantes. `rot` tourne la façade vers le chemin ou la mairie.
 */
export const SLOTS: { id: number; x: number; z: number; rot: number; unlockLevel: 1 | 2 | 3 }[] = [
  { id: 0, x: 29, z: 17, rot: -2.28, unlockLevel: 1 },
  { id: 1, x: 21, z: 3, rot: -1.11, unlockLevel: 1 },
  { id: 2, x: 25, z: 9.5, rot: -1.57, unlockLevel: 2 },
  { id: 3, x: 25, z: -6, rot: -1.21, unlockLevel: 2 },
  { id: 4, x: 10.5, z: -7, rot: 1.02, unlockLevel: 3 },
  { id: 5, x: 30.5, z: 6, rot: -1.57, unlockLevel: 3 },
]
