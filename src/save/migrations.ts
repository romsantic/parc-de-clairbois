/**
 * Migrations de sauvegarde : MIGRATIONS[n] transforme une partie au format n en format n + 1.
 * À chaque changement du format de GameState, on augmente CURRENT_VERSION et on ajoute ici
 * la fonction qui convertit l'ancien format, pour que les parties en cours survivent aux mises à jour.
 */
export const CURRENT_VERSION = 3

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
  // v2 -> v3 (étape 5, missions). Écrite en clair, sans importer les données des missions ni appeler le jeu.
  2: (old) => {
    // Index de la première mission d'histoire de chaque palier (11 missions : 4 + 4 + 3), écrits ici pour ne jamais changer.
    const STORY_START: Record<number, number> = { 1: 0, 2: 4, 3: 8 }
    return {
      ...old,
      version: 3,
      stats: {
        counts: {
          nettoyages: 0, fourrageAchete: 0, viandeAchetee: 0, ventes: 0, achatsAnimaux: 0, naissances: 0, gestations: 0,
          visiteurs: old.totalVisitors, piecesGagnees: 0, soins: 0, billetsRegles: 0, ficheEnclosVue: 0, autonomieVue: 0, ameliorations: 0,
        },
        birthsBySpecies: {},
      },
      missions: {
        tutorial: { step: 0, current: null, skipped: false },
        story: { index: STORY_START[old.village?.level] ?? 0, current: null },
        daily: { dayKey: -1, list: [], streak: 0, lastFullDay: null, coupons: 0 },
        unread: true,
      },
      utcOffsetMin: 0,
    }
  },
}
