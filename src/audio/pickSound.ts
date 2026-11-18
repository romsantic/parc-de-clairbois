import type { Pick } from '../scene/picking'
import type { GameState } from '../sim/types'
import type { SoundEngine } from './sound'
import { cryFor } from './events'

type PickEffect = 'clic' | { cry: NonNullable<ReturnType<typeof cryFor>> } | null

/** Sélection sur la carte : le cri de l'espèce de l'enclos s'il en a un, sinon le clic de bois (enclos ou bâtiment). */
export function pickEffect(p: Pick, s: GameState): PickEffect {
  if (p.kind === 'emplacement') return 'clic'
  if (p.kind !== 'enclos') return null
  const enc = s.enclosures.find((e) => e.id === p.id)
  const hasAnimal = s.animals.some((a) => a.enclosureId === p.id)
  const cry = enc && hasAnimal ? cryFor(enc.species) : null
  return cry ? { cry } : 'clic'
}

export function effectsOnPick(p: Pick, s: GameState, engine: SoundEngine): void {
  const e = pickEffect(p, s)
  if (e === null) return
  if (e === 'clic') engine.playEffect('clic')
  else { engine.playEffect('clic', 0.5); engine.playEffect(e.cry) }
}
