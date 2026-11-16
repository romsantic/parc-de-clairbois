/**
 * Migrations de sauvegarde : MIGRATIONS[n] transforme une partie au format n en format n + 1.
 * À chaque changement du format de GameState, on augmente CURRENT_VERSION et on ajoute ici
 * la fonction qui convertit l'ancien format, pour que les parties en cours survivent aux mises à jour.
 */
export const CURRENT_VERSION = 2

export type Migration = (old: any) => unknown // eslint-disable-line @typescript-eslint/no-explicit-any

export const MIGRATIONS: Record<number, Migration> = {
  // v1 -> v2 (étape 4, économie et village). Écrite en clair, sans appeler le jeu : elle ne doit jamais changer.
  1: (old) => ({
    ...old,
    version: 2,
    ticketPrice: 5,
    reputation: 1,
    village: { level: 1, clientsServed: 0 },
    buildings: [{ slot: 0, type: 'ferme', level: 1 }],
    merchant: { restockAt: old.time, restocks: 0, offers: [] }, // le stock se remplit au pas suivant
    totalVisitors: 0,
    animals: (old.animals as unknown[]).map((a) => ({ ...(a as object), lastBirthAt: null })),
  }),
}
