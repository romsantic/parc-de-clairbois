/**
 * Confirmation en deux clics : le 1er clic « arme », le 2e confirme, mais seulement après `delayMs`
 * (un double-clic ne doit pas valider). `reset()` désarme (volet fermé, délai écoulé).
 */
export interface ConfirmGuard {
  /** 'armed' : 1er clic · 'ignored' : 2e clic trop proche · 'confirmed' : 2e clic accepté (désarme). */
  click(): 'armed' | 'ignored' | 'confirmed'
  armed(): boolean
  reset(): void
}

export function createConfirmGuard(delayMs = 400, now: () => number = () => performance.now()): ConfirmGuard {
  let armedAt: number | null = null
  return {
    click() {
      if (armedAt === null) { armedAt = now(); return 'armed' }
      if (now() - armedAt < delayMs) return 'ignored'
      armedAt = null
      return 'confirmed'
    },
    armed: () => armedAt !== null,
    reset() { armedAt = null },
  }
}
