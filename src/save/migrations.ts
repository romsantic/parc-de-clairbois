/**
 * Migrations de sauvegarde : MIGRATIONS[n] transforme une partie au format n en format n + 1.
 * À chaque changement du format de GameState, on augmente CURRENT_VERSION et on ajoute ici
 * la fonction qui convertit l'ancien format, pour que les parties en cours survivent aux mises à jour.
 */
export const CURRENT_VERSION = 1

export type Migration = (old: any) => unknown // eslint-disable-line @typescript-eslint/no-explicit-any

export const MIGRATIONS: Record<number, Migration> = {}
