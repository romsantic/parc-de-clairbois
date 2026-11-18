import { describe, it, expect } from 'vitest'
import { clamp01, defaultSettings, parseSettings, setVolume, setMuted, effectiveVolume, loadSettings, saveSettings } from '../../src/audio/settings'
import { AUDIO_TUNING } from '../../src/data/audio'

describe('réglages du son', () => {
  it('valeurs de départ : musique 40 %, effets 70 %, rien de coupé', () => {
    const d = defaultSettings()
    expect(d.music).toEqual({ volume: 0.4, muted: false })
    expect(d.effects).toEqual({ volume: 0.7, muted: false })
  })
  it('volumes bornés entre 0 et 1', () => {
    expect(clamp01(-3)).toBe(0)
    expect(clamp01(7)).toBe(1)
    expect(clamp01(NaN)).toBe(0)
    expect(setVolume(defaultSettings(), 'music', 5).music.volume).toBe(1)
    expect(setVolume(defaultSettings(), 'effects', -1).effects.volume).toBe(0)
  })
  it('couper puis rétablir garde le volume choisi', () => {
    let s = setVolume(defaultSettings(), 'music', 0.25)
    s = setMuted(s, 'music', true)
    expect(effectiveVolume(s.music)).toBe(0)
    s = setMuted(s, 'music', false)
    expect(effectiveVolume(s.music)).toBe(0.25)
  })
  it('couper la musique ne touche pas les effets', () => {
    const s = setMuted(defaultSettings(), 'music', true)
    expect(effectiveVolume(s.effects)).toBe(0.7)
  })
  it('réglage illisible ou absent : valeurs de départ', () => {
    for (const bad of [null, '', '{pas du json', '42', 'null', '[]']) expect(parseSettings(bad)).toEqual(defaultSettings())
  })
  it('réglage incomplet ou faux : champs par défaut, volumes bornés', () => {
    const s = parseSettings(JSON.stringify({ music: { volume: 9, muted: 'oui' }, effects: 'x' }))
    expect(s.music).toEqual({ volume: 1, muted: false })
    expect(s.effects).toEqual(defaultSettings().effects)
  })
  it('aller-retour dans le stockage', () => {
    const mem: Record<string, string> = {}
    const store = { getItem: (k: string) => mem[k] ?? null, setItem: (k: string, v: string) => { mem[k] = v } }
    const s = setMuted(setVolume(defaultSettings(), 'effects', 0.1), 'music', true)
    saveSettings(store, s)
    expect(loadSettings(store)).toEqual(s)
    expect(Object.keys(mem)).toEqual([AUDIO_TUNING.STORAGE_KEY])
  })
  it('stockage qui refuse ou absent : jamais d\'erreur', () => {
    const boom = { getItem() { throw new Error('x') }, setItem() { throw new Error('x') } }
    expect(loadSettings(boom)).toEqual(defaultSettings())
    expect(() => saveSettings(boom, defaultSettings())).not.toThrow()
    expect(loadSettings(null)).toEqual(defaultSettings())
    expect(() => saveSettings(null, defaultSettings())).not.toThrow()
  })
})
