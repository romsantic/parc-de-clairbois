import type { SoundKey } from '../assets/sounds'
import type { SpeciesId } from '../data/species'
import type { Action } from '../sim/actions'
import type { GameState } from '../sim/types'
import { AUDIO_TUNING } from '../data/audio'

/** Cri de chaque espèce ; les autres (alpaga, renard, cerf, lama) n'ont que le clic. */
const CRIES: Partial<Record<SpeciesId, SoundKey>> = {
  mouton: 'criMouton', ane: 'criAne', cochon: 'criCochon', cheval: 'criCheval', taureau: 'criTaureau', loup: 'criLoup',
}
export function cryFor(species: SpeciesId | null): SoundKey | null {
  return species ? CRIES[species] ?? null : null
}

export interface Effect { key: SoundKey; gain: number }

/** Effet d'une action réussie (rien pour les observations silencieuses). */
export function effectForAction(a: Action): Effect | null {
  switch (a.type) {
    case 'recuperer': case 'vendre': case 'acheterAnimal': case 'acheterRations':
      return { key: 'pieces', gain: 1 }
    case 'construire': case 'batir': case 'ameliorer': case 'redimensionner': case 'monterNiveau': case 'agrandirGardeManger':
      return { key: 'construction', gain: 1 }
    case 'vu': case 'lireMission': return null
    default: return { key: 'clic', gain: 1 }
  }
}

/** Effet d'une action ratée : le clic seul, tout doux. */
export const FAILED_EFFECT: Effect = { key: 'clic', gain: AUDIO_TUNING.SOFT_CLICK }

/** Identifiants des missions réussies (tutoriel, histoire, quotidiennes). */
export function doneMissionIds(s: GameState): Set<string> {
  const m = s.missions
  const out = new Set<string>()
  for (const p of [m.tutorial.current, m.story.current, ...m.daily.list]) if (p?.done) out.add(p.id)
  return out
}

/** Vrai si une mission est devenue réussie depuis `before`. */
export function missionJustDone(before: Set<string>, now: Set<string>): boolean {
  for (const id of now) if (!before.has(id)) return true
  return false
}
