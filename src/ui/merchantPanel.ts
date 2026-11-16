import type { GameState, Offer } from '../sim/types'
import type { Pick } from '../scene/picking'
import { SPECIES } from '../data/species'
import { acceptsSpecies, BIOME_NAMES } from '../sim/merchant'
import { closeDrawer, isDrawerOpen, openDrawer, refreshDrawer } from './drawer'
import { formatCountdown } from './format'
import type { PanelContext } from './ticketPanel'

export interface MerchantContext extends PanelContext { selection(): Pick }

const text = (tag: string, t: string, cls = '') => { const e = document.createElement(tag); e.textContent = t; if (cls) e.className = cls; return e }

/** Enclos qui recevra l'animal : le sélectionné s'il l'accepte, sinon le premier qui l'accepte ; sinon la raison. */
export function merchantTarget(s: GameState, sel: Pick, species: Offer['species']): { encId: number } | { reason: string } {
  const selected = sel.kind === 'enclos' ? s.enclosures.find((e) => e.id === sel.id) : undefined
  if (selected && acceptsSpecies(s, selected, species) === null) return { encId: selected.id }
  const first = s.enclosures.find((e) => acceptsSpecies(s, e, species) === null)
  if (first) return { encId: first.id }
  const biome = SPECIES[species].biome
  const sameBiome = s.enclosures.find((e) => e.biome === biome)
  if (sameBiome) return { reason: acceptsSpecies(s, sameBiome, species) ?? '' }
  return { reason: `Il faut un enclos de ${BIOME_NAMES[biome]}.` }
}

/** Volet du marchand d'animaux : stock, prix, enclos cible. */
export function toggleMerchantPanel(ctx: MerchantContext): void {
  if (isDrawerOpen('marchand')) { closeDrawer(); return }
  openDrawer('marchand', 'Marchand d’animaux', (body) => {
    body.replaceChildren()
    const countdown = text('p', '', 'gros')
    const list = document.createElement('div')
    list.className = 'offres'
    body.append(countdown, list)
    let sig = ''

    function rows() {
      const s = ctx.get()
      list.replaceChildren()
      if (s.merchant.offers.length === 0) list.append(text('p', 'Plus rien en stock pour le moment.', 'discret'))
      for (const o of s.merchant.offers) {
        const row = document.createElement('div')
        row.className = 'offre'
        row.append(text('b', SPECIES[o.species].name), text('span', o.sex === 'F' ? '♀' : '♂'), text('span', o.stage),
          text('span', `${o.price} pièces`, 'prix'))
        const t = merchantTarget(s, ctx.selection(), o.species)
        const buy = document.createElement('button')
        buy.type = 'button'; buy.textContent = 'Acheter'
        if ('encId' in t) {
          row.append(text('span', `→ Enclos ${t.encId}`, 'cible'))
          buy.addEventListener('click', () => { if (ctx.dispatch({ type: 'acheterAnimal', offerId: o.id, encId: t.encId }, buy)) refreshDrawer() })
        } else {
          buy.disabled = true; buy.title = t.reason
          row.append(text('span', t.reason, 'rouge'))
        }
        row.append(buy)
        list.append(row)
      }
    }

    function update() {
      const s = ctx.get()
      countdown.textContent = `Nouveau stock dans ${formatCountdown(s.merchant.restockAt - s.time)}`
      // Les lignes ne sont refaites que si quelque chose a changé (offres, enclos cibles).
      const k = JSON.stringify([s.merchant.offers.map((o) => [o.id, merchantTarget(s, ctx.selection(), o.species)]), s.enclosures.length])
      if (k !== sig) { sig = k; rows() }
    }
    update()
    return update
  })
}
