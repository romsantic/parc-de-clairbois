import type { GameState } from '../sim/types'
import { autonomyHours } from '../sim/feeding'
import { incomePerHour } from '../sim/economy'
import { canLevelUp, population } from '../sim/village'
import { ECONOMY } from '../data/economy'
import { formatAutonomy, formatGameTime } from './format'
import { flash, floatDelta } from './feedback'

export type Resource = 'coins' | 'fourrage' | 'viande' | 'village'

/** Icônes en SVG fixe (aucun contenu venu du joueur). */
const ICON = {
  coins: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 8v8M9.5 10.5c0-1.2 1.1-2 2.5-2s2.5.8 2.5 2-1.1 1.5-2.5 1.5-2.5.6-2.5 1.8 1.1 2 2.5 2 2.5-.8 2.5-2" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>',
  fourrage: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 19c6 0 13-5 13-14-7 0-13 5-13 14zm0 0 7-7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
  viande: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 4a6 6 0 0 1 6 6c0 4-5 6-8 6l-4 4-2-2 4-4c0-3 1-10 4-10z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>',
  horloge: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 8v4l3 2" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
  visiteurs: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="9" cy="8" r="3" fill="none" stroke="currentColor" stroke-width="2"/><path d="M3 19c0-3 3-5 6-5s6 2 6 5M16 5a3 3 0 0 1 0 6M18 14c2 .7 3 2.5 3 5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
  billet: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 8a2 2 0 0 0 0 4v0a2 2 0 0 1 0 4h0v2h16v-2a2 2 0 0 1 0-4 2 2 0 0 0 0-4V6H4zM14 6v12" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>',
  village: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 11l8-6 8 6v8H4z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M10 19v-5h4v5" fill="none" stroke="currentColor" stroke-width="2"/></svg>',
}

function cell(cls: string, icon: string, label: string): { root: HTMLSpanElement; value: HTMLSpanElement } {
  const root = document.createElement('span')
  root.className = `ressource ${cls}`
  root.title = label
  root.innerHTML = icon
  const value = document.createElement('span')
  value.className = 'valeur'
  root.append(value)
  return { root, value }
}

/** Barre des ressources en haut de l'écran (spec §7). */
export interface TopBarHandlers { onTicket(): void; onVillage(): void }

export function mountTopBar(get: () => GameState, handlers: TopBarHandlers): { pulse(r: Resource, delta: number): void } {
  const bar = document.createElement('header')
  bar.className = 'barre-haut'
  const cells = {
    coins: cell('pieces', ICON.coins, 'Pièces'),
    fourrage: cell('fourrage', ICON.fourrage, 'Fourrage'),
    viande: cell('viande', ICON.viande, 'Viande'),
    auto: cell('autonomie', ICON.horloge, 'Autonomie du garde-manger'),
    visiteurs: cell('visiteurs', ICON.visiteurs, 'Visiteurs par heure'),
    billet: cell('billet', ICON.billet, 'Prix du billet : touche pour le régler'),
    village: cell('village', ICON.village, 'Village : touche pour voir les habitants'),
  }
  const time = document.createElement('span')
  time.className = 'heure'
  bar.append(...Object.values(cells).map((c) => c.root), time)
  document.body.append(bar)
  for (const [c, fn] of [[cells.billet, handlers.onTicket], [cells.village, handlers.onVillage]] as const) {
    c.root.setAttribute('role', 'button')
    c.root.tabIndex = 0
    c.root.classList.add('cliquable')
    c.root.addEventListener('click', fn)
    c.root.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fn() } })
  }

  const render = () => {
    const s = get()
    cells.coins.value.textContent = String(Math.floor(s.coins))
    cells.fourrage.value.textContent = String(Math.floor(s.pantry.fourrage))
    cells.viande.value.textContent = String(Math.floor(s.pantry.viande))
    const a = formatAutonomy(autonomyHours(s))
    cells.auto.value.textContent = a.text
    cells.auto.root.dataset.niveau = a.level
    cells.visiteurs.value.textContent = `${Math.round(incomePerHour(s).visiteurs)}/h`
    cells.billet.value.textContent = String(s.ticketPrice)
    cells.village.value.textContent = `${ECONOMY.LEVEL_NAMES[s.village.level - 1]} · ${population(s)} hab.`
    cells.village.root.dataset.pret = canLevelUp(s).ok ? 'oui' : 'non'
    time.textContent = formatGameTime(s.time)
  }
  render()
  setInterval(render, 500)

  return {
    pulse(r, delta) {
      render()
      const c = cells[r].root
      flash(c, delta >= 0)
      floatDelta(c, delta)
    },
  }
}
