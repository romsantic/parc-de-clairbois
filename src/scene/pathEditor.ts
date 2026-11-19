import * as THREE from 'three'
import { isPhone } from '../core/device'
import type { GameState, PathPoint } from '../sim/types'
import type { Action } from '../sim/actions'
import { PATHS_TUNING } from '../data/paths'
import { allSegments, checkSegment, closestPoint, nearestOnNetwork } from '../sim/paths'
import type { World } from './world'
import type { CameraRig } from './cameraRig'
import { ribbonEdges } from './path'

export interface PathEditorContext {
  get(): GameState
  dispatch(action: Action, from?: HTMLElement | null): boolean
}

const TAP_TOLERANCE_PX = 6 // même tolérance que picking.ts : au-delà, c'est la caméra qu'on tourne
const round05 = (v: number) => Math.round(v * 2) / 2

/**
 * Arrivée d'un segment : le point du réseau le plus proche à moins de `snap` (sauf le départ lui-même),
 * sinon le point arrondi au demi-mètre.
 */
export function snapEnd(state: GameState, p: PathPoint, start: PathPoint, snap: number): PathPoint {
  let best: PathPoint | null = null
  let bestD = snap
  for (const s of allSegments(state)) {
    const c = closestPoint(p, s)
    if (Math.hypot(c.x - start.x, c.z - start.z) <= PATHS_TUNING.ON_PATH_EPS) continue
    const d = Math.hypot(p.x - c.x, p.z - c.z)
    if (d <= bestD) { best = c; bestD = d }
  }
  return best ?? { x: round05(p.x), z: round05(p.z) }
}

const fr = (n: number) => String(Math.round(n * 10) / 10).replace('.', ',')

/**
 * Éditeur de chemins : on touche un chemin pour partir, puis on place l'arrivée (fantôme vert ou rouge,
 * prix en direct). Valider pose le segment et repart de son bout ; Terminer (ou Échap) ferme.
 */
export function createPathEditor(world: World, canvas: HTMLCanvasElement, _rig: CameraRig, ctx: PathEditorContext) {
  const phone = isPhone()
  const snapDist = phone ? PATHS_TUNING.SNAP_M_PHONE : PATHS_TUNING.SNAP_M
  const ray = new THREE.Raycaster()
  const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)
  const hit = new THREE.Vector3()
  const ndc = new THREE.Vector2()

  let open = false
  let start: PathPoint | null = null
  let end: PathPoint | null = null
  let ghost: THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial> | null = null
  let shownKey = ''
  let down: { x: number; y: number; id: number } | null = null

  const matOk = new THREE.MeshBasicMaterial({ color: '#4fbf4a', transparent: true, opacity: 0.55, depthWrite: false, side: THREE.DoubleSide })
  const matBad = new THREE.MeshBasicMaterial({ color: '#d4402e', transparent: true, opacity: 0.55, depthWrite: false, side: THREE.DoubleSide })
  const marker = new THREE.Mesh(
    new THREE.CylinderGeometry(0.55, 0.55, 0.12, 20),
    new THREE.MeshBasicMaterial({ color: '#fff7de', transparent: true, opacity: 0.9, depthWrite: false }),
  )
  marker.renderOrder = 5

  const panel = document.createElement('div')
  panel.className = 'editeur-enclos'
  panel.hidden = true
  const info = document.createElement('span'); info.className = 'infos'
  const reason = document.createElement('span'); reason.className = 'raison'
  const ok = document.createElement('button'); ok.type = 'button'; ok.textContent = 'Valider'; ok.className = 'principal'
  const done = document.createElement('button'); done.type = 'button'; done.textContent = 'Terminer'
  panel.append(info, reason, ok, done)
  document.body.append(panel)

  function disposeGhost() {
    if (!ghost) return
    ghost.removeFromParent()
    ghost.geometry.dispose()
    ghost = null
  }

  /** Ruban plat qui suit le relief, de a à b. */
  function ribbon(a: PathPoint, b: PathPoint, good: boolean) {
    const len = Math.hypot(b.x - a.x, b.z - a.z)
    const n = Math.max(1, Math.ceil(len / 0.5))
    const pts: PathPoint[] = []
    for (let i = 0; i <= n; i++) pts.push({ x: a.x + ((b.x - a.x) * i) / n, z: a.z + ((b.z - a.z) * i) / n })
    const edges = ribbonEdges(pts, PATHS_TUNING.WIDTH_M / 2)
    const pos: number[] = [], idx: number[] = []
    const y = (x: number, z: number) => Math.max(world.groundHeight(x, z), -0.05) + 0.14
    edges.forEach((e, i) => {
      pos.push(e.left.x, y(e.left.x, e.left.z), e.left.z, e.right.x, y(e.right.x, e.right.z), e.right.z)
      if (i > 0) { const k = (i - 1) * 2; idx.push(k, k + 2, k + 1, k + 1, k + 2, k + 3) }
    })
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
    geo.setIndex(idx)
    const m = new THREE.Mesh(geo, good ? matOk : matBad)
    m.renderOrder = 4
    return m
  }

  function refresh() {
    if (!open) return
    if (!start) {
      info.className = 'infos invite'
      info.textContent = 'Touche un chemin pour commencer'
      reason.textContent = ''
      ok.disabled = true
      shownKey = ''
      disposeGhost()
      marker.removeFromParent()
      return
    }
    marker.position.set(start.x, Math.max(world.groundHeight(start.x, start.z), -0.05) + 0.2, start.z)
    if (!marker.parent) world.scene.add(marker)
    if (!end) {
      disposeGhost()
      shownKey = ''
      info.className = 'infos invite'
      info.textContent = phone ? "Touche le point d'arrivée" : "Clique le point d'arrivée"
      reason.textContent = ''
      ok.disabled = true
      return
    }
    const check = checkSegment(ctx.get(), start, end)
    const key = `${start.x},${start.z},${end.x},${end.z},${check.ok}`
    if (key !== shownKey) { // ne reconstruit le ruban que s'il a changé
      shownKey = key
      disposeGhost()
      ghost = ribbon(start, end, check.ok)
      world.scene.add(ghost)
    }
    info.className = 'infos'
    const length = check.ok ? check.length : Math.hypot(end.x - start.x, end.z - start.z)
    info.textContent = `${fr(length)} m · ${check.cost} pièces`
    reason.textContent = check.ok ? '' : check.reason
    ok.disabled = !check.ok
  }

  function close() {
    open = false
    start = null; end = null; down = null
    shownKey = ''
    disposeGhost()
    marker.removeFromParent()
    panel.hidden = true
  }

  function ground(e: PointerEvent): PathPoint | null {
    const b = canvas.getBoundingClientRect()
    ndc.set(((e.clientX - b.left) / b.width) * 2 - 1, -((e.clientY - b.top) / b.height) * 2 + 1)
    ray.setFromCamera(ndc, world.camera)
    const p = ray.ray.intersectPlane(plane, hit)
    return p ? { x: p.x, z: p.z } : null
  }

  function candidate(e: PointerEvent) {
    const p = ground(e)
    if (!p || !start) return
    const next = snapEnd(ctx.get(), p, start, snapDist)
    if (end && end.x === next.x && end.z === next.z) return
    end = next
    refresh()
  }

  canvas.addEventListener('pointerdown', (e) => {
    if (!open || e.button !== 0 || !e.isPrimary) return // un second doigt n'est jamais un tap
    down = { x: e.clientX, y: e.clientY, id: e.pointerId }
  })
  canvas.addEventListener('pointermove', (e) => {
    if (!open || !start || e.pointerType !== 'mouse' || (e.buttons & 1)) return // souris : le fantôme suit, sauf pendant un glisser
    candidate(e)
  })
  canvas.addEventListener('pointerup', (e) => {
    if (!e.isPrimary) return
    const d = down
    down = null
    if (!open || !d || d.id !== e.pointerId) return
    if (Math.hypot(e.clientX - d.x, e.clientY - d.y) > TAP_TOLERANCE_PX) return // glisser : la caméra tourne, rien n'est posé
    if (!start) {
      const p = ground(e)
      if (!p) return
      const n = nearestOnNetwork(ctx.get(), p.x, p.z)
      if (!n || n.d > snapDist) { reason.textContent = 'Commence sur un chemin existant.'; return }
      start = n.point
      end = null
      reason.textContent = ''
      refresh()
      return
    }
    candidate(e)
  })
  canvas.addEventListener('pointercancel', () => { down = null })

  ok.addEventListener('click', () => {
    if (!open || !start || !end) return
    if (!ctx.dispatch({ type: 'tracerChemin', a: start, b: end }, ok)) return
    start = end // on repart du bout posé
    end = null
    refresh()
  })
  done.addEventListener('click', close)
  window.addEventListener('keydown', (e) => { if (e.key === 'Escape' && open) close() })

  return {
    start(from?: PathPoint) {
      close()
      open = true
      start = from ? { ...from } : null
      panel.hidden = false
      refresh()
    },
    close,
    active: () => open,
  }
}
