import type { GameState } from '../sim/types'
import { currentMission } from '../sim/missions'
import { bannerFor } from './missionModel'

const SHOW_MS = 4000

/**
 * Bannière « Nouvelle mission — titre » / « Mission réussie ! » au-dessus de la barre du bas (4 s).
 * Elle compare la mission courante d'un passage à l'autre ; au tout premier passage elle ne parle que d'une mission non lue.
 */
let hideBanner: (() => void) | null = null
/** Cache la bannière et oublie la mission vue (nouvelle partie). */
export function resetMissionBanner(): void { hideBanner?.() }

export function mountMissionBanner(get: () => GameState, onOpen: () => void): void {
  const el = document.createElement('button')
  el.type = 'button'
  el.className = 'banniere-mission'
  el.setAttribute('role', 'status')
  el.setAttribute('aria-live', 'polite')
  el.hidden = true
  el.addEventListener('click', () => { el.hidden = true; onOpen() })
  document.body.append(el)

  let prev: { id: string; done: boolean } | undefined
  let timer = 0
  const show = (msg: string) => {
    el.textContent = msg
    el.hidden = false
    el.classList.remove('visible')
    void el.offsetWidth // relance la transition
    el.classList.add('visible')
    clearTimeout(timer)
    timer = window.setTimeout(() => { el.hidden = true; el.classList.remove('visible') }, SHOW_MS)
  }
  hideBanner = () => { clearTimeout(timer); el.hidden = true; el.classList.remove('visible'); prev = undefined }
  const check = () => {
    const s = get()
    const c = currentMission(s)
    const cur = c ? { id: c.def.id, done: c.mp.done } : null
    const kind = bannerFor(prev, cur, s.missions.unread)
    if (cur) prev = cur
    if (kind === 'nouvelle') show(`Nouvelle mission — ${c!.def.title}`)
    else if (kind === 'reussie') show('Mission réussie ! Récupère ta récompense')
  }
  check()
  setInterval(check, 500)
}
