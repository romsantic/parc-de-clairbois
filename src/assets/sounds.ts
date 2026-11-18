/**
 * Liste de tous les sons du jeu (CC0, voir CREDITS.md). Fichiers .mp3 dans public/sons/.
 * Chemins relatifs à public/ : jamais de « / » au début, sinon tout casse sur GitHub Pages.
 * `maxKo` = budget de poids (musiques ≤ 1,5 Mo, ambiances ≤ 600 Ko, effets ≤ 50 Ko).
 */
export const SOUNDS = {
  // Musiques (boucles)
  musiqueJour: { path: 'sons/musique-jour.mp3', maxKo: 1536 },
  musiqueNuit: { path: 'sons/musique-nuit.mp3', maxKo: 1536 },
  // Ambiances (boucles)
  ambianceJour: { path: 'sons/ambiance-jour.mp3', maxKo: 600 },
  ambianceNuit: { path: 'sons/ambiance-nuit.mp3', maxKo: 600 },
  // Effets
  clic: { path: 'sons/clic.mp3', maxKo: 50 },
  pieces: { path: 'sons/pieces.mp3', maxKo: 50 },
  mission: { path: 'sons/mission.mp3', maxKo: 50 },
  construction: { path: 'sons/construction.mp3', maxKo: 50 },
  // Cris d'animaux
  criMouton: { path: 'sons/cri-mouton.mp3', maxKo: 50 },
  criAne: { path: 'sons/cri-ane.mp3', maxKo: 50 },
  criCochon: { path: 'sons/cri-cochon.mp3', maxKo: 50 },
  criCheval: { path: 'sons/cri-cheval.mp3', maxKo: 50 },
  criTaureau: { path: 'sons/cri-taureau.mp3', maxKo: 50 },
  criLoup: { path: 'sons/cri-loup.mp3', maxKo: 50 },
} as const

export type SoundKey = keyof typeof SOUNDS

export function soundUrl(key: SoundKey): string {
  return import.meta.env.BASE_URL + SOUNDS[key].path
}
