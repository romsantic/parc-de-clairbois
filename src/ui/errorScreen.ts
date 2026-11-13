/** Écran plein qui remplace une page noire quand quelque chose empêche le jeu de démarrer. */
export function showError(message: string): void {
  document.querySelector('.ecran-message')?.remove()
  const box = document.createElement('div')
  box.className = 'ecran-message'
  box.setAttribute('role', 'alert')
  const p = document.createElement('p')
  p.textContent = message
  const btn = document.createElement('button')
  btn.type = 'button'
  btn.textContent = 'Recharger'
  btn.addEventListener('click', () => location.reload())
  box.append(p, btn)
  document.body.append(box)
}

/** Message de chargement, retiré dès que la scène est prête. */
export function showLoading(text: string): { update(text: string): void; hide(): void } {
  const box = document.createElement('div')
  box.className = 'ecran-message chargement'
  box.setAttribute('role', 'status')
  box.textContent = text
  document.body.append(box)
  return { update: (t) => { box.textContent = t }, hide: () => box.remove() }
}
