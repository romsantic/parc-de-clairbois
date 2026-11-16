import * as THREE from 'three'
import type { Zone } from '../data/zones'
import { zoneAtPoint } from '../sim/placement'
import type { World } from './world'

export type Pick =
  | { kind: 'enclos'; id: number }
  | { kind: 'zone'; zone: Zone; point: { x: number; z: number } }
  | { kind: 'rien' }

const CLICK_TOLERANCE_PX = 6

/**
 * Clic (ou tap) sur la carte : enclos touché, sinon zone touchée au sol, sinon rien.
 * Un glisser (rotation de la caméra) n'est pas un clic ; les clics sur l'interface sont ignorés
 * car ils ne visent pas le canevas.
 */
export function createPicker(
  world: World,
  canvas: HTMLCanvasElement,
  targets: () => Map<number, THREE.Object3D>,
  isBusy: () => boolean = () => false,
) {
  const listeners: ((p: Pick) => void)[] = []
  const ray = new THREE.Raycaster()
  const ground = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)
  let down: { x: number; y: number } | null = null

  canvas.addEventListener('pointerdown', (e) => { down = { x: e.clientX, y: e.clientY } })
  canvas.addEventListener('pointerup', (e) => {
    if (!down || isBusy()) { down = null; return }
    const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y)
    down = null
    if (moved > CLICK_TOLERANCE_PX) return
    const rect = canvas.getBoundingClientRect()
    const ndc = new THREE.Vector2(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1)
    ray.setFromCamera(ndc, world.camera)
    const pick = pickAt(ray)
    for (const l of listeners) l(pick)
  })

  function pickAt(r: THREE.Raycaster): Pick {
    const objs = targets()
    const hits = r.intersectObjects([...objs.values()], true)
    for (const h of hits) {
      let o: THREE.Object3D | null = h.object
      while (o && o.userData.enclosureId === undefined) o = o.parent
      if (o) return { kind: 'enclos', id: o.userData.enclosureId as number }
    }
    const p = new THREE.Vector3()
    if (r.ray.intersectPlane(ground, p)) {
      const zone = zoneAtPoint(p.x, p.z)
      if (zone) return { kind: 'zone', zone, point: { x: p.x, z: p.z } }
    }
    return { kind: 'rien' }
  }

  return { onPick(cb: (p: Pick) => void) { listeners.push(cb) } }
}
