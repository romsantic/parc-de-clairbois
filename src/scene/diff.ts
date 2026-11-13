/** Compare ce qui est affiché (ids) à ce qui doit l'être : quoi ajouter, retirer, garder. */
export function diffById<T extends { id: number }>(shown: Set<number>, next: T[]): { added: T[]; removed: number[]; kept: T[] } {
  const nextIds = new Set(next.map((x) => x.id))
  return {
    added: next.filter((x) => !shown.has(x.id)),
    removed: [...shown].filter((id) => !nextIds.has(id)),
    kept: next.filter((x) => shown.has(x.id)),
  }
}
