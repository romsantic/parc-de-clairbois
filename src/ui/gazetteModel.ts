/** Contenu de La Gazette de Clairbois : fonction pure (testée), sans DOM. */
import type { GameState } from '../sim/types'
import type { Summary } from '../sim/summary'
import { autonomyHours } from '../sim/feeding'
import { dailyLines, currentLine } from './missionModel'
import { formatAbsence, formatAutonomy, formatThousands } from './format'

export interface GazetteItem { label: string; text: string }
export interface GazetteEdition {
  /** Titre à la une. */
  headline: string
  /** « Tu étais absent 5 h 20 » */
  absence: string
  items: GazetteItem[]
}

const plural = (n: number, one: string, many: string) => `${formatThousands(n)} ${n < 2 ? one : many}`
const ago = (n: number) => Math.round(n)

/** Le titre à la une : le plus marquant (une mort > des naissances > les recettes > une journée calme). */
export function gazetteHeadline(s: Summary): string {
  if (s.morts.length === 1) return `Triste nouvelle : ${s.morts[0].name} nous a quittés`
  if (s.morts.length > 1) return `Triste nouvelle : ${s.morts.length} animaux nous ont quittés`
  if (s.naissances === 1) return 'Un heureux événement au parc !'
  if (s.naissances > 1) return `${s.naissances} naissances au parc !`
  const coins = ago(s.pieces)
  if (coins > 0) return `${plural(coins, 'pièce', 'pièces')} dans la caisse`
  return 'Une journée calme à Clairbois'
}

/** Prépare l'édition : titre, durée d'absence et rubriques (rien pour ce qui vaut 0, sauf pièces et visiteurs). */
export function gazetteEdition(s: Summary, absentMs: number, state?: GameState): GazetteEdition {
  const items: GazetteItem[] = []
  items.push({ label: 'Caisse', text: `${plural(ago(s.pieces), 'pièce gagnée', 'pièces gagnées')} · ${plural(ago(s.visiteurs), 'visiteur', 'visiteurs')}` })
  if (s.naissances > 0) items.push({ label: 'Naissances', text: plural(s.naissances, 'naissance', 'naissances') })
  const fourrage = ago(s.fourrage), viande = ago(s.viande)
  if (fourrage > 0 || viande > 0) {
    const eaten = [fourrage > 0 ? `${plural(fourrage, 'fourrage', 'fourrages')}` : '', viande > 0 ? `${plural(viande, 'viande', 'viandes')}` : ''].filter(Boolean).join(' et ')
    const left = !state ? '' : state.animals.length === 0 ? ' Plus aucun animal à nourrir.' : ` Il reste ${formatAutonomy(autonomyHours(state)).text} d'autonomie.`
    items.push({ label: 'Garde-manger', text: `Les animaux ont mangé ${eaten}.${left}` })
  }
  if (s.malades > 0) items.push({ label: 'Santé', text: s.malades === 1 ? 'Un animal est tombé malade.' : `${s.malades} animaux sont tombés malades.` })
  if (s.morts.length > 0) items.push({ label: 'Disparus', text: s.morts.map((m) => m.name).join(', ') })
  const toClaim = new Set(state ? [currentLine(state), ...dailyLines(state)].filter((l) => l && l.done && !l.claimed).map((l) => l!.title) : [])
  for (const title of s.missions) items.push({ label: 'Mission réussie', text: toClaim.has(title) ? `${title} (à récupérer)` : title })
  if (s.quotidiennesRenouvelees) {
    const n = state?.missions.daily.list.length || 3
    items.push({ label: 'Missions du jour', text: `${n} nouvelles missions du jour` })
  }
  if (s.serie > 0) items.push({ label: 'Série', text: plural(s.serie, 'jour', 'jours') + ' de suite' })
  return { headline: gazetteHeadline(s), absence: `Tu étais absent ${formatAbsence(absentMs)}`, items }
}

const MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre']
const JOURS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi']

/** Date du jour en français : « mardi 17 novembre 2026 » (fuseau de l'appareil). */
export function formatDateFr(ms: number): string {
  const d = new Date(ms)
  return `${JOURS[d.getDay()]} ${d.getDate() === 1 ? '1er' : d.getDate()} ${MOIS[d.getMonth()]} ${d.getFullYear()}`
}
