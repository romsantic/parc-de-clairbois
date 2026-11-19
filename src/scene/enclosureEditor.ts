import * as THREE from 'three'
import { isPhone } from '../core/device'
import type { GameState, Rect } from '../sim/types'
import type { Action } from '../sim/actions'
import { previewEnclosure } from '../sim/actions'
import type { Zone } from '../data/zones'
import { SPECIES } from '../data/species'
import { snapRect } from '../sim/placement'
import { capacity } from '../sim/enclosure'
import type { World } from './world'
import type { CameraRig } from './cameraRig'
import { fenceGhost } from './fence'

export interface EditorContext {
  get(): GameState
  dispatch(action: Action, from?: HTMLElement | null): boolean
  /** Appelé après une pose ou un redimensionnement réussi, avec l'id de l'enclos. */
  onDone(encId: number): void
}

const START_W = 10, START_D = 8

/**
 * Éditeur d'enclos : clôture fantôme verte ou rouge, 4 poignées aux coins, prix en direct,
 * Valider / Annuler. La caméra n'est suspendue que pendant qu'on tire une poignée.
 */
export function createEnclosureEditor(world: World, canvas: HTMLCanvasElement, rig: CameraRig, ctx: EditorContext) {
  const coarse = isPhone()
  const handleMat = new THREE.MeshStandardMaterial({ color: '#fff7de', emissive: '#7a5b12', emissiveIntensity: 0.4, roughness: 0.5 })
  const handleGeo = new THREE.SphereGeometry(coarse ? 0.9 : 0.6, 16, 10)
  const handles = [0, 1, 2, 3].map(() => new THREE.Mesh(handleGeo, handleMat))
  const ray = new THREE.Raycaster()
  const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)

  let mode: { kind: 'build' } | { kind: 'resize'; encId: number; original: Rect } | null = null
  let rect: Rect = { x: 0, z: 0, w: START_W, d: START_D }
  let ghost: THREE.Group | null = null
  let dragging: number | null = null
  let dragPointer = -1
  let shownKey = ''
  let fixedCorner = { x: 0, z: 0 }

  // Panneau flottant : dimensions, prix, raison du refus, Valider / Annuler.
  const panel = document.createElement('div')
  panel.className = 'editeur-enclos'
  panel.hidden = true
  const info = document.createElement('span'); info.className = 'infos'
  const reason = document.createElement('span'); reason.className = 'raison'
  const ok = document.createElement('button'); ok.type = 'button'; ok.textContent = 'Valider'; ok.className = 'principal'
  const cancel = document.createElement('button'); cancel.type = 'button'; cancel.textContent = 'Annuler'
  panel.append(info, reason, ok, cancel)
  document.body.append(panel)

  const corners = (r: Rect) => [
    { x: r.x, z: r.z }, { x: r.x + r.w, z: r.z }, { x: r.x + r.w, z: r.z + r.d }, { x: r.x, z: r.z + r.d },
  ]

  function refresh() {
    if (!mode) return
    const s = ctx.get()
    // Une seule vérification, partagée avec l'action : place, capacité et pièces.
    const check = previewEnclosure(s, rect, mode.kind === 'resize' ? mode.encId : undefined)
    const key = `${rect.x},${rect.z},${rect.w},${rect.d},${check.ok}`
    if (key !== shownKey) { // ne reconstruit la clôture fantôme que si elle a changé
      shownKey = key
      disposeGhost()
      ghost = fenceGhost(world, rect, check.ok)
      world.scene.add(ghost)
    }
    corners(rect).forEach((c, i) => handles[i].position.set(c.x, world.groundHeight(c.x, c.z) + 0.6, c.z))
    const fr = (n: number) => String(n).replace('.', ',')
    const size = `${fr(rect.w)} × ${fr(rect.d)} m`
    if (mode.kind === 'build') {
      info.textContent = `${size} · ${check.cost} pièces`
    } else {
      const enc = s.enclosures.find((e) => e.id === (mode as { encId: number }).encId)
      const cap = enc && enc.species ? ` · ${capacity({ ...enc, rect })} ${SPECIES[enc.species].name.toLowerCase()}s max` : ''
      info.textContent = `${size}${cap} · ${check.cost ? `+${check.cost} pièces` : 'gratuit'}`
    }
    reason.textContent = check.ok ? '' : check.reason
    ok.disabled = !check.ok
  }

  function open(m: NonNullable<typeof mode>, r: Rect) {
    close()
    mode = m
    rect = snapRect(r)
    for (const h of handles) world.scene.add(h)
    panel.hidden = false
    refresh()
  }

  function disposeGhost() {
    if (!ghost) return
    ghost.removeFromParent()
    ghost.traverse((o) => (o as THREE.Mesh).geometry?.dispose())
    ghost = null
  }

  function close() {
    mode = null
    dragging = null
    shownKey = ''
    disposeGhost()
    for (const h of handles) h.removeFromParent()
    panel.hidden = true
    rig.setEnabled(true)
  }

  function groundPoint(e: PointerEvent): THREE.Vector3 | null {
    const b = canvas.getBoundingClientRect()
    ray.setFromCamera(new THREE.Vector2(((e.clientX - b.left) / b.width) * 2 - 1, -((e.clientY - b.top) / b.height) * 2 + 1), world.camera)
    return ray.ray.intersectPlane(plane, new THREE.Vector3())
  }

  canvas.addEventListener('pointerdown', (e) => {
    if (!mode || e.button !== 0 || dragging !== null) return // clic gauche ou premier doigt seulement
    const b = canvas.getBoundingClientRect()
    ray.setFromCamera(new THREE.Vector2(((e.clientX - b.left) / b.width) * 2 - 1, -((e.clientY - b.top) / b.height) * 2 + 1), world.camera)
    const hit = ray.intersectObjects(handles, false)[0]
    if (!hit) return
    dragging = handles.findIndex((h) => h === hit.object)
    const c = corners(rect)
    fixedCorner = c[(dragging + 2) % 4] // le coin opposé ne bouge pas
    dragPointer = e.pointerId
    rig.setEnabled(false)
    canvas.setPointerCapture(e.pointerId)
    e.stopPropagation()
  }, { capture: true })

  canvas.addEventListener('pointermove', (e) => {
    if (dragging === null || e.pointerId !== dragPointer) return
    const p = groundPoint(e)
    if (!p) return
    rect = snapRect({
      x: Math.min(p.x, fixedCorner.x), z: Math.min(p.z, fixedCorner.z),
      w: Math.abs(p.x - fixedCorner.x), d: Math.abs(p.z - fixedCorner.z),
    })
    refresh()
  })

  const endDrag = (e: PointerEvent) => {
    if (dragging !== null && e.pointerId === dragPointer) { dragging = null; rig.setEnabled(true) }
  }
  canvas.addEventListener('pointerup', endDrag)
  canvas.addEventListener('pointercancel', endDrag)

  ok.addEventListener('click', () => {
    if (!mode) return
    const before = new Set(ctx.get().enclosures.map((x) => x.id))
    const action: Action = mode.kind === 'build' ? { type: 'construire', rect } : { type: 'redimensionner', encId: mode.encId, rect }
    if (!ctx.dispatch(action, ok)) return
    const id = mode.kind === 'resize' ? mode.encId : ctx.get().enclosures.find((x) => !before.has(x.id))?.id
    close()
    if (id !== undefined) ctx.onDone(id)
  })
  cancel.addEventListener('click', close)
  window.addEventListener('keydown', (e) => { if (e.key === 'Escape' && mode) close() })

  return {
    startBuild(zone: Zone, point: { x: number; z: number }) {
      const z = zone.rect
      const x = Math.min(Math.max(point.x - START_W / 2, z.x), z.x + z.w - START_W)
      const zz = Math.min(Math.max(point.z - START_D / 2, z.z), z.z + z.d - START_D)
      open({ kind: 'build' }, { x, z: zz, w: START_W, d: START_D })
    },
    startResize(encId: number) {
      const enc = ctx.get().enclosures.find((e) => e.id === encId)
      if (enc) open({ kind: 'resize', encId, original: { ...enc.rect } }, enc.rect)
    },
    close,
    active: () => mode !== null,
  }
}
