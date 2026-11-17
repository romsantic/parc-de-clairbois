import { formatDateFr, type GazetteEdition } from './gazetteModel'

let overlay: HTMLElement | null = null

export function isGazetteOpen(): boolean { return overlay !== null }

export function closeGazette(): void {
  overlay?.remove()
  overlay = null
}

const el = (tag: string, cls: string, t = ''): HTMLElement => {
  const e = document.createElement(tag)
  e.className = cls
  if (t) e.textContent = t // toujours du texte, jamais du HTML (noms d'animaux saisis par le joueur)
  return e
}

/** Ouvre La Gazette de Clairbois par-dessus la carte. `edition` null : rien de neuf depuis l'arrivée. */
export function openGazette(edition: GazetteEdition | null, nowMs = Date.now()): void {
  closeGazette()
  const back = el('div', 'gazette-fond')
  const paper = el('article', 'gazette')
  paper.setAttribute('role', 'dialog')
  paper.setAttribute('aria-modal', 'true')
  paper.setAttribute('aria-label', 'La Gazette de Clairbois')
  paper.tabIndex = -1
  paper.append(el('h2', 'gazette-titre', 'La Gazette de Clairbois'), el('p', 'gazette-date', formatDateFr(nowMs)), el('hr', 'gazette-filet'))
  if (!edition) {
    paper.append(el('p', 'gazette-vide', 'Rien de neuf depuis ton arrivée.'))
  } else {
    paper.append(el('h3', 'gazette-une', edition.headline), el('p', 'gazette-absence', edition.absence))
    const list = el('div', 'gazette-rubriques')
    for (const it of edition.items) {
      const p = el('p', 'gazette-rubrique')
      p.append(el('b', 'gazette-etiquette', it.label), document.createTextNode(' '), document.createTextNode(it.text))
      list.append(p)
    }
    paper.append(list)
  }
  const btn = el('button', 'principal gazette-retour', 'Retour au parc') as HTMLButtonElement
  btn.type = 'button'
  btn.addEventListener('click', closeGazette)
  paper.append(btn)
  back.addEventListener('click', (e) => { if (e.target === back) closeGazette() })
  back.append(paper)
  document.body.append(back)
  overlay = back
  btn.focus()
}

window.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeGazette() })
