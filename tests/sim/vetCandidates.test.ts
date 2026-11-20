import { describe, it, expect } from 'vitest'
import { emptyState, employee } from './helpers'
import { applyAction } from '../../src/sim/actions'
import { ensureVetCandidate, renewCandidates } from '../../src/sim/staff'
import { STAFF_TUNING } from '../../src/data/staff'
import type { GameState } from '../../src/sim/types'

const withCentre = (over: Partial<GameState> = {}) =>
  emptyState({ buildings: [{ slot: 0, type: 'ferme', level: 1 }, { slot: 7, type: 'centreVeto', level: 1 }], ...over })
const vets = (s: GameState) => s.staff.candidates.filter((c) => c.job === 'veterinaire')
const ok = (r: ReturnType<typeof applyAction>): GameState => { if (!r.ok) throw new Error(r.reason); return r.state }

describe('un vétérinaire est toujours proposé quand le centre existe', () => {
  it('à chaque renouvellement, sur de nombreuses graines', () => {
    for (let seed = 1; seed <= 200; seed++) {
      const s = withCentre({ rng: seed })
      for (let k = 0; k < 3; k++) {
        renewCandidates(s)
        expect(s.staff.candidates).toHaveLength(STAFF_TUNING.CANDIDATES)
        expect(vets(s).length).toBeGreaterThanOrEqual(1)
      }
    }
  })

  it('premier renouvellement : soigneur et entretien restent garantis', () => {
    for (let seed = 1; seed <= 50; seed++) {
      const s = withCentre({ rng: seed })
      renewCandidates(s)
      expect(s.staff.candidates[0].job).toBe('soigneur')
      expect(s.staff.candidates[1].job).toBe('entretien')
      expect(vets(s).length).toBeGreaterThanOrEqual(1)
    }
  })

  it('pas de vétérinaire forcé sans centre', () => {
    for (let seed = 1; seed <= 50; seed++) {
      const s = emptyState({ rng: seed })
      renewCandidates(s)
      expect(vets(s)).toHaveLength(0)
    }
  })

  it('ensureVetCandidate ne change rien si un vétérinaire est employé ou déjà proposé', () => {
    const a = withCentre(); a.staff.employees.push(employee(500, 'veterinaire'))
    ensureVetCandidate(a)
    expect(a.staff.candidates).toEqual([])
    const b = withCentre(); b.staff.candidates = [{ id: 1, name: 'X', job: 'veterinaire', level: 2 }]
    ensureVetCandidate(b)
    expect(b.staff.candidates).toEqual([{ id: 1, name: 'X', job: 'veterinaire', level: 2 }])
  })

  it('un vétérinaire de niveau 1 prend la place du dernier candidat quand la liste est pleine', () => {
    const s = withCentre()
    s.staff.candidates = [1, 2, 3, 4].map((id) => ({ id, name: 'X', job: 'soigneur' as const, level: 2 as const }))
    ensureVetCandidate(s)
    expect(s.staff.candidates).toHaveLength(4)
    expect(s.staff.candidates[3]).toMatchObject({ job: 'veterinaire', level: 1 })
    expect(s.staff.candidates[0].job).toBe('soigneur')
  })

  it('dès la construction du centre, sans attendre le renouvellement', () => {
    const s = emptyState({ coins: 100000, village: { level: 2, clientsServed: 0 } })
    expect(vets(s)).toHaveLength(0)
    const t = ok(applyAction(s, { type: 'batir', slot: 7, building: 'centreVeto' }))
    expect(vets(t)).toHaveLength(1)
    expect(vets(t)[0].level).toBe(1)
    expect(t.staff.candidates.length).toBeLessThanOrEqual(STAFF_TUNING.CANDIDATES)
    expect(t.nextId).toBeGreaterThan(s.nextId)
  })

  it('quand le dernier vétérinaire est licencié', () => {
    const s = withCentre()
    s.staff.employees.push(employee(500, 'veterinaire'))
    const t = ok(applyAction(s, { type: 'licencier', employeeId: 500 }))
    expect(vets(t)).toHaveLength(1)
  })
})
