import { describe, it, expect } from 'vitest'
import { staffCap, employeeLevel, wage, dailyWages, firstKeeper, staffStep, renewCandidates } from '../../src/sim/staff'
import { advanceTo, step } from '../../src/sim/advance'
import { DAY_MS, HOUR_MS } from '../../src/data/tuning'
import { JOBS } from '../../src/data/staff'
import { animal, enclosure } from './helpers'
import type { GameEvent } from '../../src/sim/types'
import { STAFF_NAMES } from '../../src/data/names'
import { emptyState, T0 } from './helpers'
import type { Employee } from '../../src/sim/types'

const emp = (xpH: number, job: Employee['job'] = 'soigneur'): Employee => ({ id: 1, name: 'X', job, xpH, hiredAt: T0, encIds: [] })

describe('employeeLevel', () => {
  it('suit les seuils d\'expérience', () => {
    expect(employeeLevel(emp(0))).toBe(1)
    expect(employeeLevel(emp(71.9))).toBe(1)
    expect(employeeLevel(emp(72))).toBe(2)
    expect(employeeLevel(emp(168))).toBe(3)
    expect(employeeLevel(emp(336))).toBe(4)
    expect(employeeLevel(emp(672))).toBe(5)
    expect(employeeLevel(emp(5000))).toBe(5)
  })
})

describe('wage', () => {
  it('monte de 20 % par niveau, arrondi', () => {
    expect(wage('soigneur', 1)).toBe(60)
    expect(wage('soigneur', 3)).toBe(84)
    expect(wage('entretien', 2)).toBe(48)
  })
})

describe('dailyWages', () => {
  it('additionne les salaires', () => {
    const s = emptyState()
    expect(dailyWages(s)).toBe(0)
    s.staff.employees = [emp(0), emp(72, 'entretien')]
    expect(dailyWages(s)).toBe(60 + 48)
  })
})

describe('firstKeeper', () => {
  it('crée Léa niveau 1, prend un id, sans l\'ajouter', () => {
    const s = emptyState()
    const l = firstKeeper(s, [4, 5])
    expect(l).toEqual({ id: 100, name: 'Léa', job: 'soigneur', xpH: 0, hiredAt: T0, encIds: [4, 5] })
    expect(s.nextId).toBe(101)
    expect(s.staff.employees).toEqual([])
  })
})

describe('STAFF_NAMES', () => {
  it('au moins 30 prénoms distincts, sans Léa ni Margaux', () => {
    expect(STAFF_NAMES.length).toBeGreaterThanOrEqual(30)
    expect(new Set(STAFF_NAMES).size).toBe(STAFF_NAMES.length)
    expect(STAFF_NAMES).not.toContain('Léa')
    expect(STAFF_NAMES).not.toContain('Margaux')
  })
})

const flat = () => ({ ...emptyState().staff, coverAllUntil: 0, renewAt: Number.MAX_SAFE_INTEGER, payDay: Math.floor(T0 / DAY_MS) })

/** État juste avant minuit (le prochain pas franchit le jour), avec salaires de 100. */
function beforeMidnight(coins: number) {
  const midnight = (Math.floor(T0 / DAY_MS) + 1) * DAY_MS
  const s = emptyState({ time: midnight - 600_000, coins })
  s.staff = { ...flat(), payDay: Math.floor((midnight - 600_000) / DAY_MS) }
  s.staff.employees = [emp(0, 'soigneur'), { ...emp(0, 'entretien'), id: 2 }] // 60 + 40
  return { s, midnight }
}

describe('paie de minuit', () => {
  it('paie les salaires au passage de minuit', () => {
    const { s } = beforeMidnight(500)
    const ev = step(s)
    expect(s.coins).toBeLessThanOrEqual(400)
    expect(ev.find((e) => e.kind === 'paie')).toMatchObject({ due: 100, paid: 100 })
  })
  it('la dette est plafonnée à une journée de salaires', () => {
    const { s } = beforeMidnight(30)
    const ev = step(s)
    expect(s.coins).toBeLessThanOrEqual(-70)
    expect(s.coins).toBeGreaterThan(-100)
    expect(ev.find((e) => e.kind === 'paie')).toMatchObject({ due: 100, paid: 30 })
  })
  it('déjà à -100 : reste à -100', () => {
    const { s } = beforeMidnight(-100)
    const ev = step(s)
    expect(s.coins).toBeLessThan(0)
    expect(s.coins).toBeGreaterThanOrEqual(-100)
    expect(ev.find((e) => e.kind === 'paie')).toMatchObject({ due: 100, paid: 0 })
  })
  it('payDay -1 : le premier pas note le jour sans payer', () => {
    const { s } = beforeMidnight(500)
    s.staff.payDay = -1
    const ev: GameEvent[] = []
    staffStep(s, ev)
    expect(s.coins).toBe(500)
    expect(s.staff.payDay).toBe(Math.floor(s.time / DAY_MS))
    expect(ev.some((e) => e.kind === 'paie')).toBe(false)
  })
  it('horloge qui recule : une seule paie ce jour-là', () => {
    const { s, midnight } = beforeMidnight(500)
    const r1 = advanceTo(s, midnight)
    expect(r1.events.filter((e) => e.kind === 'paie')).toHaveLength(1)
    const back = advanceTo(r1.state, midnight - DAY_MS / 2)
    const r2 = advanceTo(back.state, midnight + 600_000)
    expect(r2.events.filter((e) => e.kind === 'paie')).toHaveLength(0)
  })
})

describe('expérience', () => {
  it('niveau 2 à 72 h, salaire 72', () => {
    const s = emptyState({ staff: flat() })
    s.staff.employees = [emp(71.9)]
    const ev: GameEvent[] = []
    staffStep(s, ev)
    expect(employeeLevel(s.staff.employees[0])).toBe(2)
    expect(ev.filter((e) => e.kind === 'niveauEmploye')).toEqual([{ kind: 'niveauEmploye', at: s.time, employeeId: 1, name: 'X', level: 2 }])
    expect(dailyWages(s)).toBe(72)
  })
})

describe('candidats', () => {
  it('premier tirage : 4 candidats, un soigneur et un agent au moins, métiers ouverts', () => {
    const s = emptyState()
    const ev: GameEvent[] = []
    renewCandidates(s, ev)
    expect(s.staff.candidates).toHaveLength(4)
    const jobs = s.staff.candidates.map((c) => c.job)
    expect(jobs).toContain('soigneur')
    expect(jobs).toContain('entretien')
    expect(jobs.every((j) => JOBS[j].open)).toBe(true)
    expect(s.staff.renewAt).toBe(s.time + 12 * HOUR_MS)
    expect(s.staff.renewals).toBe(1)
    expect(new Set(s.staff.candidates.map((c) => c.id)).size).toBe(4)
    expect(ev).toEqual([{ kind: 'candidats', at: s.time }])
  })
  it('même graine, mêmes candidats', () => {
    const a = emptyState(); const b = emptyState()
    renewCandidates(a); renewCandidates(b)
    expect(a.staff.candidates).toEqual(b.staff.candidates)
  })
  it('staffStep renouvelle quand renewAt est atteint', () => {
    const s = emptyState({ staff: { ...flat(), renewAt: T0 } })
    const ev: GameEvent[] = []
    staffStep(s, ev)
    expect(s.staff.candidates).toHaveLength(4)
    expect(ev.some((e) => e.kind === 'candidats')).toBe(true)
  })
})

describe('naissance et affectations', () => {
  it('une naissance complète les trous au même pas', () => {
    const s = emptyState({ staff: flat() })
    s.enclosures = [enclosure(1, 'mouton', 4, 10)]
    s.animals = [animal(1, 'mouton', 'F', 1)]
    s.staff.employees = [{ id: 1, name: 'Léa', job: 'soigneur', xpH: 0, hiredAt: T0, encIds: [] }]
    const ev: GameEvent[] = [{ kind: 'naissance', at: s.time, animalId: 1, motherId: 1 }]
    staffStep(s, ev)
    expect(s.staff.employees[0].encIds).toEqual([1])
  })
})

describe('staffCap', () => {
  it('3 sans maison, puis 6 / 10 / 15 selon son niveau', () => {
    const s = emptyState()
    expect(staffCap(s)).toBe(3)
    s.buildings.push({ slot: 6, type: 'personnel', level: 1 })
    expect(staffCap(s)).toBe(6)
    s.buildings[s.buildings.length - 1].level = 2
    expect(staffCap(s)).toBe(10)
    s.buildings[s.buildings.length - 1].level = 3
    expect(staffCap(s)).toBe(15)
  })
})

import { applyAction } from '../../src/sim/actions'
import { careCoverage } from '../../src/sim/care'
import type { GameState } from '../../src/sim/types'

const hireState = (over: Partial<GameState> = {}): GameState => {
  const s = emptyState({
    coins: 1000,
    enclosures: [enclosure(1, 'mouton'), enclosure(2, 'cochon')],
    animals: [animal(1, 'mouton', 'F', 1), animal(2, 'mouton', 'M', 1), animal(3, 'cochon', 'F', 2)],
    buildings: [{ slot: 0, type: 'ferme', level: 1 }, { slot: 4, type: 'personnel', level: 1 }],
    ...over,
  })
  s.staff.coverAllUntil = 0
  s.staff.candidates = [
    { id: 50, name: 'Hugo', job: 'soigneur', level: 2 },
    { id: 51, name: 'Jade', job: 'entretien', level: 1 },
  ]
  return s
}
const ok = (r: ReturnType<typeof applyAction>) => { if (!r.ok) throw new Error(r.reason); return r.state }
const refused = (r: ReturnType<typeof applyAction>) => (r.ok ? 'ok' : r.reason)

describe('embaucher', () => {
  it('candidat inconnu : Introuvable', () => {
    expect(refused(applyAction(hireState(), { type: 'embaucher', candidateId: 999 }))).toBe('Introuvable.')
  })
  it("un soigneur de niveau 2 arrive avec 72 h d'expérience et reçoit les enclos non suivis", () => {
    const s = ok(applyAction(hireState(), { type: 'embaucher', candidateId: 50 }))
    const e = s.staff.employees[0]
    expect(e).toMatchObject({ name: 'Hugo', job: 'soigneur', xpH: 72, hiredAt: s.time })
    expect(employeeLevel(e)).toBe(2)
    expect(s.staff.candidates.map((c) => c.id)).toEqual([51])
    expect(e.encIds).toEqual([1, 2])
  })
  it('plein : refus avec le plafond (3 sans maison)', () => {
    const s = hireState({ buildings: [{ slot: 0, type: 'ferme', level: 1 }] })
    s.staff.employees = [1, 2, 3].map((i) => ({ id: i, name: 'X', job: 'soigneur' as const, xpH: 0, hiredAt: T0, encIds: [] }))
    expect(refused(applyAction(s, { type: 'embaucher', candidateId: 50 })))
      .toBe('Plus de place à la maison du personnel (3 employés au plus).')
  })
})

describe('licencier', () => {
  it("retire l'employé sans indemnité ; le dernier soigneur parti, plus personne ne suit", () => {
    let s = ok(applyAction(hireState(), { type: 'embaucher', candidateId: 50 }))
    const coins = s.coins
    s = ok(applyAction(s, { type: 'licencier', employeeId: s.staff.employees[0].id }))
    expect(s.staff.employees).toEqual([])
    expect(s.coins).toBe(coins)
    expect(careCoverage(s).covered.size).toBe(0)
  })
  it('inconnu : Introuvable', () => {
    expect(refused(applyAction(hireState(), { type: 'licencier', employeeId: 1 }))).toBe('Introuvable.')
  })
})

describe('affecter', () => {
  const withTeam = () => {
    let s = ok(applyAction(hireState(), { type: 'embaucher', candidateId: 50 }))
    s = ok(applyAction(s, { type: 'embaucher', candidateId: 51 }))
    return s
  }
  it('refus : métier sans enclos, enclos inconnu, agent trop chargé', () => {
    const s = withTeam()
    s.staff.employees.push({ id: 77, name: 'V', job: 'veterinaire', xpH: 0, hiredAt: T0, encIds: [] })
    expect(refused(applyAction(s, { type: 'affecter', employeeId: 77, encIds: [1] }))).toBe("Ce métier ne s'occupe pas d'un enclos.")
    expect(refused(applyAction(s, { type: 'affecter', employeeId: s.staff.employees[0].id, encIds: [1, 99] }))).toBe('Introuvable.')
    const agent = s.staff.employees.find((e) => e.job === 'entretien')!
    s.enclosures.push(...[3, 4, 5, 6].map((i) => enclosure(i, null)))
    expect(refused(applyAction(s, { type: 'affecter', employeeId: agent.id, encIds: [1, 2, 3, 4, 5] }))).toBe('Il ne peut entretenir que 4 enclos.')
    expect(refused(applyAction(s, { type: 'affecter', employeeId: 4242, encIds: [1] }))).toBe('Introuvable.')
  })
  it("la capacité de l'agent ignore la dette", () => {
    const s = withTeam()
    s.coins = -10
    s.enclosures.push(...[3, 4].map((i) => enclosure(i, null)))
    const agent = s.staff.employees.find((e) => e.job === 'entretien')!
    expect(applyAction(s, { type: 'affecter', employeeId: agent.id, encIds: [1, 2, 3, 4] }).ok).toBe(true)
  })
  it("retire les doublons en gardant l'ordre", () => {
    const s = withTeam()
    const k = s.staff.employees.find((e) => e.job === 'soigneur')!
    const r = ok(applyAction(s, { type: 'affecter', employeeId: k.id, encIds: [2, 1, 2] }))
    expect(r.staff.employees.find((e) => e.id === k.id)!.encIds).toEqual([2, 1])
  })
  it('choix manuel gardé : un animal acheté dans A ne déplace pas Léa de B', () => {
    let s = hireState()
    s.staff.employees = [{ id: 1, name: 'Léa', job: 'soigneur', xpH: 0, hiredAt: T0, encIds: [] }]
    s = ok(applyAction(s, { type: 'affecter', employeeId: 1, encIds: [2] }))
    s.merchant.offers = [{ id: 900, species: 'mouton', sex: 'F', stage: 'adulte', price: 10 }]
    s = ok(applyAction(s, { type: 'acheterAnimal', offerId: 900, encId: 1 }))
    expect(s.staff.employees[0].encIds[0]).toBe(2)
  })
})

describe('repartir', () => {
  it("redistribue : le plus peuplé d'abord", () => {
    let s = ok(applyAction(hireState(), { type: 'embaucher', candidateId: 50 }))
    s = ok(applyAction(s, { type: 'affecter', employeeId: s.staff.employees[0].id, encIds: [2] }))
    s = ok(applyAction(s, { type: 'repartir' }))
    expect(s.staff.employees[0].encIds).toEqual([1, 2])
  })
})

describe('dette', () => {
  const debt = () => hireState({ coins: -10 })
  const msg = "Rembourse d'abord la dette : il manque 10 pièces."
  it('refuse les dépenses avec « il manque N pièces »', () => {
    const s = debt()
    for (const a of [
      { type: 'embaucher', candidateId: 50 },
      { type: 'acheterAnimal', offerId: 1, encId: 1 },
      { type: 'batir', slot: 1, building: 'cafe' },
      { type: 'ameliorer', slot: 0 },
      { type: 'agrandirGardeManger' },
      { type: 'construire', rect: { x: 0, z: 0, w: 6, d: 6 } },
      { type: 'tracerChemin', a: { x: 0, z: 0 }, b: { x: 1, z: 0 } },
      { type: 'relierEnclos', encId: 1 },
    ] as const) expect(refused(applyAction(s, a)), a.type).toBe(msg)
  })
  it('arrondit au-dessus', () => {
    expect(refused(applyAction(hireState({ coins: -9.2 }), { type: 'embaucher', candidateId: 50 }))).toBe(msg)
  })
  it('acheterRations : seulement le manque de pièces ; vendre et licencier passent', () => {
    const s = debt()
    expect(refused(applyAction(s, { type: 'acheterRations', food: 'fourrage', n: 1 }))).not.toContain('dette')
    s.staff.employees = [{ id: 1, name: 'Léa', job: 'soigneur', xpH: 0, hiredAt: T0, encIds: [] }]
    expect(applyAction(s, { type: 'licencier', employeeId: 1 }).ok).toBe(true)
    expect(refused(applyAction(s, { type: 'vendre', animalId: 3 }))).not.toContain('dette')
  })
  it("redimensionner : refusé seulement s'il coûte", () => {
    const s = debt()
    const free = refused(applyAction(s, { type: 'redimensionner', encId: 1, rect: { x: 0, z: 0, w: 11, d: 10 } }))
    const costly = refused(applyAction(s, { type: 'redimensionner', encId: 1, rect: { x: 0, z: 0, w: 14, d: 12 } }))
    expect(free).not.toContain('dette')
    expect(costly).toBe(msg)
  })
})
