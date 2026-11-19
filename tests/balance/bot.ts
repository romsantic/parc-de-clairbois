import { SPECIES, type SpeciesId } from '../../src/data/species'
import { BUILDINGS } from '../../src/data/economy'
import { STORY, TUTORIAL } from '../../src/data/missions'
import { DAY_MS, HOUR_MS, TUNING } from '../../src/data/tuning'
import { ZONES } from '../../src/data/zones'
import { applyAction, type Action } from '../../src/sim/actions'
import { advanceTo } from '../../src/sim/advance'
import { fairPrice, incomePerHour } from '../../src/sim/economy'
import { animalsIn, capacity, cleanliness } from '../../src/sim/enclosure'
import { consumptionPerHour } from '../../src/sim/feeding'
import { catalogue, sellPrice } from '../../src/sim/merchant'
import { currentMission } from '../../src/sim/missions'
import { newGame } from '../../src/sim/newGame'
import { checkPlacement, enclosureCost } from '../../src/sim/placement'
import { isLinked, removalImpact } from '../../src/sim/paths'
import { START_PATH } from '../../src/data/paths'
import { canLevelUp, population } from '../../src/sim/village'
import { careCoverage } from '../../src/sim/care'
import { dailyWages, staffCap } from '../../src/sim/staff'
import { STAFF_TUNING } from '../../src/data/staff'
import type { BuildingType, GameState, Rect } from '../../src/sim/types'

/**
 * Joueur automatique : il joue UNIQUEMENT par les vraies règles (applyAction, advanceTo),
 * comme un humain qui passe `visitsPerDay` fois par jour entre 8 h et 22 h, fait toute sa liste
 * de choses à faire à chaque passage, puis laisse le temps passer jusqu'au passage suivant.
 * Il suit les premiers pas normalement (il ne les passe pas) et réclame toutes les récompenses.
 */

/** Jour (à partir de 1) et heure (0 à 23) d'un moment de la partie. */
export interface Moment { day: number; hour: number }

export type MilestoneKey = 'village' | 'especes3' | 'especes5' | 'especes10' | 'bourg' | 'habitants150' | 'habitants250' | 'fin'

export interface DayRow {
  day: number
  coins: number
  population: number
  visitorsPerHour: number
  animals: number
  species: number
  level: number
  /** Morts pendant ce jour. */
  deaths: number
}

export interface Timeline {
  seed: number
  days: number
  visitsPerDay: number
  milestones: Record<MilestoneKey, Moment | null>
  rows: DayRow[]
  deaths: number
  /** État de la partie à la fin du jeu du joueur automatique. */
  final: GameState
}

/** Minuit de départ (jour 1), aligné sur le pas de 10 minutes et sur un jour entier (heure locale = UTC). */
export const T0 = Math.floor(1_800_000_000_000 / DAY_MS) * DAY_MS
const WAKE_FROM_H = 8
const WAKE_TO_H = 22

export const MILESTONE_LABELS: Record<MilestoneKey, string> = {
  village: 'Village (niveau 2)', especes3: '3 espèces', especes5: '5 espèces', especes10: '10 espèces', bourg: 'Bourg (niveau 3)',
  habitants150: '150 habitants', habitants250: '250 habitants', fin: "Fin de l'histoire",
}

/** Heures (locales) des visites : réparties de 8 h à 22 h. */
export function visitHours(visitsPerDay: number): number[] {
  if (visitsPerDay <= 1) return [12]
  return Array.from({ length: visitsPerDay }, (_, k) => WAKE_FROM_H + ((WAKE_TO_H - WAKE_FROM_H) * k) / (visitsPerDay - 1))
}

interface Ctx { s: GameState; deaths: number; dayDeaths: number; timeline: Timeline; /** Plus gros budget déjà essayé en vain, par situation (propre à cette partie). */ noRoom: Map<string, number> }

/** Joue une action ; vrai si elle a réussi. */
function act(c: Ctx, a: Action): boolean {
  const r = applyAction(c.s, a)
  if (!r.ok) return false
  c.s = r.state
  return true
}

const momentOf = (time: number): Moment => ({ day: Math.floor((time - T0) / DAY_MS) + 1, hour: Math.floor(((time - T0) % DAY_MS) / HOUR_MS) })

function markMilestones(c: Ctx): void {
  const m = c.timeline.milestones
  const set = (k: MilestoneKey, ok: boolean) => { if (ok && !m[k]) m[k] = momentOf(c.s.time) }
  const species = new Set(c.s.animals.map((a) => a.species)).size
  const pop = population(c.s)
  set('village', c.s.village.level >= 2)
  set('bourg', c.s.village.level >= 3)
  set('especes3', species >= 3)
  set('especes5', species >= 5)
  set('especes10', species >= 10)
  set('habitants150', pop >= 150)
  set('habitants250', pop >= 250)
  set('fin', c.s.missions.tutorial.step >= TUTORIAL.length && c.s.missions.story.index >= STORY.length)
}

function pushRow(c: Ctx, deathsToday: number): void {
  const s = c.s
  c.timeline.rows.push({
    day: Math.round((s.time - T0) / DAY_MS), coins: Math.round(s.coins), population: population(s),
    visitorsPerHour: Math.round(incomePerHour(s).visiteurs * 10) / 10, animals: s.animals.length,
    species: new Set(s.animals.map((a) => a.species)).size, level: s.village.level, deaths: deathsToday,
  })
}

// ---------------------------------------------------------------------------------------------
// Placement : balayage simple et déterministe de la grille de la zone.

/** Nombre d'animaux visé dans l'enclos neuf d'une espèce (2 par défaut : les chemins prennent de la place ; 3 pour les portées de plusieurs petits, et le loup dont la naissance est demandée). */
const TARGET_CAP: Partial<Record<SpeciesId, number>> = { cochon: 3, renard: 3, loup: 3 }
const MIN_SIDE = TUNING.MIN_SIDE_M

/** Il laisse 2,5 m entre deux enclos : de quoi y passer un chemin. */
function hasRoomAround(s: GameState, r: Rect): boolean {
  const g = 2.5
  return s.enclosures.every((e) => r.x >= e.rect.x + e.rect.w + g || e.rect.x >= r.x + r.w + g || r.z >= e.rect.z + e.rect.d + g || e.rect.z >= r.z + r.d + g)
}

/** Le joueur ne pose un enclos que s'il sait le relier à l'allée (il le voit à l'écran) : essai sur une copie. */
function canBuildLinked(s: GameState, rect: Rect): boolean {
  const built = applyAction(s, { type: 'construire', rect })
  if (!built.ok) return false
  const encId = built.state.enclosures[built.state.enclosures.length - 1].id
  return isLinked(built.state, encId) || applyAction(built.state, { type: 'relierEnclos', encId }).ok
}

/** Le plus grand enclos (pour 2 animaux au moins) que le budget permet et qui tient dans la zone ; balayage de la grille de gauche à droite, de haut en bas. */
function findRect(c: Ctx, species: SpeciesId, budget: number): Rect | null {
  const s = c.s
  // Pas de place trouvée tant que ni les enclos ni les chemins ni le budget n'ont changé (un budget plus grand refait la recherche) : inutile de rechercher à chaque passage.
  const key = `${s.enclosures.length}|${s.paths.length}|${s.village.level}|${species}|${s.enclosures.map((e) => e.rect.x + ',' + e.rect.z + ',' + e.rect.w + ',' + e.rect.d).join(';')}`
  const failed = c.noRoom.get(key)
  if (failed !== undefined && budget <= failed) return null
  const found = searchRect(s, species, budget)
  if (!found) c.noRoom.set(key, Math.max(failed ?? 0, budget))
  return found
}

function searchRect(s: GameState, species: SpeciesId, budget: number): Rect | null {
  const sp = SPECIES[species]
  const zone = ZONES.find((z) => z.id === sp.biome && z.unlockLevel <= s.village.level)
  if (!zone) return null
  const z = zone.rect
  for (let n = TARGET_CAP[species] ?? 2; n >= 2; n--) {
    const area = n * sp.spaceM2
    const shapes: { w: number; d: number }[] = []
    for (let w = MIN_SIDE; w <= z.w; w++) {
      const d = Math.max(MIN_SIDE, Math.ceil((area / w) * 2) / 2) // au demi-mètre
      if (d <= z.d) shapes.push({ w, d })
    }
    // Colonnes étroites et profondes d'abord (les plus étroites qui tiennent dans la zone) : elles se rangent côte à côte sans trou.
    // Prairie : bandes peu profondes le long de l'allée, deux rangées ; forêt et montagne : formes presque carrées.
    const shallow = sp.biome === 'prairie'
    shapes.sort(shallow ? (a, b) => a.d - b.d || a.w - b.w : (a, b) => Math.abs(a.w - a.d) - Math.abs(b.w - b.d) || a.w - b.w)
    for (const { w, d } of shapes) {
      if (enclosureCost({ x: 0, z: 0, w, d }) > budget) continue
      const zs: number[] = []
      for (let zz = z.z; zz + d <= z.z + z.d + 1e-9; zz++) zs.push(zz)
      if (shallow) zs.reverse() // de l'allée vers le fond
      for (const zz of zs) {
        for (let x = z.x; x + w <= z.x + z.w + 1e-9; x += 0.5) {
          const rect = { x, z: zz, w, d }
          if (checkPlacement(s, rect).ok && hasRoomAround(s, rect) && canBuildLinked(s, rect)) return rect
        }
      }
    }
  }
  return null
}

/**
 * Le joueur range son premier enclos (moutons) dans le coin est de la prairie, même taille (donc gratuit) :
 * il libère un grand bloc d'un seul tenant à l'ouest pour les autres espèces de prairie.
 */
function moveStartPen(c: Ctx): void {
  const start = c.s.enclosures[0]
  const home = TUNING.START_ENCLOSURE
  if (!start || start.rect.x !== home.x || start.rect.z !== home.z) return
  const prairie = ZONES.find((z) => z.id === 'prairie')!.rect
  const rect = { x: prairie.x + prairie.w - 9, z: prairie.z, w: 9, d: 7 }
  // Il ne déménage que si le nouvel emplacement peut être relié à l'allée.
  const moved = applyAction(c.s, { type: 'redimensionner', encId: start.id, rect })
  if (!moved.ok || !(isLinked(moved.state, start.id) || applyAction(moved.state, { type: 'relierEnclos', encId: start.id }).ok)) return
  act(c, { type: 'redimensionner', encId: start.id, rect })
  act(c, { type: 'relierEnclos', encId: start.id })
  // Le chemin offert au départ ne sert plus : il coupe la prairie en deux, le joueur le retire.
  const old = c.s.paths.find((p) => p.a.x === START_PATH.a.x && p.a.z === START_PATH.a.z && p.b.x === START_PATH.b.x && p.b.z === START_PATH.b.z)
  if (old && removalImpact(c.s, old.id).length === 0) act(c, { type: 'detruireChemin', id: old.id })
}

/** Construit l'enclos puis le relie à l'allée (un refus « déjà relié » est sans importance) ; renvoie son id, ou null. */
function buildLinked(c: Ctx, rect: Rect): number | null {
  if (!act(c, { type: 'construire', rect })) return null
  const encId = c.s.enclosures[c.s.enclosures.length - 1].id
  act(c, { type: 'relierEnclos', encId })
  return encId
}

// ---------------------------------------------------------------------------------------------
// Petites aides

const income = (s: GameState): number => { const i = incomePerHour(s); return i.billets + i.village }
/** Argent qu'on garde de côté pour les imprévus (soins, nourriture). */
const reserve = (): number => 100

function claimAll(c: Ctx): boolean {
  let any = false
  for (let guard = 0; guard < 30; guard++) {
    let got = act(c, { type: 'recuperer', track: 'tutoriel' }) || act(c, { type: 'recuperer', track: 'histoire' })
    for (const mp of [...c.s.missions.daily.list]) {
      if (mp.done && !mp.claimed && act(c, { type: 'recuperer', track: 'quotidienne', id: mp.id })) got = true
    }
    if (!got) break
    any = true
  }
  return any
}

/** Garde-manger plein pour 30 h (50 h quand la mission d'histoire le demande) ; agrandit le garde-manger si besoin. */
function feed(c: Ctx): boolean {
  const cur = currentMission(c.s)
  const hours = cur && cur.track === 'histoire' && cur.def.objective.kind === 'autonomie' ? cur.def.objective.hours + 2 : 30
  const cons = consumptionPerHour(c.s)
  let changed = false
  const wanted = cons.fourrage * hours + cons.viande * hours
  if (wanted > c.s.pantry.capacity * 0.9 && act(c, { type: 'agrandirGardeManger' })) changed = true
  for (const food of ['fourrage', 'viande'] as const) {
    const s = c.s
    const need = Math.ceil(cons[food] * hours - s.pantry[food])
    const place = Math.floor(s.pantry.capacity - s.pantry.fourrage - s.pantry.viande)
    let n = Math.min(need, place)
    // Jamais d'achat partiel : on réduit jusqu'à ce que ça passe.
    while (n > 0 && !act(c, { type: 'acheterRations', food, n })) n = Math.floor(n * 0.7)
    if (n > 0) changed = true
  }
  return changed
}

function cleanAll(c: Ctx): boolean {
  let changed = false
  for (const e of c.s.enclosures) {
    if (cleanliness(e, c.s.time) < 0.9 && act(c, { type: 'nettoyer', encId: e.id })) changed = true
  }
  return changed
}

function cureAll(c: Ctx): boolean {
  let changed = false
  for (const e of c.s.enclosures) {
    if (animalsIn(c.s, e.id).some((a) => a.health.status === 'malade') && act(c, { type: 'soignerTout', encId: e.id })) changed = true
  }
  return changed
}

function setTicket(c: Ctx): boolean {
  const p = fairPrice(c.s)
  return c.s.ticketPrice !== p && act(c, { type: 'billet', price: p })
}

// ---------------------------------------------------------------------------------------------
// Animaux

const rank = (id: SpeciesId): number => SPECIES[id].price

/** L'enclos où l'espèce peut aller : le sien s'il a de la place, sinon un enclos vide du bon biome. */
function enclosureFor(s: GameState, species: SpeciesId): number | null {
  const sp = SPECIES[species]
  const own = s.enclosures.find((e) => e.species === species)
  if (own) return animalsIn(s, own.id).length < capacity(own) ? own.id : null
  const free = s.enclosures.find((e) => e.species === null && e.biome === sp.biome
    && animalsIn(s, e.id).length === 0 && Math.floor((e.rect.w * e.rect.d) / sp.spaceM2) >= 2)
  return free ? free.id : null
}

/** Une offre qui vaut le coup : une espèce qu'on n'a pas encore, ou le sexe qui manque à une espèce déjà là. */
function wantsOffer(s: GameState, species: SpeciesId, sex: 'F' | 'M'): boolean {
  const mine = s.animals.filter((a) => a.species === species)
  return mine.length === 0 || !mine.some((a) => a.sex === sex)
}

function buyAnimals(c: Ctx): boolean {
  const open = new Set(catalogue(c.s.village.level))
  const offers = [...c.s.merchant.offers]
    .filter((o) => open.has(o.species) && wantsOffer(c.s, o.species, o.sex))
    // les moins chers d'abord ; à prix égal, l'adulte (il se reproduit tout de suite)
    .sort((a, b) => rank(a.species) - rank(b.species) || (a.stage === b.stage ? 0 : a.stage === 'adulte' ? -1 : 1) || a.id - b.id)
  for (const o of offers) {
    const free = c.s.coins - reserve() - o.price
    if (free < 0) continue
    let encId = enclosureFor(c.s, o.species)
    if (encId === null) {
      if (c.s.animals.some((a) => a.species === o.species)) continue // son enclos est plein : on ne le double pas
      const rect = findRect(c, o.species, free)
      if (!rect) continue
      encId = buildLinked(c, rect)
      if (encId === null) continue
    }
    if (act(c, { type: 'acheterAnimal', offerId: o.id, encId })) return true
  }
  return false
}

/** Enclos plein : on revend un adulte ou un jeune de trop (en gardant une femelle et un mâle) pour que les naissances reprennent. */
function sellSurplus(c: Ctx): boolean {
  for (const e of c.s.enclosures) {
    const here = animalsIn(c.s, e.id)
    if (!e.species || here.length < capacity(e)) continue
    const f = here.filter((a) => a.sex === 'F'), m = here.filter((a) => a.sex === 'M')
    const keep = new Set<number>()
    if (f[0]) keep.add(f[0].id)
    if (m[0]) keep.add(m[0].id)
    const extras = here
      .filter((a) => !keep.has(a.id) && a.health.status === 'ok' && sellPrice(c.s, a) !== null)
      .sort((a, b) => (sellPrice(c.s, b) ?? 0) - (sellPrice(c.s, a) ?? 0) || a.id - b.id)
    if (extras.length > 0 && act(c, { type: 'vendre', animalId: extras[0].id })) return true
  }
  return false
}

// ---------------------------------------------------------------------------------------------
// Bâtiments

const SLOT_OF: Partial<Record<BuildingType, number>> = { cafe: 1, boutique: 2, auberge: 3 }

function buildBuildings(c: Ctx): boolean {
  for (const type of ['cafe', 'boutique', 'auberge'] as const) {
    const data = BUILDINGS[type]
    if (c.s.buildings.some((b) => b.type === type) || c.s.village.level < data.unlockLevel) continue
    if (data.buildCost !== null && c.s.coins - reserve() >= data.buildCost && act(c, { type: 'batir', slot: SLOT_OF[type]!, building: type })) return true
  }
  return false
}

const allSpeciesOwned = (s: GameState): boolean => new Set(s.animals.map((a) => a.species)).size >= Object.keys(SPECIES).length

/** Améliore un bâtiment : la mission de la ferme, puis les plus rentables (retour sur investissement ≤ 150 h) ; sans autre dépense à faire, tout. */
function upgradeBuildings(c: Ctx): boolean {
  const cur = currentMission(c.s)
  if (cur && cur.def.id === 'hist-ferme' && act(c, { type: 'ameliorer', slot: 0 })) return true
  const idle = allSpeciesOwned(c.s)
  const base = income(c.s)
  const list = c.s.buildings
    .filter((b) => b.level < 3)
    .map((b) => ({ slot: b.slot, cost: BUILDINGS[b.type].upgradeCost[b.level - 1] }))
    .filter((u) => c.s.coins - reserve() >= u.cost)
    .sort((a, b) => a.cost - b.cost || a.slot - b.slot)
  for (const u of list) {
    const r = applyAction(c.s, { type: 'ameliorer', slot: u.slot })
    if (!r.ok) continue
    const gain = income(r.state) - base
    const payback = gain > 0 ? u.cost / gain : Infinity
    if ((payback <= 150 || idle) && act(c, { type: 'ameliorer', slot: u.slot })) return true
  }
  return false
}

// ---------------------------------------------------------------------------------------------
// Personnel

/** Le meilleur candidat d'un métier (niveau le plus haut, puis le premier de la liste). */
function bestCandidate(s: GameState, job: 'soigneur' | 'entretien'): number | null {
  let best: { id: number; level: number } | null = null
  for (const c of s.staff.candidates) if (c.job === job && (!best || c.level > best.level)) best = c
  return best ? best.id : null
}

/** Agents voulus : un dès 3 enclos, puis un par `CLEANER_ENCLOSURES[0]` enclos. */
const agentsWanted = (s: GameState): number => (s.enclosures.length >= 3 ? Math.ceil(s.enclosures.length / STAFF_TUNING.CLEANER_ENCLOSURES[0]) : 0)

/** Il embauche un soigneur si des animaux ne sont pas suivis, un agent s'il en manque ; maison pleine : il la construit ou l'améliore. */
function hireStaff(c: Ctx): boolean {
  const s = c.s
  // il ne s'engage que s'il peut payer quelques jours de salaires en plus du nouveau venu
  if (s.coins - reserve() < 3 * dailyWages(s) + 200) return false
  const uncovered = s.animals.length - careCoverage(s).covered.size
  const agents = s.staff.employees.filter((e) => e.job === 'entretien').length
  const job = uncovered > 0 ? 'soigneur' : agents < agentsWanted(s) ? 'entretien' : null
  if (!job) return false
  const id = bestCandidate(s, job)
  if (id === null) return false
  if (s.staff.employees.length >= staffCap(s)) {
    const house = s.buildings.find((b) => b.type === 'personnel')
    if (!house) return act(c, { type: 'batir', slot: 6, building: 'personnel' })
    return house.level < 3 && act(c, { type: 'ameliorer', slot: house.slot })
  }
  return act(c, { type: 'embaucher', candidateId: id })
}

// ---------------------------------------------------------------------------------------------
// Un passage

/** Les premiers pas, un à un, comme un joueur qui suit Margaux. Vrai si quelque chose a été fait. */
function tutorialStep(c: Ctx): boolean {
  const t = c.s.missions.tutorial
  if (t.step >= TUTORIAL.length || !t.current || t.current.done) return false
  switch (TUTORIAL[t.step].id) {
    case 'pas-fiche': return act(c, { type: 'vu', what: 'ficheEnclos' })
    case 'pas-fourrage': return act(c, { type: 'acheterRations', food: 'fourrage', n: 20 })
    case 'pas-nettoyer': {
      const e = c.s.enclosures.find((x) => cleanliness(x, c.s.time) <= 0.95)
      return !!e && act(c, { type: 'nettoyer', encId: e.id })
    }
    case 'pas-billet': return act(c, { type: 'billet', price: fairPrice(c.s) })
    case 'pas-cafe': return act(c, { type: 'batir', slot: SLOT_OF.cafe!, building: 'cafe' })
    case 'pas-enclos': {
      moveStartPen(c)
      const rect = findRect(c, 'cochon', c.s.coins)
      return !!rect && buildLinked(c, rect) !== null
    }
    case 'pas-cochons': {
      const adults = c.s.merchant.offers.filter((o) => o.species === 'cochon' && o.stage === 'adulte')
      for (const o of adults) {
        const encId = enclosureFor(c.s, 'cochon')
        if (encId !== null && wantsOffer(c.s, 'cochon', o.sex) && act(c, { type: 'acheterAnimal', offerId: o.id, encId })) return true
      }
      return false
    }
    case 'pas-autonomie': return act(c, { type: 'vu', what: 'autonomie' })
    default: return false // pas-gestation : il suffit d'attendre
  }
}

/** Un passage complet : tout ce qu'un joueur attentif fait en ouvrant le jeu. */
function visit(c: Ctx): void {
  act(c, { type: 'lireMission' })
  for (let pass = 0; pass < 40; pass++) {
    const step = c.s.missions.tutorial.step
    let changed = claimAll(c)
    changed = tutorialStep(c) || changed
    // Les soins passent toujours ; le reste attend son pas des premiers pas (pour que le pas compte).
    changed = cureAll(c) || changed
    if (step >= 2) changed = feed(c) || changed
    if (step >= 3) changed = cleanAll(c) || changed
    if (step >= 4) changed = setTicket(c) || changed
    if (step >= 7) {
      if (canLevelUp(c.s).ok && act(c, { type: 'monterNiveau' })) changed = true
      else if (buildBuildings(c)) changed = true
      else if (hireStaff(c)) changed = true
      else if (buyAnimals(c)) changed = true
      else if (upgradeBuildings(c)) changed = true
      else if (sellSurplus(c)) changed = true
    }
    markMilestones(c)
    if (!changed) break
  }
}

/** Laisse le temps passer heure par heure jusqu'à `until` (pour noter les moments et les jours). */
function waitUntil(c: Ctx, until: number): void {
  while (c.s.time < until) {
    const next = Math.min(until, (Math.floor(c.s.time / HOUR_MS) + 1) * HOUR_MS)
    const r = advanceTo(c.s, next)
    c.s = r.state
    const died = r.events.filter((e) => e.kind === 'mort').length
    c.deaths += died
    c.dayDeaths += died
    markMilestones(c)
    if (c.s.time % DAY_MS === 0) { pushRow(c, c.dayDeaths); c.dayDeaths = 0 }
  }
}

export function playBot(opts: { seed: number; days: number; visitsPerDay: number }): Timeline {
  const { seed, days, visitsPerDay } = opts
  const milestones = {} as Record<MilestoneKey, Moment | null>
  for (const k of Object.keys(MILESTONE_LABELS) as MilestoneKey[]) milestones[k] = null
  const timeline: Timeline = { seed, days, visitsPerDay, milestones, rows: [], deaths: 0, final: undefined as unknown as GameState }
  const c: Ctx = { s: newGame(seed, T0 + WAKE_FROM_H * HOUR_MS), deaths: 0, dayDeaths: 0, timeline, noRoom: new Map() }
  const hours = visitHours(visitsPerDay)
  for (let day = 1; day <= days; day++) {
    for (const h of hours) {
      const at = T0 + (day - 1) * DAY_MS + h * HOUR_MS
      if (c.s.time < at) waitUntil(c, at)
      visit(c)
    }
    waitUntil(c, T0 + day * DAY_MS)
    if (timeline.milestones.fin) break // l'histoire est finie : la suite n'apprend plus rien
  }
  timeline.deaths = c.deaths
  timeline.final = c.s
  return timeline
}

// ---------------------------------------------------------------------------------------------
// Rapport

const two = (n: number) => String(n).padStart(2, '0')
export const fmtMoment = (m: Moment | null): string => (m ? `jour ${m.day}, ${two(m.hour)}h` : 'jamais')

/** Tableau lisible du rythme (pour le chef et Romain). */
export function formatTimeline(t: Timeline): string {
  const lines = [`=== Graine ${t.seed} · ${t.visitsPerDay} visites par jour · ${t.days} jours max ===`]
  for (const k of Object.keys(MILESTONE_LABELS) as MilestoneKey[]) lines.push(`  ${MILESTONE_LABELS[k].padEnd(20)} ${fmtMoment(t.milestones[k])}`)
  lines.push(`  Morts : ${t.deaths}`)
  lines.push('  Jour | pièces | habitants | visiteurs/h | animaux | espèces | niveau | morts')
  for (const r of t.rows) {
    lines.push(`  ${String(r.day).padStart(4)} | ${String(r.coins).padStart(6)} | ${String(r.population).padStart(9)} | ${String(r.visitorsPerHour).padStart(11)} | ${String(r.animals).padStart(7)} | ${String(r.species).padStart(7)} | ${String(r.level).padStart(6)} | ${String(r.deaths).padStart(5)}`)
  }
  return lines.join('\n')
}
