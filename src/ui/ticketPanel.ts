import type { GameState } from '../sim/types'
import type { Action } from '../sim/actions'
import { fairPrice, incomePerHour } from '../sim/economy'
import { ECONOMY } from '../data/economy'
import { closeDrawer, isDrawerOpen, openDrawer } from './drawer'
import { formatPerHour, reputationLabel } from './format'

export interface PanelContext {
  get(): GameState
  dispatch(action: Action, from?: HTMLElement | null): boolean
}

const text = (tag: string, t: string, cls = '') => { const e = document.createElement(tag); e.textContent = t; if (cls) e.className = cls; return e }

/** Volet du billet : curseur de 0 à 3 × le prix juste, estimation en direct (spec §7). */
export function toggleTicketPanel(ctx: PanelContext): void {
  if (isDrawerOpen('billet')) { closeDrawer(); return }
  openDrawer('billet', 'Prix du billet', (body) => {
    body.replaceChildren()
    const s0 = ctx.get()
    const fair = text('p', '')
    const label = text('p', '', 'gros')
    const slider = document.createElement('input')
    slider.type = 'range'; slider.min = '0'; slider.step = '1'; slider.className = 'curseur'
    slider.max = String(3 * fairPrice(s0))
    slider.value = String(Math.min(s0.ticketPrice, 3 * fairPrice(s0)))
    slider.setAttribute('aria-label', 'Prix du billet')
    const estimate = text('p', '', 'estimation')
    const repu = text('p', '')
    const warn = text('p', '', 'rouge')
    const ok = document.createElement('button')
    ok.type = 'button'; ok.textContent = 'Valider'; ok.className = 'principal'
    ok.addEventListener('click', () => ctx.dispatch({ type: 'billet', price: Number(slider.value) }, ok))
    body.append(fair, label, slider, estimate, repu, warn, ok)

    const price = () => Number(slider.value)
    function numbers() {
      const s = ctx.get()
      const f = fairPrice(s)
      fair.textContent = `Prix juste : ${f} pièces`
      label.textContent = `Billet à ${price()} pièces`
      const inc = incomePerHour(s, price())
      estimate.textContent = formatPerHour(inc.visiteurs, inc.billets + inc.village)
      repu.textContent = `Réputation : ${reputationLabel(s.reputation)}`
      const max = 3 * f
      warn.textContent = price() > max ? `Au-dessus du maximum actuel (${max} pièces) : choisis moins.`
        : price() > ECONOMY.REPUTATION_DROP_ABOVE * f ? 'Trop cher : ta réputation baissera.' : ''
    }
    slider.addEventListener('input', numbers)
    numbers()
    return () => {
      // Le curseur n'est jamais touché pendant que le joueur le tient ; le reste suit la partie.
      // Le maximum ne baisse jamais sous le prix que le joueur a choisi : il verra l'avertissement au lieu d'un curseur qui saute.
      const max = 3 * fairPrice(ctx.get())
      if (document.activeElement !== slider && Number(slider.value) <= max) slider.max = String(max)
      numbers()
    }
  })
}
