import * as THREE from 'three'
import { ZONES, type Zone } from '../data/zones'
import { FOG_DISSOLVE_S, fogOpacity, zoneSignText } from './fog'
import type { World } from './world'

const TINT: Record<Zone['id'], string> = { prairie: '#b6dc7a', foret: '#5f8f4a', montagne: '#a99a82' }

/** Panneau de texte toujours tourné vers la caméra. */
export function label(text: string): THREE.Sprite {
  const c = document.createElement('canvas')
  c.width = 512; c.height = 128
  const g = c.getContext('2d')!
  g.fillStyle = 'rgba(246,240,225,0.92)'
  g.beginPath(); g.roundRect(8, 16, 496, 96, 28); g.fill()
  g.fillStyle = '#4a4434'
  g.font = '600 46px system-ui, sans-serif'
  g.textAlign = 'center'; g.textBaseline = 'middle'
  g.fillText(text, 256, 66)
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false }))
  s.scale.set(8, 2, 1)
  s.renderOrder = 5
  return s
}

const FOG_PER_ZONE = 4 // 2 zones fermables x 4 = 8 panneaux au plus
const FOG_BASE_OPACITY = 0.8
const FOG_DAY = new THREE.Color('#f4f6f8')
const FOG_NIGHT = new THREE.Color('#3a4560')

/** Texture douce de brume : tache blanche au bord fondu, dessinée une fois. */
function fogTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas')
  c.width = c.height = 128
  const g = c.getContext('2d')!
  const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64)
  grad.addColorStop(0, 'rgba(255,255,255,1)')
  grad.addColorStop(0.5, 'rgba(255,255,255,0.55)')
  grad.addColorStop(1, 'rgba(255,255,255,0)')
  g.fillStyle = grad
  g.fillRect(0, 0, 128, 128)
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

interface Puff { sprite: THREE.Sprite; mat: THREE.SpriteMaterial; bx: number; bz: number; amp: number; speed: number; phase: number }
interface Fog { zone: Zone; puffs: Puff[]; state: 'closed' | 'dissolving' | 'open'; elapsed: number }

/**
 * Teinte légère de chaque zone du zoo ; zones verrouillées grisées et couvertes de brume qui dérive.
 * `setLevel` reconstruit teinte et panneaux (et libère les anciens) ; au chargement la zone s'affiche ouverte
 * directement, mais si le niveau monte en cours de partie la brume se dissipe en FOG_DISSOLVE_S secondes.
 * `update(dt)` à appeler à chaque image. `setNight(amount)` (0 jour, 1 nuit) teinte la brume : prévu pour la nuit.
 */
export function createZonesView(world: World): { setLevel(level: number): void; update(dt: number): void; setNight(amount: number): void } {
  let current: THREE.Object3D[] = []
  const clear = () => {
    for (const o of current) {
      o.removeFromParent()
      const m = o as THREE.Mesh & THREE.Sprite
      if (m.isSprite) { m.material.map?.dispose(); m.material.dispose() }
      else { m.geometry.dispose(); (m.material as THREE.Material).dispose() }
    }
    current = []
  }
  const add = (o: THREE.Object3D) => { world.scene.add(o); current.push(o) }

  // Brume : créée une fois pour toutes les zones qui ont un nom caché, partageant une seule texture.
  const fogTex = fogTexture()
  const fogColor = new THREE.Color(FOG_DAY)
  let night = 0
  const fogs: Fog[] = ZONES.filter((z) => z.hiddenName).map((zone) => {
    const r = zone.rect
    const puffs: Puff[] = []
    for (let i = 0; i < FOG_PER_ZONE; i++) {
      const mat = new THREE.SpriteMaterial({ map: fogTex, color: FOG_DAY, transparent: true, opacity: 0, depthWrite: false })
      const sprite = new THREE.Sprite(mat)
      const bx = r.x + r.w * (0.18 + 0.64 * (i / (FOG_PER_ZONE - 1)))
      const bz = r.z + r.d * (i % 2 ? 0.35 : 0.65)
      sprite.scale.set(r.w * 0.5, 6, 1)
      sprite.renderOrder = 4
      sprite.visible = false
      sprite.position.set(bx, world.groundHeight(bx, bz) + 2.2, bz)
      world.scene.add(sprite)
      puffs.push({ sprite, mat, bx, bz, amp: 2.5 + i * 0.7, speed: 0.12 + i * 0.03, phase: i * 1.7 })
    }
    return { zone, puffs, state: 'open', elapsed: 0 }
  })
  let t = 0
  let started = false

  const applyOpacity = (f: Fog) => {
    const o = f.state === 'open' ? 0 : FOG_BASE_OPACITY * fogOpacity(f.state === 'dissolving', f.elapsed)
    for (const p of f.puffs) { p.mat.opacity = o; p.sprite.visible = o > 0.005 }
  }
  const applyTint = () => {
    fogColor.lerpColors(FOG_DAY, FOG_NIGHT, night)
    for (const f of fogs) for (const p of f.puffs) p.mat.color.copy(fogColor)
  }

  return {
    setLevel(villageLevel: number) {
      clear()
      for (const f of fogs) {
        const locked = f.zone.unlockLevel > villageLevel
        if (locked) { f.state = 'closed'; f.elapsed = 0 }
        else if (f.state === 'closed' && started) { f.state = 'dissolving'; f.elapsed = 0 }
        else if (f.state !== 'dissolving') f.state = 'open'
        applyOpacity(f)
      }
      started = true
      for (const z of ZONES) {
        const locked = z.unlockLevel > villageLevel
        const r = z.rect
        const geo = new THREE.PlaneGeometry(r.w, r.d, Math.ceil(r.w), Math.ceil(r.d))
        geo.rotateX(-Math.PI / 2)
        geo.translate(r.x + r.w / 2, 0, r.z + r.d / 2)
        const p = geo.attributes.position as THREE.BufferAttribute
        for (let i = 0; i < p.count; i++) p.setY(i, world.groundHeight(p.getX(i), p.getZ(i)) + 0.02)
        geo.computeVertexNormals()
        const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({
          color: locked ? '#8b8f86' : TINT[z.id], roughness: 1, transparent: true, opacity: locked ? 0.45 : 0.22,
          polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1, depthWrite: false,
        }))
        mesh.receiveShadow = true
        mesh.name = `zone:${z.id}`
        add(mesh)
        const s = label(zoneSignText(z, villageLevel))
        // Zone ouverte : nom discret sur son bord nord, pour ne pas gêner les enclos.
        const lz = locked ? r.z + r.d / 2 : r.z + 1.2
        s.position.set(r.x + r.w / 2, world.groundHeight(r.x + r.w / 2, lz) + (locked ? 3 : 1.6), lz)
        s.scale.set(locked ? 11 : 5, locked ? 2.75 : 1.25, 1)
        add(s)
      }
    },
    update(dt: number) {
      t += dt
      for (const f of fogs) {
        if (f.state === 'open') continue
        if (f.state === 'dissolving') {
          f.elapsed += dt
          if (f.elapsed >= FOG_DISSOLVE_S) f.state = 'open'
          applyOpacity(f)
          if (f.state === 'open') continue
        }
        for (const p of f.puffs) p.sprite.position.x = p.bx + Math.sin(t * p.speed + p.phase) * p.amp
      }
    },
    setNight(amount: number) {
      night = Math.min(1, Math.max(0, amount))
      applyTint()
    },
  }
}
