/** Volet qui s'ouvre au-dessus de la barre du bas pour montrer un détail (spec §7). */
let panel: HTMLElement | null = null
let currentKey: string | null = null
let refresh: (() => void) | null = null
let tick: (() => void) | null = null

/** Ce que `render` peut renvoyer : une fonction appelée chaque seconde pour tenir les chiffres à jour sans reconstruire le volet. */
type Render = (body: HTMLElement) => void | (() => void)

export function isDrawerOpen(key?: string): boolean {
  return panel !== null && (key === undefined || key === currentKey)
}

/** Ouvre (ou remplace) le volet. `render` est rappelé pour le tenir à jour. */
export function openDrawer(key: string, title: string, render: Render): void {
  closeDrawer()
  panel = document.createElement('section')
  panel.className = 'volet'
  panel.setAttribute('role', 'dialog')
  panel.setAttribute('aria-label', title)
  const head = document.createElement('header')
  const h = document.createElement('h2')
  h.textContent = title
  const close = document.createElement('button')
  close.type = 'button'
  close.className = 'fermer'
  close.textContent = '✕'
  close.setAttribute('aria-label', 'Fermer')
  close.addEventListener('click', closeDrawer)
  head.append(h, close)
  const body = document.createElement('div')
  body.className = 'volet-corps'
  panel.append(head, body)
  document.body.append(panel)
  currentKey = key
  refresh = () => { tick = render(body) ?? null }
  refresh()
}

/** Redessine le volet ; renvoie faux s'il n'a pas pu (le joueur est en train de taper un nom). */
export function refreshDrawer(): boolean {
  if (!panel || !refresh) return false
  const a = document.activeElement
  // Un bouton cliqué prend le focus sous Chrome : seul un champ de saisie bloque le rafraîchissement.
  if (a instanceof HTMLInputElement && panel.contains(a)) return false
  refresh()
  return true
}

export function closeDrawer(): void {
  panel?.remove()
  panel = null
  currentKey = null
  refresh = null
  tick = null
}

setInterval(() => { if (panel && tick) tick() }, 1000)

window.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeDrawer() })
