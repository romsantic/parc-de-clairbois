import type { GameState } from '../sim/types'
import type { MissionTrack } from '../sim/missions'
import { TUTORIAL } from '../data/missions'
import { closeDrawer, isDrawerOpen, openDrawer, refreshDrawer } from './drawer'
import { currentLine, dailyLines, storyEnded, storyEndMessage, streakText, type MissionLine } from './missionModel'
import type { PanelContext } from './ticketPanel'

const text = (tag: string, t: string, cls = '') => { const e = document.createElement(tag); e.textContent = t; if (cls) e.className = cls; return e }

/** Délai pendant lequel un 2e clic est ignoré (double-clic sur « Récupérer » ou « Passer »). */
const GUARD_MS = 400
const SKIP_CONFIRM_MS = 3000
let claimBlockedUntil = 0
let skipArmed = false
let skipArmedAt = 0
let skipTimer = 0

/** À appeler quand un bouton « Récupérer » vient d'apparaître : un double-clic ne doit pas viser le suivant. */
export function armClaimGuard(): void {
  claimBlockedUntil = performance.now() + GUARD_MS
}

/** Clic sur « Récupérer » : la récompense n'est versée que sur ce clic, et un 2e clic trop rapide est ignoré. */
export function claimReward(ctx: PanelContext, track: MissionTrack, id: string, from: HTMLElement): boolean {
  if (performance.now() < claimBlockedUntil) return false
  claimBlockedUntil = performance.now() + GUARD_MS
  return ctx.dispatch({ type: 'recuperer', track, id }, from)
}

/** Bouton « Récupérer » (avec la récompense si `withReward`). */
export function claimButton(ctx: PanelContext, l: MissionLine, withReward: boolean, onDone?: () => void): HTMLButtonElement {
  const b = document.createElement('button')
  b.type = 'button'
  b.className = 'principal recuperer'
  b.append(document.createTextNode('Récupérer'))
  if (withReward) b.append(text('span', ` : ${l.reward}`, 'recompense'))
  b.setAttribute('aria-label', `Récupérer : ${l.reward}`)
  b.addEventListener('click', () => { if (claimReward(ctx, l.track, l.id, b)) onDone?.() })
  return b
}

export function openMissionPanel(ctx: PanelContext): void {
  if (isDrawerOpen('missions')) return
  openDrawer('missions', 'Missions', (body) => {
    ctx.dispatch({ type: 'lireMission' })
    let sig = ''
    /** Textes d'avancée à tenir à jour sans reconstruire les boutons. */
    const live: (() => void)[] = []

    function progressSpan(get: (s: GameState) => string): HTMLElement {
      const e = text('span', get(ctx.get()), 'avancee')
      live.push(() => { e.textContent = get(ctx.get()) })
      return e
    }
    const lineOf = (id: string) => (s: GameState) =>
      [currentLine(s), ...dailyLines(s)].find((l) => l?.id === id)?.progress ?? ''

    function build(s: GameState) {
      body.replaceChildren()
      live.length = 0
      const cur = currentLine(s)
      const m = s.missions
      const inTutorial = m.tutorial.step < TUTORIAL.length

      const head = document.createElement('div')
      head.className = 'mission-courante'
      if (cur) {
        if (inTutorial) head.append(text('p', `Étape ${m.tutorial.step + 1} sur ${TUTORIAL.length}`, 'discret'))
        head.append(text('p', cur.title, 'gros'), text('p', `${cur.giver} : ${cur.text}`, 'dialogue'))
        const row = document.createElement('p')
        row.append(document.createTextNode('Avancée : '), progressSpan(lineOf(cur.id)), text('span', ` · Récompense : ${cur.reward}`))
        head.append(row)
        if (cur.done) head.append(claimButton(ctx, cur, true, () => update()))
        if (inTutorial) head.append(skipButton())
      } else if (storyEnded(s)) {
        head.append(text('p', storyEndMessage, 'gros'))
      } else {
        head.append(text('p', 'Une nouvelle mission arrive…', 'discret'))
      }
      body.append(head)

      body.append(text('h3', 'Missions du jour'))
      if (inTutorial) {
        body.append(text('p', 'Les missions du jour commencent après les premiers pas.', 'discret'))
      } else {
        for (const l of dailyLines(s)) {
          const row = document.createElement('div')
          row.className = 'quotidienne'
          row.append(text('span', l.title, 'titre'))
          if (l.claimed) {
            row.append(text('span', '✓', 'coche'))
          } else if (l.done) {
            row.append(claimButton(ctx, l, true, () => update()))
          } else {
            row.append(progressSpan(lineOf(l.id)), text('span', l.reward, 'discret'))
          }
          body.append(row)
        }
      }
      body.append(text('p', streakText(m.daily.streak), 'discret'))
      if (m.daily.coupons > 0) {
        body.append(text('p', `Bons de réduction disponibles : ${m.daily.coupons}`, 'gros'))
      }
    }

    function skipButton(): HTMLButtonElement {
      const b = document.createElement('button')
      b.type = 'button'
      b.className = skipArmed ? 'passer confirmer' : 'passer'
      b.textContent = skipArmed ? 'Passer ?' : 'Passer les premiers pas'
      b.addEventListener('click', () => {
        // Un double-clic ne doit pas valider : la confirmation demande un 2e clic distinct.
        if (skipArmed && performance.now() - skipArmedAt < GUARD_MS) return
        clearTimeout(skipTimer)
        if (!skipArmed) {
          skipArmed = true
          skipArmedAt = performance.now()
          skipTimer = window.setTimeout(() => { skipArmed = false; if (isDrawerOpen('missions')) refreshDrawer() }, SKIP_CONFIRM_MS)
          update()
          return
        }
        skipArmed = false
        ctx.dispatch({ type: 'passerTutoriel' }, b)
        update()
      })
      return b
    }

    function structure(s: GameState): string {
      const m = s.missions
      return JSON.stringify([m.tutorial.step, m.story.index, m.story.current?.id, m.story.current?.done, m.tutorial.current?.done,
        m.daily.list.map((x) => [x.id, x.done, x.claimed]), m.daily.streak, m.daily.coupons, skipArmed])
    }

    function update() {
      const s = ctx.get()
      if (s.missions.unread) ctx.dispatch({ type: 'lireMission' }) // une mission est arrivée pendant que le volet était ouvert
      const k = structure(s)
      if (k !== sig) { sig = k; build(s); armClaimGuard() }
      for (const f of live) f()
    }
    update()
    return update
  })
}

/** Volet Missions : mission courante, quotidiennes, série. */
export function toggleMissionPanel(ctx: PanelContext): void {
  if (isDrawerOpen('missions')) { closeDrawer(); return }
  openMissionPanel(ctx)
}
