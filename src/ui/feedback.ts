/** Retour visuel des actions (spec §7) : bouton vert ou rouge, message court en bas de la carte. */

const FLASH_MS = 900
const TOAST_MS = 1800

/** Le bouton (ou la case) passe en vert si l'action a réussi, en rouge sinon, un court instant. */
export function flash(el: HTMLElement | null | undefined, ok: boolean): void {
  if (!el) return
  el.classList.remove('flash-ok', 'flash-non')
  void el.offsetWidth // relance l'animation même si on clique deux fois de suite
  el.classList.add(ok ? 'flash-ok' : 'flash-non')
  setTimeout(() => el.classList.remove('flash-ok', 'flash-non'), FLASH_MS)
}

let toastEl: HTMLDivElement | null = null
let toastTimer = 0

/** Message court en bas de la carte (« +20 viande dans le garde-manger », raison d'un refus…). */
export function toast(text: string, ok: boolean): void {
  if (!toastEl) {
    toastEl = document.createElement('div')
    toastEl.className = 'message-action'
    toastEl.setAttribute('role', 'status')
    toastEl.setAttribute('aria-live', 'polite')
    document.body.append(toastEl)
  }
  toastEl.textContent = text
  toastEl.classList.toggle('refus', !ok)
  toastEl.classList.add('visible')
  clearTimeout(toastTimer)
  toastTimer = window.setTimeout(() => toastEl?.classList.remove('visible'), TOAST_MS)
}

/** Petit « +20 » / « −5 » qui s'envole au-dessus d'un élément. */
export function floatDelta(el: HTMLElement, delta: number): void {
  const p = document.createElement('span')
  p.className = `envol ${delta >= 0 ? 'gain' : 'perte'}`
  p.textContent = `${delta >= 0 ? '+' : '−'}${Math.abs(Math.round(delta))}`
  el.append(p)
  setTimeout(() => p.remove(), 1100)
}
