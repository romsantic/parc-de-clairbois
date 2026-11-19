import type { BuildingType } from '../sim/types'

/** Réglages de l'économie (étape 4). Tous les chiffres vivent ici, faciles à changer après avoir joué. */
export const ECONOMY = {
  /** Visiteurs par heure pour 1 point d'attrait, bonheur 1, prix juste, réputation 1. */
  VISITORS_PER_APPEAL: 4,
  /** Bonus d'attrait par animal supplémentaire de la même espèce : × (1 + 0,5 × √(n − 1)). */
  APPEAL_EXTRA_FACTOR: 0.5,
  /** Prix juste = arrondi de FAIR_BASE + FAIR_PER_LEVEL × (niveau − 1) + FAIR_PER_APPEAL × attrait. */
  FAIR_BASE: 2,
  FAIR_PER_LEVEL: 1,
  FAIR_PER_APPEAL: 0.05,
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
  /** Nouveaux venus (réglage de l'étape 6, choix de Romain 17/11) : un habitant pour CLIENTS_PER_NEWCOMER clients servis jusqu'à NEWCOMER_FAST_CLIENTS clients, puis un pour CLIENTS_PER_NEWCOMER_LATE. */
  CLIENTS_PER_NEWCOMER: 30,
  /** Clients servis jusqu'auxquels les nouveaux venus arrivent vite (2400 / 30 = 80 habitants). */
  NEWCOMER_FAST_CLIENTS: 2400,
  /** Au-delà de NEWCOMER_FAST_CLIENTS : clients servis pour un nouvel habitant. */
  CLIENTS_PER_NEWCOMER_LATE: 350,
  BASE_POPULATION: 10,
  RESIDENTS_PER_LEVEL: 5,
  /** Habitants requis pour passer au niveau 2 puis 3. */
  LEVEL_POPULATION: { 2: 40, 3: 150 } as Record<2 | 3, number>,
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
  cafe: { name: 'Café', withArticle: 'un café', unlockLevel: 1, buildCost: 300, upgradeCost: [600, 1200], share: 0.4, spend: [1.5, 2, 2.5], maxClientsPerH: [10, 25, 50] },
  boutique: { name: 'Boutique', withArticle: 'une boutique', unlockLevel: 2, buildCost: 800, upgradeCost: [1500, 3000], share: 0.3, spend: [0.5, 0.6, 0.75], maxClientsPerH: [10, 25, 50] },
  personnel: { name: 'Maison du personnel', withArticle: 'une maison du personnel', unlockLevel: 1, buildCost: 400, upgradeCost: [900, 2000], share: 0, spend: [0, 0, 0], maxClientsPerH: [0, 0, 0] },
  auberge: { name: 'Auberge', withArticle: 'une auberge', unlockLevel: 2, buildCost: 1200, upgradeCost: [2500, 5000], share: 0.1, spend: [4, 5, 6], maxClientsPerH: [4, 8, 15] },
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
 * Emplacements de bâtiments, autour de la place du village (x 8..24) : à plus de 4,5 m des chemins,
 * à plus de 8,5 m de l'axe de la rivière, à 9 m les uns des autres. `rot` tourne la façade vers le chemin.
 * Les deux premiers (ferme, premier choix) sont les plus proches du pont.
 */
/** `only` : l'emplacement n'accepte que ce bâtiment (et les autres emplacements ne l'acceptent pas). */
export const SLOTS: { id: number; x: number; z: number; rot: number; unlockLevel: 1 | 2 | 3; only?: BuildingType }[] = [
  { id: 0, x: 15, z: 10, rot: 2.31, unlockLevel: 1 },
  { id: 1, x: 21, z: 17, rot: -2.93, unlockLevel: 1 },
  { id: 2, x: 24, z: 8, rot: -1.67, unlockLevel: 2 },
  { id: 3, x: 24, z: -1.5, rot: -1.29, unlockLevel: 2 },
  { id: 4, x: 12, z: -11, rot: 0.41, unlockLevel: 3 },
  { id: 5, x: 24, z: -11, rot: -0.55, unlockLevel: 3 },
  // Au fond du village, derrière les emplacements du Bourg, façade tournée vers la place : la maison du personnel.
  { id: 6, x: 17, z: -19, rot: 0, unlockLevel: 1, only: 'personnel' },
]
