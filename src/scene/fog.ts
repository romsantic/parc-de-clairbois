import type { Zone } from '../data/zones'
import { ECONOMY } from '../data/economy'

/** Durée de la dissipation de la brume quand une zone s'ouvre. */
export const FOG_DISSOLVE_S = 3

/**
 * Opacité (0 à 1) de la brume d'une zone.
 * Fermée : pleine. En dissipation : décroît en douceur sur FOG_DISSOLVE_S, `elapsed` secondes après l'ouverture.
 */
export function fogOpacity(dissolving: boolean, elapsed: number): number {
  if (!dissolving) return 1
  const t = Math.min(1, Math.max(0, elapsed / FOG_DISSOLVE_S))
  return 1 - t * t * (3 - 2 * t)
}

/** Texte du panneau : nom caché + niveau d'ouverture tant que la zone est fermée, vrai nom ensuite. */
export function zoneSignText(zone: Zone, villageLevel: number): string {
  if (zone.unlockLevel <= villageLevel) return zone.name
  return `${zone.hiddenName ?? zone.name} · s'ouvre au ${ECONOMY.LEVEL_NAMES[zone.unlockLevel - 1]}`
}
