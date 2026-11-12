/**
 * Générateur pseudo-aléatoire à graine (mulberry32).
 * Même graine → même suite : indispensable pour rejouer une absence et pour les tests.
 * Renvoie une fonction qui donne un nombre dans [0, 1).
 */
export function createRng(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
