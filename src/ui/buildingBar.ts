import type { BuildingType, GameState } from '../sim/types'
import type { Action } from '../sim/actions'
import { rationCost } from '../sim/actions'
import { buildingIncomePerHour } from '../sim/economy'
import { BUILDINGS, SLOTS } from '../data/economy'
import { TUNING } from '../data/tuning'
import { ICONS, iconButton } from './icons'

export interface BuildingBarContext {
  get(): GameState
  dispatch(action: Action, from?: HTMLElement | null): boolean
}

const text = (tag: string, t: string, cls = '') => { const e = document.createElement(tag); e.textContent = t; if (cls) e.className = cls; return e }
const BUILD_ICON: Record<BuildingType, string> = { ferme: ICONS.garde, cafe: ICONS.cafe, boutique: ICONS.boutique, auberge: ICONS.auberge }

/** Ce qui doit changer pour que la barre d'un emplacement soit reconstruite. */
export function slotKey(s: GameState, slot: number): string {
  const b = s.buildings.find((x) => x.slot === slot)
  return `s${slot}:${b?.level ?? 0}:${s.buildings.length}:${s.village.level}:${s.pantry.capacity}`
}

/** Prochain cran du garde-manger, s'il existe. */
function nextPantry(s: GameState): { capacity: number; cost?: number; level?: number } | undefined {
  const sizes = TUNING.PANTRY_SIZES
  let i = 0
  sizes.forEach((sz, k) => { if (sz.capacity <= s.pantry.capacity) i = k })
  return sizes[i + 1]
}

function withQty(b: HTMLButtonElement, qty: string): HTMLButtonElement {
  b.append(text('i', qty, 'qte'))
  return b
}

/**
 * Remplit la barre du bas pour un emplacement (spec §7) : bâtiments à construire, ou actions du bâtiment.
 * Renvoie une fonction qui rafraîchit les chiffres sans reconstruire les boutons.
 */
export function buildBuildingBar(ctx: BuildingBarContext, slot: number, left: HTMLElement, actions: HTMLElement): () => void {
  const s = ctx.get()
  const def = SLOTS.find((x) => x.id === slot)
  const b = s.buildings.find((x) => x.slot === slot)
  const none = () => {}

  if (!b) {
    if (def && def.unlockLevel > s.village.level) {
      left.append(text('span', `Se débloque au niveau ${def.unlockLevel}`, 'discret'))
      return none
    }
    left.append(text('b', 'Emplacement libre', 'nom'))
    const types = (Object.keys(BUILDINGS) as BuildingType[]).filter((t) => BUILDINGS[t].buildCost !== null && !s.buildings.some((x) => x.type === t))
    if (types.length === 0) {
      left.append(text('span', 'De nouveaux bâtiments arriveront bientôt', 'discret'))
      return none
    }
    for (const t of types) {
      const d = BUILDINGS[t]
      const locked = d.unlockLevel > s.village.level
      const label = locked ? `${d.name} (se débloque au niveau ${d.unlockLevel})` : `Construire ${d.withArticle}`
      const btn = iconButton(BUILD_ICON[t], label, { price: d.buildCost ?? 0, disabled: locked })
      btn.addEventListener('click', () => ctx.dispatch({ type: 'batir', slot, building: t }, btn))
      actions.append(btn)
    }
    return none
  }

  const d = BUILDINGS[b.type]
  const upgrade = () => {
    const cost = b.level < 3 ? d.upgradeCost[b.level - 1] : undefined
    const btn = iconButton(ICONS.ameliorer, cost === undefined ? 'Niveau maximum' : `Améliorer (niveau ${b.level + 1})`, { price: cost, disabled: cost === undefined })
    btn.addEventListener('click', () => ctx.dispatch({ type: 'ameliorer', slot }, btn))
    return btn
  }

  if (b.type === 'ferme') {
    left.append(text('b', `${d.name} ${'★'.repeat(b.level)}`, 'nom'))
    for (const [food, icon, label] of [['fourrage', ICONS.fourrage, 'Fourrage'], ['viande', ICONS.viande, 'Viande']] as const) {
      for (const n of [10, 50]) {
        const btn = withQty(iconButton(icon, `${label} ×${n}`, { price: rationCost(s, food, n) }), `×${n}`)
        btn.addEventListener('click', () => ctx.dispatch({ type: 'acheterRations', food, n }, btn))
        actions.append(btn)
      }
    }
    actions.append(upgrade())
    const next = nextPantry(s)
    const label = next ? `Agrandir le garde-manger (${next.capacity} places)` : 'Garde-manger au maximum'
    const pantry = iconButton(ICONS.garde, label, { price: next?.cost, disabled: !next })
    pantry.addEventListener('click', () => ctx.dispatch({ type: 'agrandirGardeManger' }, pantry))
    actions.append(pantry)
    return none
  }

  left.append(text('b', `${d.name} · niveau ${b.level}`, 'nom'), text('span', '', 'estim'))
  actions.append(upgrade())
  return () => {
    const est = left.querySelector('.estim')
    if (!est) return
    const r = buildingIncomePerHour(ctx.get(), slot)
    est.textContent = `≈ ${Math.round(r.clients)} clients/h · ${Math.round(r.pieces)} pièces/h`
  }
}
