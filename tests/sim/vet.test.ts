import { describe, it, expect } from 'vitest'
import { animal, emptyState, employee, enclosure, sick, T0 } from './helpers'
import { step } from '../../src/sim/advance'
import { applyAction } from '../../src/sim/actions'
import { renewCandidates } from '../../src/sim/staff'
import {
  canTreat, careCost, careDurationMs, careQueue, centerLevel, isolateRefusal, quarantinePlaces, quarantineUsed, untreatable, vaccinateRefusal, vaccineCost, workingVets,
} from '../../src/sim/vet'
import { HOUR_MS, TUNING } from '../../src/data/tuning'
import type { Animal, GameEvent, GameState, Health } from '../../src/sim/types'

/** Un parc avec un centre de niveau `level` (0 = aucun) et `vets` vétérinaires ; les animaux sont des moutons sauf indication. */
function world(level: number, vets: number, animals: Animal[] = [], over: Partial<GameState> = {}): GameState {
  const buildings: GameState['buildings'] = [{ slot: 0, type: 'ferme', level: 1 }]
  if (level > 0) buildings.push({ slot: 7, type: 'centreVeto', level })
  return emptyState({
    buildings,
    pantry: { fourrage: 500, viande: 500, capacity: 1000 },
    enclosures: [enclosure(1, 'mouton', 20, 20), enclosure(2, 'loup', 20, 20)],
    animals, ticketPrice: 0,
    village: { level: 2, clientsServed: 0 },
    staff: {
      employees: Array.from({ length: vets }, (_, i) => employee(i + 1, 'veterinaire', { hiredAt: T0 + i })),
      candidates: [], renewAt: T0 + 100 * 24 * HOUR_MS, renewals: 1, payDay: -1, coverAllUntil: Number.MAX_SAFE_INTEGER,
    },
    ...over,
  })
}

const mouton = (id: number, health: Health = { status: 'ok' }) => animal(id, 'mouton', id % 2 ? 'F' : 'M', 1, { health })
const run = (s: GameState, n: number): GameEvent[] => {
  const ev: GameEvent[] = []
  for (let i = 0; i < n; i++) ev.push(...step(s))
  return ev
}
const STEPS_PER_H = HOUR_MS / TUNING.STEP_MS
const careUntil = (a: Animal) => (a.health.status === 'malade' ? a.health.careUntil : undefined)

describe('le centre soigne', () => {
  it('un repéré est soigné seul', () => {
    const s = world(1, 1, [mouton(1, sick(T0))])
    const ev = run(s, 1)
    expect(careUntil(s.animals[0])).toBe(s.time + 2 * HOUR_MS)
    expect(s.coins).toBe(980)
    expect(ev.find((e) => e.kind === 'soigne')).toMatchObject({ animalId: 1, disease: 'indigestion', cost: 20 })
    run(s, 2 * STEPS_PER_H)
    expect(s.animals[0].health).toEqual({ status: 'ok' })
    expect(s.stats.counts.soins).toBe(1)
    expect(s.animals[0].lastFedAt).toBe(s.time) // l'indigestion repart de zéro
  })

  it('non repéré = pas soigné', () => {
    const s = world(1, 1, [mouton(1, sick(T0, { detectedAt: null }))])
    s.staff.coverAllUntil = 0 // personne ne suit l'animal : sa maladie reste inconnue (sauf au stade grave)
    run(s, 3)
    expect(careUntil(s.animals[0])).toBeNull()
    expect(s.coins).toBe(1000)
  })

  it("file d'attente : le plus grave d'abord, puis le plus ancien", () => {
    const s = world(1, 1, [
      mouton(1, sick(T0, { detectedAt: T0 })), // léger ancien
      mouton(2, sick(T0, { stage: 2, detectedAt: T0 + 5 * HOUR_MS })), // grave récent
      mouton(3, sick(T0, { detectedAt: T0 + 5 * HOUR_MS })), // léger récent
    ])
    expect(careQueue(s).map((a) => a.id)).toEqual([2, 1, 3])
    run(s, 1)
    expect(careUntil(s.animals[1])).not.toBeNull() // le grave est pris en premier
    expect(careQueue(s).map((a) => a.id)).toEqual([1, 3]) // il en reste 2 en attente
  })

  it('places : 2 vétérinaires en même temps aux niveaux 1 à 4, 3 au niveau 5, soins × 0,6', () => {
    const sicks = () => [1, 2, 3, 4].map((i) => mouton(i, sick(T0)))
    const a = world(1, 3, sicks())
    expect(workingVets(a)).toHaveLength(2)
    run(a, 1)
    expect(a.animals.filter((x) => careUntil(x) !== null)).toHaveLength(2)

    const b = world(5, 3, sicks())
    expect(workingVets(b)).toHaveLength(3)
    run(b, 1)
    expect(b.animals.filter((x) => careUntil(x) !== null)).toHaveLength(3)
    // 2 h × 0,6 = 1 h 12 min, arrondi au pas : 1 h 20
    expect(careUntil(b.animals[0])).toBe(b.time + 80 * 60_000)
  })

  it("la durée suit l'expérience du vétérinaire et la caisse dans le rouge", () => {
    const s = world(1, 1, [mouton(1, sick(T0))])
    const vet = s.staff.employees[0]
    expect(careDurationMs(s, 'indigestion', vet)).toBe(2 * HOUR_MS)
    vet.xpH = 672 // niveau 5 : × 1,4 plus vite : 2 h / 1,4 = 85,7 min -> 90 min
    expect(careDurationMs(s, 'indigestion', vet)).toBe(90 * 60_000)
    vet.xpH = 0
    s.coins = -1 // efficacité 0,5 : 4 h
    expect(careDurationMs(s, 'indigestion', vet)).toBe(4 * HOUR_MS)
  })

  it('soignable selon le niveau : blessure avec un centre 1 attend, avec un centre 2 est soignée', () => {
    const hurt = () => [mouton(1, sick(T0, { disease: 'blessure' }))]
    const a = world(1, 1, hurt())
    expect(canTreat(a, 'blessure')).toBe(false)
    expect(untreatable(a).map((x) => x.id)).toEqual([1])
    run(a, 3)
    expect(careUntil(a.animals[0])).toBeNull()
    const b = world(2, 1, hurt())
    run(b, 1)
    expect(careUntil(b.animals[0])).not.toBeNull()
    expect(b.coins).toBe(1000 - 20)
  })

  it('sans centre : personne n\'est soigné', () => {
    const s = world(0, 1, [mouton(1, sick(T0))])
    expect(centerLevel(s)).toBe(0)
    expect(workingVets(s)).toEqual([])
    expect(untreatable(s)).toHaveLength(1)
    run(s, 3)
    expect(careUntil(s.animals[0])).toBeNull()
  })

  it('sans vétérinaire : personne n\'est soigné, mais la file reste vide', () => {
    const s = world(1, 0, [mouton(1, sick(T0))])
    expect(untreatable(s)).toHaveLength(1)
    run(s, 3)
    expect(careUntil(s.animals[0])).toBeNull()
  })

  it('prix : au moins 20, 10/25/40 % du prix de l\'espèce', () => {
    expect(careCost(mouton(1, sick(T0)))).toBe(20)
    expect(careCost(animal(2, 'loup', 'M', 2, { health: sick(T0, { stage: 2 }) }))).toBe(625)
    expect(careCost(animal(2, 'loup', 'M', 2, { health: sick(T0, { stage: 3 }) }))).toBe(1000)
  })
})

describe('Review Focus 2 : la caisse ne passe jamais sous zéro pour un soin', () => {
  it('le soin attend, puis commence quand la caisse est revenue', () => {
    const s = world(1, 1, [mouton(1, sick(T0))], { coins: 10 })
    run(s, 3)
    expect(s.coins).toBe(10)
    expect(careUntil(s.animals[0])).toBeNull()
    s.coins = 100
    run(s, 1)
    expect(careUntil(s.animals[0])).not.toBeNull()
    expect(s.coins).toBe(80)
  })

  it('en attente, le malade continue de s\'aggraver', () => {
    const s = world(1, 1, [mouton(1, sick(T0))], { coins: 10 })
    run(s, 24 * STEPS_PER_H + 1)
    const h = s.animals[0].health
    expect(h.status === 'malade' && h.stage).toBe(2)
  })

  it('un malade moins cher derrière lui est soigné en premier', () => {
    const s = world(1, 1, [
      mouton(1, sick(T0)),
      animal(2, 'loup', 'M', 2, { health: sick(T0, { stage: 2, detectedAt: T0 }) }), // 625 pour un loup grave
    ], { coins: 25 })
    run(s, 1)
    expect(careUntil(s.animals[0])).not.toBeNull()
    expect(careUntil(s.animals[1])).toBeNull()
    expect(s.coins).toBe(5)
  })
})

describe('Review Focus 1 : vétérinaire parti, animal disparu', () => {
  it('un vétérinaire licencié en plein soin : soin annulé, le stade repart, l\'animal reprend sa place dans la file', () => {
    const s = world(1, 2, [mouton(1, sick(T0))])
    run(s, 2)
    const vetId = (s.animals[0].health as Extract<Health, { status: 'malade' }>).vetId!
    s.staff.employees = s.staff.employees.filter((e) => e.id !== vetId)
    const ev = run(s, 1) // l'autre vétérinaire est libre : l'animal est repris dans le même pas
    expect(ev.filter((e) => e.kind === 'soigne')).toHaveLength(1)
    const h = s.animals[0].health as Extract<Health, { status: 'malade' }>
    expect(h.vetId).not.toBe(vetId)
    expect(h.stage).toBe(1)
  })

  it('annulation sans autre vétérinaire : stageSince repart à maintenant', () => {
    const s = world(1, 1, [mouton(1, sick(T0 - 20 * HOUR_MS))])
    run(s, 2)
    s.staff.employees = []
    run(s, 1)
    const h = s.animals[0].health as Extract<Health, { status: 'malade' }>
    expect(h.careUntil).toBeNull()
    expect(h.vetId).toBeNull()
    expect(h.stageSince).toBe(s.time)
    expect(careQueue(s).map((a) => a.id)).toEqual([1])
  })

  it('un vétérinaire qui ne travaille plus (centre disparu) annule le soin', () => {
    const s = world(1, 1, [mouton(1, sick(T0))])
    run(s, 2)
    s.buildings = s.buildings.filter((b) => b.type !== 'centreVeto')
    run(s, 1)
    expect(careUntil(s.animals[0])).toBeNull()
  })

  it('animal mort ou retiré pendant un soin : la place du vétérinaire se libère et la file repart', () => {
    const s = world(1, 1, [mouton(1, sick(T0)), mouton(2, sick(T0, { detectedAt: T0 + 1 }))])
    run(s, 1)
    expect(careUntil(s.animals[0])).not.toBeNull()
    s.animals = s.animals.filter((a) => a.id !== 1)
    run(s, 1)
    expect(careUntil(s.animals[0])).not.toBeNull() // le suivant a pris la place
  })

  it('animal mort en quarantaine : la place se libère', () => {
    const s = world(3, 0, [mouton(1, sick(T0, { quarantined: true })), mouton(2, sick(T0, { quarantined: true }))])
    expect(quarantineUsed(s)).toBe(2)
    expect(quarantinePlaces(s)).toBe(2)
    s.animals = s.animals.filter((a) => a.id !== 1)
    expect(quarantineUsed(s)).toBe(1)
  })

  it('un animal guéri sort de quarantaine tout seul', () => {
    const s = world(3, 1, [mouton(1, sick(T0, { quarantined: true }))])
    run(s, 1 + 2 * STEPS_PER_H)
    expect(s.animals[0].health).toEqual({ status: 'ok' })
    expect(quarantineUsed(s)).toBe(0)
  })
})

describe('vaccination', () => {
  const full = () => world(4, 1, [mouton(1), mouton(2), mouton(3)])
  it('refus avec leurs textes exacts', () => {
    expect(applyAction(world(3, 1, [mouton(1)]), { type: 'vacciner', encId: 1 })).toEqual({ ok: false, reason: 'Le centre vétérinaire doit être au niveau 4.' })
    expect(applyAction(world(4, 0, [mouton(1)]), { type: 'vacciner', encId: 1 })).toEqual({ ok: false, reason: 'Il faut un vétérinaire au centre.' })
    expect(applyAction(world(4, 1, []), { type: 'vacciner', encId: 1 })).toEqual({ ok: false, reason: 'Aucun animal dans cet enclos.' })
    const protectedEnc = full()
    protectedEnc.enclosures[0].vaccinatedUntil = protectedEnc.time + 30 * HOUR_MS
    expect(applyAction(protectedEnc, { type: 'vacciner', encId: 1 })).toEqual({ ok: false, reason: 'Cet enclos est encore protégé 30 h.' })
    expect(applyAction({ ...full(), coins: 29 }, { type: 'vacciner', encId: 1 })).toEqual({ ok: false, reason: 'Pas assez de pièces (il en faut 30).' })
    expect(applyAction(full(), { type: 'vacciner', encId: 9 })).toEqual({ ok: false, reason: 'Introuvable.' })
  })

  it('refusée dans le rouge', () => {
    const r = applyAction({ ...full(), coins: -5 }, { type: 'vacciner', encId: 1 })
    expect(r).toEqual({ ok: false, reason: "Rembourse d'abord la dette : il manque 5 pièces." })
  })

  it('réussie : coût, protection 5 jours, compteur', () => {
    const s = full()
    expect(vaccineCost(s, 1)).toBe(30)
    const r = applyAction(s, { type: 'vacciner', encId: 1 })
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.state.coins).toBe(970)
    expect(r.state.enclosures[0].vaccinatedUntil).toBe(s.time + 5 * 24 * HOUR_MS)
    expect(r.state.stats.counts.vaccinations).toBe(1)
  })

  it('10 pièces par animal au-delà de 3, et on revaccine sous 24 h', () => {
    const s = world(4, 1, Array.from({ length: 5 }, (_, i) => mouton(i + 1)))
    expect(vaccineCost(s, 1)).toBe(50)
    s.enclosures[0].vaccinatedUntil = s.time + 24 * HOUR_MS
    expect(applyAction(s, { type: 'vacciner', encId: 1 }).ok).toBe(true)
  })
})

describe('quarantaine', () => {
  const sickWorld = (level = 3) => world(level, 1, [mouton(1, sick(T0, { disease: 'grippe' })), mouton(2, sick(T0, { detectedAt: null })), mouton(3)])
  it('refus avec leurs textes exacts', () => {
    expect(applyAction(sickWorld(2), { type: 'isoler', animalId: 1 })).toEqual({ ok: false, reason: 'Le centre vétérinaire doit être au niveau 3.' })
    expect(applyAction(sickWorld(), { type: 'isoler', animalId: 3 })).toEqual({ ok: false, reason: "Cet animal n'est pas malade." })
    expect(applyAction(sickWorld(), { type: 'isoler', animalId: 2 })).toEqual({ ok: false, reason: "Sa maladie n'a pas encore été repérée." })
    const full = world(3, 1, [1, 2, 3].map((i) => mouton(i, sick(T0, { quarantined: i < 3 }))))
    expect(applyAction(full, { type: 'isoler', animalId: 3 })).toEqual({ ok: false, reason: 'La quarantaine est pleine (2 places).' })
    const already = world(3, 1, [mouton(1, sick(T0, { quarantined: true }))])
    expect(applyAction(already, { type: 'isoler', animalId: 1 })).toEqual({ ok: false, reason: 'Il est déjà en quarantaine.' })
  })

  it('isoler puis remettre', () => {
    const r = applyAction(sickWorld(), { type: 'isoler', animalId: 1 })
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.state.animals[0].health).toMatchObject({ quarantined: true })
    expect(quarantineUsed(r.state)).toBe(1)
    const back = applyAction(r.state, { type: 'remettre', animalId: 1 })
    expect(back.ok && back.state.animals[0].health).toMatchObject({ quarantined: false })
  })

  it('remettre refuse un animal qui n\'y est pas', () => {
    expect(applyAction(sickWorld(), { type: 'remettre', animalId: 1 })).toEqual({ ok: false, reason: "Il n'est pas en quarantaine." })
    expect(applyAction(sickWorld(), { type: 'remettre', animalId: 3 })).toEqual({ ok: false, reason: "Il n'est pas en quarantaine." })
  })
})

describe('vente et amélioration', () => {
  it('un malade ne se vend pas', () => {
    expect(applyAction(world(1, 1, [mouton(1, sick(T0))]), { type: 'vendre', animalId: 1 }))
      .toEqual({ ok: false, reason: "Il doit guérir avant d'être vendu." })
  })

  it("le centre s'améliore jusqu'au niveau 5 (500 / 1 200 / 2 500 / 5 000), pas au-delà", () => {
    let s = world(1, 0, [], { coins: 10_000 })
    for (const price of [500, 1200, 2500, 5000]) {
      const before = s.coins
      const r = applyAction(s, { type: 'ameliorer', slot: 7 })
      expect(r.ok).toBe(true)
      if (!r.ok) return
      expect(before - r.state.coins).toBe(price)
      s = r.state
    }
    expect(centerLevel(s)).toBe(5)
    s.coins = 10_000
    expect(applyAction(s, { type: 'ameliorer', slot: 7 })).toEqual({ ok: false, reason: 'Ce bâtiment est déjà au niveau maximum.' })
  })
})

describe('candidats vétérinaires', () => {
  const jobsDrawn = (s: GameState): Set<string> => {
    const jobs = new Set<string>()
    for (let i = 0; i < 400; i++) { renewCandidates(s); for (const c of s.staff.candidates) jobs.add(c.job) }
    return jobs
  }
  it('sans centre, jamais de vétérinaire', () => {
    expect(jobsDrawn(world(0, 0)).has('veterinaire')).toBe(false)
  })
  it('avec un centre, des vétérinaires se présentent (et toujours des soigneurs et des agents)', () => {
    const jobs = jobsDrawn(world(1, 0))
    expect(jobs.has('veterinaire')).toBe(true)
    expect(jobs.has('soigneur')).toBe(true)
    expect(jobs.has('entretien')).toBe(true)
  })
})

describe('règles partagées avec l\'interface', () => {
  it('isolateRefusal : null quand permis, sinon le même texte que l\'action', () => {
    const ok = world(3, 1, [mouton(1, sick(T0))])
    expect(isolateRefusal(ok, 1)).toBeNull()
    expect(applyAction(ok, { type: 'isoler', animalId: 1 }).ok).toBe(true)
    const small = world(2, 1, [mouton(1, sick(T0))])
    const r = applyAction(small, { type: 'isoler', animalId: 1 })
    expect(isolateRefusal(small, 1)).toBe('Le centre vétérinaire doit être au niveau 3.')
    expect(r.ok === false && r.reason).toBe(isolateRefusal(small, 1))
    expect(isolateRefusal(world(3, 1, [mouton(1, sick(T0, { detectedAt: null }))]), 1)).toBe("Sa maladie n'a pas encore été repérée.")
  })
  it('vaccinateRefusal : ne regarde pas l\'argent', () => {
    const ok = world(4, 1, [mouton(1)], { coins: 0 })
    expect(vaccinateRefusal(ok, 1)).toBeNull()
    expect(applyAction(ok, { type: 'vacciner', encId: 1 }).ok).toBe(false) // refusé pour l'argent, pas par la règle
    expect(vaccinateRefusal(world(4, 0, [mouton(1)]), 1)).toBe('Il faut un vétérinaire au centre.')
    expect(vaccinateRefusal(world(4, 1, []), 1)).toBe('Aucun animal dans cet enclos.')
  })
})
