/** Icônes SVG fixes de l'interface (jamais de contenu venu du joueur ici). */
const svg = (d: string) =>
  `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${d}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`

export const ICONS = {
  balai: svg('M14 4l6 6M10 8l6 6M4 20l6-6M8 16c-2 2-4 3-5 3 0-1 1-3 3-5l4-4 4 4z'),
  soin: svg('M9 4h6v5h5v6h-5v5H9v-5H4V9h5z'),
  agrandir: svg('M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5'),
  liste: svg('M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01'),
  plus: svg('M12 5v14M5 12h14'),
  cible: svg('M12 12m-8 0a8 8 0 1 0 16 0a8 8 0 1 0-16 0M12 12m-3 0a3 3 0 1 0 6 0a3 3 0 1 0-6 0'),
  marchand: svg('M3 7h11v9H3zM14 10h4l3 3v3h-7M7 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4M17 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4'),
  gazette: svg('M4 5h13v14H6a2 2 0 0 1-2-2zM17 9h3v8a2 2 0 0 1-2 2M8 9h5M8 13h5'),
  replier: svg('M6 9l6 6 6-6'),
  deplier: svg('M6 15l6-6 6 6'),
  patte: svg('M8 10a2 2 0 1 0 0-4 2 2 0 0 0 0 4M16 10a2 2 0 1 0 0-4 2 2 0 0 0 0 4M5 15a2 2 0 1 0 0-4 2 2 0 0 0 0 4M19 15a2 2 0 1 0 0-4 2 2 0 0 0 0 4M12 20c-3 0-5-2-5-4s2-4 5-4 5 2 5 4-2 4-5 4'),
}

/** Petit bouton-icône avec prix dans un coin et nom au survol (spec §7). */
export function iconButton(icon: string, label: string, opts: { price?: number; disabled?: boolean } = {}): HTMLButtonElement {
  const b = document.createElement('button')
  b.type = 'button'
  b.className = 'icone'
  b.innerHTML = icon
  b.setAttribute('aria-label', opts.price !== undefined ? `${label} (${opts.price} pièces)` : label)
  b.dataset.bulle = label
  if (opts.price !== undefined) {
    const p = document.createElement('small')
    p.textContent = String(opts.price)
    b.append(p)
  }
  if (opts.disabled) b.setAttribute('aria-disabled', 'true')
  return b
}
