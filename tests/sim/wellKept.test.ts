import { describe, it, expect } from 'vitest'
import { advanceTo } from '../../src/sim/advance'
import { careQueue } from '../../src/sim/vet'
import { DAY_MS } from '../../src/data/tuning'
import type { GameEvent, GameState } from '../../src/sim/types'
import { hameauPark, wellKeptPark } from './helpers'

interface Run { deaths: number; sick: number; treated: number; minCoins: number; maxQueue: number; careSpend: number[]; final: GameState }

/** Avance jour par jour (la caisse est relevée chaque soir) sans le joueur. */
function run(make: () => GameState, seed: number, days: number): Run {
  let s = { ...make(), rng: seed }
  const r: Run = { deaths: 0, sick: 0, treated: 0, minCoins: Infinity, maxQueue: 0, careSpend: [], final: s }
  const t0 = s.time
  for (let d = 1; d <= days; d++) {
    let spend = 0
    // pas de 1 h pour suivre la file d'attente
    for (let h = 1; h <= 24; h++) {
      const res = advanceTo(s, t0 + (d - 1) * DAY_MS + h * 3_600_000)
      s = res.state
      const ev: GameEvent[] = res.events
      r.deaths += ev.filter((e) => e.kind === 'mort').length
      r.sick += ev.filter((e) => e.kind === 'malade').length
      for (const e of ev) if (e.kind === 'soigne') { r.treated++; spend += e.cost }
      r.maxQueue = Math.max(r.maxQueue, careQueue(s).length)
    }
    r.careSpend.push(spend)
    r.minCoins = Math.min(r.minCoins, s.coins)
  }
  r.final = s
  return r
}

describe('parc bien tenu : 3 jours sans le joueur', () => {
  for (const [name, make] of [['Village niveau 3', wellKeptPark], ['Hameau', hameauPark]] as const) {
    it(`${name} : aucune mort ni dette (graines 1 à 20), et des maladies apparues`, () => {
      let sick = 0
      for (let seed = 1; seed <= 20; seed++) {
        const r = run(make, seed, 3)
        expect(r.deaths, `${name}, graine ${seed} : morts`).toBe(0)
        expect(r.minCoins, `${name}, graine ${seed} : caisse`).toBeGreaterThanOrEqual(0)
        sick += r.sick
      }
      expect(sick, 'au moins une maladie sur toutes les graines').toBeGreaterThan(0)
    }, 60_000)
  }

  it('contre-épreuve : sans vétérinaire, des animaux meurent (6 jours, graines 1 à 20)', () => {
    let deaths = 0
    for (let seed = 1; seed <= 20; seed++) {
      deaths += run(() => {
        const s = wellKeptPark()
        s.staff.employees = s.staff.employees.filter((e) => e.job !== 'veterinaire')
        return s
      }, seed, 6).deaths
    }
    expect(deaths).toBeGreaterThan(0)
  }, 120_000)
})
