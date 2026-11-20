import type { Biome, SpeciesId } from './species'
import type { BuildingType, StatKey } from '../sim/types'

/** Missions du jeu (étape 5). Données seules : tous les textes et chiffres vivent ici. */

/** Ce que la mission demande. Ajouter une sorte = ajouter une ligne dans `MEASURES` (sim/missions.ts). */
export type Objective =
  | { kind: 'compteur'; stat: StatKey; n: number }
  | { kind: 'compteurs'; stats: StatKey[]; n: number }
  | { kind: 'batiment'; building: BuildingType; level?: 1 | 2 | 3 }
  | { kind: 'especes'; n: number; biome?: Biome }
  | { kind: 'couple'; species: SpeciesId }
  | { kind: 'enclos'; biome: Biome; n: number }
  | { kind: 'visiteursH'; n: number }
  | { kind: 'habitants'; n: number }
  | { kind: 'autonomie'; hours: number }
  | { kind: 'naissanceDe'; species: SpeciesId[] }

export interface Reward { coins?: number; fourrage?: number; viande?: number }

/** Élément de l'interface à mettre en évidence pendant les premiers pas. */
export type HighlightId = 'detailsEnclos' | 'ferme' | 'nettoyer' | 'billet' | 'emplacementLibre' | 'emplacementCentre' | 'prairie' | 'marchand' | 'autonomie'

export interface MissionDef {
  id: string
  /** Une ligne. */
  title: string
  /** Ce que dit l'habitant. */
  text: string
  giver: string
  objective: Objective
  reward: Reward
  highlight?: HighlightId
  /** Dernière mission d'un palier : sa réussite ouvre le niveau suivant du village (`'fin'` : fin de la V1). */
  gate?: 2 | 3 | 'fin'
}

export const MISSIONS_TUNING = {
  DAILY_COUNT: 3,
  STREAK_DAYS: 7,
  COUPON_DISCOUNT: 0.25,
  GAZETTE_MIN_ABSENCE_H: 1,
}

/**
 * Réglage des quotidiennes : tout se règle sur l'état du parc au moment du tirage (minuit) et ne bouge plus de la journée.
 * Cibles : heures d'activité du parc ; récompenses : heures de recettes (au moins REWARD_MIN pièces).
 */
export const DAILY_TUNING = {
  /** Visiteurs à accueillir : ce que le parc reçoit en tant d'heures. */
  VISITORS_HOURS: 3,
  /** Pièces à gagner : les recettes de tant d'heures. */
  COINS_HOURS: 3,
  /** Rations à acheter : cette part de ce que mangent les animaux en un jour. */
  RATIONS_DAY_SHARE: 0.5,
  /** Nettoyages : un par enclos, entre ces bornes. */
  CLEAN_MIN: 2,
  CLEAN_MAX: 6,
  /** Vendre / acheter : 1 animal, ou TRADE_MANY quand le parc en a plus que TRADE_MANY_ABOVE. */
  TRADE_MANY_ABOVE: 20,
  TRADE_MANY: 2,
  /** Planchers des cibles (un parc à l'arrêt a quand même une mission faisable). */
  MIN_VISITORS: 50,
  MIN_COINS: 300,
  MIN_RATIONS: 30,
  /** Récompense en pièces : tant d'heures de recettes, jamais moins de REWARD_MIN. */
  REWARD_HOURS: 1,
  REWARD_MIN: 30,
  /** Multiplicateur de la récompense pour les missions qui coûtent (acheter des rations ou un animal). */
  COSTLY_FACTOR: 1.5,
  /** Récompense en nourriture (fermier) : cette part de la consommation d'un jour, au moins FOOD_MIN. */
  FOOD_DAY_SHARE: 0.25,
  FOOD_MIN: 15,
  /** Petit bonus de nourriture d'une naissance. */
  BIRTH_FOOD_DAY_SHARE: 0.1,
  BIRTH_FOOD_MIN: 10,
  /** Chiffres ronds : en dessous de `below`, on arrondit au multiple de `step`. */
  NICE_STEPS: [
    { below: 100, step: 5 },
    { below: 500, step: 10 },
    { below: 2000, step: 50 },
    { below: 10000, step: 100 },
    { below: Infinity, step: 500 },
  ] as readonly { below: number; step: number }[],
}

/** L'état du parc au moment du tirage des quotidiennes. */
export interface ParkPace {
  visitorsPerH: number
  coinsPerH: number
  rationsPerDay: number
  enclosures: number
  animals: number
}

/** Arrondit à un chiffre « rond » selon la taille du nombre (147 → 150, 1234 → 1250) ; jamais moins d'un pas. */
export function niceRound(x: number, steps: readonly { below: number; step: number }[] = DAILY_TUNING.NICE_STEPS): number {
  const v = Math.max(0, Number.isFinite(x) ? x : 0)
  const { step } = steps.find((s) => v < s.below) ?? steps[steps.length - 1]
  return Math.max(step, Math.round(v / step) * step)
}


const MARGAUX = 'Margaux, la maire'
const FERMIER = 'Le fermier'
const AUBERGISTE = "L'aubergiste"
const GARDE = 'La garde forestière'

/** Les 10 premiers pas avec Margaux, dans l'ordre. L'index de `pas-cafe` (4) est écrit en dur dans la migration v5 → v6 (un test le compare). */
export const TUTORIAL: MissionDef[] = [
  {
    id: 'pas-fiche', title: "Ouvre la fiche de l'enclos des moutons", giver: MARGAUX, highlight: 'detailsEnclos',
    text: "Bienvenue à Clairbois, je suis Margaux, la maire du village ! Je vais te guider pas à pas dans la création et l'évolution de ton village et de ton zoo. Je t'envoie Léa, notre soigneuse : elle s'occupe déjà de tes moutons. Pour commencer, touche l'enclos des moutons, puis le bouton Détails pour voir qui y vit.",
    objective: { kind: 'compteur', stat: 'ficheEnclosVue', n: 1 }, reward: { coins: 20 },
  },
  {
    id: 'pas-fourrage', title: 'Achète 20 fourrages à la ferme', giver: MARGAUX, highlight: 'ferme',
    text: 'Bravo, tu as tes premiers animaux. Mais ils mangent tous les jours. Touche la ferme, puis achète du fourrage pour remplir le garde-manger.',
    objective: { kind: 'compteur', stat: 'fourrageAchete', n: 20 }, reward: { fourrage: 20 },
  },
  {
    id: 'pas-nettoyer', title: "Nettoie l'enclos", giver: MARGAUX, highlight: 'nettoyer',
    text: 'Un enclos sale rend les animaux malheureux. Touche l\'enclos, puis le bouton Nettoyer.',
    objective: { kind: 'compteur', stat: 'nettoyages', n: 1 }, reward: { coins: 10 },
  },
  {
    id: 'pas-billet', title: 'Règle le prix du billet', giver: MARGAUX, highlight: 'billet',
    text: "Le billet, c'est ce que paient les visiteurs. Trop cher, ils restent chez eux ; trop bas, tu perds des pièces. Touche la case Billet en haut et valide un prix.",
    objective: { kind: 'compteur', stat: 'billetsRegles', n: 1 }, reward: { coins: 20 },
  },
  {
    id: 'pas-cafe', title: 'Construis le café', giver: MARGAUX, highlight: 'emplacementLibre',
    text: "Les visiteurs ont soif ! Un café rapporte des pièces et attire de nouveaux habitants. Touche l'emplacement libre pour le construire.",
    objective: { kind: 'batiment', building: 'cafe' }, reward: { coins: 150 },
  },
  {
    id: 'pas-centre', title: 'Construis le centre vétérinaire', giver: MARGAUX, highlight: 'emplacementCentre',
    text: "Les animaux peuvent tomber malades, et on ne les soigne plus d'un clic : il faut un centre vétérinaire. Touche l'emplacement réservé au village pour le construire, puis embauche un vétérinaire.",
    objective: { kind: 'batiment', building: 'centreVeto' }, reward: { coins: 150 },
  },
  {
    id: 'pas-enclos', title: 'Pose un deuxième enclos dans la prairie', giver: MARGAUX, highlight: 'prairie',
    text: "Il faut de la place pour de nouveaux animaux. Touche la prairie et dessine un deuxième enclos, puis relie-le à l'allée par un chemin pour que les visiteurs le voient.",
    objective: { kind: 'enclos', biome: 'prairie', n: 2 }, reward: { coins: 150 },
  },
  {
    id: 'pas-cochons', title: 'Achète un couple de cochons', giver: MARGAUX, highlight: 'marchand',
    text: 'Pour avoir des petits, il faut un mâle et une femelle. Va chez le marchand, achète une truie et un verrat adultes et mets-les dans ton nouvel enclos.',
    objective: { kind: 'couple', species: 'cochon' }, reward: { coins: 100 },
  },
  {
    id: 'pas-gestation', title: 'Attends la première gestation', giver: MARGAUX,
    text: "Pour qu'une femelle attende un petit, il faut un mâle et une femelle adultes, de la place dans l'enclos, un soigneur qui les suit, et des animaux heureux et bien nourris. Sois patient, ça vient tout seul !",
    objective: { kind: 'compteur', stat: 'gestations', n: 1 }, reward: { fourrage: 20 },
  },
  {
    id: 'pas-autonomie', title: "Vérifie l'autonomie", giver: MARGAUX, highlight: 'autonomie',
    text: "L'autonomie dit combien de temps le garde-manger tiendra sans toi. Touche la case Autonomie en haut pour la voir : c'est ce qui te dit quand revenir.",
    objective: { kind: 'compteur', stat: 'autonomieVue', n: 1 }, reward: { coins: 50 },
  },
]

/**
 * Les 11 missions d'histoire : 0 à 3 Hameau, 4 à 7 Village, 8 à 10 Bourg.
 * Les index de début de palier (0, 4, 8) sont aussi écrits en dur dans la migration v2 → v3 (un test les compare).
 */
// Les id « hist-habitants-100 » et « hist-habitants-150 » sont gardés (parties sauvegardées) : leurs objectifs sont 150 et 250.
export const STORY: MissionDef[] = [
  {
    id: 'hist-naissance', title: 'Première naissance au parc', giver: MARGAUX,
    text: "Un parc vit quand les petits arrivent. Veille à ce que tes couples aient un soigneur, et attends ta première naissance.",
    objective: { kind: 'compteur', stat: 'naissances', n: 1 }, reward: { coins: 150, fourrage: 30 },
  },
  {
    id: 'hist-ferme', title: 'Améliore la ferme', giver: FERMIER,
    text: "Une meilleure ferme donne plus de fourrage gratuit et des rations moins chères. Améliore-la, tu verras la différence !",
    objective: { kind: 'batiment', building: 'ferme', level: 2 }, reward: { coins: 200 },
  },
  {
    id: 'hist-especes-3', title: 'Possède 3 espèces', giver: MARGAUX,
    text: "Plus il y a d'espèces différentes, plus les visiteurs sont curieux. Essaie d'en avoir trois.",
    objective: { kind: 'especes', n: 3 }, reward: { coins: 300 },
  },
  {
    id: 'hist-visiteurs-20', title: 'Accueille 20 visiteurs par heure', giver: MARGAUX, gate: 2,
    text: "Si tu atteins 20 visiteurs par heure, Clairbois pourra devenir un vrai village. Soigne tes animaux et choisis un bon prix de billet.",
    objective: { kind: 'visiteursH', n: 20 }, reward: { coins: 400 },
  },
  {
    id: 'hist-auberge', title: "Construis l'auberge", giver: AUBERGISTE,
    text: "Les visiteurs venus de loin ont besoin d'un lit ! Construis une auberge et ils resteront plus longtemps.",
    objective: { kind: 'batiment', building: 'auberge' }, reward: { coins: 500 },
  },
  {
    id: 'hist-foret', title: 'Possède 2 espèces de forêt', giver: GARDE,
    text: "La forêt cache de belles bêtes. Installe-en deux espèces différentes, elles ont besoin de calme et de viande ou de fourrage.",
    objective: { kind: 'especes', n: 2, biome: 'foret' }, reward: { coins: 800 },
  },
  {
    id: 'hist-autonomie-2j', title: "2 jours d'autonomie au garde-manger", giver: FERMIER,
    text: "Un garde-manger bien rempli, c'est la tranquillité. Fais en sorte qu'il tienne deux jours sans que tu reviennes.",
    objective: { kind: 'autonomie', hours: 48 }, reward: { fourrage: 100, viande: 50 },
  },
  {
    id: 'hist-habitants-100', title: 'Atteins 150 habitants', giver: MARGAUX, gate: 3,
    text: "Clairbois grandit ! À 150 habitants, nous pourrons devenir un bourg. Construis, améliore et accueille du monde.",
    objective: { kind: 'habitants', n: 150 }, reward: { coins: 1000 },
  },
  {
    id: 'hist-loup-taureau', title: 'Fais naître un loup ou un taureau', giver: GARDE,
    text: "Les bêtes de la montagne sont fières et rares. Si un loup ou un taureau naît chez toi, tu as vraiment tout compris.",
    objective: { kind: 'naissanceDe', species: ['loup', 'taureau'] }, reward: { coins: 1500 },
  },
  {
    id: 'hist-dix-especes', title: 'Possède les 10 espèces', giver: MARGAUX,
    text: "Un parc complet, avec toutes les espèces de la région : voilà mon rêve. Aide-moi à le réaliser !",
    objective: { kind: 'especes', n: 10 }, reward: { coins: 3000 },
  },
  {
    id: 'hist-habitants-150', title: 'Atteins 250 habitants', giver: MARGAUX, gate: 'fin',
    text: "Dernière étape : 250 habitants, et Clairbois sera la plus belle ville de la région. Toute la fête sera pour toi !",
    objective: { kind: 'habitants', n: 250 }, reward: { coins: 5000 },
  },
]

export const STORY_DONE_MESSAGE = 'Toutes les missions sont faites, merci ! De nouvelles aventures arriveront bientôt.'

/** Condition pour qu'une quotidienne puisse être tirée. */
export type DailyCondition = 'toujours' | 'ferme' | 'animalVendable' | 'couple' | 'malade' | 'vaccinable'

/**
 * Une quotidienne du pool. `{n}` dans le titre est remplacé par la cible ; `titleOne` sert quand la cible est 1.
 * `target` donne la cible d'après l'état du parc, `reward` la récompense d'après l'état du parc et la cible.
 * Le tirage garde la cible et la récompense avec la mission (`MissionProgress.n` / `.reward`) : elles ne changent plus de la journée.
 * L'objectif sert de modèle : son `n` est remplacé par la cible tirée.
 */
export type DailyDef = Omit<MissionDef, 'reward'> & {
  possible: DailyCondition
  titleOne?: string
  target: (p: ParkPace) => number
  reward: (p: ParkPace, n: number) => Reward
}

const T = DAILY_TUNING
const nice = (x: number) => niceRound(x)
const atLeast = (min: number, x: number) => Math.max(min, nice(x))
/** Pièces : ~REWARD_HOURS heures de recettes, au moins REWARD_MIN. */
const coinsReward = (p: ParkPace, factor = 1): Reward => ({ coins: Math.max(T.REWARD_MIN, nice(p.coinsPerH * T.REWARD_HOURS * factor)) })
const foodReward = (p: ParkPace, share: number, min: number): number => Math.max(min, nice(p.rationsPerDay * share))
const tradeCount = (p: ParkPace) => (p.animals > T.TRADE_MANY_ABOVE ? T.TRADE_MANY : 1)

export const DAILY_POOL: DailyDef[] = [
  {
    id: 'quot-nettoyer', title: 'Nettoie {n} fois', giver: MARGAUX, possible: 'toujours',
    text: 'Un parc propre, des animaux contents !', objective: { kind: 'compteur', stat: 'nettoyages', n: 2 },
    target: (p) => Math.min(T.CLEAN_MAX, Math.max(T.CLEAN_MIN, p.enclosures)),
    reward: (p) => coinsReward(p),
  },
  {
    id: 'quot-visiteurs', title: 'Accueille {n} visiteurs', giver: MARGAUX, possible: 'toujours',
    text: "Fais venir du monde au parc aujourd'hui.", objective: { kind: 'compteur', stat: 'visiteurs', n: 50 },
    target: (p) => atLeast(T.MIN_VISITORS, p.visitorsPerH * T.VISITORS_HOURS),
    reward: (p) => coinsReward(p),
  },
  {
    id: 'quot-rations', title: 'Achète {n} rations', giver: FERMIER, possible: 'ferme',
    text: "Le garde-manger a toujours besoin d'être rempli.", objective: { kind: 'compteurs', stats: ['fourrageAchete', 'viandeAchetee'], n: 30 },
    target: (p) => atLeast(T.MIN_RATIONS, p.rationsPerDay * T.RATIONS_DAY_SHARE),
    reward: (p) => ({ fourrage: foodReward(p, T.FOOD_DAY_SHARE, T.FOOD_MIN) }),
  },
  {
    id: 'quot-vendre', title: 'Vends {n} animaux', titleOne: 'Vends un animal', giver: MARGAUX, possible: 'animalVendable',
    text: 'Un animal en trop ? Le marchand te le rachète.', objective: { kind: 'compteur', stat: 'ventes', n: 1 },
    target: tradeCount,
    reward: (p) => coinsReward(p),
  },
  {
    id: 'quot-achat', title: 'Achète {n} animaux', titleOne: 'Achète un animal', giver: MARGAUX, possible: 'toujours',
    text: 'Un nouveau pensionnaire fera plaisir aux visiteurs.', objective: { kind: 'compteur', stat: 'achatsAnimaux', n: 1 },
    target: tradeCount,
    reward: (p) => coinsReward(p, T.COSTLY_FACTOR),
  },
  {
    id: 'quot-naissance', title: 'Une naissance au parc', giver: GARDE, possible: 'couple',
    text: 'Avec un couple adulte, un petit peut arriver.', objective: { kind: 'compteur', stat: 'naissances', n: 1 },
    target: () => 1,
    reward: (p) => ({ ...coinsReward(p, T.COSTLY_FACTOR), fourrage: foodReward(p, T.BIRTH_FOOD_DAY_SHARE, T.BIRTH_FOOD_MIN) }),
  },
  {
    id: 'quot-pieces', title: 'Gagne {n} pièces', giver: MARGAUX, possible: 'toujours',
    text: 'Les recettes du jour comptent !', objective: { kind: 'compteur', stat: 'piecesGagnees', n: 300 },
    target: (p) => atLeast(T.MIN_COINS, p.coinsPerH * T.COINS_HOURS),
    reward: (p) => coinsReward(p),
  },
  {
    id: 'quot-soin', title: 'Fais soigner un animal', giver: GARDE, possible: 'malade',
    text: 'Un animal malade attend le vétérinaire au centre.', objective: { kind: 'compteur', stat: 'soins', n: 1 },
    target: () => 1,
    reward: (p) => coinsReward(p),
  },
  {
    id: 'quot-vacciner', title: 'Vaccine un enclos', giver: GARDE, possible: 'vaccinable',
    text: 'Protège un enclos de la grippe au centre vétérinaire.', objective: { kind: 'compteur', stat: 'vaccinations', n: 1 },
    target: () => 1,
    reward: (p) => coinsReward(p),
  },
]

/**
 * Anciennes quotidiennes (parties v3 : identifiant « quot-pieces#2 », sans cible ni récompense gardées).
 * Valeurs figées, ne plus y toucher : cible et récompense × niveau du village (la cible seulement si `targetScale`).
 */
export const DAILY_LEGACY: Record<string, { n: number; reward: Reward; targetScale?: boolean }> = {
  'quot-nettoyer': { n: 2, reward: { coins: 30 } },
  'quot-visiteurs': { n: 50, reward: { coins: 40 }, targetScale: true },
  'quot-rations': { n: 30, reward: { fourrage: 15 } },
  'quot-vendre': { n: 1, reward: { coins: 50 } },
  'quot-achat': { n: 1, reward: { coins: 40 } },
  'quot-naissance': { n: 1, reward: { coins: 50, fourrage: 10 } },
  'quot-pieces': { n: 300, reward: { coins: 30 }, targetScale: true },
  'quot-soin': { n: 1, reward: { coins: 30 } },
}
