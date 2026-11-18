/** Appareil tactile (téléphone, tablette) : un seul endroit pour le savoir. */
export function isPhone(): boolean {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches
}
