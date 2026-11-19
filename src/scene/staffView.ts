import * as THREE from 'three'
import type { Employee, GameState } from '../sim/types'
import { STAFF_WALKERS, WALKERS } from '../data/visuals'
import { isPhone } from '../core/device'
import type { World } from './world'
import { bridgeX, cachedWalkHeight, type RoutePoint } from './visitorRoutes'
import { Walker } from './visitorsView'
import { staffRoute } from './staffRoutes'

/** Nombre de tours avant que le personnage ne s'éclipse puis revienne (la boucle est répétée). */
const LAPS = 6

function repeat(loop: RoutePoint[]): RoutePoint[] {
  const out = [...loop]
  for (let i = 1; i < LAPS; i++) out.push(...loop.slice(1))
  return out
}

/**
 * Un personnage par employé (au plus MAX_*), qui fait le tour de son premier enclos (purement visuel,
 * pas cliquable : aucun userData de sélection). Reconstruit quand la liste des employés ou leurs premiers
 * enclos changent. Rien tant que les modèles de promeneurs ne sont pas chargés. De nuit ils restent visibles.
 */
export function createStaffView(world: World, getState: () => GameState, opts: { mobile?: boolean; rng?: () => number } = {}) {
  const rng = opts.rng ?? Math.random
  const mobile = opts.mobile ?? isPhone()
  const max = mobile ? STAFF_WALKERS.MAX_MOBILE : STAFF_WALKERS.MAX_DESKTOP
  const group = new THREE.Group()
  world.scene.add(group)
  const height = cachedWalkHeight(bridgeX(world.riverDistance), world.groundHeight)
  let walkers: { w: Walker; route: RoutePoint[] }[] = []
  let key = ''
  let refresh = 0

  function firstEnclosure(s: GameState, e: Employee) {
    return e.encIds.map((id) => s.enclosures.find((x) => x.id === id)).find((x) => x !== undefined)
  }

  function clear(): void { for (const x of walkers) x.w.dispose(); walkers = [] }

  function rebuild(): void {
    const s = getState()
    const emps = s.staff.employees.slice(0, max)
    const next = emps.map((e) => {
      const enc = firstEnclosure(s, e)
      const model = STAFF_WALKERS.MODEL[e.job]
      const r = enc?.rect
      return `${e.id}:${model}:${enc?.id ?? '-'}:${r ? `${r.x},${r.z},${r.w},${r.d}` : ''}:${world.models.has(model) ? 1 : 0}`
    }).join(';')
    if (next === key) return
    key = next
    clear()
    const seen = new Map<number, number>() // enclos -> employés déjà placés dessus
    for (const e of emps) {
      const enc = firstEnclosure(s, e)
      const slot = enc ? (seen.get(enc.id) ?? 0) : 0
      if (enc) seen.set(enc.id, slot + 1)
      const src = world.models.get(STAFF_WALKERS.MODEL[e.job])
      if (!src) continue
      const w = new Walker(src, height, rng, !mobile)
      group.add(w.object)
      const route = repeat(staffRoute(s, e, slot))
      walkers.push({ w, route })
      w.start(route)
    }
  }

  return {
    update(dt: number): void {
      refresh -= dt
      if (refresh <= 0) { refresh = WALKERS.REFRESH_S; rebuild() }
      for (const x of walkers) {
        x.w.update(dt)
        if (x.w.phase === 'off') x.w.start(x.route)
      }
    },
    dispose(): void { clear(); group.removeFromParent() },
  }
}
