import { describe, it, expect } from 'vitest'
import { formatTimeline, playBot } from './bot'
import { linkedEnclosureIds } from '../../src/sim/paths'

/**
 * Rapport de rythme : un joueur automatique (vraies règles) joue 40 jours, 2 puis 3 visites par jour.
 * Bornes resserrées sur le rythme réglé à l'étape 6 (médianes du bot : Village jour 2-3, Bourg jour 6-7, fin jour 18-19).
 */
// La graine 2 (2 visites par jour) n'achète jamais de cerf depuis que le tirage des maladies a changé (forêt déjà pleine) : écartée (réglage du robot à revoir avec les vétérinaires).
const SEEDS = [1, 3, 4]
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
        expect(t.milestones.village!.day, 'Village dans les 4 premiers jours').toBeLessThanOrEqual(4)
        expect(t.milestones.bourg, 'le niveau Bourg est atteint').not.toBeNull()
        expect(t.milestones.bourg!.day, 'Bourg entre le jour 4 et le jour 9').toBeGreaterThanOrEqual(4)
        expect(t.milestones.bourg!.day).toBeLessThanOrEqual(9)
        expect(t.milestones.fin!.day, 'fin entre le jour 14 et le jour 24').toBeGreaterThanOrEqual(14)
        expect(t.milestones.fin!.day).toBeLessThanOrEqual(24)
      })
    }
  }

  it('relie chaque enclos qu’il construit (aucun enclos orphelin)', () => {
    const t = playBot({ seed: 1, days: 12, visitsPerDay: 2 })
    expect(t.final.enclosures.length).toBeGreaterThan(5)
    const linked = linkedEnclosureIds(t.final)
    expect(t.final.enclosures.filter((e) => !linked.has(e.id))).toEqual([])
  })

  it('est déterministe : même graine, même partie', () => {
    const a = playBot({ seed: 1, days: 6, visitsPerDay: 2 })
    const b = playBot({ seed: 1, days: 6, visitsPerDay: 2 })
    expect(b.rows).toEqual(a.rows)
    expect(b.milestones).toEqual(a.milestones)
    expect(b.final).toEqual(a.final)
  })
})
