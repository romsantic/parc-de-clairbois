import * as THREE from 'three'
import type { GameState, Rect } from '../sim/types'
import { SPECIES_MODELS } from '../data/speciesModels'
import { ageStage } from '../sim/animal'
import type { World } from './world'
import { AnimalActor } from './animalActor'
import { createFenceBuilder } from './fence'
import { diffById } from './diff'
import { requestModel } from './loadModels'
import type { Bounds } from './wander'

const AGE_SCALE = { bebe: 0.5, jeune: 0.75, adulte: 1 } as const
const rectKey = (r: Rect) => `${r.x},${r.z},${r.w},${r.d}`
const toBounds = (r: Rect): Bounds => ({ minX: r.x + 0.6, maxX: r.x + r.w - 0.6, minZ: r.z + 0.6, maxZ: r.z + r.d - 0.6 })

/**
 * La carte reflète la partie : à chaque image, on compare l'état du jeu à ce qui est affiché
 * et on ajoute, met à jour ou retire clôtures et animaux (sans tout reconstruire).
 */
export function createParkView(world: World, getState: () => GameState, rng: () => number) {
  const fences = createFenceBuilder(world)
  const encs = new Map<number, { group: THREE.Group; key: string }>()
  const actors = new Map<number, AnimalActor>()
  const pending = new Set<number>() // animaux dont le modèle est en cours de chargement
  const highlight = new THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial>(
    new THREE.BufferGeometry(),
    new THREE.MeshBasicMaterial({ color: '#ffd54a', transparent: true, opacity: 0.8, depthWrite: false, depthTest: false }), // par-dessus : le sol ondule
  )
  highlight.visible = false
  highlight.renderOrder = 3
  world.scene.add(highlight)
  let selected: number | null = null
  let ageTimer = 0

  function placeHighlight() {
    const e = selected === null ? undefined : getState().enclosures.find((x) => x.id === selected)
    if (!e) { highlight.visible = false; return }
    // Liseré lumineux : un cadre légèrement plus grand que l'enclos, posé au sol.
    highlight.geometry.dispose()
    const shape = new THREE.Shape()
    const m = 0.9, r = e.rect
    shape.moveTo(-r.w / 2 - m, -r.d / 2 - m); shape.lineTo(r.w / 2 + m, -r.d / 2 - m)
    shape.lineTo(r.w / 2 + m, r.d / 2 + m); shape.lineTo(-r.w / 2 - m, r.d / 2 + m)
    const hole = new THREE.Path()
    hole.moveTo(-r.w / 2 + 0.1, -r.d / 2 + 0.1); hole.lineTo(-r.w / 2 + 0.1, r.d / 2 - 0.1)
    hole.lineTo(r.w / 2 - 0.1, r.d / 2 - 0.1); hole.lineTo(r.w / 2 - 0.1, -r.d / 2 + 0.1)
    shape.holes.push(hole)
    highlight.geometry = new THREE.ShapeGeometry(shape)
    highlight.rotation.x = -Math.PI / 2
    const cx = r.x + r.w / 2, cz = r.z + r.d / 2
    highlight.position.set(cx, world.groundHeight(cx, cz) + 0.12, cz)
    highlight.visible = true
  }

  function syncEnclosures(s: GameState) {
    const d = diffById(new Set(encs.keys()), s.enclosures)
    for (const id of d.removed) { encs.get(id)!.group.removeFromParent(); encs.delete(id) }
    for (const e of [...d.added, ...d.kept]) {
      const key = rectKey(e.rect), cur = encs.get(e.id)
      if (cur && cur.key === key) continue
      cur?.group.removeFromParent()
      const group = fences.buildFence(e.rect)
      group.userData.enclosureId = e.id
      world.scene.add(group)
      encs.set(e.id, { group, key })
      for (const a of s.animals) if (a.enclosureId === e.id) actors.get(a.id)?.setBounds(toBounds(e.rect))
      if (e.id === selected) placeHighlight()
    }
  }

  function syncAnimals(s: GameState) {
    const d = diffById(new Set([...actors.keys(), ...pending]), s.animals)
    for (const id of d.removed) { actors.get(id)?.dispose(); actors.delete(id); pending.delete(id) }
    for (const a of d.added) {
      const enc = s.enclosures.find((e) => e.id === a.enclosureId)
      if (!enc) continue
      const spec = SPECIES_MODELS[a.species]
      const key = a.sex === 'F' ? spec.female : spec.male
      pending.add(a.id)
      requestModel(world.models, key).then((model) => {
        if (!pending.has(a.id)) return // l'animal a disparu entre-temps
        pending.delete(a.id)
        const now = getState()
        const cur = now.animals.find((x) => x.id === a.id)
        const curEnc = cur && now.enclosures.find((e) => e.id === cur.enclosureId)
        if (!cur || !curEnc) return
        const actor = new AnimalActor(model, toBounds(curEnc.rect), rng, spec.height * (0.92 + rng() * 0.12), world.groundHeight)
        actor.setScale(AGE_SCALE[ageStage(cur, now.time)])
        world.scene.add(actor.object)
        actors.set(a.id, actor)
      }).catch((err) => console.error(err))
    }
  }

  return {
    update(dt: number) {
      const s = getState()
      syncEnclosures(s)
      syncAnimals(s)
      for (const a of actors.values()) a.update(dt)
      ageTimer += dt
      if (ageTimer > 2) { // les animaux grandissent : on remet leur taille à jour de temps en temps
        ageTimer = 0
        for (const a of s.animals) actors.get(a.id)?.setScale(AGE_SCALE[ageStage(a, s.time)])
      }
    },
    /** Objets cliquables : le sol de chaque enclos. */
    enclosureMeshes(): Map<number, THREE.Object3D> {
      const m = new Map<number, THREE.Object3D>()
      for (const [id, e] of encs) m.set(id, e.group)
      return m
    },
    setSelected(id: number | null) { selected = id; placeHighlight() },
  }
}
