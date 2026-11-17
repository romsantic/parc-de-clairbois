/** Mise en forme des valeurs affichées dans les barres. Fonctions pures, testées. */
import type { Reward } from '../data/missions'

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

/** Estimation des recettes : « ≈ 42 visiteurs/h · 380 pièces/h ». */
export function formatPerHour(visitors: number, coins: number): string {
  return `≈ ${Math.round(visitors)} visiteurs/h · ${Math.round(coins)} pièces/h`
}

/** Réputation en mots : bonne dès 0,8, moyenne dès 0,5. */
export function reputationLabel(r: number): 'bonne' | 'moyenne' | 'mauvaise' {
  return r >= 0.8 ? 'bonne' : r >= 0.5 ? 'moyenne' : 'mauvaise'
}

/** Compte à rebours : « 3 h 20 », « 45 min ». */
export function formatCountdown(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 60_000))
  if (total < 60) return `${total} min`
  const h = Math.floor(total / 60), m = total % 60
  return m ? `${h} h ${String(m).padStart(2, '0')}` : `${h} h`
}

/** Milliers séparés par une espace insécable fine : « 1 000 ». */
function formatThousands(n: number): string {
  return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
}

/** Récompense d'une mission : « 150 pièces + 30 fourrages ». */
export function formatReward(r: Reward): string {
  const parts: string[] = []
  const add = (n: number | undefined, singular: string, plural: string) => {
    if (n) parts.push(`${formatThousands(n)} ${n === 1 ? singular : plural}`)
  }
  add(r.coins, 'pièce', 'pièces')
  add(r.fourrage, 'fourrage', 'fourrages')
  add(r.viande, 'viande', 'viandes')
  return parts.join(' + ')
}

/** Avancée d'une mission : « 12/20 », bornée entre 0 et la cible. */
export function formatProgress(value: number, target: number): string {
  const v = Math.min(target, Math.max(0, Math.floor(value)))
  return `${v}/${target}`
}

/** Durée d'absence : « 45 min », « 3 h 05 », « 2 jours et 5 h ». Minutes ignorées au-delà d'un jour. */
export function formatAbsence(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 60_000))
  if (total < 60) return `${total} min`
  if (total < 24 * 60) {
    const h = Math.floor(total / 60), m = total % 60
    return m ? `${h} h ${String(m).padStart(2, '0')}` : `${h} h`
  }
  const d = Math.floor(total / (24 * 60))
  const h = Math.floor((total % (24 * 60)) / 60)
  const days = d === 1 ? '1 jour' : `${d} jours`
  return h ? `${days} et ${h} h` : days
}
