import { SPECIES, type Biome, type SpeciesId } from '../data/species'
import { ANIMAL_NAMES } from '../data/names'
import { ZONES } from '../data/zones'
import { MERCHANT } from '../data/economy'
import { HOUR_MS } from '../data/tuning'
import type { Animal, Enclosure, GameEvent, GameState, Offer } from './types'
import type { ActionResult } from './actions'
import { noMoney } from './actions'
import { ageStage } from './animal'
import { animalsIn, area } from './enclosure'
import { random } from './random'

export const BIOME_NAMES: Record<Biome, string> = { prairie: 'prairie', foret: 'forêt', montagne: 'montagne' }

/** Espèces vendues au niveau donné : celles dont la zone est débloquée. */
export function catalogue(level: number): SpeciesId[] {
  const open = new Set(ZONES.filter((z) => z.unlockLevel <= level).map((z) => z.id))
  return (Object.keys(SPECIES) as SpeciesId[]).filter((id) => open.has(SPECIES[id].biome))
}

const offerPrice = (species: SpeciesId, stage: Offer['stage']): number =>
  Math.round(SPECIES[species].price * (stage === 'jeune' ? MERCHANT.YOUNG_BUY_SHARE : 1))

/** Renouvelle le stock (en place). Le tout premier stock commence par un couple de cochons. */
export function restock(state: GameState, events: GameEvent[] = []): void {
  const first = state.merchant.restocks === 0
  const n = MERCHANT.BASE_STOCK + state.village.level
  const species = catalogue(state.village.level)
  const offers: Offer[] = []
  for (let i = 0; i < n; i++) {
    if (first && i < 2) {
      offers.push({ id: state.nextId++, species: 'cochon', sex: i === 0 ? 'F' : 'M', stage: 'adulte', price: offerPrice('cochon', 'adulte') })
      continue
    }
    const sp = species[Math.floor(random(state) * species.length)]
    const sex = random(state) < 0.5 ? 'F' : 'M'
    const stage = random(state) < MERCHANT.ADULT_SHARE ? 'adulte' : 'jeune'
    offers.push({ id: state.nextId++, species: sp, sex, stage, price: offerPrice(sp, stage) })
  }
  state.merchant.offers = offers
  state.merchant.restocks++
  state.merchant.restockAt = state.time + MERCHANT.RESTOCK_H * HOUR_MS
  events.push({ kind: 'stock', at: state.time })
}

/** Un pas : le stock se renouvelle toutes les 6 h. */
export function merchantStep(state: GameState, events: GameEvent[]): void {
  if (state.time >= state.merchant.restockAt) restock(state, events)
}

/** null si l'espèce peut vivre dans cet enclos, sinon la raison du refus. */
export function acceptsSpecies(state: GameState, enc: Enclosure, species: SpeciesId): string | null {
  const sp = SPECIES[species]
  if (enc.biome !== sp.biome) return `Il faut un enclos de ${BIOME_NAMES[sp.biome]}.`
  const here = animalsIn(state, enc.id)
  if (here.some((a) => a.species !== species)) return 'Cet enclos accueille déjà une autre espèce.'
  if (here.length >= Math.floor(area(enc.rect) / sp.spaceM2)) return 'Cet enclos est plein.'
  return null
}

/** Achète une offre et place l'animal dans un enclos. */
export function buyAnimal(state: GameState, offerId: number, encId: number): ActionResult {
  const offer = state.merchant.offers.find((o) => o.id === offerId)
  const enc = state.enclosures.find((e) => e.id === encId)
  if (!offer || !enc) return { ok: false, reason: 'Introuvable.' }
  const refus = acceptsSpecies(state, enc, offer.species)
  if (refus) return { ok: false, reason: refus }
  if (state.coins < offer.price) return noMoney(offer.price)
  const s = structuredClone(state)
  s.coins -= offer.price
  s.merchant.offers = s.merchant.offers.filter((o) => o.id !== offerId)
  const e = s.enclosures.find((x) => x.id === encId)!
  e.species = offer.species
  const a: Animal = {
    id: s.nextId++, species: offer.species, sex: offer.sex,
    name: ANIMAL_NAMES[Math.floor(random(s) * ANIMAL_NAMES.length)],
    bornAt: s.time - (offer.stage === 'adulte' ? 2 : 1.5) * SPECIES[offer.species].gestationH * HOUR_MS,
    enclosureId: encId, lastFedAt: s.time, health: { status: 'ok' }, pregnantSince: null, lastBirthAt: null,
  }
  s.animals.push(a)
  return { ok: true, state: s }
}

/** Prix de revente ; null pour un bébé. */
export function sellPrice(state: GameState, animal: Animal): number | null {
  const stage = ageStage(animal, state.time)
  if (stage === 'bebe') return null
  return Math.round(SPECIES[animal.species].price * (stage === 'jeune' ? MERCHANT.SELL_YOUNG : MERCHANT.SELL_ADULT))
}

/** Revend un animal au marchand. */
export function sellAnimal(state: GameState, animalId: number): ActionResult {
  const a = state.animals.find((x) => x.id === animalId)
  if (!a) return { ok: false, reason: 'Introuvable.' }
  const price = sellPrice(state, a)
  if (price === null) return { ok: false, reason: 'Un bébé ne peut pas être vendu.' }
  if (a.health.status === 'malade') return { ok: false, reason: 'Soigne-le avant de le vendre.' }
  const s = structuredClone(state)
  s.coins += price
  s.animals = s.animals.filter((x) => x.id !== animalId)
  const enc = s.enclosures.find((e) => e.id === a.enclosureId)
  if (enc && !s.animals.some((x) => x.enclosureId === enc.id)) enc.species = null // enclos vidé : il accepte de nouveau toute espèce
  return { ok: true, state: s }
}
