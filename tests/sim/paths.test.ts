import { describe, it, expect } from 'vitest'
import { emptyState, enclosure, T0 } from './helpers'
import { START_PATH } from '../../src/data/paths'
import { isLinked, reachableIds, segmentsTouch, rectSegmentDistance, segmentAt } from '../../src/sim/paths'
import { newGame } from '../../src/sim/newGame'
import { checkSegment, giftPaths, linkPlan, pathCost, removalImpact, signature } from '../../src/sim/paths'
import { applyAction } from '../../src/sim/actions'
import { ENTRANCE_ID, ENTRANCE_PATH } from '../../src/data/paths'

const seg = (id: number, ax: number, az: number, bx: number, bz: number) => ({ id, a: { x: ax, z: az }, b: { x: bx, z: bz } })

describe('liaison des enclos par les chemins', () => {
  it("enclos le long de l'allée relié", () => {
    const e = enclosure(1, 'mouton'); e.rect = { x: -30, z: 0, w: 8, d: 8.5 }
    expect(isLinked(emptyState({ enclosures: [e] }), 1)).toBe(true)
  })
  it('enclos loin de tout chemin non relié ; relié avec le chemin de départ', () => {
    const e = enclosure(1, 'mouton'); e.rect = { x: -26, z: -5, w: 12, d: 10 }
    expect(isLinked(emptyState({ enclosures: [e] }), 1)).toBe(false)
    expect(isLinked(emptyState({ enclosures: [e], paths: [{ id: 2, ...START_PATH }] }), 1)).toBe(true)
  })
  it('départ en milieu de segment', () => {
    const e = enclosure(1, 'mouton'); e.rect = { x: -36, z: 0, w: 6, d: 8 }
    const s = emptyState({ enclosures: [e], paths: [seg(2, -20, 10, -20, 0), seg(3, -20, 4, -28, 4)] })
    expect(reachableIds(s).has(3)).toBe(true)
    expect(isLinked(s, 1)).toBe(true)
  })
  it('croisement sans bout commun', () => {
    const s = emptyState({ paths: [seg(2, -20, 10, -20, -2), seg(3, -26, 2, -14, 2)] })
    expect(reachableIds(s).has(3)).toBe(true)
  })
  it("segment isolé : non atteignable, ne relie pas son enclos", () => {
    const e = enclosure(1, 'mouton'); e.rect = { x: -30, z: -20, w: 6, d: 6 }
    const s = emptyState({ enclosures: [e], paths: [seg(2, -27, -10, -27, -14)] })
    expect(reachableIds(s).has(2)).toBe(false)
    expect(isLinked(s, 1)).toBe(false)
  })
  it('cache à jour après modification sur place', () => {
    const e = enclosure(1, 'mouton'); e.rect = { x: -30, z: 0, w: 8, d: 8.5 }
    const s = emptyState({ enclosures: [e] })
    expect(isLinked(s, 1)).toBe(true)
    s.enclosures[0].rect.x -= 10
    s.enclosures[0].rect.z -= 20
    expect(isLinked(s, 1)).toBe(false)
  })
  it('géométrie : segments et rectangles', () => {
    expect(segmentsTouch(seg(1, 0, 0, 0, 5), seg(2, 0, 5.02, 4, 5.02))).toBe(true)
    expect(segmentsTouch(seg(1, 0, 0, 0, 5), seg(2, 1, 0, 1, 5))).toBe(false)
    expect(rectSegmentDistance({ x: 0, z: 0, w: 4, d: 4 }, seg(1, -2, 2, 6, 2))).toBe(0)
    expect(rectSegmentDistance({ x: 0, z: 0, w: 4, d: 4 }, seg(1, 7, 0, 7, 4))).toBeCloseTo(3)
  })
  it('segmentAt trouve le chemin le plus proche', () => {
    const s = emptyState({ paths: [seg(2, -20, 10, -20, 0)] })
    expect(segmentAt(s, -19.5, 5, 1)).toBe(2)
    expect(segmentAt(s, -10, 0, 1)).toBeNull()
    expect(segmentAt(s, -30, 10.3, 1)).toBe(-1)
  })
  it('nouvelle partie : v4, un segment de départ, enclos des moutons relié', () => {
    const g = newGame(1, T0)
    expect(g.version).toBe(4)
    expect(g.paths).toHaveLength(1)
    expect(g.paths[0]).toMatchObject(START_PATH)
    expect(isLinked(g, g.enclosures[0].id)).toBe(true)
  })
})

const P = (x: number, z: number) => ({ x, z })
const enc = (id: number, x: number, z: number, w: number, d: number) => enclosure(id, null, w, d, { rect: { x, z, w, d } })

describe('checkSegment : un test par raison', () => {
  const base = () => emptyState()
  it('prix : 3 pièces le mètre, arrondi au-dessus', () => {
    expect(pathCost(P(0, 0), P(0, 10))).toBe(30)
    expect(pathCost(P(0, 0), P(0, 3.4))).toBe(11)
  })
  it("doit partir d'un chemin existant", () => {
    expect(checkSegment(base(), P(-20, 0), P(-20, -5))).toMatchObject({ ok: false, reason: "Un chemin doit partir d'un chemin existant." })
  })
  it('trop court', () => {
    expect(checkSegment(base(), P(-20, 10), P(-20, 9.5))).toMatchObject({ ok: false, reason: 'Trop court.' })
  })
  it('la rivière ne se traverse que par le pont', () => {
    expect(checkSegment(base(), P(-20, 10), P(-3, 10))).toMatchObject({ ok: false, reason: 'La rivière ne se traverse que par le pont.' })
  })
  it('sort de la carte', () => {
    expect(checkSegment(base(), P(-20, 10), P(-40, 10))).toMatchObject({ ok: false, reason: 'Le chemin sort de la carte.' })
  })
  it('zone sous la brume', () => {
    expect(checkSegment(base(), P(-20, 10), P(-20, 14))).toMatchObject({ ok: false, reason: 'Cette zone est encore sous la brume.' })
    expect(checkSegment(emptyState({ village: { level: 3, clientsServed: 0 } }), P(-20, 10), P(-20, 14)).ok).toBe(true)
  })
  it('traverse un enclos', () => {
    const s = emptyState({ enclosures: [enc(1, -30, 0, 8, 8)] })
    expect(checkSegment(s, P(-20, 10), P(-26, 4))).toMatchObject({ ok: false, reason: 'Il traverse un enclos.' })
  })
  it('pas assez de pièces, sauf en mode offert', () => {
    const s = emptyState({ coins: 5 })
    expect(checkSegment(s, P(-20, 10), P(-20, 0))).toMatchObject({ ok: false, reason: 'Pas assez de pièces (il en faut 30).', cost: 30 })
    expect(checkSegment(s, P(-20, 10), P(-20, 0), { free: true })).toMatchObject({ ok: true, length: 10, cost: 30 })
  })
  it('un tracé valide de 10 m coûte 30 et applyAction le pose', () => {
    const s = emptyState()
    const r = applyAction(s, { type: 'tracerChemin', a: P(-20, 10), b: P(-20, 0) })
    expect(r.ok && r.state.paths.length).toBe(1)
    expect(r.ok && r.state.coins).toBe(s.coins - 30)
    expect(r.ok && r.state.paths[0].id).toBe(100)
    expect(r.ok && r.state.nextId).toBe(101)
    expect(s.paths.length).toBe(0)
  })
  it('applyAction refuse avec le texte de checkSegment', () => {
    expect(applyAction(emptyState(), { type: 'tracerChemin', a: P(-20, 0), b: P(-20, -5) })).toEqual({ ok: false, reason: "Un chemin doit partir d'un chemin existant." })
  })
})

describe('détruire un chemin', () => {
  const chain = () => {
    const e = enc(1, -18, -8, 8, 6)
    return emptyState({ enclosures: [e], paths: [seg(2, -20, 10, -20, 0), seg(3, -20, 0, -20, -6)] })
  }
  it("détruire au milieu d'une chaîne : l'enclos de bout n'est plus relié, pièces intactes", () => {
    const s = chain()
    expect(isLinked(s, 1)).toBe(true)
    expect(removalImpact(s, 2)).toEqual([1])
    const r = applyAction(s, { type: 'detruireChemin', id: 2 })
    expect(r.ok).toBe(true)
    if (r.ok) { expect(isLinked(r.state, 1)).toBe(false); expect(r.state.coins).toBe(s.coins); expect(r.state.paths.length).toBe(1) }
  })
  it('détruire un chemin sans conséquence : aucun enclos perdu', () => {
    expect(removalImpact(chain(), 3)).toEqual([1])
    expect(removalImpact(emptyState({ paths: [seg(2, -20, 10, -20, 4)] }), 2)).toEqual([])
  })
  it("l'entrée est indestructible", () => {
    expect(applyAction(chain(), { type: 'detruireChemin', id: ENTRANCE_ID })).toEqual({ ok: false, reason: "Le chemin de l'entrée ne peut pas être détruit." })
  })
  it('chemin absent : introuvable', () => {
    expect(applyAction(chain(), { type: 'detruireChemin', id: 999 })).toEqual({ ok: false, reason: 'Introuvable.' })
  })
})

describe('relier un enclos et chemin offert', () => {
  const start = () => emptyState({ enclosures: [enc(1, -26, -5, 12, 10)] })
  it('enclos de départ sans chemin : un segment de 3,5 m', () => {
    const plan = linkPlan(start(), 1)!
    expect(plan.segments.length).toBe(1)
    const { a, b } = plan.segments[0]
    expect(Math.hypot(b.x - a.x, b.z - a.z)).toBeCloseTo(3.5)
    expect(plan.cost).toBe(11)
  })
  it('relierEnclos débite le coût et relie ; le deuxième appel est refusé', () => {
    const s = start()
    const r = applyAction(s, { type: 'relierEnclos', encId: 1 })
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.state.coins).toBe(s.coins - 11)
    expect(isLinked(r.state, 1)).toBe(true)
    expect(applyAction(r.state, { type: 'relierEnclos', encId: 1 })).toEqual({ ok: false, reason: 'Cet enclos est déjà relié.' })
  })
  it('relierEnclos : pièces insuffisantes, enclos inconnu', () => {
    expect(applyAction({ ...start(), coins: 3 }, { type: 'relierEnclos', encId: 1 })).toEqual({ ok: false, reason: 'Pas assez de pièces (il en faut 11).' })
    expect(applyAction(start(), { type: 'relierEnclos', encId: 77 })).toEqual({ ok: false, reason: 'Introuvable.' })
  })
  const ring = () => emptyState({
    enclosures: [enc(1, -20, -4, 8, 8), enc(2, -26, -12, 20, 8), enc(3, -26, 4, 20, 8), enc(4, -26, -12, 6, 24), enc(5, -12, -12, 6, 24)],
  })
  it('enclos enfermé : pas de plan, offert « bloqué », sans planter', () => {
    expect(linkPlan(ring(), 1)).toBeNull()
    expect(applyAction(ring(), { type: 'relierEnclos', encId: 1 })).toEqual({ ok: false, reason: "Aucun chemin possible jusqu'à cet enclos." })
    const g = giftPaths(ring())
    expect(g.stuck).toContain(1)
    expect(g.linked).not.toContain(1)
  })
  const blocked = () => emptyState({
    enclosures: [enc(1, -14, -6, 6, 4), enc(2, -18, 1, 14, 4)],
    paths: [seg(2, -20, 10, -20, 6.5)],
  })
  it('chemin en L : la ligne droite est barrée, deux segments suffisent', () => {
    const plan = linkPlan(blocked(), 1)!
    expect(plan.segments.length).toBe(2)
    const g = giftPaths(blocked())
    expect(g.linked).toContain(1)
    expect(isLinked(g.state, 1)).toBe(true)
  })
  it('chemin offert : gratuit, ids neufs, entrée non modifiée', () => {
    const s = blocked()
    const before = structuredClone(s)
    const g = giftPaths(s)
    expect(s).toEqual(before)
    expect(g.state.coins).toBe(s.coins)
    expect(g.state.paths.length).toBeGreaterThan(s.paths.length)
    const ids = g.state.paths.map((p) => p.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(g.state.nextId).toBe(s.nextId + g.state.paths.length - s.paths.length)
  })
  it('rien à offrir quand tout est relié', () => {
    const e = enclosure(1, 'mouton'); e.rect = { x: -30, z: 0, w: 8, d: 8.5 }
    const g = giftPaths(emptyState({ enclosures: [e] }))
    expect(g.linked).toEqual([])
    expect(g.stuck).toEqual([])
    expect(g.state.paths).toEqual([])
  })
})

describe('chemin offert : recherche sur grille', () => {
  // Deux murs en chicane : l'enclos 1 ne s'atteint qu'en contournant (descente à l'est, long couloir vers l'ouest, descente, retour vers l'enclos).
  const chicane = () => emptyState({
    village: { level: 3, clientsServed: 0 },
    enclosures: [enc(1, -26, -9, 6, 4), enc(2, -34, 3.5, 22, 2), enc(3, -28, -1.5, 24, 2)],
  })
  const replay = (s: ReturnType<typeof chicane>, paths: ReturnType<typeof chicane>['paths']) => {
    let cur = { ...s, paths: [] as typeof paths }
    for (const p of paths) {
      expect(checkSegment(cur, p.a, p.b, { free: true }).ok).toBe(true)
      cur = { ...cur, paths: [...cur.paths, p] }
    }
  }
  it('ni ligne droite ni L : linkPlan abandonne, le chemin offert contourne en plusieurs virages', () => {
    const s = chicane()
    expect(linkPlan(s, 1)).toBeNull()
    const g = giftPaths(s)
    expect(g.linked).toContain(1)
    expect(g.stuck).toEqual([])
    expect(isLinked(g.state, 1)).toBe(true)
    // le trajet de l'enclos 1 a au moins deux virages : au moins trois segments au-delà de ceux des enclos 2 et 3
    expect(g.state.paths.length).toBeGreaterThanOrEqual(5)
  })
  it('tous les segments offerts passent checkSegment (gratuit), dans l’ordre où ils sont posés', () => {
    const s = chicane()
    replay(s, giftPaths(s).state.paths)
  })
  it('un enclos vraiment enfermé reste « bloqué », sans que rien ne se bloque', () => {
    const ring = emptyState({
      village: { level: 3, clientsServed: 0 },
      enclosures: [enc(1, -20, -4, 8, 8), enc(2, -26, -12, 20, 8), enc(3, -26, 4, 20, 8), enc(4, -26, -12, 6, 24), enc(5, -12, -12, 6, 24)],
    })
    const t0 = performance.now()
    const g = giftPaths(ring)
    expect(performance.now() - t0).toBeLessThan(5000)
    expect(g.stuck).toEqual([1])
    expect(isLinked(g.state, 1)).toBe(false)
    replay(ring as ReturnType<typeof chicane>, g.state.paths)
  })
})

describe('chemin offert : copies', () => {
  it('les points offerts ne sont jamais partagés avec l’état d’origine ni l’entrée', () => {
    const g = newGame(1, T0)
    g.enclosures.push({ id: 900, biome: 'prairie', species: null, rect: { x: -34, z: -8, w: 6, d: 6 }, cleanedAt: T0 })
    const r = giftPaths(g)
    expect(r.linked).toContain(900)
    const fresh = r.state.paths.slice(g.paths.length)
    expect(fresh.length).toBeGreaterThan(0)
    const olds = [...g.paths, ...ENTRANCE_PATH].flatMap((p) => [p.a, p.b])
    for (const p of fresh) { expect(olds).not.toContain(p.a); expect(olds).not.toContain(p.b) }
    for (const p of r.state.paths.slice(0, g.paths.length)) expect(g.paths.map((q) => q.a)).not.toContain(p.a)
    expect(new Set(fresh.flatMap((p) => [p.a, p.b])).size).toBe(fresh.length * 2)
  })
})

describe('signature du réseau', () => {
  it('change quand un enclos bouge ou qu’un chemin est ajouté (clé de la fiche « Relier »)', () => {
    const s = emptyState({ enclosures: [enc(1, -26, -5, 12, 10)] })
    const base = signature(s)
    expect(signature(structuredClone(s))).toBe(base)
    const moved = structuredClone(s); moved.enclosures[0].rect.w = 14
    expect(signature(moved)).not.toBe(base)
    expect(signature({ ...s, paths: [seg(2, -20, 10, -20, 6.5)] })).not.toBe(base)
  })
})
