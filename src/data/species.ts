/** Les 10 espèces de la V1 (spec §3). Données seules : aucune logique ici. */
export type SpeciesId = 'mouton' | 'cochon' | 'ane' | 'alpaga' | 'renard' | 'cerf' | 'cheval' | 'lama' | 'taureau' | 'loup'
export type Biome = 'prairie' | 'foret' | 'montagne'
export type Food = 'fourrage' | 'viande'

export interface Species {
  id: SpeciesId
  name: string
  biome: Biome
  /** Prix d'un adulte au marchand. */
  price: number
  gestationH: number
  litter: [number, number]
  appeal: number
  /** Aliments acceptés, par ordre de préférence. */
  diet: Food[]
  rationsPerDay: number
  spaceM2: number
  social: boolean
}

const s = (id: SpeciesId, name: string, biome: Biome, price: number, gestationH: number, litter: [number, number],
  appeal: number, diet: Food[], rationsPerDay: number, spaceM2: number, social: boolean): Species =>
  ({ id, name, biome, price, gestationH, litter, appeal, diet, rationsPerDay, spaceM2, social })

export const SPECIES: Record<SpeciesId, Species> = {
  mouton: s('mouton', 'Mouton', 'prairie', 120, 2, [1, 2], 1, ['fourrage'], 1, 20, true),
  cochon: s('cochon', 'Cochon', 'prairie', 150, 3, [2, 4], 1, ['fourrage', 'viande'], 2, 15, true),
  ane: s('ane', 'Âne', 'prairie', 400, 8, [1, 1], 2, ['fourrage'], 3, 30, false),
  alpaga: s('alpaga', 'Alpaga', 'prairie', 600, 10, [1, 1], 2, ['fourrage'], 3, 25, true),
  renard: s('renard', 'Renard roux', 'foret', 700, 6, [2, 4], 2, ['viande'], 1, 12, false),
  cerf: s('cerf', 'Cerf', 'foret', 1200, 12, [1, 1], 3, ['fourrage'], 3, 40, false),
  cheval: s('cheval', 'Cheval sauvage', 'foret', 1500, 14, [1, 1], 3, ['fourrage'], 4, 50, false),
  lama: s('lama', 'Lama', 'montagne', 900, 10, [1, 1], 2, ['fourrage'], 3, 25, true),
  taureau: s('taureau', 'Taureau des montagnes', 'montagne', 2000, 18, [1, 1], 3, ['fourrage'], 5, 50, false),
  loup: s('loup', 'Loup gris', 'montagne', 2500, 16, [2, 4], 4, ['viande'], 3, 30, true),
}
