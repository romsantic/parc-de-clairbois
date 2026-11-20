import * as THREE from 'three'
import type { GameState, Health } from '../sim/types'
import { SICK_ICON } from '../data/visuals'
import type { World } from './world'
import type { AnimalActor } from './animalActor'

/** Style de l'icône d'un animal : invisible s'il va bien ou si personne ne l'a encore repéré. */
export function sickIconStyle(h: Health): { color: string; visible: boolean } {
  if (h.status !== 'malade' || h.detectedAt === null) return { color: SICK_ICON.STAGES[0], visible: false }
  if (h.careUntil !== null) return { color: SICK_ICON.CARE, visible: true }
  return { color: SICK_ICON.STAGES[h.stage - 1], visible: true }
}

/** Croix épaisse à bord crème, dessinée sur un canvas (une seule texture par couleur). */
function crossTexture(color: string): THREE.CanvasTexture {
  const c = document.createElement('canvas')
  c.width = c.height = 128
  const ctx = c.getContext('2d')!
  const draw = (fill: string, grow: number) => {
    ctx.fillStyle = fill
    ctx.beginPath(); ctx.roundRect(46 - grow, 12 - grow, 36 + 2 * grow, 104 + 2 * grow, 8); ctx.fill()
    ctx.beginPath(); ctx.roundRect(12 - grow, 46 - grow, 104 + 2 * grow, 36 + 2 * grow, 8); ctx.fill()
  }
  draw('#fbf3df', 6)
  draw(color, 0)
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

interface Icon { sprite: THREE.Sprite; headRel: number; pulse: boolean; phase: number }

/**
 * Une petite croix colorée au-dessus de chaque animal malade et repéré.
 * Les sprites ne sont recréés que quand la liste (ou une couleur) change ; ensuite, seule leur position bouge.
 */
export function createSickIcons(world: World) {
  const textures = new Map<string, THREE.CanvasTexture>()
  const mats = new Map<string, THREE.SpriteMaterial>()
  const icons = new Map<number, Icon>()
  let signature = ''
  let t = 0

  function material(color: string) {
    let m = mats.get(color)
    if (!m) {
      let tex = textures.get(color)
      if (!tex) { tex = crossTexture(color); textures.set(color, tex) }
      m = new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true })
      mats.set(color, m)
    }
    return m
  }

  function clear() {
    for (const i of icons.values()) i.sprite.removeFromParent()
    icons.clear()
  }

  return {
    update(state: GameState, actors: Map<number, AnimalActor>, dt = 0) {
      t += dt
      // Animaux à marquer : malades, repérés, visibles (pas en quarantaine), avec leur acteur déjà chargé.
      const wanted: { id: number; color: string; stage: number }[] = []
      for (const a of state.animals) {
        const h = a.health
        if (h.status !== 'malade' || h.quarantined || !actors.has(a.id)) continue
        const st = sickIconStyle(h)
        if (st.visible) wanted.push({ id: a.id, color: st.color, stage: h.careUntil === null ? h.stage : 0 })
      }
      const sig = wanted.map((w) => `${w.id}:${w.color}:${w.stage === 3 ? 'p' : ''}`).join(',')
      if (sig !== signature) {
        signature = sig
        clear()
        for (const w of wanted) {
          const actor = actors.get(w.id)!
          const sprite = new THREE.Sprite(material(w.color))
          sprite.renderOrder = 6
          const box = new THREE.Box3().setFromObject(actor.object)
          const sy = actor.object.scale.y || 1
          icons.set(w.id, { sprite, headRel: (box.max.y - actor.object.position.y) / sy, pulse: w.stage === 3, phase: w.id })
          world.scene.add(sprite)
        }
      }
      for (const [id, i] of icons) {
        const o = actors.get(id)!.object
        i.sprite.position.set(o.position.x, o.position.y + i.headRel * o.scale.y + SICK_ICON.ABOVE_HEAD, o.position.z)
        const k = i.pulse ? 1 + SICK_ICON.PULSE_AMP * Math.sin(t * SICK_ICON.PULSE_SPEED + i.phase) : 1
        i.sprite.scale.setScalar(SICK_ICON.SIZE * k)
      }
    },
  }
}
