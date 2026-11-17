import * as THREE from 'three'
import type { ModelKey } from '../assets/manifest'
import type { BuildingType, GameState } from '../sim/types'
import { SLOTS } from '../data/economy'
import type { World } from './world'
import { fitHeight } from './animalActor'
import { prepareStatic } from './materials'
import { slotCanBuild } from '../sim/village'

const LEVEL_SCALE = [1, 1.08, 1.15] as const

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

  /** Panneau-sprite dessiné sur son propre canvas (la texture est libérée avec l'emplacement). */
  function sprite(c: HTMLCanvasElement, w: number, y: number, g: THREE.Group) {
    const tex = new THREE.CanvasTexture(c)
    tex.colorSpace = THREE.SRGBColorSpace
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false }))
    sp.scale.set(w, w * (c.height / c.width), 1)
    sp.position.y = y
    sp.renderOrder = 5
    g.add(sp)
  }

  function canvas(w: number, h: number) {
    const c = document.createElement('canvas')
    c.width = w; c.height = h
    return { c, ctx: c.getContext('2d')! }
  }

  /** Emplacement libre : médaillon de bois rond avec un gros « + » crème. */
  function signPlus(g: THREE.Group, y: number) {
    const { c, ctx } = canvas(256, 256)
    ctx.fillStyle = '#5c3d22'
    ctx.beginPath(); ctx.arc(128, 128, 120, 0, Math.PI * 2); ctx.fill()
    ctx.fillStyle = '#b07d4a'
    ctx.beginPath(); ctx.arc(128, 128, 104, 0, Math.PI * 2); ctx.fill()
    ctx.fillStyle = '#fbf3df'
    ctx.beginPath(); ctx.roundRect(104, 52, 48, 152, 10); ctx.fill()
    ctx.beginPath(); ctx.roundRect(52, 104, 152, 48, 10); ctx.fill()
    sprite(c, 2.2, y, g)
  }

  /** Bâtiment : petite plaque avec 3 étoiles, pleines (or) jusqu'au niveau, creuses ensuite. */
  function signStars(g: THREE.Group, level: number, y: number) {
    const { c, ctx } = canvas(384, 160)
    ctx.fillStyle = 'rgba(246,240,225,0.95)'
    ctx.beginPath(); ctx.roundRect(6, 6, 372, 148, 40); ctx.fill()
    ctx.strokeStyle = '#8a6a3a'; ctx.lineWidth = 6
    ctx.beginPath(); ctx.roundRect(6, 6, 372, 148, 40); ctx.stroke()
    for (let i = 0; i < 3; i++) {
      const cx = 72 + i * 120, cy = 82
      ctx.beginPath()
      for (let k = 0; k < 10; k++) {
        const r = k % 2 ? 24 : 54, a = -Math.PI / 2 + (k * Math.PI) / 5
        ctx[k ? 'lineTo' : 'moveTo'](cx + Math.cos(a) * r, cy + Math.sin(a) * r)
      }
      ctx.closePath()
      ctx.lineJoin = 'round'
      if (i < level) {
        ctx.fillStyle = '#f2b822'; ctx.fill()
        ctx.strokeStyle = '#a8740a'; ctx.lineWidth = 6; ctx.stroke()
      } else {
        ctx.strokeStyle = '#a89c80'; ctx.lineWidth = 7; ctx.stroke()
      }
    }
    sprite(c, 2.4, y, g)
  }

  /** Emplacement verrouillé ou « Bientôt » : texte, sur un canvas taillé pour lui. */
  function signText(g: THREE.Group, text: string, y: number) {
    const font = '700 64px system-ui, sans-serif'
    const probe = canvas(8, 8).ctx
    probe.font = font
    const tw = Math.ceil(probe.measureText(text).width)
    const { c, ctx } = canvas(tw + 80, 120)
    ctx.fillStyle = 'rgba(246,240,225,0.95)'
    ctx.beginPath(); ctx.roundRect(4, 4, c.width - 8, c.height - 8, 36); ctx.fill()
    ctx.fillStyle = '#4a4434'
    ctx.font = font
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    ctx.fillText(text, c.width / 2, c.height / 2 + 3)
    sprite(c, Math.max(3, (c.width / 64) * 0.9), y, g)
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
      signStars(g, level, look.signY * scale)
    } else {
      dirtSquare(g, st, state !== 'libre')
      pickDisc(g, st)
      if (state === 'libre') signPlus(g, 1.8)
      else signText(g, state === 'bientot' ? 'Bientôt' : `Niveau ${def.unlockLevel}`, 1.8)
    }
    world.scene.add(g)
    return g
  }

  function update() {
    const s = getState()
    for (const def of SLOTS) {
      const b = s.buildings.find((x) => x.slot === def.id)
      const locked = def.unlockLevel > s.village.level
      const state: SlotState = locked ? 'verrou' : b || slotCanBuild(s, def.id) ? 'libre' : 'bientot'
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
