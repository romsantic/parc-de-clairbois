/** Mise en forme des valeurs affichées dans les barres. Fonctions pures, testées. */

export type Urgency = 'ok' | 'attention' | 'urgent'

/** Autonomie du garde-manger : « 1 j 6 h », orange sous 1 jour, rouge sous 6 h. */
export function formatAutonomy(hours: number): { text: string; level: Urgency } {
  if (hours === Infinity) return { text: '∞', level: 'ok' }
  const h = Math.max(0, Math.floor(hours))
  const level: Urgency = h < 6 ? 'urgent' : h < 24 ? 'attention' : 'ok'
  if (h < 24) return { text: `${h} h`, level }
  const d = Math.floor(h / 24), rest = h % 24
  return { text: rest ? `${d} j ${rest} h` : `${d} j`, level }
}

const DAYS = ['dim.', 'lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.']

/** Heure du jeu : « jeu. 14:05 » (fuseau de l'appareil). */
export function formatGameTime(ms: number): string {
  const d = new Date(ms)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${DAYS[d.getDay()]} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}
