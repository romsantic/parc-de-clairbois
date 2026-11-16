import { SPECIES } from '../data/species'
import { ANIMAL_NAMES } from '../data/names'
import { TUNING, HOUR_MS } from '../data/tuning'
import type { Animal, GameEvent, GameState } from './types'
import { ageStage, isHungry } from './animal'
import { animalsIn, capacity } from './enclosure'
import { happiness } from './happiness'
import { chanceOver, random, randomInt } from './random'

/** Naissances arrivées à terme, puis nouvelles conceptions. */
export function breedingStep(state: GameState, events: GameEvent[]): void {
  const now = state.time

  // 1. Naissances
  for (const mother of [...state.animals]) {
    if (mother.pregnantSince === null) continue
    const sp = SPECIES[mother.species]
    if (now - mother.pregnantSince < sp.gestationH * HOUR_MS) continue
    mother.pregnantSince = null
    const n = randomInt(state, sp.litter[0], sp.litter[1])
    for (let i = 0; i < n; i++) {
      const baby: Animal = {
        id: state.nextId++, species: mother.species, sex: random(state) < 0.5 ? 'F' : 'M',
        name: ANIMAL_NAMES[Math.floor(random(state) * ANIMAL_NAMES.length)],
        bornAt: now, enclosureId: mother.enclosureId, lastFedAt: now,
        health: { status: 'ok' }, pregnantSince: null, lastBirthAt: null,
      }
      state.animals.push(baby)
      events.push({ kind: 'naissance', at: now, animalId: baby.id, motherId: mother.id })
    }
  }

  // 2. Conceptions
  const chance = chanceOver(TUNING.BREED_PER_HOUR, TUNING.STEP_MS / HOUR_MS)
  for (const enc of state.enclosures) {
    const here = animalsIn(state, enc.id)
    if (here.length >= capacity(enc)) continue
    const hasMale = here.some((a) => a.sex === 'M' && ageStage(a, now) === 'adulte' && a.health.status === 'ok')
    if (!hasMale) continue
    for (const f of here) {
      if (f.sex !== 'F' || f.pregnantSince !== null || f.health.status !== 'ok') continue
      if (ageStage(f, now) !== 'adulte' || isHungry(f, now)) continue
      if (happiness(state, f) <= TUNING.BREED_MIN_HAPPINESS) continue
      if (random(state) < chance) {
        f.pregnantSince = now
        events.push({ kind: 'gestation', at: now, animalId: f.id })
      }
    }
  }
}
