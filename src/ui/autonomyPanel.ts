import { TUNING } from '../data/tuning'
import { HEALTH_TUNING } from '../data/diseases'
import { autonomyHours, consumptionPerHour } from '../sim/feeding'
import { closeDrawer, isDrawerOpen, openDrawer } from './drawer'
import { formatAmount, formatAutonomy } from './format'
import type { PanelContext } from './ticketPanel'

const text = (tag: string, t: string, cls = '') => { const e = document.createElement(tag); e.textContent = t; if (cls) e.className = cls; return e }

/** Volet de l'autonomie : ce que contient le garde-manger, ce que les animaux mangent, combien de temps ça tient. */
export function toggleAutonomyPanel(ctx: PanelContext): void {
  if (isDrawerOpen('autonomie')) { closeDrawer(); return }
  openDrawer('autonomie', 'Autonomie du garde-manger', (body) => {
    ctx.dispatch({ type: 'vu', what: 'autonomie' })
    body.replaceChildren()
    const auto = text('p', '', 'gros')
    const stock = text('p', '')
    const eat = text('p', '')
    const rappel = text('p', `Le chiffre passe à l'orange sous ${formatAmount(TUNING.AUTONOMY_WARN_H)} h et au rouge sous ${formatAmount(TUNING.AUTONOMY_URGENT_H)} h. Sans nourriture, les animaux ont faim au bout de ${TUNING.HUNGRY_AFTER_H} h et ont une indigestion au bout de ${HEALTH_TUNING.INDIGESTION_AFTER_H} h.`, 'discret')
    body.append(auto, stock, eat, rappel)
    function update() {
      const s = ctx.get()
      const c = consumptionPerHour(s)
      auto.textContent = `Autonomie : ${formatAutonomy(autonomyHours(s)).text}`
      stock.textContent = `Dans le garde-manger : ${formatAmount(s.pantry.fourrage)} fourrage, ${formatAmount(s.pantry.viande)} viande`
      eat.textContent = `Les animaux mangent par jour : ${formatAmount(c.fourrage * 24)} fourrage, ${formatAmount(c.viande * 24)} viande`
    }
    update()
    return update
  })
}
