import * as THREE from 'three'
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js'
import type { GameState } from '../sim/types'
import { incomePerHour } from '../sim/economy'
import { WALKERS, visitorsShown } from '../data/visuals'
import type { ModelKey } from '../assets/manifest'
import type { World } from './world'
import { fitHeight } from './animalActor'
import { bridgeX, cachedWalkHeight, networkPlan, type RoutePoint } from './visitorRoutes'

/** Les six modèles de promeneurs, chargés en arrière-plan après l'affichage du parc. */
export const WALKER_MODELS: ModelKey[] = [
  'promeneurHoodie', 'promeneuseCasual', 'promeneurFermier', 'promeneuseAventuriere', 'promeneurCasual2', 'promeneuseTailleur',
]

type Phase = 'off' | 'in' | 'walk' | 'stop' | 'out'

export class Walker {
  readonly object: THREE.Object3D
  private mixer: THREE.AnimationMixer
  private walk?: THREE.AnimationAction
  private idle?: THREE.AnimationAction
  private base: number
  phase: Phase = 'off'
  private route: RoutePoint[] = []
  private seg = 0 // le promeneur va du point seg vers seg + 1
  private speed = 1.2
  private fade = 0
  private wait = 0
  private yaw = 0
  private faceYaw = 0
  private lastStop = -1

  constructor(
    source: { scene: THREE.Object3D; animations: THREE.AnimationClip[] },
    private height: (x: number, z: number) => number,
    private rng: () => number,
    castShadow: boolean,
  ) {
    this.object = cloneSkinned(source.scene)
    fitHeight(this.object, WALKERS.HEIGHT)
    this.base = this.object.scale.x
    this.object.traverse((o) => { if ((o as THREE.Mesh).isMesh) { o.castShadow = castShadow; o.receiveShadow = false } })
    this.mixer = new THREE.AnimationMixer(this.object)
    for (const c of source.animations) {
      if (c.name === 'Walk') this.walk = this.mixer.clipAction(c)
      else if (c.name === 'Idle') this.idle = this.mixer.clipAction(c)
    }
    this.object.visible = false
  }

  start(route: RoutePoint[]): void {
    this.route = route
    if (route.length < 2) { this.phase = 'off'; this.object.visible = false; return } // rien à parcourir
    this.seg = 0
    this.speed = WALKERS.SPEED_MIN + this.rng() * (WALKERS.SPEED_MAX - WALKERS.SPEED_MIN)
    this.fade = 0
    this.lastStop = -1
    this.phase = 'in'
    const a = route[0], b = route[1]
    this.yaw = Math.atan2(b.x - a.x, b.z - a.z)
    this.object.rotation.y = this.yaw
    this.place(a.x, a.z)
    this.object.visible = true
    this.setScale()
    this.play(true)
    this.mixer.update(this.rng() * 1.5) // désynchronise les pas
  }

  /** Le promeneur s'éclipse sur place (moins de visiteurs). */
  leave(): void { if (this.phase !== 'off' && this.phase !== 'out') { this.phase = 'out'; this.play(false) } }

  dispose(): void {
    this.mixer.stopAllAction()
    this.mixer.uncacheRoot(this.object)
    this.object.traverse((o) => { if ((o as THREE.SkinnedMesh).isSkinnedMesh) (o as THREE.SkinnedMesh).skeleton.dispose() })
    this.object.removeFromParent()
  }

  private place(x: number, z: number): void {
    this.object.position.set(x, this.height(x, z), z)
  }

  private setScale(): void {
    this.object.scale.setScalar(this.base * Math.max(0.001, this.fade))
  }

  private play(walking: boolean): void {
    const next = walking ? this.walk : this.idle
    const prev = walking ? this.idle : this.walk
    if (!next) return
    next.reset().play()
    if (prev) next.crossFadeFrom(prev, 0.3, false)
  }

  private turn(want: number, dt: number): void {
    const diff = Math.atan2(Math.sin(want - this.yaw), Math.cos(want - this.yaw))
    this.yaw += diff * Math.min(1, dt * 6)
    this.object.rotation.y = this.yaw
  }

  update(dt: number): void {
    if (this.phase === 'off') return
    this.mixer.update(dt)
    if (this.phase === 'in') {
      this.fade = Math.min(1, this.fade + dt / WALKERS.FADE_S)
      if (this.fade >= 1) this.phase = 'walk'
    } else if (this.phase === 'out') {
      this.fade = Math.max(0, this.fade - dt / WALKERS.FADE_S)
      if (this.fade <= 0) { this.phase = 'off'; this.object.visible = false; return }
    }
    this.setScale()
    if (this.phase === 'out' && this.seg >= this.route.length - 1) return // arrivé au bout : il ne fait que s'estomper
    if (this.phase === 'stop') {
      this.turn(this.faceYaw, dt)
      this.wait -= dt
      if (this.wait <= 0) { this.phase = 'walk'; this.play(true) }
      return
    }
    const r = this.route
    const target = r[this.seg + 1]
    const p = this.object.position
    const dx = target.x - p.x, dz = target.z - p.z
    const dist = Math.hypot(dx, dz), step = this.speed * dt
    if (dist > 0.001) this.turn(Math.atan2(dx, dz), dt)
    if (dist <= step) {
      this.place(target.x, target.z)
      this.seg++
      if (this.seg >= r.length - 1) { this.phase = 'out'; this.play(false); return }
      if (target.faceX !== undefined && this.seg !== this.lastStop && (target.always || this.rng() < WALKERS.STOP_CHANCE)) {
        this.lastStop = this.seg
        this.faceYaw = Math.atan2(target.faceX - target.x, (target.faceZ as number) - target.z)
        this.wait = WALKERS.STOP_MIN_S + this.rng() * (WALKERS.STOP_MAX_S - WALKERS.STOP_MIN_S)
        this.phase = 'stop'
        this.play(false)
      }
    } else {
      this.place(p.x + (dx / dist) * step, p.z + (dz / dist) * step)
    }
  }
}

/**
 * Petits personnages qui marchent sur les chemins : ils arrivent par la route, passent le pont,
 * s'arrêtent devant les enclos occupés, vont au café, puis repartent. Leur nombre suit les
 * visiteurs par heure et l'heure du jour (purement visuel). Tant qu'aucun modèle n'est chargé,
 * rien ne s'affiche.
 */
export function createVisitorsView(
  world: World,
  getState: () => GameState,
  opts: { hour: () => number; mobile: boolean; rng?: () => number },
) {
  const rng = opts.rng ?? Math.random
  const group = new THREE.Group()
  world.scene.add(group)
  const bx = bridgeX(world.riverDistance)
  const height = cachedWalkHeight(bx, world.groundHeight)
  const walkers: Walker[] = []
  let plan: (r: () => number) => RoutePoint[] = networkPlan(getState(), bx)
  let routeKey = ''
  let target = 0
  let refresh = 0
  let spawn = 0
  const max = opts.mobile ? WALKERS.MAX_MOBILE : WALKERS.MAX_DESKTOP

  function refreshPlan(): void {
    const s = getState()
    const key = s.enclosures.map((e) => `${e.id}:${e.rect.x},${e.rect.z},${e.rect.w},${e.rect.d}`).join(';')
      + '|' + [...new Set(s.animals.map((a) => a.enclosureId))].sort((a, b) => a - b).join(',')
      + '|' + s.paths.map((p) => `${p.a.x},${p.a.z},${p.b.x},${p.b.z}`).join(';')
      + '|' + s.buildings.map((b) => (b.type === 'cafe' ? b.slot : '')).join('')
    if (key !== routeKey) { routeKey = key; plan = networkPlan(s, bx) }
    target = visitorsShown(incomePerHour(s).visiteurs, opts.hour(), opts.mobile)
  }

  function grow(): Walker | undefined {
    const ready = WALKER_MODELS.filter((k) => world.models.has(k))
    if (ready.length === 0 || walkers.length >= max) return undefined
    const key = ready[walkers.length % ready.length] // les modèles se répartissent, au fil de leur arrivée
    const w = new Walker(world.models.get(key)!, height, rng, !opts.mobile)
    group.add(w.object)
    walkers.push(w)
    return w
  }

  return {
    update(dt: number): void {
      refresh -= dt
      if (refresh <= 0) { refresh = WALKERS.REFRESH_S; refreshPlan() }
      spawn -= dt
      let active = 0
      for (const w of walkers) { w.update(dt); if (w.phase !== 'off' && w.phase !== 'out') active++ }
      if (spawn > 0) return
      if (active < target) {
        let w: Walker | undefined
        for (const x of walkers) if (x.phase === 'off') { w = x; break }
        w = w ?? grow()
        if (w) { w.start(plan(rng)); spawn = WALKERS.SPAWN_EVERY_S }
      } else if (active > target) {
        for (const x of walkers) if (x.phase === 'walk' || x.phase === 'stop' || x.phase === 'in') { x.leave(); spawn = WALKERS.SPAWN_EVERY_S; break }
      }
    },
    dispose(): void { for (const w of walkers) w.dispose(); group.removeFromParent() },
  }
}
