/**
 * Générateur pseudo-aléatoire à graine (mulberry32).
 * Même graine → même suite : indispensable pour rejouer une absence et pour les tests.
 */

/** Un tirage pur : renvoie la valeur dans [0, 1) et la graine suivante (sérialisable). */
export function nextRandom(seed: number): [value: number, nextSeed: number] {
  const a = (seed + 0x6d2b79f5) >>> 0
  let t = a
  t = Math.imul(t ^ (t >>> 15), t | 1)
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
  return [((t ^ (t >>> 14)) >>> 0) / 4294967296, a]
}

/** Fermeture pratique pour le décor (non sauvegardé). */
export function createRng(seed: number): () => number {
  let s = seed >>> 0
  return () => {
    const [v, n] = nextRandom(s)
    s = n
    return v
  }
}
