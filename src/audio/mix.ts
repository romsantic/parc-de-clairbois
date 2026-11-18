import { AUDIO_TUNING } from '../data/audio'
import { clamp01 } from './settings'

export interface LoopRange { start: number; end: number }

/**
 * Début et fin utiles d'une boucle décodée : on retire le silence que l'encodeur MP3 met au début et à la fin
 * (sinon la boucle « hoquette »). Renvoie des secondes ; une boucle entièrement silencieuse garde toute sa durée.
 */
export function trimLoop(channels: ArrayLike<number>[], sampleRate: number, threshold: number = AUDIO_TUNING.LOOP_SILENCE_THRESHOLD): LoopRange {
  const len = channels.length ? channels[0].length : 0
  if (len === 0 || sampleRate <= 0) return { start: 0, end: 0 }
  const loud = (i: number) => channels.some((c) => Math.abs(c[i]) > threshold)
  let a = 0
  while (a < len && !loud(a)) a++
  if (a >= len) return { start: 0, end: len / sampleRate }
  let b = len - 1
  while (b > a && !loud(b)) b--
  return { start: a / sampleRate, end: (b + 1) / sampleRate }
}

export interface DayNightMix { musicDay: number; musicNight: number; ambDay: number; ambNight: number }

/**
 * Gains relatifs (0..1, avant le curseur Musique) des quatre boucles selon la nuit (0 = plein jour, 1 = pleine nuit).
 * Fondu en puissance constante pour ne pas creuser de trou au milieu ; la musique de nuit est plus douce.
 */
export function dayNightMix(night: number): DayNightMix {
  const n = clamp01(night)
  const day = Math.cos(n * Math.PI / 2)
  const nig = Math.sin(n * Math.PI / 2)
  return {
    musicDay: day,
    musicNight: nig * AUDIO_TUNING.NIGHT_MUSIC_LEVEL,
    ambDay: day * AUDIO_TUNING.AMBIENCE_LEVEL,
    ambNight: nig * AUDIO_TUNING.AMBIENCE_LEVEL,
  }
}

export type LoopKey = 'musiqueJour' | 'musiqueNuit' | 'ambianceJour' | 'ambianceNuit'

/**
 * Boucles qui doivent exister en mémoire (décodées et en lecture) : seulement la paire audible.
 * Rien si la musique est coupée ou à 0 (l'ambiance suit le curseur Musique) ; les deux paires pendant le fondu.
 */
export function aliveLoops(night: number, music: { volume: number; muted: boolean }): LoopKey[] {
  if (music.muted || music.volume <= 0) return []
  const n = clamp01(night)
  const out: LoopKey[] = []
  if (n < 1 - AUDIO_TUNING.LOOP_ALIVE_MARGIN) out.push('musiqueJour', 'ambianceJour')
  if (n > AUDIO_TUNING.LOOP_ALIVE_MARGIN) out.push('musiqueNuit', 'ambianceNuit')
  return out
}
