import type { GameState } from '../sim/types'
import type { Action } from '../sim/actions'
import { cureCost } from '../sim/actions'
import type { Pick } from '../scene/picking'
import type { Zone } from '../data/zones'
import { SPECIES } from '../data/species'
import { TUNING } from '../data/tuning'
import { animalsIn, capacity, cleanliness } from '../sim/enclosure'
import { ageStage, satiety } from '../sim/animal'
import { happiness } from '../sim/happiness'
import { ICONS, iconButton } from './icons'
import { closeDrawer, isDrawerOpen, openDrawer, refreshDrawer } from './drawer'
import { toast } from './feedback'

export interface BottomBarContext {
  get(): GameState
  selection(): Pick
  dispatch(action: Action, from?: HTMLElement | null): boolean
  startBuild(zone: Zone, point: { x: number; z: number }): void
  startResize(encId: number): void
}

const AGE = { bebe: 'bébé', jeune: 'jeune', adulte: 'adulte' } as const
const pct = (x: number) => `${Math.round(x * 100)} %`
const text = (tag: string, t: string, cls = '') => { const e = document.createElement(tag); e.textContent = t; if (cls) e.className = cls; return e }

/** Barre de commande compacte en bas de l'écran, qui s'agrandit en volet à la demande (spec §7). */
export function mountBottomBar(ctx: BottomBarContext): { refresh(): void } {
  const bar = document.createElement('footer')
  bar.className = 'barre-bas'
  const left = document.createElement('div'); left.className = 'zone-selection'
  const actions = document.createElement('div'); actions.className = 'zone-actions'
  const mission = document.createElement('button'); mission.type = 'button'; mission.className = 'zone-mission'
  const right = document.createElement('div'); right.className = 'zone-droite'
  bar.append(left, actions, mission, right)

  const tab = document.createElement('button')
  tab.type = 'button'; tab.className = 'languette'; tab.innerHTML = ICONS.deplier
  tab.setAttribute('aria-label', 'Déplier la barre'); tab.hidden = true
  document.body.append(bar, tab)

  mission.innerHTML = ICONS.cible
  mission.append(text('span', 'Les missions arrivent bientôt'))
  mission.addEventListener('click', () => toast('Les missions de Margaux arrivent bientôt', true))

  const marchand = iconButton(ICONS.marchand, 'Marchand (bientôt)', { disabled: true })
  const gazette = iconButton(ICONS.gazette, 'Gazette (bientôt)', { disabled: true })
  for (const b of [marchand, gazette]) b.addEventListener('click', () => toast('Bientôt disponible', true))
  const fold = iconButton(ICONS.replier, 'Replier la barre')
  fold.addEventListener('click', () => { bar.hidden = true; tab.hidden = false; closeDrawer() })
  tab.addEventListener('click', () => { bar.hidden = false; tab.hidden = true })
  right.append(marchand, gazette, fold)

  let builtFor = ''
  let drawerSeen = ''

  function enclosureDetails(encId: number) {
    openDrawer(`enclos:${encId}`, 'Animaux de l’enclos', (body) => {
      const s = ctx.get()
      const enc = s.enclosures.find((e) => e.id === encId)
      body.replaceChildren()
      if (!enc) { body.append(text('p', 'Cet enclos n’existe plus.')); return }
      const here = animalsIn(s, encId)
      if (here.length === 0) { body.append(text('p', 'Cet enclos est vide. Le marchand d’animaux arrive bientôt.')); return }
      const table = document.createElement('table')
      const hr = document.createElement('tr')
      for (const h of ['Nom', '', 'Âge', 'Satiété', 'Santé', 'Gestation', 'Bonheur', '']) hr.append(text('th', h))
      table.append(hr)
      for (const a of here) {
        const tr = document.createElement('tr')
        const name = document.createElement('input')
        name.value = a.name; name.maxLength = TUNING.NAME_MAX_LENGTH
        name.setAttribute('aria-label', `Nom de ${a.name}`)
        name.addEventListener('change', () => { ctx.dispatch({ type: 'renommer', animalId: a.id, name: name.value }, name); name.blur() })
        const nameCell = document.createElement('td'); nameCell.append(name)
        const sick = a.health.status === 'malade'
        const gest = a.pregnantSince === null ? '—'
          : pct(Math.min(1, (s.time - a.pregnantSince) / (SPECIES[a.species].gestationH * 3_600_000)))
        tr.append(nameCell, text('td', a.sex === 'F' ? '♀' : '♂'), text('td', AGE[ageStage(a, s.time)]),
          text('td', pct(satiety(a, s.time))), text('td', sick ? 'malade' : 'en forme', sick ? 'rouge' : 'vert'),
          text('td', gest), text('td', pct(happiness(s, a))))
        const act = document.createElement('td')
        if (sick) {
          const cure = iconButton(ICONS.soin, 'Soigner', { price: cureCost(SPECIES[a.species].price) })
          cure.addEventListener('click', () => { if (ctx.dispatch({ type: 'soigner', animalId: a.id }, cure)) refreshDrawer() })
          act.append(cure)
        }
        tr.append(act)
        table.append(tr)
      }
      body.append(table)
    })
  }

  function build(p: Pick) {
    left.replaceChildren(); actions.replaceChildren()
    const s = ctx.get()
    if (p.kind === 'enclos') {
      const enc = s.enclosures.find((e) => e.id === p.id)
      if (!enc) { left.append(text('span', 'Clique un enclos ou une zone', 'discret')); return }
      left.innerHTML = ICONS.patte
      left.append(text('b', enc.species ? SPECIES[enc.species].name : 'Enclos vide', 'nom'), text('span', '', 'compte'))
      const gauge = document.createElement('span'); gauge.className = 'jauge'; gauge.title = 'Propreté'
      gauge.append(document.createElement('i'))
      left.append(gauge, text('span', '', 'malades'))
      const clean = iconButton(ICONS.balai, 'Nettoyer', { price: TUNING.CLEAN_COST })
      clean.addEventListener('click', () => ctx.dispatch({ type: 'nettoyer', encId: p.id }, clean))
      const cure = iconButton(ICONS.soin, 'Soigner les malades')
      cure.addEventListener('click', () => ctx.dispatch({ type: 'soignerTout', encId: p.id }, cure))
      const resize = iconButton(ICONS.agrandir, 'Redimensionner')
      resize.addEventListener('click', () => ctx.startResize(p.id))
      const details = iconButton(ICONS.liste, 'Détails des animaux')
      details.addEventListener('click', () => isDrawerOpen(`enclos:${p.id}`) ? closeDrawer() : enclosureDetails(p.id))
      actions.append(clean, cure, resize, details)
    } else if (p.kind === 'zone') {
      left.append(text('b', p.zone.name, 'nom'))
      if (p.zone.unlockLevel > s.village.level) {
        left.append(text('span', `Se débloque au niveau ${p.zone.unlockLevel} du village`, 'discret'))
      } else {
        const add = iconButton(ICONS.plus, 'Nouvel enclos')
        add.addEventListener('click', () => ctx.startBuild(p.zone, p.point))
        actions.append(add)
      }
    } else {
      left.append(text('span', 'Clique un enclos ou une zone', 'discret'))
    }
  }

  function update() {
    const p = ctx.selection()
    const key = p.kind === 'enclos' ? `e${p.id}` : p.kind === 'zone' ? `z${p.zone.id}` : 'rien'
    if (key !== builtFor) { builtFor = key; build(p); if (!key.startsWith('e')) closeDrawer() }
    if (p.kind === 'enclos') {
      const s = ctx.get()
      const enc = s.enclosures.find((e) => e.id === p.id)
      if (!enc) return
      const here = animalsIn(s, p.id)
      const sick = here.filter((a) => a.health.status === 'malade')
      left.querySelector('.compte')!.textContent = `${here.length}/${capacity(enc)}`
      const c = cleanliness(enc, s.time)
      const fill = left.querySelector<HTMLElement>('.jauge i')!
      fill.style.width = pct(c); fill.dataset.niveau = c < 0.3 ? 'bas' : c < 0.7 ? 'moyen' : 'haut'
      const m = left.querySelector<HTMLElement>('.malades')!
      m.textContent = sick.length ? `${sick.length} malade${sick.length > 1 ? 's' : ''}` : ''
      const cureBtn = actions.querySelectorAll('button')[1]
      const cost = sick.reduce((t, a) => t + cureCost(SPECIES[a.species].price), 0)
      let price = cureBtn?.querySelector('small')
      if (cureBtn && cost && !price) { price = document.createElement('small'); cureBtn.append(price) }
      if (price) price.textContent = cost ? String(cost) : ''
    }
    // Le volet n'est redessiné que si ses animaux ont changé (sinon ses boutons seraient recréés sous le clic).
    if (p.kind === 'enclos') {
      const s = ctx.get()
      const k = JSON.stringify([s.time, animalsIn(s, p.id)])
      if (k !== drawerSeen && refreshDrawer()) drawerSeen = k // sinon on réessaiera au prochain passage
    }
  }

  update()
  setInterval(update, 500)
  return { refresh: update }
}
