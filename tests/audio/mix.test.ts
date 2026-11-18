import { describe, it, expect } from 'vitest'
import { trimLoop, dayNightMix } from '../../src/audio/mix'
import { AUDIO_TUNING } from '../../src/data/audio'

describe('trimLoop', () => {
  it('retire le silence au début et à la fin', () => {
    const c = new Float32Array(100)
    for (let i = 20; i < 90; i++) c[i] = 0.5
    expect(trimLoop([c], 100)).toEqual({ start: 0.2, end: 0.9 })
  })
  it('regarde tous les canaux', () => {
    const l = new Float32Array(10); const r = new Float32Array(10)
    l[3] = 0.5; r[6] = 0.5
    expect(trimLoop([l, r], 10)).toEqual({ start: 0.3, end: 0.7 })
  })
  it('un souffle sous le seuil est du silence', () => {
    const c = new Float32Array(10).fill(AUDIO_TUNING.LOOP_SILENCE_THRESHOLD / 2)
    c[4] = 1
    expect(trimLoop([c], 10)).toEqual({ start: 0.4, end: 0.5 })
  })
  it('tout silencieux ou vide : durée entière / rien', () => {
    expect(trimLoop([new Float32Array(50)], 10)).toEqual({ start: 0, end: 5 })
    expect(trimLoop([], 10)).toEqual({ start: 0, end: 0 })
  })
})

describe('dayNightMix', () => {
  it('plein jour : jour seul, plein pot', () => {
    const m = dayNightMix(0)
    expect(m.musicDay).toBeCloseTo(1); expect(m.musicNight).toBeCloseTo(0)
    expect(m.ambDay).toBeCloseTo(AUDIO_TUNING.AMBIENCE_LEVEL); expect(m.ambNight).toBeCloseTo(0)
  })
  it('pleine nuit : musique plus douce que le jour, grillons', () => {
    const m = dayNightMix(1)
    expect(m.musicDay).toBeCloseTo(0)
    expect(m.musicNight).toBeCloseTo(AUDIO_TUNING.NIGHT_MUSIC_LEVEL)
    expect(m.musicNight).toBeLessThan(1)
    expect(m.ambNight).toBeCloseTo(AUDIO_TUNING.AMBIENCE_LEVEL)
  })
  it('crépuscule : les deux s\'entendent, sans trou', () => {
    const m = dayNightMix(0.5)
    expect(m.musicDay).toBeGreaterThan(0.5); expect(m.musicNight).toBeGreaterThan(0.3)
  })
  it('valeurs hors bornes ramenées entre 0 et 1', () => {
    expect(dayNightMix(-4)).toEqual(dayNightMix(0))
    expect(dayNightMix(9)).toEqual(dayNightMix(1))
  })
})

import { aliveLoops } from '../../src/audio/mix'
describe('aliveLoops', () => {
  const on = { volume: 0.4, muted: false }
  it('jour : paire du jour seule ; nuit : paire de la nuit seule', () => {
    expect(aliveLoops(0, on).sort()).toEqual(['ambianceJour', 'musiqueJour'])
    expect(aliveLoops(1, on).sort()).toEqual(['ambianceNuit', 'musiqueNuit'])
  })
  it('pendant le fondu : les deux paires', () => expect(aliveLoops(0.5, on)).toHaveLength(4))
  it('musique coupée ou à 0 : rien du tout', () => {
    expect(aliveLoops(0.5, { volume: 0.4, muted: true })).toEqual([])
    expect(aliveLoops(0, { volume: 0, muted: false })).toEqual([])
  })
})
