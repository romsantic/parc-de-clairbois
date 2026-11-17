import './style.css'
import WebGL from 'three/examples/jsm/capabilities/WebGL.js'
import { MODELS, type ModelKey } from './assets/manifest'
import { loadModels, AssetLoadError } from './scene/loadModels'
import { createWorld } from './scene/world'
import { showError, showLoading } from './ui/errorScreen'
import { runGame } from './game/runGame'
import type { Storage } from './save/save'
import { createCameraRig } from './scene/cameraRig'
import { mountCameraButtons } from './ui/cameraButtons'
import { buildDecor } from './scene/decor'
import { createZonesView } from './scene/zonesView'
import { createParkView } from './scene/parkView'
import { createVillageView } from './scene/villageView'
import { createPicker, type Pick } from './scene/picking'
import { mountBottomBar } from './ui/bottomBar'
import { closeDrawer } from './ui/drawer'
import { createEnclosureEditor } from './scene/enclosureEditor'
import { SPECIES_MODELS } from './data/speciesModels'
import { createRng } from './core/rng'
import { setHighlight } from './ui/highlight'
import { highlightFor, markerPosition, markerVisible } from './ui/missionModel'

/** Le stockage du navigateur, ou une mémoire temporaire s'il est bloqué. */
function openStorage(): { store: Storage; ok: boolean } {
  try {
    const ls = window.localStorage
    ls.setItem('parc-clairbois:test', '1')
    ls.removeItem('parc-clairbois:test')
    return { store: ls, ok: true }
  } catch {
    const mem = new Map<string, string>()
    return { store: { getItem: (k) => mem.get(k) ?? null, setItem: (k, v) => { mem.set(k, v) } }, ok: false }
  }
}

const NO_3D ='Ton navigateur ne peut pas afficher la 3D. Essaie avec une version récente de Chrome, Firefox ou Edge.'

async function start(): Promise<void> {
  const canvas = document.querySelector<HTMLCanvasElement>('#monde')
  if (!canvas) return
  // La partie tourne même si la 3D n'est pas disponible : rien n'est perdu.
  // Si le stockage du navigateur est bloqué (navigation privée stricte), on joue sans sauvegarde.
  const { store, ok } = openStorage()
  let game: ReturnType<typeof runGame>
  try {
    game = runGame(store, ok)
  } catch (e) {
    console.error(e)
    showError("La partie n'a pas pu démarrer. Ta sauvegarde n'a pas été modifiée ; recharge la page.")
    return
  }
  if (!game) return // un message a déjà expliqué pourquoi
  const getState = game.get
  if (!WebGL.isWebGL2Available()) {
    showError(NO_3D)
    return
  }
  const loading = showLoading('Chargement du parc…')
  const hideLoading = () => loading.hide()
  try {
    // Au démarrage : le décor et les espèces déjà présentes. Les autres animaux à la demande.
    const animalKeys = new Set<ModelKey>(Object.values(SPECIES_MODELS).flatMap((m) => [m.female, m.male]))
    const needed = new Set<ModelKey>((Object.keys(MODELS) as ModelKey[]).filter((k) => !animalKeys.has(k)))
    for (const a of getState().animals) {
      const m = SPECIES_MODELS[a.species]
      needed.add(a.sex === 'F' ? m.female : m.male)
    }
    const models = await loadModels([...needed], undefined, (done, total) =>
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
    const decor = buildDecor(world, createRng(2026))
    const zones = createZonesView(world)
    let zonesLevel = getState().village.level
    zones.setLevel(zonesLevel)
    decor.setPathLevel(zonesLevel)
    const villageView = createVillageView(world, getState)
    const park = createParkView(world, getState, createRng(Date.now() >>> 0))
    const rig = createCameraRig(world, canvas)
    let selection: Pick = { kind: 'rien' }
    const select = (p: Pick) => {
      selection = p
      park.setSelected(p.kind === 'enclos' ? p.id : null)
      villageView.setSelected(p.kind === 'emplacement' ? p.slot : null)
    }
    const dispatch = game.dispatch
    const editor = createEnclosureEditor(world, canvas, rig, {
      get: getState,
      dispatch,
      onDone: (id) => { select({ kind: 'enclos', id }); bottomBar.refresh() },
    })
    const picker = createPicker(world, canvas, () => park.enclosureMeshes(), () => editor.active(), () => villageView.slotMeshes())
    const bottomBar = mountBottomBar({
      get: getState,
      selection: () => selection,
      dispatch,
      startBuild: (zone, point) => { closeDrawer(); editor.startBuild(zone, point) },
      startResize: (id) => { closeDrawer(); editor.startResize(id) },
      openGazette: game.openGazette,
    })
    picker.onPick((p) => { select(p); bottomBar.refresh(); closeDrawer() }) // un clic sur la carte ferme le volet
    mountCameraButtons(rig)
    // Mission en cours : anneau doré sur le bon bouton, « ! » au-dessus de la cible sur la carte (ou de la mairie).
    const guideTick = () => {
      const s = getState()
      const id = highlightFor(s)
      setHighlight(id)
      decor.setMarker(markerPosition(s, id, selection))
      decor.setMarkerVisible(markerVisible(s))
    }
    guideTick()
    setInterval(guideTick, 300)
    window.addEventListener('resize', () => world.resize())
    hideLoading()
    let last = performance.now()
    const frame = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000)
      last = now
      try {
        rig.update(dt)
        world.update(dt)
        decor.update(dt)
        park.update(dt)
        const level = getState().village.level
        if (level !== zonesLevel) { zonesLevel = level; zones.setLevel(level); decor.setPathLevel(level) }
        villageView.update()
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
