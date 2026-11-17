import type { HighlightId } from '../data/missions'

/**
 * Met en évidence l'élément que la mission en cours demande de toucher : les éléments concernés portent
 * `data-guide="…"` (barres, boutons) et le CSS dessine un anneau doré qui pulse quand `data-highlight` correspond.
 * Les éléments sont recréés souvent : seul cet attribut du <body> change, le CSS fait le reste.
 */
export function setHighlight(id: HighlightId | null): void {
  if (id) {
    if (document.body.dataset.highlight !== id) document.body.dataset.highlight = id
  } else if (document.body.dataset.highlight !== undefined) {
    delete document.body.dataset.highlight
  }
}

/** Marque un élément comme cible possible d'une mise en évidence. */
export function guide<T extends HTMLElement>(el: T, id: HighlightId): T {
  el.dataset.guide = id
  return el
}
