import type { Biome, SpeciesId } from '../data/species'

/** Rectangle au sol, en mètres : coin nord-ouest (x, z) + largeur (w) et profondeur (d). */
export interface Rect { x: number; z: number; w: number; d: number }

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

export interface GameState {
  version: 2
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
}

export type GameEvent =
  | { kind: 'naissance'; at: number; animalId: number; motherId: number }
  | { kind: 'malade'; at: number; animalId: number; cause: 'faim' | 'saleté' }
  | { kind: 'mort'; at: number; animalId: number; name: string; species: SpeciesId }
  | { kind: 'gestation'; at: number; animalId: number }
  | { kind: 'repas'; at: number; fourrage: number; viande: number }
  | { kind: 'recettes'; at: number; visiteurs: number; billets: number; village: number }
  | { kind: 'stock'; at: number }
