import { closeDrawer, isDrawerOpen, openDrawer, refreshDrawer } from './drawer'
import { createConfirmGuard } from './confirmGuard'
import { setMuted, setVolume, type AudioSettings } from '../audio/settings'
import type { AudioController } from '../audio/sound'

export interface OptionsContext { restart(): void; audio: AudioController }

const CONFIRM_DELAY_MS = 400
const CONFIRM_TIMEOUT_MS = 3000

/** Une ligne de réglage : libellé, pourcentage, bouton Couper / Remettre et curseur (haut, pour le doigt). */
function soundRow(label: string, ch: 'music' | 'effects', audio: AudioController): HTMLElement {
  const row = document.createElement('div')
  row.className = 'reglage-son'
  const head = document.createElement('div')
  head.className = 'reglage-son-tete'
  const name = document.createElement('label')
  name.textContent = label
  const pct = document.createElement('span')
  pct.className = 'discret'
  const mute = document.createElement('button')
  mute.type = 'button'
  mute.className = 'couper'
  head.append(name, pct, mute)
  const slider = document.createElement('input')
  slider.type = 'range'
  slider.className = 'curseur-son'
  slider.min = '0'; slider.max = '100'; slider.step = '1'
  slider.id = `son-${ch}`
  name.htmlFor = slider.id
  const show = (s: AudioSettings) => {
    slider.value = String(Math.round(s[ch].volume * 100))
    slider.disabled = s[ch].muted
    pct.textContent = s[ch].muted ? 'coupé' : `${Math.round(s[ch].volume * 100)} %`
    mute.textContent = s[ch].muted ? 'Remettre' : 'Couper'
    mute.setAttribute('aria-pressed', String(s[ch].muted))
  }
  show(audio.settings())
  slider.addEventListener('input', () => { audio.update((s) => setVolume(s, ch, Number(slider.value) / 100)); show(audio.settings()) })
  mute.addEventListener('click', () => { audio.update((s) => setMuted(s, ch, !s[ch].muted)); show(audio.settings()) })
  row.append(head, slider)
  return row
}

/** Volet Options (roue ⚙) : le son (musique, effets), puis « Recommencer à zéro » en deux clics. */
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
    const son = document.createElement('div')
    son.className = 'reglages-son'
    son.append(soundRow('Musique', 'music', ctx.audio), soundRow('Effets', 'effects', ctx.audio))
    const warn = document.createElement('p')
    warn.textContent = 'Efface ta partie et recommence depuis le début, avec Margaux.'
    warn.className = 'discret'
    const go = document.createElement('button')
    go.type = 'button'
    go.className = guard.armed() ? 'vendre confirmer' : 'vendre'
    go.textContent = guard.armed() ? 'Tout ton parc sera effacé — confirmer ?' : 'Recommencer à zéro'
    go.addEventListener('click', () => {
      const r = guard.click()
      if (r === 'ignored') return
      clearTimeout(timer)
      if (r === 'confirmed') { ctx.restart(); return } // ferme aussi le volet
      timer = window.setTimeout(disarm, CONFIRM_TIMEOUT_MS)
      refreshDrawer()
    })
    body.append(son, warn, go)
  })
}
