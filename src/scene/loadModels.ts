import type { AnimationClip, Object3D } from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js'
import { MTLLoader } from 'three/examples/jsm/loaders/MTLLoader.js'
import { modelUrl, type ModelKey } from '../assets/manifest'

/** Un modèle chargé, quel que soit son format. */
export interface LoadedModel {
  scene: Object3D
  animations: AnimationClip[]
}

export class AssetLoadError extends Error {
  constructor(public readonly key: ModelKey, cause?: unknown) {
    super(`Modèle introuvable ou illisible : ${key}`, { cause })
    this.name = 'AssetLoadError'
  }
}

/** Chargeur par défaut : glTF pour les animaux, OBJ + MTL pour le décor. */
export async function loadByExtension(url: string): Promise<LoadedModel> {
  if (url.endsWith('.obj')) {
    const materials = await new MTLLoader().loadAsync(url.replace(/\.obj$/, '.mtl'))
    materials.preload()
    const scene = await new OBJLoader().setMaterials(materials).loadAsync(url)
    return { scene, animations: [] }
  }
  const gltf = await new GLTFLoader().loadAsync(url)
  return { scene: gltf.scene, animations: gltf.animations }
}

export async function loadModels(
  keys: ModelKey[],
  load: (url: string) => Promise<LoadedModel> = loadByExtension,
): Promise<Map<ModelKey, LoadedModel>> {
  const entries = await Promise.all(
    keys.map(async (key) => {
      try {
        const model = await load(modelUrl(key))
        let meshes = 0
        model.scene.traverse((o) => { if ((o as { isMesh?: boolean }).isMesh) meshes++ })
        // Un fichier manquant peut être remplacé par une page web : le modèle est alors vide.
        if (meshes === 0) throw new Error('modèle vide')
        return [key, model] as const
      } catch (e) {
        throw new AssetLoadError(key, e)
      }
    }),
  )
  return new Map(entries)
}
