import * as THREE from 'three'
import type { GameState } from '../sim/types'
import { PATH_STYLE_BY_LEVEL, PATHS_TUNING } from '../data/paths'
import { createRng } from '../core/rng'
import type { World } from './world'
import { createJunctionDisc, createPath, type PathStyle } from './path'

/**
 * Chemins construits par le joueur : un ruban droit par segment, un disque à chaque bout.
 * On ne reconstruit que si les segments ou le niveau du village changent.
 */
export function createPathsView(world: World) {
  let group: THREE.Group | null = null
  let shownKey = ''
  const ground = (x: number, z: number) => Math.max(world.groundHeight(x, z), -0.05)

  function dispose() {
    if (!group) return
    group.removeFromParent()
    const mats = new Set<THREE.Material>()
    group.traverse((o) => {
      const m = o as THREE.Mesh
      if (!m.isMesh) return
      m.geometry.dispose()
      for (const mat of Array.isArray(m.material) ? m.material : [m.material]) mats.add(mat)
    })
    mats.forEach((m) => { if (!m.userData.keep) m.dispose() }) // les textures en cache restent partagées
    group = null
  }

  return {
    update(state: GameState) {
      const level = state.village.level
      const key = `${level}|${state.paths.map((p) => `${p.id}:${p.a.x},${p.a.z},${p.b.x},${p.b.z}`).join(';')}`
      if (key === shownKey) return
      shownKey = key
      dispose()
      if (state.paths.length === 0) return
      const style = (PATH_STYLE_BY_LEVEL[Math.min(3, Math.max(1, Math.round(level) || 1))] ?? 1) as PathStyle
      const rng = createRng(4242) // même rendu à chaque reconstruction
      const width = PATHS_TUNING.WIDTH_M
      group = new THREE.Group()
      const ends = new Set<string>()
      for (const s of state.paths) {
        group.add(createPath([s.a, s.b], { style, lanterns: style === 3, ground, rng, width }))
        for (const p of [s.a, s.b]) {
          const k = `${p.x},${p.z}`
          if (ends.has(k)) continue // un seul disque par jonction
          ends.add(k)
          group.add(createJunctionDisc(p, { style, width, ground, rng }))
        }
      }
      world.scene.add(group)
    },
  }
}
