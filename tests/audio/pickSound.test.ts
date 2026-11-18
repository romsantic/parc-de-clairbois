import { describe, it, expect } from 'vitest'
import { pickEffect } from '../../src/audio/pickSound'
import type { GameState } from '../../src/sim/types'

const s = { enclosures: [{ id: 1, species: 'mouton' }, { id: 2, species: 'alpaga' }, { id: 3, species: null }], animals: [{ enclosureId: 1 }, { enclosureId: 2 }] } as unknown as GameState

describe('son de sélection', () => {
  it("enclos avec animaux : cri de l'espèce", () => expect(pickEffect({ kind: 'enclos', id: 1 }, s)).toEqual({ cry: 'criMouton' }))
  it('espèce sans cri, enclos vide : clic', () => {
    expect(pickEffect({ kind: 'enclos', id: 2 }, s)).toBe('clic')
    expect(pickEffect({ kind: 'enclos', id: 3 }, s)).toBe('clic')
  })
  it('bâtiment : clic ; sol ou rien : silence', () => {
    expect(pickEffect({ kind: 'emplacement', slot: 0 }, s)).toBe('clic')
    expect(pickEffect({ kind: 'decor', index: 0 }, s)).toBe('clic')
    expect(pickEffect({ kind: 'rien' }, s)).toBeNull()
  })
})
