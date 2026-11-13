import { describe, it, expect } from 'vitest'
import { advanceTo } from '../../src/sim/advance'
import { newGame } from '../../src/sim/newGame'
import { DAY_MS, HOUR_MS } from '../../src/data/tuning'

const MIN = 60_000
const start = () => {
  const s = newGame(11, 1_800_000_000_000)
  s.pantry.fourrage = 150
  return s
}

describe('advanceTo', () => {
  it('donne le même résultat en un seul saut ou par petits morceaux', () => {
    const a = advanceTo(start(), start().time + 3 * DAY_MS).state
    let b = start()
    for (let d = 1; d <= 3; d++) b = advanceTo(b, start().time + d * DAY_MS).state
    let c = start()
    for (let i = 1; i <= 432; i++) c = advanceTo(c, start().time + i * 10 * MIN).state
    expect(b).toEqual(a)
    expect(c).toEqual(a)
  })
  it("n'avance que par pas entiers de 10 minutes", () => {
    const s = start()
    expect(advanceTo(s, s.time + 9 * MIN).state.time).toBe(s.time)
    expect(advanceTo(s, s.time + 10 * MIN).state.time).toBe(s.time + 10 * MIN)
  })
  it("horloge qui recule de moins d'un pas : rien ne change", () => {
    const s = start()
    const r = advanceTo(s, s.time - 5 * MIN)
    expect(r.state).toEqual(s)
    expect(r.events).toEqual([])
  })
  it("horloge qui recule nettement : le parc se recale sans rajeunir, puis continue de vivre", () => {
    const s = start()
    const back = s.time - 3 * DAY_MS
    const r = advanceTo(s, back)
    expect(r.events).toEqual([])
    expect(r.state.time).toBe(back - (back % (10 * MIN)))
    const a0 = s.animals[0], a1 = r.state.animals[0]
    expect(a1.bornAt - r.state.time).toBe(a0.bornAt - s.time) // même âge
    expect(a1.lastFedAt - r.state.time).toBe(a0.lastFedAt - s.time)
    expect(advanceTo(r.state, back + HOUR_MS).state.time).toBeGreaterThan(r.state.time) // il n'est plus figé
  })
  it("ne modifie jamais l'état d'origine", () => {
    const s = start()
    const copy = structuredClone(s)
    advanceTo(s, s.time + DAY_MS)
    expect(s).toEqual(copy)
  })
})
