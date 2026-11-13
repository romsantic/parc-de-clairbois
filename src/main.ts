import './style.css'
import WebGL from 'three/examples/jsm/capabilities/WebGL.js'
import { MODELS, type ModelKey } from './assets/manifest'
import { loadModels, AssetLoadError } from './scene/loadModels'
import { createWorld } from './scene/world'
import { showError, showLoading } from './ui/errorScreen'
import { createCameraRig } from './scene/cameraRig'
import { mountCameraButtons } from './ui/cameraButtons'
import { buildTestScene } from './scene/testScene'
import { createRng } from './core/rng'

async function start(): Promise<void> {
  const canvas = document.querySelector<HTMLCanvasElement>('#monde')
  if (!canvas) return
  if (!WebGL.isWebGL2Available()) {
    showError('Ton navigateur ne peut pas afficher la 3D. Essaie avec une version récente de Chrome, Firefox ou Edge.')
    return
  }
  const hideLoading = showLoading('Chargement du parc…')
  try {
    const models = await loadModels(Object.keys(MODELS) as ModelKey[])
    const world = createWorld(canvas, models)
    const testScene = buildTestScene(world, createRng(2026))
    const rig = createCameraRig(world, canvas)
    mountCameraButtons(rig)
    window.addEventListener('resize', () => world.resize())
    hideLoading()
    let last = performance.now()
    const frame = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000)
      last = now
      rig.update(dt)
      world.update(dt)
      testScene.update(dt)
      world.renderer.render(world.scene, world.camera)
      requestAnimationFrame(frame)
    }
    requestAnimationFrame(frame)
  } catch (e) {
    hideLoading()
    if (e instanceof AssetLoadError) {
      console.error(e, e.cause)
      showError(`Le modèle « ${e.key} » n'a pas pu être chargé. Recharge la page ; si ça continue, le fichier manque dans le projet.`)
    } else {
      console.error(e)
      showError("Le parc n'a pas pu démarrer. Recharge la page.")
    }
  }
}

void start()
