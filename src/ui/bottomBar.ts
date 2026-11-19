import type { GameState } from '../sim/types'
import type { Action } from '../sim/actions'
import { cureCost } from '../sim/actions'
import type { Pick } from '../scene/picking'
import type { Zone } from '../data/zones'
import { SPECIES } from '../data/species'
import { TUNING } from '../data/tuning'
import { animalsIn, capacity, cleanliness } from '../sim/enclosure'
import { ageStage, satiety } from '../sim/animal'
import { happiness } from '../sim/happiness'
import { ICONS, iconButton } from './icons'
import { closeDrawer, isDrawerOpen, openDrawer, refreshDrawer } from './drawer'
import { guide } from './highlight'
import { armClaimGuard, claimButton, openMissionPanel, toggleMissionPanel } from './missionPanel'
import { mountMissionBanner } from './missionBanner'
import { currentLine, dailyCount, storyEnded, storyEndMessage } from './missionModel'
import { buildBuildingBar, slotKey } from './buildingBar'
import { toggleMerchantPanel } from './merchantPanel'
import { sellPrice } from '../sim/merchant'
import { buildingInfo, type InfoTarget } from './buildingInfo'
import { toggleVillagePanel } from './villagePanel'
import { INFO_LABELS } from '../data/buildingInfo'
import { VILLAGE_PROPS } from '../data/village'
import { allSegments, closestPoint, isLinked, linkPlan, signature } from '../sim/paths'
import type { PathPoint } from '../sim/types'
import { ENTRANCE_ID } from '../data/paths'
import { createConfirmGuard } from './confirmGuard'
import { NO_PATH_TEXT, pathWarning } from './pathModel'

export interface BottomBarContext {
  get(): GameState
  selection(): Pick
  dispatch(action: Action, from?: HTMLElement | null): boolean
  startBuild(zone: Zone, point: { x: number; z: number }): void
  startResize(encId: number): void
  /** `from` : point d'un chemin existant d'où repartir (Prolonger) ; sans lui, on choisit le départ sur la carte. */
  startPath(from?: PathPoint): void
  openGazette(): void
  /** Glisse la caméra jusqu'au « ! » de la mission ; false s'il n'y en a pas. */
  focusMission(): boolean
}

const AGE = { bebe: 'bébé', jeune: 'jeune', adulte: 'adulte' } as const
const pct = (x: number) => `${Math.round(x * 100)} %`
const SELL_CONFIRM_DELAY_MS = 400
const text = (tag: string, t: string, cls = '') => { const e = document.createElement(tag); e.textContent = t; if (cls) e.className = cls; return e }

/** Barre de commande compacte en bas de l'écran, qui s'agrandit en volet à la demande (spec §7). */
export function mountBottomBar(ctx: BottomBarContext): { refresh(): void } {
  const bar = document.createElement('footer')
  bar.className = 'barre-bas'
  const left = document.createElement('div'); left.className = 'zone-selection'
  const actions = document.createElement('div'); actions.className = 'zone-actions'
  const mission = document.createElement('div'); mission.className = 'zone-mission'
  const right = document.createElement('div'); right.className = 'zone-droite'
  bar.append(left, actions, mission, right)

  const tab = document.createElement('button')
  tab.type = 'button'; tab.className = 'languette'; tab.innerHTML = ICONS.deplier
  tab.setAttribute('aria-label', 'Déplier la barre'); tab.hidden = true
  document.body.append(bar, tab)

  const panelCtx = { get: ctx.get, dispatch: ctx.dispatch, focusMission: ctx.focusMission }
  mountMissionBanner(ctx.get, () => openMissionPanel(panelCtx))

  const marchand = guide(iconButton(ICONS.marchand, 'Marchand d’animaux'), 'marchand')
  marchand.addEventListener('click', () => toggleMerchantPanel({ get: ctx.get, selection: ctx.selection, dispatch: ctx.dispatch }))
  /** Avertissement de destruction d'un chemin : une bulle au-dessus de la barre, pour ne rien déplacer dans la barre (le 2e clic doit tomber sur le même bouton). */
  const pathNote = document.createElement('div')
  pathNote.className = 'note-chemin'; pathNote.setAttribute('role', 'status'); pathNote.hidden = true
  document.body.append(pathNote)
  const gazette = iconButton(ICONS.gazette, 'La Gazette de Clairbois')
  gazette.addEventListener('click', () => ctx.openGazette())
  const fold = iconButton(ICONS.replier, 'Replier la barre')
  fold.addEventListener('click', () => { bar.hidden = true; tab.hidden = false; closeDrawer(); pathNote.hidden = true })
  tab.addEventListener('click', () => { bar.hidden = false; tab.hidden = true })
  right.append(marchand, gazette, fold)

  let builtFor = ''
  let builtKind = ''
  let drawerSeen = ''
  let slotUpdate: (() => void) | null = null
  /** Animal dont la vente attend sa confirmation (annulée au bout de 3 s) et moment où elle a été armée. */
  let sellArmed: number | null = null
  let sellArmedAt = 0
  let sellTimer = 0
  /** Destruction d'un chemin : 1er clic arme (avertissement), 2e clic confirme ; désarmée au bout de 4 s. */
  const pathGuard = createConfirmGuard()
  let pathGuardTimer = 0

  function enclosureDetails(encId: number) {
    openDrawer(`enclos:${encId}`, 'Animaux de l’enclos', (body) => {
      const s = ctx.get()
      const enc = s.enclosures.find((e) => e.id === encId)
      body.replaceChildren()
      if (!enc) { body.append(text('p', 'Cet enclos n’existe plus.')); return }
      if (!isLinked(s, encId)) body.append(text('p', NO_PATH_TEXT, 'rouge'))
      const here = animalsIn(s, encId)
      if (here.length === 0) { body.append(text('p', 'Cet enclos est vide. Le marchand d’animaux arrive bientôt.')); return }
      const table = document.createElement('table')
      const hr = document.createElement('tr')
      for (const h of ['Nom', '', 'Âge', 'Satiété', 'Santé', 'Gestation', 'Bonheur', '']) hr.append(text('th', h))
      table.append(hr)
      for (const a of here) {
        const tr = document.createElement('tr')
        const name = document.createElement('input')
        name.value = a.name; name.maxLength = TUNING.NAME_MAX_LENGTH
        name.setAttribute('aria-label', `Nom de ${a.name}`)
        name.addEventListener('change', () => { ctx.dispatch({ type: 'renommer', animalId: a.id, name: name.value }, name); name.blur() })
        const nameCell = document.createElement('td'); nameCell.append(name)
        const sick = a.health.status === 'malade'
        const gest = a.pregnantSince === null ? '—'
          : pct(Math.min(1, (s.time - a.pregnantSince) / (SPECIES[a.species].gestationH * 3_600_000)))
        tr.append(nameCell, text('td', a.sex === 'F' ? '♀' : '♂'), text('td', AGE[ageStage(a, s.time)]),
          text('td', pct(satiety(a, s.time))), text('td', sick ? 'malade' : 'en forme', sick ? 'rouge' : 'vert'),
          text('td', gest), text('td', pct(happiness(s, a))))
        const act = document.createElement('td')
        if (sick) {
          const cure = iconButton(ICONS.soin, 'Soigner', { price: cureCost(SPECIES[a.species].price) })
          cure.addEventListener('click', () => { if (ctx.dispatch({ type: 'soigner', animalId: a.id }, cure)) refreshDrawer() })
          act.append(cure)
        }
        const price = sellPrice(s, a)
        if (price !== null) {
          const armed = sellArmed === a.id
          const sell = document.createElement('button')
          sell.type = 'button'
          sell.className = armed ? 'vendre confirmer' : 'vendre'
          sell.textContent = armed ? 'Vendre ?' : `Vendre (${price})`
          sell.addEventListener('click', () => {
            // Un double-clic ne doit pas valider la vente : la confirmation demande un 2e clic distinct.
            if (sellArmed === a.id && performance.now() - sellArmedAt < SELL_CONFIRM_DELAY_MS) return
            clearTimeout(sellTimer)
            if (sellArmed !== a.id) {
              sellArmed = a.id
              sellArmedAt = performance.now()
              sellTimer = window.setTimeout(() => { sellArmed = null; if (isDrawerOpen(`enclos:${encId}`)) refreshDrawer() }, 3000)
              refreshDrawer()
              return
            }
            sellArmed = null
            ctx.dispatch({ type: 'vendre', animalId: a.id }, sell)
            refreshDrawer()
          })
          act.append(sell)
        }
        tr.append(act)
        table.append(tr)
      }
      body.append(table)
    })
  }

  /** Fiche d'un bâtiment ou de la mairie dans le volet : textes fixes une fois, chiffres remis à jour chaque seconde. */
  function infoSheet(key: string, target: InfoTarget) {
    const first = buildingInfo(ctx.get(), target)
    if (!first) return
    openDrawer(key, first.title, (body) => {
      body.replaceChildren()
      const role = text('p', first.role)
      const list = document.createElement('dl'); list.className = 'fiche'
      const missing = document.createElement('div')
      body.append(role, list, missing)
      if (first.villageButton) {
        const go = document.createElement('button')
        go.type = 'button'; go.className = 'principal'; go.textContent = first.villageButton
        go.addEventListener('click', () => toggleVillagePanel(panelCtx))
        body.append(go)
      }
      const fill = () => {
        const info = buildingInfo(ctx.get(), target)
        if (!info) return
        list.replaceChildren(...info.rows.flatMap((r) => [text('dt', r.label), text('dd', r.value)]))
        missing.replaceChildren(...info.missing.map((m) => text('p', m, 'rouge')))
      }
      fill()
      return fill
    })
  }

  function infoButton(key: string, target: InfoTarget): HTMLButtonElement {
    const btn = iconButton(ICONS.liste, INFO_LABELS.info)
    btn.addEventListener('click', () => { if (isDrawerOpen(key)) closeDrawer(); else infoSheet(key, target) })
    return btn
  }

  /** Fiche d'un chemin : longueur, Prolonger, Détruire en deux clics (l'entrée ne se détruit pas). */
  function disarmPath() { pathGuard.reset(); clearTimeout(pathGuardTimer); pathNote.hidden = true; pathNote.textContent = '' }

  function pathSheet(id: number, point: PathPoint) {
    disarmPath()
    const seg = allSegments(ctx.get()).find((x) => x.id === id)
    if (!seg) { left.append(text('span', 'Clique un enclos ou une zone', 'discret invite')); return }
    const entrance = id === ENTRANCE_ID
    left.innerHTML = ICONS.chemin
    left.append(text('b', entrance ? 'Chemin de l’entrée' : `Chemin · ${Math.round(Math.hypot(seg.b.x - seg.a.x, seg.b.z - seg.a.z))} m`, 'nom'))
    const extend = document.createElement('button')
    extend.type = 'button'; extend.className = 'principal'; extend.textContent = 'Prolonger'
    extend.addEventListener('click', () => ctx.startPath(closestPoint(point, seg)))
    actions.append(extend)
    if (entrance) return
    const del = document.createElement('button')
    del.type = 'button'; del.className = 'vendre'; del.textContent = 'Détruire'
    const disarmLook = () => { disarmPath(); del.className = 'vendre'; del.textContent = 'Détruire' }
    del.addEventListener('click', () => {
      const r = pathGuard.click()
      if (r === 'ignored') return
      clearTimeout(pathGuardTimer)
      if (r === 'armed') {
        pathNote.textContent = pathWarning(ctx.get(), id); pathNote.hidden = false
        del.style.minWidth = `${del.offsetWidth}px` // le bouton ne bouge pas (il ne peut que grandir vers la droite)
        del.className = 'vendre confirmer'; del.textContent = 'Détruire ?'
        pathGuardTimer = window.setTimeout(disarmLook, 4000)
        return
      }
      pathNote.hidden = true
      if (ctx.dispatch({ type: 'detruireChemin', id }, del)) { builtFor = ''; update() } // le chemin n'existe plus : fiche reconstruite
      else disarmLook() // refusé : le bouton redevient « Détruire »
    })
    actions.append(del)
  }

  function build(p: Pick) {
    left.replaceChildren(); actions.replaceChildren(); slotUpdate = null
    disarmPath() // l'avertissement et son minuteur ne survivent pas à un changement de fiche
    const s = ctx.get()
    if (p.kind === 'enclos') {
      const enc = s.enclosures.find((e) => e.id === p.id)
      if (!enc) { left.append(text('span', 'Clique un enclos ou une zone', 'discret invite')); return }
      left.innerHTML = ICONS.patte
      left.append(text('b', enc.species ? SPECIES[enc.species].name : 'Enclos vide', 'nom'), text('span', '', 'compte'))
      const gauge = document.createElement('span'); gauge.className = 'jauge'; gauge.title = 'Propreté'
      gauge.append(document.createElement('i'))
      left.append(gauge, text('span', '', 'malades'))
      const clean = guide(iconButton(ICONS.balai, 'Nettoyer', { price: TUNING.CLEAN_COST }), 'nettoyer')
      clean.addEventListener('click', () => ctx.dispatch({ type: 'nettoyer', encId: p.id }, clean))
      const cure = iconButton(ICONS.soin, 'Soigner les malades')
      cure.addEventListener('click', () => ctx.dispatch({ type: 'soignerTout', encId: p.id }, cure))
      const resize = iconButton(ICONS.agrandir, 'Redimensionner')
      resize.addEventListener('click', () => ctx.startResize(p.id))
      const details = guide(iconButton(ICONS.liste, 'Détails des animaux'), 'detailsEnclos')
      details.addEventListener('click', () => {
        if (isDrawerOpen(`enclos:${p.id}`)) { closeDrawer(); return }
        enclosureDetails(p.id)
        ctx.dispatch({ type: 'vu', what: 'ficheEnclos' })
      })
      actions.append(clean, cure, resize, details)
      // Plan de liaison calculé une seule fois ici (coûteux), pas à chaque rafraîchissement.
      if (!isLinked(s, p.id)) {
        left.append(text('span', NO_PATH_TEXT, 'rouge alerte'))
        const plan = linkPlan(s, p.id)
        const link = document.createElement('button')
        link.type = 'button'; link.className = 'principal'
        if (plan) {
          link.textContent = `Relier (${plan.cost} pièces)`
          link.addEventListener('click', () => ctx.dispatch({ type: 'relierEnclos', encId: p.id }, link))
        } else {
          link.textContent = 'Tracer un chemin'
          link.addEventListener('click', () => ctx.startPath())
        }
        actions.append(link)
      }
    } else if (p.kind === 'chemin') {
      pathSheet(p.id, p.point)
    } else if (p.kind === 'zone') {
      left.append(text('b', p.zone.name, 'nom'))
      if (p.zone.unlockLevel > s.village.level) {
        left.append(text('span', `Se débloque au niveau ${p.zone.unlockLevel} du village`, 'discret'))
      } else {
        const add = iconButton(ICONS.plus, 'Nouvel enclos')
        if (p.zone.id === 'prairie') guide(add, 'prairie')
        add.addEventListener('click', () => ctx.startBuild(p.zone, p.point))
        const path = iconButton(ICONS.chemin, 'Tracer un chemin')
        path.addEventListener('click', () => ctx.startPath())
        actions.append(add, path)
      }
    } else if (p.kind === 'emplacement') {
      slotUpdate = buildBuildingBar(ctx, p.slot, left, actions)
      if (s.buildings.some((b) => b.slot === p.slot)) actions.prepend(infoButton(`info:s${p.slot}`, { kind: 'emplacement', slot: p.slot }))
    } else if (p.kind === 'decor') {
      const v = VILLAGE_PROPS[p.index]
      if (!v) { left.append(text('span', 'Clique un enclos ou une zone', 'discret invite')); return }
      if (v.key === 'mairie') {
        left.append(text('b', v.name, 'nom'))
        actions.append(infoButton('info:mairie', { kind: 'decor', index: p.index }))
      } else {
        left.append(text('b', v.name, 'nom'), text('span', v.sentence, 'discret'))
      }
    } else {
      left.append(text('span', 'Clique un enclos ou une zone', 'discret invite'))
    }
  }

  /** Zone mission : reconstruite seulement quand la mission change ; l'avancée se met à jour sur place. */
  let missionSeen = ''
  let missionProgress: HTMLElement | null = null
  let missionDaily: HTMLElement | null = null
  function updateMission() {
    const s = ctx.get()
    const l = currentLine(s)
    const d = dailyCount(s)
    const ended = !l && storyEnded(s)
    const sig = JSON.stringify([l?.id, l?.done, d !== null, ended])
    if (sig !== missionSeen) {
      missionSeen = sig
      mission.replaceChildren()
      mission.classList.toggle('reussie', !!l?.done)
      const open = document.createElement('button')
      open.type = 'button'; open.className = 'mission-ouvrir'
      open.innerHTML = ICONS.cible
      open.append(text('span', l ? l.title : ended ? storyEndMessage : 'Une nouvelle mission arrive…', 'titre'))
      missionProgress = l ? text('span', '', 'avancee') : null
      if (missionProgress) open.append(missionProgress)
      missionDaily = d ? text('span', '', 'quot') : null
      if (missionDaily) { missionDaily.title = 'Missions du jour réussies'; open.append(missionDaily) }
      open.addEventListener('click', () => { const opening = !isDrawerOpen('missions'); if (opening) ctx.focusMission(); toggleMissionPanel(panelCtx) })
      mission.append(open)
      if (l?.done) { mission.append(claimButton(panelCtx, l, true, updateMission)); armClaimGuard() }
    }
    if (missionProgress && l) missionProgress.textContent = l.progress
    if (missionDaily && d) missionDaily.textContent = `☀ ${d.done}/${d.total}`
  }

  function update() {
    updateMission()
    const p = ctx.selection()
    const kind = p.kind === 'enclos' ? `e${p.id}` : p.kind === 'chemin' ? `c${p.id}` : p.kind === 'zone' ? `z${p.zone.id}` : p.kind === 'emplacement' ? `s${p.slot}` : p.kind === 'decor' ? `d${p.index}` : 'rien'
    // Un enclos change de fiche quand son lien change ; non relié, quand le réseau change (le plan de liaison peut changer).
    const linkKey = p.kind === 'enclos' ? (isLinked(ctx.get(), p.id) ? ':l' : `:u${signature(ctx.get())}`) : ''
    const key = p.kind === 'emplacement' ? slotKey(ctx.get(), p.slot) : kind + linkKey
    if (key !== builtFor) {
      builtFor = key; build(p)
      // Le volet ne se ferme que si la sélection change, pas quand le même emplacement évolue (niveau, garde-manger).
      if (kind !== builtKind && !kind.startsWith('e')) closeDrawer()
      builtKind = kind
    }
    if (p.kind === 'emplacement') slotUpdate?.()
    if (p.kind === 'enclos') {
      const s = ctx.get()
      const enc = s.enclosures.find((e) => e.id === p.id)
      if (!enc) return
      const here = animalsIn(s, p.id)
      const sick = here.filter((a) => a.health.status === 'malade')
      left.querySelector('.compte')!.textContent = `${here.length}/${capacity(enc)}`
      const c = cleanliness(enc, s.time)
      const fill = left.querySelector<HTMLElement>('.jauge i')!
      fill.style.width = pct(c); fill.dataset.niveau = c < 0.3 ? 'bas' : c < 0.7 ? 'moyen' : 'haut'
      const m = left.querySelector<HTMLElement>('.malades')!
      m.textContent = sick.length ? `${sick.length} malade${sick.length > 1 ? 's' : ''}` : ''
      const cureBtn = actions.querySelectorAll('button')[1]
      const cost = sick.reduce((t, a) => t + cureCost(SPECIES[a.species].price), 0)
      let price = cureBtn?.querySelector('small')
      if (cureBtn && cost && !price) { price = document.createElement('small'); cureBtn.append(price) }
      if (price) price.textContent = cost ? String(cost) : ''
    }
    // Le volet n'est redessiné que si ses animaux ont changé (sinon ses boutons seraient recréés sous le clic).
    if (p.kind === 'enclos') {
      const s = ctx.get()
      const k = JSON.stringify([s.time, animalsIn(s, p.id)])
      if (k !== drawerSeen && isDrawerOpen(`enclos:${p.id}`) && refreshDrawer()) drawerSeen = k // sinon on réessaiera au prochain passage
    }
  }

  // Sur téléphone la barre peut prendre plusieurs lignes : les volets se posent au-dessus de sa hauteur réelle.
  const syncHeight = () => document.documentElement.style.setProperty('--barre-h', bar.hidden ? '0px' : `${bar.offsetHeight}px`)
  if (typeof ResizeObserver !== 'undefined') new ResizeObserver(syncHeight).observe(bar)
  syncHeight()
  update()
  setInterval(update, 500)
  return { refresh: update }
}
