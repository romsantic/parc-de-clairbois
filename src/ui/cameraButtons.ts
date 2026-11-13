import type { CameraRig } from '../scene/cameraRig'

const ICONS = {
  gauche: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12a8 8 0 1 0 3-6.2M4 4v5h5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  droite: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 12a8 8 0 1 1-3-6.2M20 4v5h-5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  plus: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>',
  moins: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>',
}

/** Boutons de caméra en haut à droite : quarts de tour et zoom. */
export function mountCameraButtons(rig: CameraRig): void {
  const bar = document.createElement('div')
  bar.className = 'boutons-camera'
  const add = (label: string, icon: string, action: () => void) => {
    const b = document.createElement('button')
    b.type = 'button'
    b.setAttribute('aria-label', label)
    b.title = label
    b.innerHTML = icon
    b.addEventListener('click', action)
    bar.append(b)
  }
  add('Tourner à gauche', ICONS.gauche, () => rig.rotateQuarter(-1))
  add('Tourner à droite', ICONS.droite, () => rig.rotateQuarter(1))
  add('Zoomer', ICONS.plus, () => rig.zoom(1))
  add('Dézoomer', ICONS.moins, () => rig.zoom(-1))
  document.body.append(bar)
}
