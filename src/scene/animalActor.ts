import * as THREE from 'three'
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js'
import type { LoadedModel } from './loadModels'
import { pickWanderTarget, stepToward, type Bounds, type Point } from './wander'

/** Un animal qui se promène dans son enclos : marche, s'arrête, broute ou se repose. */
export class AnimalActor {
  readonly object: THREE.Object3D
  private mixer: THREE.AnimationMixer
  private actions = new Map<string, THREE.AnimationAction>()
  private current?: THREE.AnimationAction
  private target: Point
  private pause = 0
  private speed: number

  constructor(
    model: LoadedModel,
    private bounds: Bounds,
    private rng: () => number,
    height: number,
    private ground: (x: number, z: number) => number,
  ) {
    this.object = cloneSkinned(model.scene)
    fitHeight(this.object, height)
    this.object.traverse((o) => { if ((o as THREE.Mesh).isMesh) { o.castShadow = true; o.receiveShadow = true } })
    this.mixer = new THREE.AnimationMixer(this.object)
    for (const clip of model.animations) this.actions.set(clip.name, this.mixer.clipAction(clip))
    this.speed = 0.7 + rng() * 0.5
    const start = pickWanderTarget(bounds, rng, 1)
    this.object.position.set(start.x, ground(start.x, start.z), start.z)
    this.object.rotation.y = rng() * Math.PI * 2
    this.target = start
    this.pause = rng() * 3
    this.play(this.restClip())
    this.mixer.update(rng() * 3) // désynchronise les animaux
  }

  private restClip(): string {
    const r = this.rng()
    return r < 0.45 ? 'Eating' : r < 0.75 ? 'Idle' : r < 0.9 ? 'Idle_2' : 'Idle_2_HeadLow'
  }

  private play(name: string): void {
    const next = this.actions.get(name) ?? this.actions.get('Idle')
    if (!next || next === this.current) return
    next.reset().play()
    if (this.current) next.crossFadeFrom(this.current, 0.35, false)
    this.current = next
  }

  update(dt: number): void {
    this.mixer.update(dt)
    if (this.pause > 0) {
      this.pause -= dt
      if (this.pause <= 0) { this.target = pickWanderTarget(this.bounds, this.rng, 1); this.play('Walk') }
      return
    }
    const p = this.object.position
    const step = stepToward({ x: p.x, z: p.z }, this.target, this.speed, dt)
    const dx = step.x - p.x, dz = step.z - p.z
    if (dx || dz) {
      const want = Math.atan2(dx, dz)
      let diff = want - this.object.rotation.y
      diff = Math.atan2(Math.sin(diff), Math.cos(diff))
      this.object.rotation.y += diff * Math.min(1, dt * 5)
    }
    p.set(step.x, this.ground(step.x, step.z), step.z)
    if (step.arrived) { this.pause = 2 + this.rng() * 4; this.play(this.restClip()) }
  }
}

/** Met un objet à la hauteur voulue (en mètres) et pose sa base au sol (y = 0). */
export function fitHeight(obj: THREE.Object3D, height: number): void {
  obj.updateMatrixWorld(true)
  const box = new THREE.Box3().setFromObject(obj)
  const h = box.max.y - box.min.y
  if (h > 0) obj.scale.multiplyScalar(height / h)
}
