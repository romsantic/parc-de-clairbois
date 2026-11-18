import * as THREE from 'three'
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js'
import type { LoadedModel } from './loadModels'
import { pickWanderTarget, stepToward, restDuration, walkSpeedFactor, type Bounds, type Point } from './wander'

/** Un animal qui se promène dans son enclos : marche, s'arrête, broute ou se repose. */
export class AnimalActor {
  readonly object: THREE.Object3D
  private mixer: THREE.AnimationMixer
  private actions = new Map<string, THREE.AnimationAction>()
  private current?: THREE.AnimationAction
  private target: Point
  private pause = 0
  private speed: number
  private baseScale: THREE.Vector3
  private ageScale = 1
  private canWalk: boolean
  private t = 0
  private night = 0

  constructor(
    model: LoadedModel,
    private bounds: Bounds,
    private rng: () => number,
    height: number,
    private ground: (x: number, z: number) => number,
  ) {
    this.object = cloneSkinned(model.scene)
    fitHeight(this.object, height)
    this.baseScale = this.object.scale.clone()
    this.object.traverse((o) => { if ((o as THREE.Mesh).isMesh) { o.castShadow = true; o.receiveShadow = true } })
    this.mixer = new THREE.AnimationMixer(this.object)
    for (const clip of model.animations) this.actions.set(clip.name, this.mixer.clipAction(clip))
    this.canWalk = hasWalk(model.animations.map((c) => c.name))
    this.speed = 0.7 + rng() * 0.5
    const start = pickWanderTarget(bounds, rng, 1)
    this.object.position.set(start.x, ground(start.x, start.z), start.z)
    this.object.rotation.y = rng() * Math.PI * 2
    this.target = start
    this.pause = rng() * 3
    this.play(this.restClip())
    this.mixer.update(rng() * 3) // désynchronise les animaux
  }

  /** Nuit 0..1 : pauses plus longues, marche plus lente. */
  setNight(n: number): void { this.night = n }

  /** Taille selon l'âge (bébé, jeune, adulte). */
  setScale(k: number): void {
    if (k === this.ageScale) return
    this.ageScale = k
    this.object.scale.copy(this.baseScale).multiplyScalar(k)
  }

  /** Nouvel enclos ou enclos redimensionné : l'animal reste (ou revient) à l'intérieur. */
  setBounds(b: Bounds): void {
    this.bounds = b
    const p = this.object.position
    if (p.x < b.minX || p.x > b.maxX || p.z < b.minZ || p.z > b.maxZ) {
      const q = pickWanderTarget(b, this.rng, 1)
      p.set(q.x, this.ground(q.x, q.z), q.z)
    }
    this.target = pickWanderTarget(b, this.rng, 1)
  }

  dispose(): void {
    this.mixer.stopAllAction()
    this.mixer.uncacheRoot(this.object)
    this.object.traverse((o) => { if ((o as THREE.SkinnedMesh).isSkinnedMesh) (o as THREE.SkinnedMesh).skeleton.dispose() })
    this.object.removeFromParent()
  }

  private restClip(): string {
    const r = this.rng()
    return r < 0.45 ? 'Eating' : r < 0.75 ? 'Idle' : r < 0.9 ? 'Idle_2' : 'Idle_2_HeadLow'
  }

  private play(name: string): void {
    const clip = resolveClip(name, [...this.actions.keys()])
    const next = clip ? this.actions.get(clip) : undefined
    if (!next || next === this.current) return
    next.reset().play()
    if (this.current) next.crossFadeFrom(this.current, 0.35, false)
    this.current = next
  }

  update(dt: number): void {
    this.mixer.update(dt)
    this.t += dt
    if (this.pause > 0) {
      this.pause -= dt
      if (this.pause <= 0) { this.target = pickWanderTarget(this.bounds, this.rng, 1); this.play('Walk') }
      return
    }
    const p = this.object.position
    const step = stepToward({ x: p.x, z: p.z }, this.target, this.speed * walkSpeedFactor(this.night), dt)
    const dx = step.x - p.x, dz = step.z - p.z
    if (dx || dz) {
      const want = Math.atan2(dx, dz)
      let diff = want - this.object.rotation.y
      diff = Math.atan2(Math.sin(diff), Math.cos(diff))
      this.object.rotation.y += diff * Math.min(1, dt * 5)
    }
    // Modèles sans animation de marche : petit balancement pour ne pas « glisser ».
    const bob = this.canWalk ? 0 : Math.abs(Math.sin(this.t * 9)) * 0.07 * this.ageScale
    p.set(step.x, this.ground(step.x, step.z) + bob, step.z)
    if (step.arrived) { this.pause = restDuration(this.rng, this.night); this.play(this.restClip()) }
  }
}

/** Les modèles du pack ne nomment pas tous leurs animations pareil. */
const CLIP_ALIASES: Record<string, string[]> = {
  Idle_2_HeadLow: ['Idle_2_HeadLow', 'Idle_Headlow', 'Idle_HeadLow'],
}

/**
 * Nom réel de l'animation à jouer pour ce modèle ; « Idle » par défaut.
 * Les modèles FBX préfixent leurs noms (« Armature|Idle ») : on les reconnaît aussi.
 */
export function resolveClip(wanted: string, available: string[]): string | undefined {
  const find = (name: string) => available.find((a) => a === name || a.endsWith(`|${name}`))
  for (const name of CLIP_ALIASES[wanted] ?? [wanted]) { const hit = find(name); if (hit) return hit }
  return find('Idle')
}

/** Vrai si le modèle a une vraie animation de marche (sinon on simule un balancement). */
export const hasWalk = (available: string[]): boolean => available.some((a) => a === 'Walk' || a.endsWith('|Walk'))

/**
 * Met un objet à la hauteur voulue (en mètres) et pose sa base à son origine (y = 0),
 * en décalant son contenu : sa propre position reste libre pour le placer sur la carte.
 */
export function fitHeight(obj: THREE.Object3D, height: number): void {
  obj.updateMatrixWorld(true)
  const box = new THREE.Box3().setFromObject(obj)
  const h = box.max.y - box.min.y
  if (h <= 0) return
  obj.scale.multiplyScalar(height / h)
  obj.updateMatrixWorld(true)
  const base = new THREE.Box3().setFromObject(obj).min.y - obj.position.y
  if (Math.abs(base) > 1e-6) for (const child of obj.children) child.position.y -= base / obj.scale.y
}
