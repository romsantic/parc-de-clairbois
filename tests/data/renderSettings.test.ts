import { describe, it, expect } from 'vitest'
import { renderSettings } from '../../src/data/visuals'
import { VILLAGE_PROPS, MAIRIE } from '../../src/data/village'

describe('réglages d’affichage', () => {
  it('téléphone : image ≤ 1,5 et ombres 1024', () => {
    expect(renderSettings(true, 3)).toEqual({ pixelRatio: 1.5, shadowMapSize: 1024 })
    expect(renderSettings(true, 1).pixelRatio).toBe(1)
  })
  it('ordinateur : image ≤ 2 et ombres 2048', () => {
    expect(renderSettings(false, 3)).toEqual({ pixelRatio: 2, shadowMapSize: 2048 })
    expect(renderSettings(false, 1.25).pixelRatio).toBe(1.25)
  })
  it('un ratio invalide retombe sur 1', () => {
    expect(renderSettings(false, 0).pixelRatio).toBe(1)
  })
})

describe('village', () => {
  it('la mairie est à sa place d’origine', () => {
    expect(MAIRIE).toMatchObject({ key: 'mairie', x: 17, z: -3 })
    expect(VILLAGE_PROPS).toHaveLength(8)
  })
})
