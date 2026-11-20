import { describe, it, expect } from 'vitest'
import * as THREE from 'three'
import { Walker } from '../../src/scene/visitorsView'

const source = () => ({
  scene: new THREE.Mesh(new THREE.BoxGeometry(1, 2, 1), new THREE.MeshBasicMaterial()),
  animations: [] as THREE.AnimationClip[],
})
const make = () => new Walker(source(), () => 0, () => 0.5, false)

describe('Walker : fin de parcours', () => {
  for (const n of [2, 3]) {
    it(`une route de ${n} points : arrive, s'estompe puis s'éteint sans erreur`, () => {
      const w = make()
      const route = Array.from({ length: n }, (_, i) => ({ x: i * 0.5, z: 0 }))
      w.start(route)
      expect(() => { for (let i = 0; i < 2000; i++) w.update(0.1) }).not.toThrow()
      expect(w.phase).toBe('off')
    })
  }

  it('une route de moins de 2 points est tout de suite finie', () => {
    const w = make()
    expect(() => { w.start([{ x: 0, z: 0 }]); for (let i = 0; i < 50; i++) w.update(0.1) }).not.toThrow()
    expect(w.phase).toBe('off')
    expect(() => { w.start([]); w.update(0.1) }).not.toThrow()
    expect(w.phase).toBe('off')
  })
})
