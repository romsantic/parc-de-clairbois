import { describe, it, expect } from 'vitest'
import { formatTimeline, playBot } from './bot'

/**
 * Rapport de rythme : un joueur automatique (vraies règles) joue 40 jours, 2 puis 3 visites par jour.
 * Bornes très larges pour l'instant (la tâche 5 les resserre après réglage des chiffres du jeu).
 */
const SEEDS = [1, 2, 3]
const VISITS = [2, 3]
const DAYS = 40

describe('joueur automatique : rythme de la partie', () => {
  for (const visitsPerDay of VISITS) {
    for (const seed of SEEDS) {
      it(`graine ${seed}, ${visitsPerDay} visites par jour`, () => {
        const t = playBot({ seed, days: DAYS, visitsPerDay })
        console.log(formatTimeline(t))
        expect(t.deaths, 'aucun animal ne meurt avec un joueur attentif').toBe(0)
        expect(t.milestones.village, 'le niveau Village est atteint').not.toBeNull()
        expect(t.milestones.fin, "la fin de l'histoire est atteinte").not.toBeNull()
        expect(t.milestones.fin!.day, "avant le jour 40").toBeLessThan(DAYS)
      })
    }
  }

  it('est déterministe : même graine, même partie', () => {
    const a = playBot({ seed: 1, days: 6, visitsPerDay: 2 })
    const b = playBot({ seed: 1, days: 6, visitsPerDay: 2 })
    expect(b.rows).toEqual(a.rows)
    expect(b.milestones).toEqual(a.milestones)
    expect(b.final).toEqual(a.final)
  })
})
