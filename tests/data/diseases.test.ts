import { describe, it, expect } from 'vitest'
import { DISEASES, STAGE_NAMES, HEALTH_TUNING, VET_CENTER } from '../../src/data/diseases'
import { BUILDINGS, SLOTS } from '../../src/data/economy'

describe('données des maladies', () => {
  it('compte 4 maladies, soignées à partir des niveaux 1, 1, 2 et 3 du centre', () => {
    expect(Object.keys(DISEASES)).toEqual(['parasites', 'indigestion', 'blessure', 'grippe'])
    expect(Object.values(DISEASES).map((d) => d.centerLevel)).toEqual([1, 1, 2, 3])
  })
  it('chaque maladie a trois stades de durée positive et une durée de soin positive', () => {
    for (const d of Object.values(DISEASES)) {
      expect(d.stageH).toHaveLength(3)
      for (const h of d.stageH) expect(h).toBeGreaterThan(0)
      expect(d.careH).toBeGreaterThan(0)
    }
    expect(DISEASES.grippe.contagious).toBe(true)
    expect(DISEASES.parasites.contagious).toBe(false)
  })
  it('trois noms de stade', () => {
    expect(STAGE_NAMES).toEqual(['léger', 'grave', 'mortel'])
  })
  it('le centre a des chiffres pour ses 5 niveaux', () => {
    expect(VET_CENTER.PLACES).toHaveLength(5)
    expect(VET_CENTER.QUARANTINE).toHaveLength(5)
    expect(VET_CENTER.SPEED).toHaveLength(5)
    expect(VET_CENTER.SLOT).toBe(7)
    expect(VET_CENTER.CANDIDATE_WEIGHT).toBe(0.2)
    expect(VET_CENTER.LEVEL_SPEEDUP).toBe(0.1)
    expect(HEALTH_TUNING.CARE_PRICE_SHARE).toHaveLength(3)
  })
  it('le centre vétérinaire a 4 améliorations (5 niveaux) et occupe l’emplacement 7', () => {
    expect(BUILDINGS.centreVeto.upgradeCost).toEqual([500, 1200, 2500, 5000])
    expect(BUILDINGS.centreVeto.buildCost).toBe(250)
    expect(SLOTS.find((s) => s.id === VET_CENTER.SLOT)?.only).toBe('centreVeto')
  })
})
