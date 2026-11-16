import * as THREE from 'three'
import type { ModelKey } from '../assets/manifest'
import type { BuildingType, GameState } from '../sim/types'
import { BUILDINGS, SLOTS } from '../data/economy'
import type { World } from './world'
import { fitHeight } from './animalActor'
import { prepareStatic } from './materials'
import { label } from './zonesView'

const LEVEL_SCALE = [1, 1.08, 1.15] as const
const BUILDING_TYPES = Object.keys(BUILDINGS) as BuildingType[]

/** Un élément de décor d'un bâtiment : modèle, position locale, hauteur, rotation, niveau minimal. */
interface Part { key: ModelKey; x: number; z: number; h: number; rot?: number; minLevel?: 1 | 2 | 3 }

/** Allure de chaque bâtiment : le bâtiment principal puis ses accessoires, certains au niveau 3. */
const LOOKS: Record<BuildingType, { signY: number; parts: Part[] }> = {
  ferme: { signY: 4.6, parts: [
    { key: 'ecurie', x: 0, z: -0.5, h: 3.2, rot: Math.PI },
    { key: 'foin', x: 3, z: 1.8, h: 1.4, rot: 0.4 },
    { key: 'moulin', x: -3.2, z: -2.2, h: 6, rot: 0.5, minLevel: 3 },
  ] },
  cafe: { signY: 4, parts: [
    { key: 'etal2', x: 0, z: -0.5, h: 2.6, rot: Math.PI },
    { key: 'banc2', x: -2.2, z: 1.8, h: 0.9, rot: Math.PI },
    { key: 'banc2', x: 2.2, z: 1.8, h: 0.9, rot: Math.PI },
    { key: 'kiosque', x: -3.2, z: -2.4, h: 3.6, minLevel: 3 },
  ] },
  boutique: { signY: 4.8, parts: [
    { key: 'maison4', x: 0, z: -1.2, h: 3.6, rot: Math.PI },
    { key: 'etal', x: 2.9, z: 1.6, h: 2.4, rot: Math.PI },
    { key: 'caisse', x: -2.4, z: 1.8, h: 0.7 },
    { key: 'sacs', x: -1.2, z: 2.9, h: 0.8, rot: 0.6, minLevel: 3 },
  ] },
  auberge: { signY: 5.6, parts: [
    { key: 'auberge', x: 0, z: -0.6, h: 4.6, rot: Math.PI },
    { key: 'tonneau', x: 2.9, z: 1.6, h: 1 },
    { key: 'tonneau', x: 3.6, z: 2.6, h: 1, rot: 1 },
    { key: 'feu', x: -3, z: 2.4, h: 1.1, minLevel: 3 },
  ] },
}

type Own = { mats: THREE.Material[]; geos: THREE.BufferGeometry[] }
type SlotState = 'libre' | 'bientot' | 'verrou'

/**
 * Les 6 emplacements du village : terre avec panneau quand ils sont libres ou verrouillés,
 * bâtiment (qui change d'allure avec son niveau) quand ils sont occupés.
 * Seuls les emplacements dont l'apparence a changé sont reconstruits.
 */
export function createVillageView(world: World, getState: () => GameState) {
  const slots = new Map<number, { group: THREE.Group; key: string }>()
  const own = new WeakMap<THREE.Object3D, Own>()
  const highlight = new THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial>(
    new THREE.RingGeometry(3.7, 4.1, 40),
    new THREE.MeshBasicMaterial({ color: '#ffd54a', transparent: true, opacity: 0.8, depthWrite: false, depthTest: false, side: THREE.DoubleSide }),
  )
  highlight.rotation.x = -Math.PI / 2
  highlight.visible = false
  highlight.renderOrder = 3
  world.scene.add(highlight)
  let selected: number | null = null

  function dispose(g: THREE.Object3D) {
    g.removeFromParent()
    const st = own.get(g)
    st?.geos.forEach((x) => x.dispose())
    st?.mats.forEach((x) => x.dispose())
    g.traverse((o) => {
      const sp = o as THREE.Sprite
      if (sp.isSprite) { sp.material.map?.dispose(); sp.material.dispose() }
    })
  }

  function placeHighlight() {
    const s = selected === null ? undefined : SLOTS.find((x) => x.id === selected)
    if (!s) { highlight.visible = false; return }
    highlight.position.set(s.x, world.groundHeight(s.x, s.z) + 0.15, s.z)
    highlight.visible = true
  }

  function signAt(g: THREE.Group, text: string, y: number, w: number) {
    const sp = label(text)
    sp.scale.set(w, w / 4, 1)
    sp.position.y = y
    g.add(sp)
  }

  /** Disque invisible mais touchable : le bâtiment et sa cour se choisissent d'un clic. */
  function pickDisc(g: THREE.Group, st: Own) {
    const geo = new THREE.CircleGeometry(3.4, 16)
    geo.rotateX(-Math.PI / 2)
    const mat = new THREE.MeshBasicMaterial({ visible: false })
    const m = new THREE.Mesh(geo, mat)
    m.position.y = 0.1
    st.geos.push(geo); st.mats.push(mat)
    g.add(m)
  }

  function dirtSquare(g: THREE.Group, st: Own, locked: boolean) {
    const geo = new THREE.PlaneGeometry(5, 5, 4, 4)
    geo.rotateX(-Math.PI / 2)
    const p = geo.attributes.position as THREE.BufferAttribute
    for (let i = 0; i < p.count; i++) p.setY(i, world.groundHeight(g.position.x + p.getX(i), g.position.z + p.getZ(i)) - g.position.y + 0.03)
    geo.computeVertexNormals()
    const mat = new THREE.MeshStandardMaterial({ color: locked ? '#8b8f86' : '#9a7b55', roughness: 1, flatShading: true })
    const m = new THREE.Mesh(geo, mat)
    m.receiveShadow = true
    st.geos.push(geo); st.mats.push(mat)
    g.add(m)
  }

  function build(id: number, key: string, type: BuildingType | null, level: number, state: SlotState): THREE.Group {
    const def = SLOTS.find((s) => s.id === id)!
    const g = new THREE.Group()
    g.userData.slot = id
    g.name = `emplacement:${key}`
    g.position.set(def.x, world.groundHeight(def.x, def.z), def.z)
    const st: Own = { mats: [], geos: [] }
    own.set(g, st)
    if (type) {
      const look = LOOKS[type]
      const scale = LEVEL_SCALE[level - 1]
      const inner = new THREE.Group()
      inner.rotation.y = def.rot
      inner.scale.setScalar(scale)
      for (const part of look.parts) {
        if ((part.minLevel ?? 1) > level) continue
        const src = world.models.get(part.key)
        if (!src) continue
        const obj = src.scene.clone(true)
        prepareStatic(obj)
        fitHeight(obj, part.h)
        obj.rotation.y = part.rot ?? 0
        obj.position.set(part.x, 0, part.z)
        inner.add(obj)
      }
      g.add(inner)
      pickDisc(g, st)
      signAt(g, '★'.repeat(level) + '☆'.repeat(3 - level), look.signY * scale, 2.6)
    } else {
      dirtSquare(g, st, state !== 'libre')
      pickDisc(g, st)
      const text = state === 'libre' ? '+' : state === 'bientot' ? 'Bientôt' : `Niveau ${def.unlockLevel}`
      signAt(g, text, 1.6, state === 'libre' ? 1.4 : 3.2)
    }
    world.scene.add(g)
    return g
  }

  function update() {
    const s = getState()
    const allBuilt = BUILDING_TYPES.every((t) => s.buildings.some((b) => b.type === t))
    for (const def of SLOTS) {
      const b = s.buildings.find((x) => x.slot === def.id)
      const locked = def.unlockLevel > s.village.level
      const state: SlotState = locked ? 'verrou' : allBuilt ? 'bientot' : 'libre'
      const key = b ? `${b.type}:${b.level}` : state === 'verrou' ? `verrou:${def.unlockLevel}` : state
      const cur = slots.get(def.id)
      if (cur && cur.key === key) continue
      if (cur) dispose(cur.group)
      slots.set(def.id, { group: build(def.id, key, b ? b.type : null, b ? b.level : 1, state), key })
    }
  }

  update()
  return {
    update,
    /** Objets cliquables : chaque emplacement (terre libre ou bâtiment). */
    slotMeshes(): Map<number, THREE.Object3D> {
      const m = new Map<number, THREE.Object3D>()
      for (const [id, e] of slots) m.set(id, e.group)
      return m
    },
    setSelected(slot: number | null) { selected = slot; placeHighlight() },
  }
}
