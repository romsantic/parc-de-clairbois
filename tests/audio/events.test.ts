import { describe, it, expect } from 'vitest'
import { cryFor, effectForAction, doneMissionIds, missionJustDone, FAILED_EFFECT } from '../../src/audio/events'
import { SOUNDS } from '../../src/assets/sounds'
import { SPECIES } from '../../src/data/species'
import type { GameState } from '../../src/sim/types'

const mp = (id: string, done: boolean) => ({ id, base: 0, done, claimed: false })
const state = (cur: ReturnType<typeof mp> | null, daily: ReturnType<typeof mp>[] = []) =>
  ({ missions: { tutorial: { step: 0, current: cur, skipped: false }, story: { index: 0, current: null }, daily: { list: daily } } }) as unknown as GameState

describe('effets', () => {
  it('cris : six espèces, les autres n\'en ont pas, toujours un fichier connu', () => {
    const withCry = Object.keys(SPECIES).filter((s) => cryFor(s as keyof typeof SPECIES))
    expect(withCry.sort()).toEqual(['ane', 'cheval', 'cochon', 'loup', 'mouton', 'taureau'])
    for (const s of withCry) expect(SOUNDS).toHaveProperty(cryFor(s as keyof typeof SPECIES)!)
    expect(cryFor('alpaga')).toBeNull()
    expect(cryFor(null)).toBeNull()
  })
  it('sons des actions', () => {
    expect(effectForAction({ type: 'recuperer', track: 'tutoriel' })?.key).toBe('pieces')
    expect(effectForAction({ type: 'vendre', animalId: 1 })?.key).toBe('pieces')
    expect(effectForAction({ type: 'ameliorer', slot: 0 })?.key).toBe('construction')
    expect(effectForAction({ type: 'nettoyer', encId: 1 })?.key).toBe('clic')
    expect(effectForAction({ type: 'vu', what: 'autonomie' })).toBeNull()
    expect(FAILED_EFFECT.key).toBe('clic')
    expect(FAILED_EFFECT.gain).toBeLessThan(1)
  })
  it('mission réussie : détectée une seule fois', () => {
    const a = doneMissionIds(state(mp('m1', false), [mp('d1', true)]))
    const b = doneMissionIds(state(mp('m1', true), [mp('d1', true)]))
    expect(missionJustDone(a, b)).toBe(true)
    expect(missionJustDone(b, b)).toBe(false)
    expect(missionJustDone(b, a)).toBe(false)
  })
})
