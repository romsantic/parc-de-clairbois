import { describe, it, expect } from 'vitest'
import { SPECIES_MODELS } from '../../src/data/speciesModels'
import { SPECIES } from '../../src/data/species'
import { MODELS } from '../../src/assets/manifest'

describe('SPECIES_MODELS', () => {
  it('chaque espèce a un modèle femelle et mâle existant, et une taille', () => {
    for (const id of Object.keys(SPECIES)) {
      const m = SPECIES_MODELS[id as keyof typeof SPECIES]
      expect(m, id).toBeDefined()
      expect(MODELS[m.female], `${id} femelle`).toBeDefined()
      expect(MODELS[m.male], `${id} mâle`).toBeDefined()
      expect(m.height).toBeGreaterThan(0)
    }
  })
  it('biche et cerf, vache et taureau sont distincts', () => {
    expect(SPECIES_MODELS.cerf).toMatchObject({ female: 'biche', male: 'cerf' })
    expect(SPECIES_MODELS.taureau).toMatchObject({ female: 'vache', male: 'taureau' })
  })
})
