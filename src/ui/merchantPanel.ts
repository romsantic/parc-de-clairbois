import type { GameState, Offer } from '../sim/types'
import type { Pick } from '../scene/picking'
import { SPECIES } from '../data/species'
import { acceptsSpecies, BIOME_NAMES, offerPriceFor } from '../sim/merchant'
import { MISSIONS_TUNING } from '../data/missions'
import { closeDrawer, isDrawerOpen, openDrawer, refreshDrawer } from './drawer'
import { formatCountdown } from './format'
import type { PanelContext } from './ticketPanel'

export interface MerchantContext extends PanelContext { selection(): Pick }

/** Délai pendant lequel « Acheter » ignore les clics après un achat ou une reconstruction de la liste (double-clic). */
const BUY_DELAY_MS = 400
let buyBlockedUntil = 0
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

/** Nom d'un enclos pour le joueur : son rang parmi ses enclos et son espèce (jamais l'identifiant interne). */
export function enclosureLabel(s: GameState, encId: number): string {
  const i = s.enclosures.findIndex((e) => e.id === encId)
  const enc = s.enclosures[i]
  return `Enclos ${i + 1} (${enc?.species ? SPECIES[enc.species].name.toLowerCase() : 'vide'})`
}

/** Prix d'une offre : avec un bon, le prix normal barré puis le prix réduit. */
function priceCell(normal: number, paid: number): HTMLElement {
  const cell = document.createElement('span')
  cell.className = 'prix'
  if (paid !== normal) cell.append(text('s', `${normal}`, 'barre'), text('b', ` ${paid} pièces`, 'reduit'))
  else cell.textContent = `${paid} pièces`
  return cell
}

/** Volet du marchand d'animaux : stock, prix, enclos cible. */
export function toggleMerchantPanel(ctx: MerchantContext): void {
  if (isDrawerOpen('marchand')) { closeDrawer(); return }
  openDrawer('marchand', 'Marchand d’animaux', (body) => {
    body.replaceChildren()
    const countdown = text('p', '', 'gros')
    const list = document.createElement('div')
    list.className = 'offres'
    const coupon = text('p', `Bon −${Math.round(MISSIONS_TUNING.COUPON_DISCOUNT * 100)} % sur ce prochain achat`, 'bon')
    body.append(countdown, coupon, list)
    let sig = ''

    function rows() {
      const s = ctx.get()
      list.replaceChildren()
      coupon.hidden = s.missions.daily.coupons <= 0 || s.merchant.offers.length === 0
      buyBlockedUntil = performance.now() + BUY_DELAY_MS
      if (s.merchant.offers.length === 0) list.append(text('p', 'Plus rien en stock pour le moment.', 'discret'))
      for (const o of s.merchant.offers) {
        const row = document.createElement('div')
        row.className = 'offre'
        row.append(text('b', SPECIES[o.species].name), text('span', o.sex === 'F' ? '♀' : '♂'), text('span', o.stage),
          priceCell(o.price, offerPriceFor(s, o)))
        const t = merchantTarget(s, ctx.selection(), o.species)
        const buy = document.createElement('button')
        buy.type = 'button'; buy.textContent = 'Acheter'
        if ('encId' in t) {
          row.append(text('span', `→ ${enclosureLabel(s, t.encId)}`, 'cible'))
          buy.addEventListener('click', () => {
            if (performance.now() < buyBlockedUntil) return
            if (ctx.dispatch({ type: 'acheterAnimal', offerId: o.id, encId: t.encId }, buy)) {
              buyBlockedUntil = performance.now() + BUY_DELAY_MS
              refreshDrawer()
            }
          })
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
      const k = JSON.stringify([s.merchant.offers.map((o) => [o.id, merchantTarget(s, ctx.selection(), o.species)]), s.enclosures.length, s.missions.daily.coupons])
      if (k !== sig) { sig = k; rows() }
    }
    update()
    return update
  })
}
