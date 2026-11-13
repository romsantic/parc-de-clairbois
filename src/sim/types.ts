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
}

export interface Pantry { fourrage: number; viande: number; capacity: number }

export interface GameState {
  version: 1
  /** Heure du jeu (ms), toujours alignée sur le pas de 10 minutes. */
  time: number
  /** Graine du hasard, sauvegardée avec la partie. */
  rng: number
  coins: number
  nextId: number
  pantry: Pantry
  enclosures: Enclosure[]
  animals: Animal[]
}

export type GameEvent =
  | { kind: 'naissance'; at: number; animalId: number; motherId: number }
  | { kind: 'malade'; at: number; animalId: number; cause: 'faim' | 'saleté' }
  | { kind: 'mort'; at: number; animalId: number; name: string; species: SpeciesId }
  | { kind: 'gestation'; at: number; animalId: number }
  | { kind: 'repas'; at: number; fourrage: number; viande: number }
