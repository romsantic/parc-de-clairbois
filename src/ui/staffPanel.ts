import type { Action } from '../sim/actions'
import { applyAction } from '../sim/actions'
import { JOBS } from '../data/staff'
import { closeDrawer, isDrawerOpen, openDrawer } from './drawer'
import { createConfirmGuard, type ConfirmGuard } from './confirmGuard'
import { formatCountdown } from './format'
import { enclosureLabel } from './merchantPanel'
import { candidateLine, debtLine, employeeLine, staffHeader } from './staffModel'
import type { PanelContext } from './ticketPanel'

const text = (tag: string, t: string, cls = '') => { const e = document.createElement(tag); e.textContent = t; if (cls) e.className = cls; return e }
const button = (label: string, cls = '') => {
  const b = document.createElement('button')
  b.type = 'button'; b.textContent = label
  if (cls) b.className = cls
  return b
}

/** Fiches dont la liste d'enclos est dépliée et licenciements armés : gardés d'un rafraîchissement à l'autre. */
const expanded = new Set<number>()
const guards = new Map<number, ConfirmGuard>()
const guardTimers = new Map<number, number>()
const ARM_MS = 4000

function guardFor(id: number): ConfirmGuard {
  let g = guards.get(id)
  if (!g) { g = createConfirmGuard(); guards.set(id, g) }
  return g
}

function resetGuards(): void {
  for (const t of guardTimers.values()) clearTimeout(t)
  guards.clear(); guardTimers.clear()
}

/** Volet du personnel : employés, candidats à l'embauche, métiers à venir. */
export function toggleStaffPanel(ctx: PanelContext): void {
  if (isDrawerOpen('personnel')) { closeDrawer(); return }
  resetGuards(); expanded.clear()
  openDrawer('personnel', 'Personnel', (body) => {
    body.replaceChildren()
    const top = document.createElement('div')
    top.className = 'personnel'
    const countdown = text('p', '', 'discret')
    const list = document.createElement('div')
    list.className = 'personnel'
    body.append(top, list)
    let sig = ''

    const redraw = () => { sig = ''; update() }
    const act = (a: Action, from: HTMLElement) => { if (ctx.dispatch(a, from)) redraw() }

    function draw() {
      const s = ctx.get()
      top.replaceChildren(text('p', staffHeader(s), 'gros'))
      const debt = debtLine(s)
      if (debt) top.append(text('p', debt, 'rouge'))
      const spread = button('Répartir')
      spread.title = 'Répartit les enclos entre les employés'
      spread.addEventListener('click', () => act({ type: 'repartir' }, spread))
      top.append(spread)

      list.replaceChildren(text('h3', 'Employés'))
      if (s.staff.employees.length === 0) list.append(text('p', 'Personne pour l’instant.', 'discret'))
      for (const e of s.staff.employees) {
        const line = employeeLine(s, e)
        const card = document.createElement('div')
        card.className = 'carte-perso'
        const info = document.createElement('div')
        info.className = 'infos'
        info.append(text('b', line.title), text('div', line.detail, 'discret'))
        const btns = document.createElement('div')
        btns.className = 'boutons'
        const canAssign = e.job === 'soigneur' || e.job === 'entretien'
        if (canAssign) {
          const enc = button(expanded.has(e.id) ? 'Enclos ▲' : 'Enclos ▼')
          enc.addEventListener('click', () => { if (expanded.has(e.id)) expanded.delete(e.id); else expanded.add(e.id); redraw() })
          btns.append(enc)
        }
        const g = guardFor(e.id)
        const fire = button(g.armed() ? `Licencier ${e.name} ? Sans indemnité.` : 'Licencier', g.armed() ? 'vendre confirmer' : 'vendre')
        fire.addEventListener('click', () => {
          const r = g.click()
          if (r === 'ignored') return
          clearTimeout(guardTimers.get(e.id))
          if (r === 'armed') {
            guardTimers.set(e.id, window.setTimeout(() => { g.reset(); if (isDrawerOpen('personnel')) redraw() }, ARM_MS))
            redraw()
            return
          }
          expanded.delete(e.id)
          guards.delete(e.id)
          act({ type: 'licencier', employeeId: e.id }, fire)
        })
        btns.append(fire)
        card.append(info, btns)
        if (canAssign && expanded.has(e.id)) {
          const boxes = document.createElement('div')
          boxes.className = 'liste-enclos'
          if (s.enclosures.length === 0) boxes.append(text('p', 'Aucun enclos pour l’instant.', 'discret'))
          for (const x of s.enclosures) {
            const label = document.createElement('label')
            const box = document.createElement('input')
            box.type = 'checkbox'; box.checked = e.encIds.includes(x.id)
            box.addEventListener('change', () => {
              const cur = ctx.get().staff.employees.find((y) => y.id === e.id)
              const ids = new Set(cur?.encIds ?? [])
              if (box.checked) ids.add(x.id); else ids.delete(x.id)
              act({ type: 'affecter', employeeId: e.id, encIds: [...ids] }, box)
            })
            label.append(box, ` ${enclosureLabel(s, x.id)}`)
            boxes.append(label)
          }
          card.append(boxes)
        }
        list.append(card)
      }

      list.append(text('h3', 'Candidats'), countdown)
      if (s.staff.candidates.length === 0) list.append(text('p', 'Aucun candidat pour le moment.', 'discret'))
      for (const c of s.staff.candidates) {
        const card = document.createElement('div')
        card.className = 'carte-perso'
        // La raison vient de la règle elle-même : on essaie l'action sur l'état courant.
        const test = applyAction(s, { type: 'embaucher', candidateId: c.id })
        const hire = button('Embaucher', 'principal')
        if (!test.ok) { hire.disabled = true; hire.title = test.reason }
        hire.addEventListener('click', () => act({ type: 'embaucher', candidateId: c.id }, hire))
        const info = document.createElement('div')
        info.className = 'infos'
        info.append(text('span', candidateLine(c)))
        if (!test.ok) info.append(text('div', test.reason, 'rouge'))
        const btns = document.createElement('div')
        btns.className = 'boutons'
        btns.append(hire)
        card.append(info, btns)
        list.append(card)
      }

      list.append(text('h3', 'Bientôt'))
      for (const j of Object.values(JOBS).filter((x) => !x.open)) list.append(text('p', j.name, 'discret bientot'))
    }

    function update() {
      const s = ctx.get()
      // Les fiches ne sont refaites que si un texte affiché change (pas à chaque point d'expérience).
      const k = JSON.stringify([
        staffHeader(s), debtLine(s),
        s.staff.employees.map((e) => [e.id, employeeLine(s, e), e.encIds]),
        s.staff.candidates.map((c) => [c.id, candidateLine(c), (() => { const r = applyAction(s, { type: 'embaucher', candidateId: c.id }); return r.ok ? '' : r.reason })()]),
        s.enclosures.map((e) => enclosureLabel(s, e.id)),
      ])
      if (k !== sig) { sig = k; draw() }
      countdown.textContent = `Nouveaux candidats dans ${formatCountdown(s.staff.renewAt - s.time)}`
    }
    update()
    return update
  })
}
