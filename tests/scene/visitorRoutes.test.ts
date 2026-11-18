import { describe, it, expect } from 'vitest'
import { alleyStops, bridgeX, buildRoute, cafeRoute, walkHeight, ROUTE_START_X, type RoutePoint } from '../../src/scene/visitorRoutes'
import { visitorsShown, WALKERS } from '../../src/data/visuals'
import { riverDistance } from '../../src/scene/world'
import { BRIDGE_Z, BRIDGE_DECK_Y } from '../../src/scene/decor'
import { villagePaths } from '../../src/data/zones'
import type { Animal, Building, Enclosure } from '../../src/sim/types'

const bx = bridgeX(riverDistance)
const enc = (id: number, x: number, z: number, w = 8, d = 6): Enclosure =>
  ({ id, biome: 'prairie', species: 'lion' as never, rect: { x, z, w, d }, cleanedAt: 0 })
const animal = (id: number, enclosureId: number) => ({ id, enclosureId }) as Animal
const enclosures = [enc(1, -30, 2.5), enc(2, -20, 11.5), enc(3, -12, -20, 8, 6)] // 3 : trop loin de l'allée
const animals = [animal(1, 1), animal(2, 2), animal(3, 3)]
const cafe: Building[] = [{ slot: 0, type: 'cafe', level: 1 }]

function distToSegment(p: { x: number; z: number }, a: { x: number; z: number }, b: { x: number; z: number }) {
  const dx = b.x - a.x, dz = b.z - a.z
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.z - a.z) * dz) / (dx * dx + dz * dz || 1)))
  return Math.hypot(p.x - (a.x + dx * t), p.z - (a.z + dz * t))
}
const lines = () => [
  [{ x: ROUTE_START_X, z: BRIDGE_Z }, { x: bx + 3.5, z: BRIDGE_Z }],
  ...villagePaths(bx),
]
const onPath = (p: { x: number; z: number }) =>
  lines().some((l) => l.slice(0, -1).some((a, i) => distToSegment(p, a, l[i + 1]) < 0.05))

/** Points du trajet, échantillonnés tous les 0,25 m le long des segments. */
function sample(route: RoutePoint[]) {
  const out: { x: number; z: number }[] = []
  for (let i = 0; i < route.length - 1; i++) {
    const a = route[i], b = route[i + 1], n = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.z - a.z) / 0.25))
    for (let k = 0; k <= n; k++) out.push({ x: a.x + ((b.x - a.x) * k) / n, z: a.z + ((b.z - a.z) * k) / n })
  }
  return out
}

describe('trajets des promeneurs', () => {
  const route = buildRoute(bx, alleyStops(enclosures, animals, bx), cafeRoute(cafe, bx))
  it('commencent et finissent au bout de la route', () => {
    expect(route[0]).toMatchObject({ x: ROUTE_START_X, z: BRIDGE_Z })
    expect(route[route.length - 1]).toMatchObject({ x: ROUTE_START_X, z: BRIDGE_Z })
  })
  it('restent toujours sur les chemins', () => {
    for (const p of sample(route)) expect(onPath(p), `${p.x},${p.z}`).toBe(true)
  })
  it('ne passent jamais dans la rivière, sauf sur le pont', () => {
    for (const p of sample(route)) {
      const onBridge = p.z === BRIDGE_Z && Math.abs(p.x - bx) <= 3.6
      if (!onBridge) expect(riverDistance(p.x, p.z), `${p.x},${p.z}`).toBeGreaterThan(2.2)
    }
  })
  it('ne passent jamais dans un enclos', () => {
    for (const p of sample(route)) for (const e of enclosures) {
      const r = e.rect
      expect(p.x > r.x && p.x < r.x + r.w && p.z > r.z && p.z < r.z + r.d, `${p.x},${p.z}`).toBe(false)
    }
  })
  it("s'arrêtent seulement devant un enclos occupé proche, en le regardant", () => {
    const stops = route.filter((p) => p.faceX !== undefined && !p.always)
    expect(stops).toHaveLength(2)
    expect(stops[0].faceZ).toBeLessThan(BRIDGE_Z) // enclos 1, au nord
    expect(stops[1].faceZ).toBeGreaterThan(BRIDGE_Z) // enclos 2, au sud
  })
  it('ignore les enclos vides', () => {
    expect(alleyStops(enclosures, [], bx)).toHaveLength(0)
  })
  it('passent par le café quand il existe', () => {
    expect(route.filter((p) => p.always)).toHaveLength(1)
    expect(cafeRoute([], bx)).toBeNull()
  })
})

describe('visitorsShown', () => {
  it('suit les visiteurs par heure, plafonné', () => {
    expect(visitorsShown(0, 14, false)).toBe(0)
    expect(visitorsShown(6, 14, false)).toBe(2)
    expect(visitorsShown(500, 14, false)).toBe(WALKERS.MAX_DESKTOP)
  })
  it('limite plus bas sur téléphone', () => {
    expect(visitorsShown(500, 14, true)).toBe(WALKERS.MAX_MOBILE)
  })
  it('baisse aux heures de transition (7 h, 21 h)', () => {
    for (const h of [7, 21]) {
      expect(visitorsShown(500, h, false)).toBeLessThan(visitorsShown(500, 14, false))
      expect(visitorsShown(500, h, false)).toBeGreaterThan(visitorsShown(500, 23, false))
    }
  })
  it('est presque nul la nuit (22 h – 6 h)', () => {
    for (const h of [22, 23, 0, 3, 5.9]) expect(visitorsShown(500, h, false)).toBeLessThanOrEqual(1)
    expect(visitorsShown(500, 14, false)).toBeGreaterThan(visitorsShown(500, 23, false))
  })
})

describe('walkHeight', () => {
  const flat = () => -0.3
  it('marche sur le dessus des planches au milieu du pont', () => {
    expect(walkHeight(bx, BRIDGE_Z, bx, flat)).toBeCloseTo(BRIDGE_DECK_Y)
    expect(walkHeight(bx + 2, BRIDGE_Z, bx, flat)).toBeCloseTo(BRIDGE_DECK_Y)
  })
  it('monte en douceur depuis la berge', () => {
    const a = walkHeight(bx - 3.3, BRIDGE_Z, bx, flat), b = walkHeight(bx - 3.8, BRIDGE_Z, bx, flat)
    expect(a).toBeCloseTo(-0.05) // sol borné à -0,05
    expect(b).toBeCloseTo(-0.05)
    const mid = walkHeight(bx - 2.8, BRIDGE_Z, bx, () => 0)
    expect(mid).toBeGreaterThan(0); expect(mid).toBeLessThan(BRIDGE_DECK_Y)
  })
  it('suit le sol loin du pont', () => {
    expect(walkHeight(-20, BRIDGE_Z, bx, () => 0.2)).toBeCloseTo(0.2)
  })
})
