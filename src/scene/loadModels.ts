import type { AnimationClip, Object3D } from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js'
import { MTLLoader } from 'three/examples/jsm/loaders/MTLLoader.js'
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js'
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
  if (url.endsWith('.fbx')) {
    const group = await new FBXLoader().loadAsync(url)
    return { scene: group, animations: group.animations }
  }
  const gltf = await new GLTFLoader().loadAsync(url)
  return { scene: gltf.scene, animations: gltf.animations }
}

export async function loadModels(
  keys: ModelKey[],
  load: (url: string) => Promise<LoadedModel> = loadByExtension,
  onProgress?: (done: number, total: number) => void,
): Promise<Map<ModelKey, LoadedModel>> {
  let done = 0
  const entries = await Promise.all(
    keys.map(async (key) => {
      try {
        const model = await load(modelUrl(key))
        let meshes = 0
        model.scene.traverse((o) => { if ((o as { isMesh?: boolean }).isMesh) meshes++ })
        // Un fichier manquant peut être remplacé par une page web : le modèle est alors vide.
        if (meshes === 0) throw new Error('modèle vide')
        onProgress?.(++done, keys.length)
        return [key, model] as const
      } catch (e) {
        throw new AssetLoadError(key, e)
      }
    }),
  )
  return new Map(entries)
}

const inFlight = new Map<ModelKey, Promise<LoadedModel>>()

/**
 * Charge un modèle à la demande (les animaux d'une espèce qu'on n'a pas encore) et le range
 * dans `models`. Plusieurs demandes simultanées du même modèle n'en font qu'un téléchargement.
 */
export function requestModel(models: Map<ModelKey, LoadedModel>, key: ModelKey, load = loadByExtension): Promise<LoadedModel> {
  const have = models.get(key)
  if (have) return Promise.resolve(have)
  let p = inFlight.get(key)
  if (!p) {
    p = loadModels([key], load).then((m) => { const v = m.get(key)!; models.set(key, v); inFlight.delete(key); return v })
    p.catch(() => inFlight.delete(key))
    inFlight.set(key, p)
  }
  return p
}
