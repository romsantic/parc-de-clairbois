import { describe, it, expect } from 'vitest'
import { Box3, BoxGeometry, Group, Mesh } from 'three'
import { resolveClip, fitHeight } from '../../src/scene/animalActor'

describe('resolveClip', () => {
  it('trouve le repos tête basse quel que soit le nom utilisé par le modèle', () => {
    expect(resolveClip('Idle_2_HeadLow', ['Idle', 'Idle_Headlow', 'Walk'])).toBe('Idle_Headlow')
    expect(resolveClip('Idle_2_HeadLow', ['Idle', 'Idle_2_HeadLow'])).toBe('Idle_2_HeadLow')
  })
  it('se rabat sur Idle si le modèle ne connaît pas l’animation', () => {
    expect(resolveClip('Eating', ['Idle', 'Walk'])).toBe('Idle')
  })
  it('comprend les noms préfixés des modèles FBX (« Armature|Idle »)', () => {
    expect(resolveClip('Idle', ['Armature|Jump', 'Armature|Idle'])).toBe('Armature|Idle')
    expect(resolveClip('Walk', ['Armature|Jump', 'Armature|Idle'])).toBe('Armature|Idle')
  })
  it('renvoie undefined pour un modèle sans animation', () => {
    expect(resolveClip('Walk', [])).toBeUndefined()
  })
})

describe('fitHeight', () => {
  it('met l’objet à la bonne hauteur et pose sa base au sol', () => {
    const g = new Group()
    const m = new Mesh(new BoxGeometry(1, 4, 1)) // de y = -2 à y = 2
    m.position.y = 1 // donc de -1 à 3
    g.add(m)
    fitHeight(g, 2)
    const box = new Box3().setFromObject(g)
    expect(box.max.y - box.min.y).toBeCloseTo(2)
    expect(box.min.y).toBeCloseTo(0)
  })
})
