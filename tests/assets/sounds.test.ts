import { describe, it, expect } from 'vitest'
import { existsSync, statSync } from 'node:fs'
import { SOUNDS, soundUrl, type SoundKey } from '../../src/assets/sounds'

describe('SOUNDS', () => {
  it.each(Object.entries(SOUNDS))('%s existe, n\'est pas vide et reste dans son budget', (_k, s) => {
    const file = `public/${s.path}`
    expect(existsSync(file)).toBe(true)
    const size = statSync(file).size
    expect(size).toBeGreaterThan(0)
    expect(size).toBeLessThanOrEqual(s.maxKo * 1024)
  })
  it("n'utilise jamais de chemin absolu (cassé sur GitHub Pages)", () => {
    for (const s of Object.values(SOUNDS)) expect(s.path.startsWith('/')).toBe(false)
  })
  it('construit les URL à partir de BASE_URL', () => {
    const key = Object.keys(SOUNDS)[0] as SoundKey
    expect(soundUrl(key)).toBe(import.meta.env.BASE_URL + SOUNDS[key].path)
  })
})
