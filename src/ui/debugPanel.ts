import type { GameState } from '../sim/types'
import type { Summary } from '../sim/summary'
import type { ActionResult } from '../sim/actions'
import { cleanEnclosure, cureAnimal, addRations, cureCost } from '../sim/actions'
import { SPECIES } from '../data/species'
import { TUTORIAL } from '../data/missions'
import { ECONOMY } from '../data/economy'
import { DAY_MS, HOUR_MS, TUNING } from '../data/tuning'
import { ageStage, satiety } from '../sim/animal'
import { animalsIn, capacity, cleanliness } from '../sim/enclosure'
import { happiness } from '../sim/happiness'
import { autonomyHours } from '../sim/feeding'
import { msUntilNextDay } from './missionModel'

/** Ce que le panneau de test peut faire sur la partie en cours. */
export interface DebugController {
  get(): GameState
  set(s: GameState): void
  /** Avance l'horloge du jeu (simule une absence). */
  advanceBy(ms: number): void
  reset(): void
  summary: Summary | null
  /** Temps d'absence au-delà de 30 jours, non rejoué. */
  skippedMs: number
}

const AGE = { bebe: 'bébé', jeune: 'jeune', adulte: 'adulte' } as const
const pct = (x: number) => `${Math.round(x * 100)} %`

function el<K extends keyof HTMLElementTagNameMap>(tag: K, text = '', cls = ''): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag)
  if (text) e.textContent = text // toujours du texte : les noms d'animaux viennent du joueur
  if (cls) e.className = cls
  return e
}

function button(label: string, onClick: () => void): HTMLButtonElement {
  const b = el('button', label)
  b.type = 'button'
  b.addEventListener('click', onClick)
  return b
}

/** Panneau visible seulement avec ?debug dans l'adresse. */
export function mountDebugPanel(ctl: DebugController): void {
  if (!new URLSearchParams(location.search).has('debug')) return
  const panel = el('section', '', 'panneau-test')
  panel.setAttribute('aria-label', 'Panneau de test')
  document.body.append(panel)
  let message = ''
  let confirmReset = false

  const act = (r: ActionResult) => {
    if (r.ok) { ctl.set(r.state); message = '' } else message = r.reason
    render()
  }

  /** Rend la mission courante réussie (sans verser la récompense : il reste à cliquer « Récupérer »). */
  function finishMission() {
    const s = structuredClone(ctl.get())
    const m = s.missions
    const cur = m.tutorial.step < TUTORIAL.length ? m.tutorial.current : m.story.current
    if (cur) cur.done = true
    else for (const d of m.daily.list) d.done = true
    ctl.set(s)
    render()
  }

  function render() {
    const s = ctl.get()
    panel.replaceChildren()
    panel.append(el('h2', 'Panneau de test'))
    const auto = autonomyHours(s)
    panel.append(el('p', `Heure du jeu : ${new Date(s.time).toLocaleString('fr-FR')}`))
    panel.append(el('p', `Pièces : ${Math.floor(s.coins)}`))
    const autoTxt = auto === Infinity ? '∞' : `${Math.floor(auto)} h`
    panel.append(el('p', `Garde-manger : ${s.pantry.fourrage.toFixed(1)} fourrage, ${s.pantry.viande.toFixed(1)} viande (sur ${s.pantry.capacity}) · autonomie ${autoTxt}`,
      auto < 6 ? 'rouge' : auto < 24 ? 'orange' : ''))
    const m = ctl.summary
    if (m && (m.naissances || m.malades || m.morts.length || m.fourrage || m.viande)) {
      panel.append(el('p', `Pendant ton absence : ${m.naissances} naissance(s), ${m.malades} malade(s), ${m.morts.length} mort(s), ${m.fourrage.toFixed(1)} fourrage et ${m.viande.toFixed(1)} viande mangés.`, 'resume'))
    }
    if (ctl.skippedMs > 0) {
      panel.append(el('p', `Absence très longue : seuls les 30 derniers jours ont été rejoués (${Math.round(ctl.skippedMs / DAY_MS)} jours ignorés).`, 'resume'))
    }

    const bar = el('div', '', 'rangee')
    bar.append(
      button('+1 h', () => { ctl.advanceBy(HOUR_MS); render() }),
      button('+1 jour', () => { ctl.advanceBy(DAY_MS); render() }),
      button('+3 jours', () => { ctl.advanceBy(3 * DAY_MS); render() }),
      button('+20 fourrage', () => act(addRations(ctl.get(), 'fourrage', 20))),
      button('+20 viande', () => act(addRations(ctl.get(), 'viande', 20))),
      button('+20 habitants', () => { const n = structuredClone(ctl.get()); n.village.clientsServed += 20 * ECONOMY.CLIENTS_PER_NEWCOMER; ctl.set(n); render() }),
      button('Finir la mission', () => finishMission()),
      button('Jour suivant', () => { const t = ctl.get(); ctl.advanceBy(msUntilNextDay(t.time, t.utcOffsetMin) + TUNING.STEP_MS); render() }),
      button('Niveau suivant', () => { const n = structuredClone(ctl.get()); n.village.level = Math.min(3, n.village.level + 1) as 1 | 2 | 3; ctl.set(n); render() }),
    )
    panel.append(bar)

    for (const e of s.enclosures) {
      const here = animalsIn(s, e.id)
      const head = el('div', '', 'rangee')
      head.append(el('strong', `Enclos ${e.id} · ${e.species ? SPECIES[e.species].name : 'vide'} · ${here.length}/${capacity(e)} · propreté ${pct(cleanliness(e, s.time))}`),
        button('Nettoyer (5)', () => act(cleanEnclosure(ctl.get(), e.id))))
      panel.append(head)
      const table = el('table')
      const hr = el('tr')
      for (const h of ['Nom', 'Sexe', 'Âge', 'Satiété', 'Santé', 'Gestation', 'Bonheur', '']) hr.append(el('th', h))
      table.append(hr)
      for (const a of here) {
        const tr = el('tr')
        const sick = a.health.status === 'malade'
        const gest = a.pregnantSince === null ? '—'
          : pct(Math.min(1, (s.time - a.pregnantSince) / (SPECIES[a.species].gestationH * HOUR_MS)))
        tr.append(el('td', a.name), el('td', a.sex === 'F' ? '♀' : '♂'), el('td', AGE[ageStage(a, s.time)]),
          el('td', pct(satiety(a, s.time))), el('td', sick ? 'malade' : 'ok', sick ? 'rouge' : ''),
          el('td', gest), el('td', pct(happiness(s, a))))
        const td = el('td')
        if (sick) td.append(button(`Soigner (${cureCost(SPECIES[a.species].price)})`, () => act(cureAnimal(ctl.get(), a.id))))
        tr.append(td)
        table.append(tr)
      }
      panel.append(table)
    }

    if (message) panel.append(el('p', message, 'rouge'))
    const end = el('div', '', 'rangee')
    if (confirmReset) {
      end.append(el('span', 'Effacer la partie et recommencer ?'),
        button('Oui, recommencer', () => { confirmReset = false; ctl.reset(); render() }),
        button('Annuler', () => { confirmReset = false; render() }))
    } else end.append(button('Nouvelle partie', () => { confirmReset = true; render() }))
    panel.append(end)
  }

  render()
  // Ne redessine que si la partie a changé : sinon les boutons seraient recréés sous le clic.
  let lastSeen = JSON.stringify(ctl.get())
  setInterval(() => {
    const now = JSON.stringify(ctl.get())
    if (now !== lastSeen) { lastSeen = now; render() }
  }, 1000)
}
