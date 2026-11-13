/**
 * Heure affichée par le monde : l'heure réelle, ou celle forcée par ?heure=14 dans l'adresse
 * (pratique pour tester). Une valeur vide, invalide ou infinie est ignorée.
 */
export function hourFromLocation(search: string, now: Date): { hour: number; forced: boolean } {
  const raw = new URLSearchParams(search).get('heure')
  const forced = raw && raw.trim() ? Number(raw) : NaN
  if (Number.isFinite(forced)) return { hour: forced, forced: true }
  return { hour: now.getHours() + now.getMinutes() / 60, forced: false }
}
