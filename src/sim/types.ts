import type { Biome, SpeciesId } from '../data/species'

/** Rectangle au sol, en mètres : coin nord-ouest (x, z) + largeur (w) et profondeur (d). */
export interface Rect { x: number; z: number; w: number; d: number }

export interface PathPoint { x: number; z: number }
/** Un tronçon de chemin droit ; id -1 réservé à l'entrée (non sauvegardée). */
export interface PathSegment { id: number; a: PathPoint; b: PathPoint }

export interface Enclosure {
  id: number
  biome: Biome
  species: SpeciesId | null
  rect: Rect
  /** Dernier nettoyage (ms). */
  cleanedAt: number
}

/** Santé : un seul type de maladie en V1, extensible en V2 (centre vétérinaire). */
export type Health = { status: 'ok' } | { status: 'malade'; since: number }

export interface Animal {
  id: number
  species: SpeciesId
  sex: 'F' | 'M'
  name: string
  bornAt: number
  enclosureId: number
  /** Dernier pas où il a eu sa part de nourriture. */
  lastFedAt: number
  health: Health
  pregnantSince: number | null
  /** Dernière naissance (ms) : sert au repos après une portée. */
  lastBirthAt: number | null
}

export type BuildingType = 'ferme' | 'cafe' | 'boutique' | 'auberge'
export interface Building { slot: number; type: BuildingType; level: 1 | 2 | 3 }

/** Un animal proposé par le marchand. */
export interface Offer { id: number; species: SpeciesId; sex: 'F' | 'M'; stage: 'jeune' | 'adulte'; price: number }
export interface Merchant { restockAt: number; restocks: number; offers: Offer[] }

/** Niveau du village (1 Hameau, 2 Village, 3 Bourg) et clients servis depuis le début. */
export interface Village { level: 1 | 2 | 3; clientsServed: number }

export interface Pantry { fourrage: number; viande: number; capacity: number }

/** Compteurs cumulés depuis le début de la partie : les missions en mesurent la différence. */
export type StatKey = 'nettoyages' | 'fourrageAchete' | 'viandeAchetee' | 'ventes' | 'achatsAnimaux' | 'naissances' | 'gestations'
  | 'visiteurs' | 'piecesGagnees' | 'soins' | 'billetsRegles' | 'ficheEnclosVue' | 'autonomieVue' | 'ameliorations'
export interface Stats { counts: Record<StatKey, number>; birthsBySpecies: Partial<Record<SpeciesId, number>> }

/** Avancée d'une mission : `base` = valeur du compteur au début ; `done` = réussie ; `claimed` = récompense récupérée. */
export interface MissionProgress {
  id: string; base: number; done: boolean; claimed: boolean
  /** Quotidienne : cible et récompense tirées à minuit (absentes dans les anciennes parties, dont l'id porte « #niveau »). */
  n?: number
  reward?: { coins?: number; fourrage?: number; viande?: number }
}
export interface MissionsState {
  /** step de 0 à 9 (9 = fini). */
  tutorial: { step: number; current: MissionProgress | null; skipped: boolean }
  story: { index: number; current: MissionProgress | null }
  daily: { dayKey: number; list: MissionProgress[]; streak: number; lastFullDay: number | null; coupons: number }
  /** Une nouvelle mission n'a pas encore été lue (« ! »). */
  unread: boolean
}

export type JobId = 'soigneur' | 'entretien' | 'veterinaire' | 'fermier' | 'animateur'
export type StaffLevel = 1 | 2 | 3 | 4 | 5
/** Un employé ; son niveau se déduit de xpH (jamais stocké). */
export interface Employee { id: number; name: string; job: JobId; xpH: number; hiredAt: number; encIds: number[] }
export interface Candidate { id: number; name: string; job: JobId; level: StaffLevel }
export interface Staff {
  employees: Employee[]
  candidates: Candidate[]
  renewAt: number
  renewals: number
  /** Jour du dernier salaire noté ; -1 : pas encore de jour noté (le premier pas note le jour sans payer). */
  payDay: number
  /** Jusqu'à cette heure du jeu, tous les animaux comptent comme suivis. */
  coverAllUntil: number
}

export interface GameState {
  version: 5
  /** Heure du jeu (ms), toujours alignée sur le pas de 10 minutes. */
  time: number
  /** Graine du hasard, sauvegardée avec la partie. */
  rng: number
  coins: number
  nextId: number
  pantry: Pantry
  enclosures: Enclosure[]
  animals: Animal[]
  ticketPrice: number
  /** De 0 à 1. */
  reputation: number
  village: Village
  buildings: Building[]
  merchant: Merchant
  totalVisitors: number
  stats: Stats
  missions: MissionsState
  /** Décalage de l'heure locale par rapport à UTC, en minutes (réglé par la session au chargement). */
  utcOffsetMin: number
  /** Chemins construits par le joueur (l'entrée n'en fait pas partie). */
  paths: PathSegment[]
  staff: Staff
}

export type GameEvent =
  | { kind: 'naissance'; at: number; animalId: number; motherId: number }
  | { kind: 'malade'; at: number; animalId: number; cause: 'faim' | 'saleté' }
  | { kind: 'mort'; at: number; animalId: number; name: string; species: SpeciesId }
  | { kind: 'gestation'; at: number; animalId: number }
  | { kind: 'repas'; at: number; fourrage: number; viande: number }
  | { kind: 'recettes'; at: number; visiteurs: number; billets: number; village: number }
  | { kind: 'stock'; at: number }
  | { kind: 'mission'; at: number; track: 'tutoriel' | 'histoire' | 'quotidienne'; id: string; title?: string }
  | { kind: 'quotidiennes'; at: number }
  /** Salaires de minuit : dus, et réellement payés (la dette est plafonnée à une journée). */
  | { kind: 'paie'; at: number; due: number; paid: number }
  | { kind: 'niveauEmploye'; at: number; employeeId: number; name: string; level: StaffLevel }
  | { kind: 'candidats'; at: number }
  /** Une quotidienne réussie et non récupérée a été versée d'office à minuit. */
  | { kind: 'missionVersee'; at: number; id: string; title?: string }
