/**
 * Migrations de sauvegarde : MIGRATIONS[n] transforme une partie au format n en format n + 1.
 * À chaque changement du format de GameState, on augmente CURRENT_VERSION et on ajoute ici
 * la fonction qui convertit l'ancien format, pour que les parties en cours survivent aux mises à jour.
 */
export const CURRENT_VERSION = 6

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
  // v3 -> v4 (V2 étape 1, chemins à construire). Écrite en clair : aucun chemin construit au départ.
  3: (old) => ({ ...old, version: 4, paths: [] }),
  // v4 -> v5 (V2 étape 2, personnel). Écrite en clair : aucun employé, le premier pas tire les candidats.
  4: (old) => ({ ...old, version: 5, staff: { employees: [], candidates: [], renewAt: old.time, renewals: 0, payDay: -1, coverAllUntil: 0 } }),
  // v5 -> v6 (V2 étape 3, maladies et centre vétérinaire). Écrite en clair, sans importer les données ni appeler le jeu :
  // les chiffres ci-dessous (24 h, emplacement 7, nom de la vétérinaire) ne doivent jamais changer.
  5: (old) => {
    const H = 3_600_000
    const enclosures = old.enclosures as { id: number; cleanedAt: number }[]
    const animals = (old.animals as { enclosureId: number; lastFedAt: number; health: { status: string; since?: number } }[]).map((a) => {
      if (a.health.status !== 'malade') return a
      const enc = enclosures.find((e) => e.id === a.enclosureId)
      // Même règle que la V1 pour deviner la cause : la faim d'abord, puis la saleté ; sinon indigestion.
      const disease = old.time - a.lastFedAt >= 24 * H ? 'indigestion'
        : enc && old.time - enc.cleanedAt >= 24 * H ? 'parasites' : 'indigestion'
      const stage = old.time - (a.health.since as number) >= 24 * H ? 2 : 1
      // Le stade repart du début, repéré : aucun malade ne meurt à cause de la mise à jour.
      return { ...a, health: { status: 'malade', disease, stage, stageSince: old.time, detectedAt: old.time, careUntil: null, vetId: null, quarantined: false } }
    })
    const buildings = [...(old.buildings as { slot: number; type: string; level: number }[])]
    if (!buildings.some((b) => b.type === 'centreVeto') && !buildings.some((b) => b.slot === 7)) buildings.push({ slot: 7, type: 'centreVeto', level: 1 })
    const employees = [...(old.staff.employees as { job: string }[])]
    let nextId = old.nextId as number
    if (!employees.some((e) => e.job === 'veterinaire')) {
      employees.push({ id: nextId, name: 'Élise Fontaine', job: 'veterinaire', xpH: 0, hiredAt: old.time, encIds: [] } as never)
      nextId += 1
    }
    return {
      ...old, version: 6, nextId, animals, buildings,
      enclosures: (old.enclosures as object[]).map((e) => ({ ...e, vaccinatedUntil: null })),
      stats: { ...old.stats, counts: { ...old.stats.counts, vaccinations: 0 } },
      staff: { ...old.staff, employees },
    }
  },
}
