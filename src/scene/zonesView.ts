import * as THREE from 'three'
import { ZONES, type Zone } from '../data/zones'
import type { World } from './world'

const TINT: Record<Zone['id'], string> = { prairie: '#b6dc7a', foret: '#5f8f4a', montagne: '#a99a82' }

/** Panneau de texte toujours tourné vers la caméra. */
function label(text: string): THREE.Sprite {
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

/** Teinte légère de chaque zone du zoo ; zones verrouillées grisées avec leur niveau. */
export function drawZones(world: World, villageLevel: number): void {
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
    world.scene.add(mesh)
    const s = label(locked ? `${z.name} · niveau ${z.unlockLevel}` : z.name)
    // Zone ouverte : nom discret sur son bord nord, pour ne pas gêner les enclos.
    const lz = locked ? r.z + r.d / 2 : r.z + 1.2
    s.position.set(r.x + r.w / 2, world.groundHeight(r.x + r.w / 2, lz) + (locked ? 3 : 1.6), lz)
    if (!locked) s.scale.set(5, 1.25, 1)
    world.scene.add(s)
  }
}
