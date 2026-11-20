/** Contenu de La Gazette de Clairbois : fonction pure (testée), sans DOM. */
import type { GameState } from '../sim/types'
import type { Summary } from '../sim/summary'
import { autonomyHours } from '../sim/feeding'
import { careQueue, centerLevel, untreatable, workingVets } from '../sim/vet'
import { DISEASES } from '../data/diseases'
import { MISSIONS_TUNING } from '../data/missions'
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

/** Salaires dus mais non payés, en pièces (0 sans dette de salaires). */
const unpaidWages = (s: Summary): number => ago(s.salairesDus) - ago(s.salaires)

/** Le titre à la une : le plus marquant (une mort > une caisse vide > des naissances > les recettes > une journée calme). */
export function gazetteHeadline(s: Summary): string {
  if (s.morts.length === 1) return `Triste nouvelle : ${s.morts[0].name} nous a quittés`
  if (s.morts.length > 1) return `Triste nouvelle : ${s.morts.length} animaux nous ont quittés`
  if (unpaidWages(s) > 0) return 'Caisse vide : les salaires n’ont pas été payés en entier'
  if (s.naissances === 1) return 'Un heureux événement au parc !'
  if (s.naissances > 1) return `${s.naissances} naissances au parc !`
  const coins = ago(s.pieces)
  if (coins > 0) return `${plural(coins, 'pièce', 'pièces')} dans la caisse`
  return 'Une journée calme à Clairbois'
}

/** Phrases de la rubrique « Santé » : maladies repérées, soins, file d'attente, malades que personne ne peut soigner. */
function healthLines(s: Summary, state?: GameState): string[] {
  const lines: string[] = []
  if (s.malades > 0) {
    // Le plus fréquent d'abord, puis par ordre alphabétique.
    const parts = Object.entries(s.maladies)
      .map(([d, n]) => ({ name: DISEASES[d as keyof typeof DISEASES].name.toLowerCase(), n: n ?? 0 }))
      .filter((p) => p.n > 0)
      .sort((a, b) => b.n - a.n || a.name.localeCompare(b.name, 'fr'))
      .map((p) => `${p.n} ${p.name}`)
    // Un seul malade : « (indigestion) » ; plusieurs : « (1 grippe, 1 parasites) ».
    const detail = parts.length === 0 ? '' : s.malades === 1 ? ` (${parts[0].replace(/^1 /, '')})` : ` (${parts.join(', ')})`
    lines.push(s.malades === 1 ? `Un animal est tombé malade${detail}.` : `${s.malades} animaux sont tombés malades${detail}.`)
  }
  if (s.soignes > 0) lines.push(`Le vétérinaire a soigné ${plural(s.soignes, 'animal', 'animaux')} pour ${plural(ago(s.soinsCout), 'pièce', 'pièces')}.`)
  if (state) {
    const queue = workingVets(state).length > 0 ? careQueue(state).length : 0 // sans vétérinaire, la ligne « Personne ne peut soigner » dit tout
    if (queue > 0) lines.push(`File d’attente au centre : ${plural(queue, 'animal', 'animaux')}.`)
    const stuck = untreatable(state)
    if (stuck.length > 0) {
      if (workingVets(state).length === 0) {
        const need = centerLevel(state) === 0 ? 'le centre vétérinaire et un vétérinaire' : 'embaucher un vétérinaire'
        lines.push(`Personne ne peut soigner ${plural(stuck.length, 'animal', 'animaux')} : il faut ${need}.`)
      }
      else {
        const level = Math.min(...stuck.map((a) => DISEASES[(a.health as { disease: keyof typeof DISEASES }).disease].centerLevel))
        lines.push(`${plural(stuck.length, 'animal attend', 'animaux attendent')} que le centre passe au niveau ${level}.`)
      }
    }
  }
  return lines
}

/** Prépare l'édition : titre, durée d'absence et rubriques (rien pour ce qui vaut 0, sauf pièces et visiteurs). */
export function gazetteEdition(s: Summary, absentMs: number, state?: GameState): GazetteEdition {
  const items: GazetteItem[] = []
  items.push({ label: 'Caisse', text: `${plural(ago(s.pieces), 'pièce gagnée', 'pièces gagnées')} · ${plural(ago(s.visiteurs), 'visiteur', 'visiteurs')}` })
  const paid = ago(s.salaires), unpaid = unpaidWages(s)
  if (paid > 0) items.push({ label: 'Personnel', text: `Salaires versés : ${plural(paid, 'pièce', 'pièces')}.` })
  if (unpaid > 0) items.push({ label: 'Personnel', text: `Caisse vide à minuit : il manque ${plural(unpaid, 'pièce', 'pièces')} de salaires.` })
  for (const n of s.niveaux) items.push({ label: 'Personnel', text: `${n.name} passe au niveau ${n.level}.` })
  if (s.naissances > 0) items.push({ label: 'Naissances', text: plural(s.naissances, 'naissance', 'naissances') })
  const fourrage = ago(s.fourrage), viande = ago(s.viande)
  if (fourrage > 0 || viande > 0) {
    const eaten = [fourrage > 0 ? `${plural(fourrage, 'fourrage', 'fourrages')}` : '', viande > 0 ? `${plural(viande, 'viande', 'viandes')}` : ''].filter(Boolean).join(' et ')
    const left = !state ? '' : state.animals.length === 0 ? ' Plus aucun animal à nourrir.' : ` Il reste ${formatAutonomy(autonomyHours(state)).text} d'autonomie.`
    items.push({ label: 'Garde-manger', text: `Les animaux ont mangé ${eaten}.${left}` })
  }
  for (const text of healthLines(s, state)) items.push({ label: 'Santé', text })
  if (s.morts.length > 0) items.push({ label: 'Disparus', text: s.morts.map((m) => (m.cause ? `${m.name} (${DISEASES[m.cause].name.toLowerCase()})` : m.name)).join(', ') })
  const toClaim = new Set(state ? [currentLine(state), ...dailyLines(state)].filter((l) => l && l.done && !l.claimed).map((l) => l!.title) : [])
  const versees = new Set(s.missionsVersees)
  for (const title of s.missions) items.push({ label: 'Mission réussie', text: versees.has(title) ? `${title} (récompense versée)` : toClaim.has(title) ? `${title} (à récupérer)` : title })
  if (s.quotidiennesRenouvelees) {
    const n = state?.missions.daily.list.length || MISSIONS_TUNING.DAILY_COUNT
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
