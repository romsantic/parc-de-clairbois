import { ECONOMY } from '../data/economy'
import { canLevelUp, population } from '../sim/village'
import { levelBlockReason } from './missionModel'
import { closeDrawer, isDrawerOpen, openDrawer } from './drawer'
import type { PanelContext } from './ticketPanel'

const text = (tag: string, t: string, cls = '') => { const e = document.createElement(tag); e.textContent = t; if (cls) e.className = cls; return e }

/** Volet du village : habitants, prochain niveau, bouton de passage de niveau. */
export function toggleVillagePanel(ctx: PanelContext): void {
  if (isDrawerOpen('village')) { closeDrawer(); return }
  openDrawer('village', 'Clairbois', (body) => {
    body.replaceChildren()
    const pop = text('p', '', 'gros')
    const next = text('p', '')
    const sources = text('p', '', 'discret')
    const reason = text('p', '', 'rouge')
    const go = document.createElement('button')
    go.type = 'button'; go.className = 'principal'
    go.addEventListener('click', () => { if (ctx.dispatch({ type: 'monterNiveau' }, go)) update() })
    body.append(pop, next, sources, reason, go)

    function update() {
      const s = ctx.get()
      const p = population(s)
      const level = s.village.level
      pop.textContent = `${ECONOMY.LEVEL_NAMES[level - 1]} · ${p} habitants`
      const niveaux = s.buildings.reduce((t, b) => t + b.level, 0)
      const venus = Math.floor(s.village.clientsServed / ECONOMY.CLIENTS_PER_NEWCOMER)
      sources.textContent = `Les habitants viennent de : ${ECONOMY.BASE_POPULATION} de départ, ${ECONOMY.RESIDENTS_PER_LEVEL * niveaux} grâce aux bâtiments (${ECONOMY.RESIDENTS_PER_LEVEL} par niveau), ${venus} nouveaux venus (1 pour ${ECONOMY.CLIENTS_PER_NEWCOMER} clients servis).`
      if (level >= 3) {
        next.textContent = 'Clairbois est un bourg : le niveau maximum.'
        go.hidden = true; reason.textContent = ''
        return
      }
      const target = (level + 1) as 2 | 3
      const needed = ECONOMY.LEVEL_POPULATION[target]
      const name = ECONOMY.LEVEL_NAMES[target - 1]
      next.textContent = `Prochain niveau : ${name} à ${needed} habitants${p < needed ? ` (encore ${needed - p})` : ''}`
      go.hidden = false
      go.textContent = `Passer au niveau ${name}`
      const c = canLevelUp(s)
      go.disabled = !c.ok
      reason.textContent = c.ok ? '' : levelBlockReason(s)
    }
    update()
    return update
  })
}
