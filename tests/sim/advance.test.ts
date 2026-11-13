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
  it("ne touche à rien si l'horloge de l'appareil recule", () => {
    const s = start()
    const r = advanceTo(s, s.time - HOUR_MS)
    expect(r.state).toEqual(s)
    expect(r.events).toEqual([])
  })
  it("ne modifie jamais l'état d'origine", () => {
    const s = start()
    const copy = structuredClone(s)
    advanceTo(s, s.time + DAY_MS)
    expect(s).toEqual(copy)
  })
})
