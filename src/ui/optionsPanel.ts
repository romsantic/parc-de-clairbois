import { closeDrawer, isDrawerOpen, openDrawer, refreshDrawer } from './drawer'
import { createConfirmGuard } from './confirmGuard'

export interface OptionsContext { restart(): void }

const CONFIRM_DELAY_MS = 400
const CONFIRM_TIMEOUT_MS = 3000

/** Volet Options (roue ⚙) : pour l'instant, « Recommencer à zéro » en deux clics. */
export function toggleOptionsPanel(ctx: OptionsContext): void {
  if (isDrawerOpen('options')) { closeDrawer(); return }
  const guard = createConfirmGuard(CONFIRM_DELAY_MS)
  let timer = 0
  function disarm() {
    guard.reset()
    if (isDrawerOpen('options')) refreshDrawer()
  }
  openDrawer('options', 'Options', (body) => {
    body.replaceChildren()
    const warn = document.createElement('p')
    warn.textContent = 'Tout ton parc sera effacé'
    warn.className = 'discret'
    const go = document.createElement('button')
    go.type = 'button'
    go.className = guard.armed() ? 'vendre confirmer' : 'vendre'
    go.textContent = guard.armed() ? 'Recommencer ?' : 'Recommencer à zéro'
    go.addEventListener('click', () => {
      const r = guard.click()
      clearTimeout(timer)
      if (r === 'confirmed') { ctx.restart(); return } // ferme aussi le volet
      timer = window.setTimeout(disarm, CONFIRM_TIMEOUT_MS)
      if (r === 'armed') refreshDrawer()
    })
    body.append(warn, go)
  })
}
