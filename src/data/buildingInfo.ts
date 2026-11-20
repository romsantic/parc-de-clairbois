import type { BuildingType } from '../sim/types'

/** Textes des fiches de bâtiment (volet de la barre du bas). */
export const BUILDING_ROLE: Record<BuildingType, string> = {
  ferme: "La ferme vend le fourrage et la viande qui nourrissent les animaux, et offre un peu de fourrage chaque jour.",
  cafe: "Le café sert une boisson aux visiteurs du parc : une part d'entre eux y passe, et chaque client dépense quelques pièces.",
  boutique: "La boutique vend des souvenirs aux visiteurs ; plus le parc compte d'espèces, plus ils achètent.",
  personnel: "Le personnel y loge : plus elle est grande, plus tu peux embaucher.",
  centreVeto: "Le vétérinaire y soigne les animaux malades que le soigneur a repérés, même quand tu n'es pas là. Plus le centre est grand, plus il soigne de maladies.",
  auberge: "L'auberge loge les visiteurs de passage : peu de clients, mais de gros paniers, et elle attire plus de monde au parc.",
}

export const MAIRIE_INFO = {
  title: 'Mairie de Clairbois — Margaux, la maire',
  role: "Margaux, la maire, veille sur le village : c'est ici que Clairbois grandit et change de niveau.",
  maxLevel: 'Clairbois est un bourg : le niveau maximum.',
  ready: 'Tout est prêt pour passer au niveau suivant.',
  openVillage: 'Ouvrir le volet du village',
}

export const INFO_LABELS = {
  level: 'Niveau',
  income: 'Rapporte',
  clients: 'Clients',
  spend: 'Dépense par client',
  upgrade: 'Amélioration',
  maxLevel: 'Niveau maximum',
  freeFood: 'Fourrage offert',
  discount: 'Remise sur les rations',
  pantry: 'Garde-manger',
  staff: 'Employés',
  villageLevel: 'Village',
  population: 'Habitants',
  next: 'Prochain niveau',
  info: 'Informations',
  treats: 'Soigne',
  vets: 'Vétérinaires',
  quarantine: 'Quarantaine',
  vaccination: 'Vaccination',
  queueTitle: "File d'attente",
}
