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

const NO_3D = 'Ton navigateur ne peut pas afficher la 3D. Essaie avec une version récente de Chrome, Firefox ou Edge.'

async function start(): Promise<void> {
  const canvas = document.querySelector<HTMLCanvasElement>('#monde')
  if (!canvas) return
  if (!WebGL.isWebGL2Available()) {
    showError(NO_3D)
    return
  }
  const loading = showLoading('Chargement du parc…')
  const hideLoading = () => loading.hide()
  try {
    const models = await loadModels(Object.keys(MODELS) as ModelKey[], undefined, (done, total) =>
      loading.update(`Chargement du parc… ${Math.round((done / total) * 100)} %`),
    )
    let world: ReturnType<typeof createWorld>
    try {
      world = createWorld(canvas, models)
    } catch (e) {
      // Carte graphique refusée par le navigateur alors que la 3D semblait disponible.
      console.error(e)
      hideLoading()
      showError(NO_3D)
      return
    }
    // Onglet mis en veille sur téléphone, pilote graphique qui redémarre…
    canvas.addEventListener('webglcontextlost', (ev) => {
      ev.preventDefault()
      showError("L'affichage 3D a été interrompu par l'appareil. Recharge la page pour retrouver ton parc.")
    })
    const testScene = buildTestScene(world, createRng(2026))
    const rig = createCameraRig(world, canvas)
    mountCameraButtons(rig)
    window.addEventListener('resize', () => world.resize())
    hideLoading()
    let last = performance.now()
    const frame = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000)
      last = now
      try {
        rig.update(dt)
        world.update(dt)
        testScene.update(dt)
        world.renderer.render(world.scene, world.camera)
      } catch (e) {
        // Plutôt qu'une scène figée sans explication : on s'arrête et on le dit.
        console.error(e)
        showError("Le parc a rencontré un problème et s'est arrêté. Recharge la page.")
        return
      }
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
