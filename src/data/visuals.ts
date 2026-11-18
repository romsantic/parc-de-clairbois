/** Réglages des promeneurs affichés sur les chemins (purement visuel : la simulation ne change pas). */
export const WALKERS = {
  /** Au plus ce nombre de promeneurs à l'écran. */
  MAX_DESKTOP: 12,
  MAX_MOBILE: 8,
  /** Un promeneur affiché pour ce nombre de visiteurs par heure. */
  VISITORS_PER_WALKER: 3,
  /** De 22 h à 6 h : presque personne. Aux heures de transition : un peu moins qu'en journée. */
  NIGHT_START_H: 22,
  NIGHT_END_H: 6,
  NIGHT_FACTOR: 0.08,
  SHOULDER_H: 2,
  SHOULDER_FACTOR: 0.6,
  /** Vitesse de marche (m/s), tirée entre ces deux valeurs. */
  SPEED_MIN: 1.0,
  SPEED_MAX: 1.5,
  /** Durée d'un arrêt devant un enclos ou au café (s), tirée entre ces deux valeurs. */
  STOP_MIN_S: 3,
  STOP_MAX_S: 6,
  /** Chance de s'arrêter devant un enclos occupé. */
  STOP_CHANCE: 0.7,
  /** Enclos à plus de cette distance de l'allée : pas d'arrêt devant lui. */
  STOP_MAX_GAP: 6,
  HEIGHT: 1.8,
  /** Apparition / disparition en douceur (s) et délai entre deux arrivées (s). */
  FADE_S: 1,
  SPAWN_EVERY_S: 1.5,
  /** Les arrêts (enclos occupés, café) sont recalculés à cet intervalle (s). */
  REFRESH_S: 3,
} as const

/** Nombre de promeneurs à afficher selon les visiteurs/h, l'heure (0–24) et l'appareil. */
export function visitorsShown(visitorsPerH: number, hour: number, mobile: boolean): number {
  if (!(visitorsPerH > 0)) return 0
  const max = mobile ? WALKERS.MAX_MOBILE : WALKERS.MAX_DESKTOP
  const h = ((hour % 24) + 24) % 24
  const night = h >= WALKERS.NIGHT_START_H || h < WALKERS.NIGHT_END_H
  const shoulder = !night && (h < WALKERS.NIGHT_END_H + WALKERS.SHOULDER_H || h >= WALKERS.NIGHT_START_H - WALKERS.SHOULDER_H)
  const factor = night ? WALKERS.NIGHT_FACTOR : shoulder ? WALKERS.SHOULDER_FACTOR : 1
  const base = Math.min(max, Math.ceil(visitorsPerH / WALKERS.VISITORS_PER_WALKER))
  return Math.round(base * factor)
}
