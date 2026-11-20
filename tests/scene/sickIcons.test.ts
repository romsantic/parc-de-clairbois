import { describe, expect, it } from 'vitest'
import { sickIconStyle } from '../../src/scene/sickIcons'
import type { Health } from '../../src/sim/types'

const sick = (o: Partial<Extract<Health, { status: 'malade' }>>): Health => ({
  status: 'malade', disease: 'parasites', stage: 1, stageSince: 0, detectedAt: 0, careUntil: null, vetId: null, quarantined: false, ...o,
})

describe('sickIconStyle', () => {
  it('en forme : invisible', () => { expect(sickIconStyle({ status: 'ok' }).visible).toBe(false) })
  it('malade non repéré : invisible', () => { expect(sickIconStyle(sick({ detectedAt: null, stage: 3 })).visible).toBe(false) })
  it('stade 1 : jaune', () => { expect(sickIconStyle(sick({ stage: 1 }))).toEqual({ color: '#e8c12a', visible: true }) })
  it('stade 2 : orange', () => { expect(sickIconStyle(sick({ stage: 2 }))).toEqual({ color: '#e8862a', visible: true }) })
  it('stade 3 : rouge', () => { expect(sickIconStyle(sick({ stage: 3 }))).toEqual({ color: '#d23a2a', visible: true }) })
  it('en soin : bleu, quel que soit le stade', () => { expect(sickIconStyle(sick({ stage: 3, careUntil: 100, vetId: 1 }))).toEqual({ color: '#3b82c4', visible: true }) })
})
