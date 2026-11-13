import * as THREE from 'three'
import type { Rect } from '../sim/types'
import type { World } from './world'
import { fitHeight } from './animalActor'
import { prepareStatic } from './materials'

const FENCE_HEIGHT = 1.1

/** Construit des clôtures du pack, posées sur le relief, avec un tapis d'herbe à l'intérieur. */
export function createFenceBuilder(world: World) {
  const { models, groundHeight } = world
  const src = models.get('cloture')
  const fenceLen = (() => {
    if (!src) return 2
    const f = src.scene.clone(true)
    fitHeight(f, FENCE_HEIGHT)
    const s = new THREE.Box3().setFromObject(f).getSize(new THREE.Vector3())
    return Math.max(s.x, s.z)
  })()
  const padMat = new THREE.MeshStandardMaterial({
    color: '#8cc265', roughness: 1, transparent: true, opacity: 0.55,
    polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1, depthWrite: false,
  })

  function side(group: THREE.Group, x0: number, z0: number, x1: number, z1: number) {
    if (!src) return
    const len = Math.hypot(x1 - x0, z1 - z0), n = Math.max(1, Math.round(len / fenceLen))
    const rot = Math.atan2(x1 - x0, z1 - z0) + Math.PI / 2
    for (let i = 0; i < n; i++) {
      const t = (i + 0.5) / n
      const x = x0 + (x1 - x0) * t, z = z0 + (z1 - z0) * t
      const obj = src.scene.clone(true)
      prepareStatic(obj)
      fitHeight(obj, FENCE_HEIGHT)
      obj.scale.x *= len / n / fenceLen
      obj.rotation.y = rot
      obj.position.set(x, groundHeight(x, z), z)
      group.add(obj)
    }
  }

  /** Clôture complète d'un enclos + herbe tendre à l'intérieur. */
  function buildFence(r: Rect): THREE.Group {
    const g = new THREE.Group()
    const x1 = r.x + r.w, z1 = r.z + r.d
    side(g, r.x, r.z, x1, r.z)
    side(g, x1, r.z, x1, z1)
    side(g, x1, z1, r.x, z1)
    side(g, r.x, z1, r.x, r.z)
    const w = r.w - 0.4, d = r.d - 0.4
    const geo = new THREE.PlaneGeometry(w, d, Math.ceil(w * 2), Math.ceil(d * 2))
    geo.rotateX(-Math.PI / 2)
    geo.translate(r.x + r.w / 2, 0, r.z + r.d / 2)
    const p = geo.attributes.position as THREE.BufferAttribute
    for (let i = 0; i < p.count; i++) p.setY(i, groundHeight(p.getX(i), p.getZ(i)) + 0.04)
    geo.computeVertexNormals()
    const pad = new THREE.Mesh(geo, padMat)
    pad.receiveShadow = true
    pad.name = 'sol-enclos' // cible pour la sélection
    g.add(pad)
    return g
  }

  return { buildFence }
}

const ghostOk = new THREE.MeshBasicMaterial({ color: '#4caf50', transparent: true, opacity: 0.55, depthWrite: false })
const ghostBad = new THREE.MeshBasicMaterial({ color: '#e53935', transparent: true, opacity: 0.55, depthWrite: false })

/** Clôture fantôme, verte si la pose est possible, rouge sinon (éditeur d'enclos). */
export function fenceGhost(world: World, r: Rect, valid: boolean): THREE.Group {
  const g = new THREE.Group()
  const mat = valid ? ghostOk : ghostBad
  const h = (x: number, z: number) => world.groundHeight(x, z)
  const rail = (x0: number, z0: number, x1: number, z1: number) => {
    const len = Math.hypot(x1 - x0, z1 - z0)
    for (const y of [0.45, 0.95]) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(len, 0.08, 0.08), mat)
      m.position.set((x0 + x1) / 2, h((x0 + x1) / 2, (z0 + z1) / 2) + y, (z0 + z1) / 2)
      m.rotation.y = -Math.atan2(z1 - z0, x1 - x0)
      g.add(m)
    }
    for (let i = 0; i <= Math.ceil(len / 2); i++) {
      const t = i / Math.ceil(len / 2), x = x0 + (x1 - x0) * t, z = z0 + (z1 - z0) * t
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.1, 0.12), mat)
      post.position.set(x, h(x, z) + 0.55, z)
      g.add(post)
    }
  }
  const x1 = r.x + r.w, z1 = r.z + r.d
  rail(r.x, r.z, x1, r.z); rail(x1, r.z, x1, z1); rail(x1, z1, r.x, z1); rail(r.x, z1, r.x, r.z)
  return g
}
