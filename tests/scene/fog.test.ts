import { describe, it, expect } from 'vitest'
import { FOG_DISSOLVE_S, fogOpacity, zoneSignText, labelCanvasWidth, labelWorldWidth, fogAmplitude } from '../../src/scene/fog'
import { ZONES } from '../../src/data/zones'

const zone = (id: string) => ZONES.find((z) => z.id === id)!

describe('brume : opacité', () => {
  it('dure 3 secondes', () => expect(FOG_DISSOLVE_S).toBe(3))
  it('pleine tant que la zone est fermée', () => expect(fogOpacity(false, 0)).toBe(1))
  it('décroît pendant la dissipation, jusqu\'à 0', () => {
    expect(fogOpacity(true, 0)).toBe(1)
    const mid = fogOpacity(true, 1.5)
    expect(mid).toBeGreaterThan(0)
    expect(mid).toBeLessThan(1)
    expect(fogOpacity(true, 1)).toBeGreaterThan(fogOpacity(true, 2))
    expect(fogOpacity(true, 3)).toBe(0)
    expect(fogOpacity(true, 10)).toBe(0)
  })
})

describe('brume : panneau', () => {
  it('forêt fermée : nom caché et niveau', () => {
    expect(zoneSignText(zone('foret'), 1)).toBe("Bois sombre · s'ouvre au Village")
  })
  it('montagne fermée', () => {
    expect(zoneSignText(zone('montagne'), 2)).toBe("Falaises · s'ouvre au Bourg")
  })
  it('zone ouverte : vrai nom', () => {
    expect(zoneSignText(zone('foret'), 2)).toBe('Forêt')
    expect(zoneSignText(zone('montagne'), 3)).toBe('Montagne')
    expect(zoneSignText(zone('prairie'), 1)).toBe('Prairie')
  })
})

describe('panneau : taille', () => {
  it('le canevas contient toujours le texte avec marge', () => {
    expect(labelCanvasWidth(600)).toBeGreaterThanOrEqual(600 + 2 * 44)
    expect(labelCanvasWidth(10)).toBe(256)
  })
  it('garde les proportions du canevas', () => {
    expect(labelWorldWidth(512, 2)).toBe(8)
    expect(labelWorldWidth(768, 2)).toBe(12)
  })
})

describe('fogAmplitude', () => {
  it('ne laisse pas le centre d\'une tache sortir de sa zone', () => {
    const rect = { x: 10, z: 0, w: 20, d: 10 }
    expect(fogAmplitude(rect, 12, 5)).toBe(2)
    expect(fogAmplitude(rect, 29, 5)).toBe(1)
    expect(fogAmplitude(rect, 20, 3)).toBe(3)
  })
})
