import { describe, it, expect } from 'vitest'
import { BoxGeometry, Group, Mesh } from 'three'
import { loadModels, AssetLoadError, type LoadedModel } from '../../src/scene/loadModels'
import { modelUrl } from '../../src/assets/manifest'

const ok = async (): Promise<LoadedModel> => {
  const g = new Group()
  g.add(new Mesh(new BoxGeometry()))
  return { scene: g, animations: [] }
}

describe('loadModels', () => {
  it('renvoie un modèle par clé', async () => {
    const m = await loadModels(['arbre1', 'maison1'], ok)
    expect([...m.keys()]).toEqual(['arbre1', 'maison1'])
  })
  it('nomme le modèle qui a échoué', async () => {
    const load = async (url: string) => {
      if (url === modelUrl('maison1')) throw new Error('404')
      return ok()
    }
    const err = await loadModels(['arbre1', 'maison1'], load).catch((e: unknown) => e)
    expect(err).toBeInstanceOf(AssetLoadError)
    expect((err as AssetLoadError).key).toBe('maison1')
  })
  it('refuse un modèle vide (fichier remplacé par une page web)', async () => {
    const empty = async (): Promise<LoadedModel> => ({ scene: new Group(), animations: [] })
    const err = await loadModels(['puits'], empty).catch((e: unknown) => e)
    expect(err).toBeInstanceOf(AssetLoadError)
    expect((err as AssetLoadError).key).toBe('puits')
  })
})
