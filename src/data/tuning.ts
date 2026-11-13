/** Réglages du jeu (spec §4 + réglages choisis dans le plan de l'étape 2). Tous modifiables ici. */
export const HOUR_MS = 3_600_000
export const DAY_MS = 86_400_000

export const TUNING = {
  /** Pas de simulation : le jeu avance par tranches entières de 10 minutes. */
  STEP_MS: 600_000,
  MAX_CATCHUP_DAYS: 30,

  HUNGRY_AFTER_H: 12,
  SICK_AFTER_H: 24,
  DEATH_AFTER_SICK_H: 48,
  DIRTY_AFTER_H: 24,
  DIRTY_SICK_PER_DAY: 0.15,

  BREED_PER_HOUR: 0.25,
  BREED_MIN_HAPPINESS: 0.6,
  SOCIAL_ALONE_FACTOR: 0.6,

  START_COINS: 500,
  START_ENCLOSURE: { x: -26, z: -16, w: 12, d: 10 },
  START_FOURRAGE: 10,
  START_PANTRY_CAPACITY: 200,

  CLEAN_COST: 5,
  CURE_MIN_COST: 50,
  CURE_PRICE_SHARE: 0.25,
  NAME_MAX_LENGTH: 20,
} as const
