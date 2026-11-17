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
export type HighlightId = 'detailsEnclos' | 'ferme' | 'nettoyer' | 'billet' | 'emplacementLibre' | 'prairie' | 'marchand' | 'autonomie'

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

const MARGAUX = 'Margaux, la maire'
const FERMIER = 'Le fermier'
const AUBERGISTE = "L'aubergiste"
const GARDE = 'La garde forestière'

/** Les 9 premiers pas avec Margaux, dans l'ordre. */
export const TUTORIAL: MissionDef[] = [
  {
    id: 'pas-fiche', title: "Ouvre la fiche de l'enclos des moutons", giver: MARGAUX, highlight: 'detailsEnclos',
    text: "Bienvenue à Clairbois, je suis Margaux, la maire ! Touche l'enclos des moutons, puis le bouton Détails pour voir qui y vit.",
    objective: { kind: 'compteur', stat: 'ficheEnclosVue', n: 1 }, reward: { coins: 20 },
  },
  {
    id: 'pas-fourrage', title: 'Achète 20 fourrages à la ferme', giver: MARGAUX, highlight: 'ferme',
    text: 'Tes animaux mangent tous les jours. Touche la ferme, puis achète du fourrage pour remplir le garde-manger.',
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
    id: 'pas-enclos', title: 'Pose un deuxième enclos dans la prairie', giver: MARGAUX, highlight: 'prairie',
    text: "Il faut de la place pour de nouveaux animaux. Touche la prairie et dessine un deuxième enclos.",
    objective: { kind: 'enclos', biome: 'prairie', n: 2 }, reward: { coins: 150 },
  },
  {
    id: 'pas-cochons', title: 'Achète un couple de cochons', giver: MARGAUX, highlight: 'marchand',
    text: 'Pour avoir des petits, il faut un mâle et une femelle. Va chez le marchand, achète une truie et un verrat adultes et mets-les dans ton nouvel enclos.',
    objective: { kind: 'couple', species: 'cochon' }, reward: { coins: 100 },
  },
  {
    id: 'pas-gestation', title: 'Attends la première gestation', giver: MARGAUX,
    text: "Pour qu'une femelle attende un petit, il faut un mâle et une femelle adultes, de la place dans l'enclos, et des animaux heureux et bien nourris. Sois patient, ça vient tout seul !",
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
export const STORY: MissionDef[] = [
  {
    id: 'hist-naissance', title: 'Première naissance au parc', giver: MARGAUX,
    text: "Un parc vit quand les petits arrivent. Prends soin de tes couples et attends ta première naissance.",
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
    id: 'hist-habitants-100', title: 'Atteins 100 habitants', giver: MARGAUX, gate: 3,
    text: "Clairbois grandit ! À 100 habitants, nous pourrons devenir un bourg. Construis, améliore et accueille du monde.",
    objective: { kind: 'habitants', n: 100 }, reward: { coins: 1000 },
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
    id: 'hist-habitants-150', title: 'Atteins 150 habitants', giver: MARGAUX, gate: 'fin',
    text: "Dernière étape : 150 habitants, et Clairbois sera la plus belle ville de la région. Toute la fête sera pour toi !",
    objective: { kind: 'habitants', n: 150 }, reward: { coins: 5000 },
  },
]

export const STORY_DONE_MESSAGE = 'Toutes les missions sont faites, merci ! De nouvelles aventures arriveront bientôt.'

/** Condition pour qu'une quotidienne puisse être tirée. */
export type DailyCondition = 'toujours' | 'ferme' | 'animalVendable' | 'couple' | 'malade'

/**
 * Une quotidienne du pool. `{n}` dans le titre est remplacé par la cible.
 * `scale` : la récompense est multipliée par le niveau du village ; `targetScale` : la cible aussi.
 * Le niveau est retenu dans l'identifiant tiré (« quot-pieces#2 ») pour que la mission ne change pas en cours de journée.
 */
export type DailyDef = MissionDef & { possible: DailyCondition; scale: boolean; targetScale?: boolean }

export const DAILY_POOL: DailyDef[] = [
  {
    id: 'quot-nettoyer', title: 'Nettoie {n} fois', giver: MARGAUX, possible: 'toujours', scale: true,
    text: 'Un parc propre, des animaux contents !', objective: { kind: 'compteur', stat: 'nettoyages', n: 2 }, reward: { coins: 30 },
  },
  {
    id: 'quot-visiteurs', title: 'Accueille {n} visiteurs', giver: MARGAUX, possible: 'toujours', scale: true, targetScale: true,
    text: "Fais venir du monde au parc aujourd'hui.", objective: { kind: 'compteur', stat: 'visiteurs', n: 50 }, reward: { coins: 40 },
  },
  {
    id: 'quot-rations', title: 'Achète {n} rations', giver: FERMIER, possible: 'ferme', scale: true,
    text: "Le garde-manger a toujours besoin d'être rempli.", objective: { kind: 'compteurs', stats: ['fourrageAchete', 'viandeAchetee'], n: 30 }, reward: { fourrage: 15 },
  },
  {
    id: 'quot-vendre', title: 'Vends un animal', giver: MARGAUX, possible: 'animalVendable', scale: true,
    text: 'Un animal en trop ? Le marchand te le rachète.', objective: { kind: 'compteur', stat: 'ventes', n: 1 }, reward: { coins: 50 },
  },
  {
    id: 'quot-achat', title: 'Achète un animal', giver: MARGAUX, possible: 'toujours', scale: true,
    text: 'Un nouveau pensionnaire fera plaisir aux visiteurs.', objective: { kind: 'compteur', stat: 'achatsAnimaux', n: 1 }, reward: { coins: 40 },
  },
  {
    id: 'quot-naissance', title: 'Une naissance au parc', giver: GARDE, possible: 'couple', scale: true,
    text: 'Avec un couple adulte, un petit peut arriver.', objective: { kind: 'compteur', stat: 'naissances', n: 1 }, reward: { coins: 50, fourrage: 10 },
  },
  {
    id: 'quot-pieces', title: 'Gagne {n} pièces', giver: MARGAUX, possible: 'toujours', scale: true, targetScale: true,
    text: 'Les recettes du jour comptent !', objective: { kind: 'compteur', stat: 'piecesGagnees', n: 300 }, reward: { coins: 30 },
  },
  {
    id: 'quot-soin', title: 'Soigne un animal', giver: GARDE, possible: 'malade', scale: true,
    text: 'Un animal malade a besoin de toi.', objective: { kind: 'compteur', stat: 'soins', n: 1 }, reward: { coins: 30 },
  },
]
