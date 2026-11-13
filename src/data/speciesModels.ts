import type { SpeciesId } from './species'
import type { ModelKey } from '../assets/manifest'

/** Modèle 3D de chaque espèce (femelle / mâle) et taille d'un adulte, en mètres. */
export const SPECIES_MODELS: Record<SpeciesId, { female: ModelKey; male: ModelKey; height: number }> = {
  mouton: { female: 'mouton', male: 'mouton', height: 1.4 },
  cochon: { female: 'cochon', male: 'cochon', height: 1.1 },
  ane: { female: 'ane', male: 'ane', height: 2.1 },
  alpaga: { female: 'alpaga', male: 'alpaga', height: 2.4 },
  renard: { female: 'renard', male: 'renard', height: 1.0 },
  cerf: { female: 'biche', male: 'cerf', height: 2.3 },
  cheval: { female: 'chevalBlanc', male: 'cheval', height: 2.5 },
  lama: { female: 'lama', male: 'lama', height: 2.3 },
  taureau: { female: 'vache', male: 'taureau', height: 2.3 },
  loup: { female: 'loup', male: 'loup', height: 1.3 },
}
