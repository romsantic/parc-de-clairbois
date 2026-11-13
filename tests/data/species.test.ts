import { describe, it, expect } from 'vitest'
import { SPECIES } from '../../src/data/species'
import { ANIMAL_NAMES } from '../../src/data/names'

describe('SPECIES', () => {
  it('chaque espèce porte sa propre clé', () => {
    for (const [k, s] of Object.entries(SPECIES)) expect(s.id).toBe(k)
    expect(Object.keys(SPECIES)).toHaveLength(10)
  })
  it('reprend les valeurs de la spec pour le mouton', () => {
    const m = SPECIES.mouton
    expect(m.price).toBe(120)
    expect(m.gestationH).toBe(2)
    expect(m.litter).toEqual([1, 2])
    expect(m.rationsPerDay).toBe(1)
    expect(m.spaceM2).toBe(20)
    expect(m.biome).toBe('prairie')
    expect(m.social).toBe(true)
  })
  it('régimes : loup à la viande, cochon aux deux', () => {
    expect(SPECIES.loup.diet).toEqual(['viande'])
    expect(SPECIES.cochon.diet).toEqual(['fourrage', 'viande'])
  })
  it('les espèces sociales sont exactement mouton, cochon, loup, alpaga, lama', () => {
    const social = Object.values(SPECIES).filter((s) => s.social).map((s) => s.id).sort()
    expect(social).toEqual(['alpaga', 'cochon', 'lama', 'loup', 'mouton'])
  })
})

describe('ANIMAL_NAMES', () => {
  it('contient 60 prénoms sans doublon', () => {
    expect(ANIMAL_NAMES).toHaveLength(60)
    expect(new Set(ANIMAL_NAMES).size).toBe(60)
  })
})
