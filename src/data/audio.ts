/** Réglages chiffrés du son (volumes de départ, fondus, niveau de nuit). */
export const AUDIO_TUNING = {
  /** Volumes de départ (0..1) : musique douce, effets plus présents. */
  DEFAULT_MUSIC: 0.4,
  DEFAULT_EFFECTS: 0.7,
  /** Clé du navigateur, hors de la sauvegarde de partie. */
  STORAGE_KEY: 'clairbois-son',
  /** La musique de nuit et l'ambiance sont réglées à ce niveau relatif (la nuit, tout est plus doux). */
  NIGHT_MUSIC_LEVEL: 0.6,
  /** Niveau relatif de l'ambiance nature (oiseaux/grillons) par rapport au curseur Musique. */
  AMBIENCE_LEVEL: 0.5,
  /** Durée des fondus (secondes). */
  VOLUME_RAMP_S: 0.15,
  MUTE_RAMP_S: 0.4,
  /** Un son plus faible que ça en début/fin de boucle est du silence de l'encodeur MP3. */
  LOOP_SILENCE_THRESHOLD: 0.004,
  /** Volume d'un effet raté ou très discret (clic seul). */
  SOFT_CLICK: 0.5,
} as const
