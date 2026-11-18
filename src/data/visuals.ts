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

/** La nuit (purement visuel). Hauteurs du soleil en degrés : au-dessus de DAY_ELEV c'est le jour, sous NIGHT_ELEV la nuit noire. */
export const NIGHT = {
  DAY_ELEV: 6,
  NIGHT_ELEV: -8,
  /** Étoiles : un seul nuage de points sur la voûte du ciel. */
  STAR_COUNT: 600,
  /** Les étoiles sont serrées près de l'horizon (0 à STAR_MAX_ELEV degrés), là où la caméra regarde. */
  STAR_MAX_ELEV: 10,
  /** Lune : hauteur au-dessus de l'horizon (degrés), droit devant la vue de départ. */
  MOON_ELEV: 4,
  STAR_RADIUS: 380,
  STAR_SIZE: 2.2,
  STAR_COLOR: '#fff6e0',
  /** Lune : disque lumineux, opposé au soleil. */
  MOON_RADIUS: 13,
  MOON_DISTANCE: 340,
  MOON_COLOR: '#f4f1e4',
  /** Brillance max des fenêtres et des lanternes la nuit (le jour : lanternes à LANTERN_DAY). */
  WINDOW_GLOW: 1.6,
  WINDOW_COLOR: '#ffcf7a',
  LANTERN_DAY: 0.05,
  LANTERN_GLOW: 2.2,
  /** Animaux : pauses multipliées par ce facteur à pleine nuit, marche ralentie. */
  REST_FACTOR: 3.5,
  WALK_SPEED_FACTOR: 0.7,
} as const

/** Réglages d'affichage selon l'appareil (purement visuel). Téléphone : image moins dense, ombres moins fines. */
export const RENDER = {
  PIXEL_RATIO_MAX_DESKTOP: 2,
  PIXEL_RATIO_MAX_MOBILE: 1.5,
  SHADOW_MAP_DESKTOP: 2048,
  SHADOW_MAP_MOBILE: 1024,
} as const

export function renderSettings(mobile: boolean, devicePixelRatio: number): { pixelRatio: number; shadowMapSize: number } {
  const max = mobile ? RENDER.PIXEL_RATIO_MAX_MOBILE : RENDER.PIXEL_RATIO_MAX_DESKTOP
  return {
    pixelRatio: Math.min(max, devicePixelRatio > 0 ? devicePixelRatio : 1),
    shadowMapSize: mobile ? RENDER.SHADOW_MAP_MOBILE : RENDER.SHADOW_MAP_DESKTOP,
  }
}

/** Lumière du soleil : zone couverte par la carte d'ombres (m) et profondeur. */
export const SUN_SHADOW = { LEFT: -45, RIGHT: 45, TOP: 40, BOTTOM: -40, NEAR: 1, FAR: 200 } as const

/** Brume des zones fermées (purement visuel). */
export const FOG = {
  /** Durée de la dissipation quand une zone s'ouvre (s). */
  DISSOLVE_S: 3,
  /** Taches de brume par zone fermable (2 zones x 4 = 8 panneaux au plus). */
  PER_ZONE: 4,
  BASE_OPACITY: 0.8,
  DAY_COLOR: '#f4f6f8',
  NIGHT_COLOR: '#3a4560',
} as const

/** Durée de la glissade de la caméra vers un point (s). */
export const FOCUS_SECONDS = 0.8

/** « Recommencer à zéro » : délai avant que le 2e clic compte (ms), et durée avant que la confirmation se désarme (ms). */
export const CONFIRM_DELAY_MS = 400
export const CONFIRM_TIMEOUT_MS = 3000

/** Trajet des promeneurs (m) : marges autour du pont et de l'allée du zoo. */
export const WALK_ROUTE = {
  /** Les arrêts devant les enclos restent à l'ouest de cette distance avant le pont. */
  STOP_BEFORE_BRIDGE: 5,
  /** Les arrêts restent à l'est de cette abscisse. */
  STOP_WEST_LIMIT: -33,
  /** Demi-longueur du passage sur le pont, de part et d'autre de son centre. */
  BRIDGE_APPROACH: 3.5,
  /** Longueur de la rampe entre la berge et le tablier. */
  DECK_RAMP: 1,
  /** Les hauteurs de marche sont mises en cache par cases de ce côté. */
  HEIGHT_CELL: 0.1,
} as const
