import { describe, it, expect } from 'vitest'
import { existsSync } from 'node:fs'
import { MODELS, modelUrl, type ModelKey } from '../../src/assets/manifest'

describe('MODELS', () => {
  it.each(Object.entries(MODELS))('%s existe dans public/', (_k, path) => {
    expect(existsSync(`public/${path}`)).toBe(true)
  })
  it.each(Object.entries(MODELS).filter(([, p]) => p.endsWith('.obj')))(
    '%s a son fichier de matériaux .mtl',
    (_k, path) => {
      expect(existsSync(`public/${path.replace(/\.obj$/, '.mtl')}`)).toBe(true)
    },
  )
  it("n'utilise jamais de chemin absolu (cassé sur GitHub Pages)", () => {
    for (const path of Object.values(MODELS)) expect(path.startsWith('/')).toBe(false)
  })
  it('construit les URL à partir de BASE_URL', () => {
    const key = Object.keys(MODELS)[0] as ModelKey
    expect(modelUrl(key)).toBe(import.meta.env.BASE_URL + MODELS[key])
  })
})
