# V2 — Étape 1 : chemins à construire — plan de construction

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal :** le joueur trace lui-même les chemins du zoo ; seuls les enclos reliés à l'entrée par un chemin attirent des visiteurs, et les promeneurs marchent sur ce réseau réel.

**Architecture :** les segments construits sont stockés dans `GameState.paths` (sauvegarde v4) ; le chemin de l'entrée (allée de l'entrée jusqu'au pont) est une donnée fixe de `src/data/paths.ts`, jamais dans l'état, donc indestructible. Toute la géométrie (liaison, contrôle d'un tracé, chemin offert) est pure dans `src/sim/paths.ts` ; la 3D (`pathsView`, éditeur de tracé) et les promeneurs (`pathGraph`) ne font que lire l'état.

**Tech Stack :** TypeScript, Three.js, Vitest (`export PATH="/c/Program Files/nodejs:$PATH"; npx vitest run`).

**Spec :** `docs/superpowers/specs/2026-11-19-parc-de-clairbois-v2-design.md` §3 (et §1 contraintes) ; conception V1 pour le reste.

## Global Constraints

- Règles pures et testées dans `src/sim/`, chiffres dans `src/data/`, aucune logique dans `src/data/`.
- Le temps n'avance que par `advanceTo` (pas de 10 min) ; les actions passent par `applyAction` et renvoient un nouvel état (`structuredClone`) ou un refus en français affichable tel quel.
- Sauvegarde versionnée : `CURRENT_VERSION` passe de 3 à 4 ; la migration est écrite en clair, sans appeler le jeu ; la partie de Romain doit continuer sans perte.
- Un enclos non relié garde ses animaux en vie normalement : il ne compte simplement pas pour les visiteurs.
- Tracé par **segments droits** ; un seul type de chemin, dont l'allure suit le niveau du village (1 terre, 2 gravier, 3 pavés + lanternes ; 4–6 plus tard).
- Tout segment construit se détruit (non remboursé, avertissement si des enclos perdent leur liaison) ; le chemin de l'entrée ne se détruit pas.
- Téléphone et ordinateur : tout se fait au tap (pas de glisser obligatoire), panneau lisible en 375 × 812.
- Textes du jeu en français simple, tutoiement.

## Décisions du chef (à confirmer par Romain avec le plan)

- **D1 — Chemin de l'entrée** = l'allée qui va de l'entrée (bord ouest, x = −36) jusqu'au pont, plus le pont et les rues du village. C'est le seul chemin déjà sur la carte : il reste fixe. Tout ce que le joueur trace se modifie.
- **D2 — Où tracer** : du côté zoo seulement (x de −34 à −4, z de −24 à 24, c'est-à-dire les trois zones et l'allée). Les rues du village ne changent pas à cette étape.
- **D3 — Relié** : un enclos est relié si un chemin relié à l'entrée passe à moins de 1 m de sa clôture (le chemin ne peut pas entrer dans l'enclos). Les enclos le long de l'allée sont donc reliés d'office.
- **D4 — Prix** : 3 pièces par mètre (un enclos de 10 × 8 coûte 224), longueur minimale 1 m, non remboursé à la destruction.
- **D5 — Bouton « Relier »** dans la fiche d'un enclos non relié : le jeu trace pour toi le chemin le plus court (droit ou en L) et affiche son prix. On peut aussi tracer à la main.
- **D6 — Tracé à la main** : « Tracer un chemin » (fiche d'une zone ou d'un chemin) → on touche un chemin existant pour partir, puis le point d'arrivée ; le fantôme est vert ou rouge avec la raison, le prix s'affiche ; Valider continue depuis le bout (pour enchaîner les segments) ; Terminer ferme.
- **D7 — Nouvelle partie** : l'enclos des moutons reçoit d'office un petit chemin jusqu'à l'allée. Le premier pas « Pose un deuxième enclos » rappelle de le relier.
- **D8 — Partie existante** : au premier chargement, chaque enclos non relié reçoit gratuitement le chemin le plus court ; un message unique le dit (et nomme les enclos impossibles à relier, s'il y en a).

## Review Focus

1. **Croisements et départs en milieu de chemin** : un segment qui part du milieu d'un autre, ou qui en croise un sans s'arrêter dessus, est relié au réseau (test en tâche 1).
2. **Destruction au milieu d'une chaîne** : détruire le segment du milieu coupe tous les enclos situés après ; l'avertissement les nomme et l'attrait baisse aussitôt (tests en tâches 2 et 3).
3. **Enclos déplacé ou redimensionné** : impossible de le poser sur un chemin construit ; s'il s'éloigne de son chemin, il devient « non relié » et l'attrait suit sans valeur gardée en cache (tests en tâches 2 et 3).
4. **Ancienne partie avec un enclos enfermé** (entouré d'autres enclos) : le chemin offert échoue proprement, le message le nomme, rien ne plante (test en tâche 2 et 3).
5. **Tracé interdit** : départ hors d'un chemin, côté rivière, zone sous la brume, hors carte : chaque cas donne sa raison, jamais un chemin posé (test en tâche 2).

---

### Tâche 1 : État v4, données et liaison des enclos — agent · **Sonnet**

**Files :**
- Create : `src/data/paths.ts`, `src/sim/paths.ts`, `tests/sim/paths.test.ts`
- Modify : `src/sim/types.ts`, `src/sim/newGame.ts`, `src/save/migrations.ts`, `src/save/save.ts`, `tests/sim/helpers.ts`, `tests/save/migrations.test.ts`, `tests/save/save-robustness.test.ts`, tout `version: 3` restant dans `src/` et `tests/`

**Interfaces :**
- Produces (types, `src/sim/types.ts`) :
  - `export interface PathPoint { x: number; z: number }`
  - `export interface PathSegment { id: number; a: PathPoint; b: PathPoint }`
  - `GameState.version: 4`, `GameState.paths: PathSegment[]`
- Produces (`src/data/paths.ts`) :
  - `PATHS_TUNING = { WIDTH_M: 2.2, TOUCH_EXTRA_M: 1, COST_PER_M: 3, MIN_LENGTH_M: 1, SNAP_M: 2, SNAP_M_PHONE: 3, ON_PATH_EPS: 0.05 }`
  - `PATH_AREA: Rect = { x: -34, z: -24, w: 30, d: 48 }` (zone où l'axe d'un chemin construit peut aller)
  - `ENTRANCE_ID = -1` ; `ENTRANCE_PATH: PathSegment[] = [{ id: -1, a: { x: -36, z: 10 }, b: { x: BRIDGE_X - 3.5, z: 10 } }]` (`BRIDGE_X` de `data/zones.ts`)
  - `START_PATH: { a: PathPoint; b: PathPoint } = { a: { x: -20, z: 10 }, b: { x: -20, z: 6.5 } }` (enclos de départ → allée)
  - `PATH_STYLE_BY_LEVEL: Record<number, 1 | 2 | 3> = { 1: 1, 2: 2, 3: 3 }`
- Produces (`src/sim/paths.ts`) :
  - `allSegments(state: GameState): PathSegment[]` — entrée + `state.paths`
  - `pointSegmentDistance(p: PathPoint, s: { a: PathPoint; b: PathPoint }): number`
  - `segmentsTouch(s1, s2): boolean` — se coupent, ou un bout de l'un est à moins de `ON_PATH_EPS` de l'autre
  - `rectSegmentDistance(r: Rect, s): number` — 0 si le segment entre dans le rect
  - `reachableIds(state: GameState): Set<number>` — ids des segments reliés à l'entrée (parcours en largeur depuis `ENTRANCE_ID`)
  - `linkedEnclosureIds(state: GameState): Set<number>` — enclos à une distance ≤ `WIDTH_M / 2 + TOUCH_EXTRA_M` d'un segment atteignable ; **mémoire d'une seule entrée**, clé = chaîne des rects des enclos et des segments (pas de cache par identité d'objet : les tests modifient les tableaux sur place)
  - `isLinked(state: GameState, encId: number): boolean`
  - `nearestOnNetwork(state: GameState, x: number, z: number): { point: PathPoint; segId: number; d: number } | null` — sur tous les segments
  - `segmentAt(state: GameState, x: number, z: number, tol: number): number | null` — id du segment le plus proche à moins de `tol` (entrée comprise)

- [ ] **Step 1 : tests qui échouent** (`tests/sim/paths.test.ts`)
  - `enclos le long de l'allée relié` : enclos `{ x: -30, z: 0, w: 8, d: 8.5 }` (bord à z = 8,5) → `isLinked` vrai.
  - `enclos loin de tout chemin non relié` : `{ x: -26, z: -5, w: 12, d: 10 }` sans chemin → faux ; avec `START_PATH` → vrai.
  - `départ en milieu de segment` : segment A `(-20,10)→(-20,0)`, segment B `(-20,4)→(-28,4)` ; un enclos touchant seulement B est relié.
  - `croisement sans bout commun` : A `(-20,10)→(-20,-2)`, B `(-26,2)→(-14,2)` ; B est dans `reachableIds`.
  - `segment isolé` : un segment qui ne touche rien n'est pas atteignable et ne relie pas son enclos.
  - `cache à jour` : après `state.enclosures[0].rect.x -= 10` sur place, `isLinked` change de valeur.
  - `nouvelle partie` : `newGame(1, T0)` a `version: 4`, `paths` = 1 segment égal à `START_PATH`, et l'enclos des moutons est relié.
  - Migration (`tests/save/migrations.test.ts`) : `MIGRATIONS[3]` donne `version: 4` et `paths: []`, garde tout le reste.
  - Validation (`tests/save/save-robustness.test.ts`) : une sauvegarde v4 avec `paths: [{ id: 1, a: { x: 'a' }, b: … }]` ou sans `paths` est illisible.
- [ ] **Step 2 :** lancer `npx vitest run tests/sim/paths.test.ts tests/save` → échecs attendus (module absent, version 3).
- [ ] **Step 3 :** implémenter types, données, `src/sim/paths.ts`, migration `3: (old) => ({ ...old, version: 4, paths: [] })`, `CURRENT_VERSION = 4`, validation des `paths` dans `looksLikeGame` (tableau ; `id`, `a.x`, `a.z`, `b.x`, `b.z` finis), `newGame` ajoute `START_PATH` avec `id: state.nextId++`, `emptyState` des tests avec `version: 4, paths: []`.
- [ ] **Step 4 :** `npx vitest run` → tout vert (les anciens tests compris).
- [ ] **Step 5 :** commit `V2-1 tâche 1 : état v4 et liaison des enclos par les chemins`.

### Tâche 2 : Tracer, détruire, relier, chemin offert (règles) — agent · **Sonnet**

**Files :**
- Modify : `src/sim/paths.ts`, `src/sim/actions.ts`, `src/sim/placement.ts`
- Test : `tests/sim/paths.test.ts`, `tests/sim/placement.test.ts`

**Interfaces :**
- Consumes : tâche 1 (`allSegments`, `reachableIds`, `linkedEnclosureIds`, `rectSegmentDistance`, `nearestOnNetwork`, `PATHS_TUNING`, `PATH_AREA`, `ENTRANCE_ID`).
- Produces (`src/sim/paths.ts`) :
  - `pathCost(a: PathPoint, b: PathPoint): number` = `Math.ceil(longueur × COST_PER_M)`
  - `checkSegment(state, a, b, opts?: { free?: boolean }): { ok: true; length: number; cost: number } | { ok: false; reason: string; cost: number }` — contrôles **dans cet ordre**, textes exacts :
    1. `a` à plus de `ON_PATH_EPS` de tout segment → « Un chemin doit partir d'un chemin existant. »
    2. longueur < `MIN_LENGTH_M` → « Trop court. »
    3. `a` ou `b` à l'est de `PATH_AREA` (x > −4) → « La rivière ne se traverse que par le pont. » ; sinon `a` ou `b` hors de `PATH_AREA` → « Le chemin sort de la carte. » (la zone est un rectangle : deux bouts dedans = tout le segment dedans)
    4. le ruban (demi-largeur `WIDTH_M / 2`) entre dans une zone dont `unlockLevel > village.level` → « Cette zone est encore sous la brume. »
    5. `rectSegmentDistance(enclos, seg) < WIDTH_M / 2` pour un enclos → « Il traverse un enclos. »
    6. pièces insuffisantes (sauf `free`) → « Pas assez de pièces (il en faut N). »
  - `removalImpact(state, id: number): number[]` — ids des enclos reliés avant et plus après
  - `linkPlan(state, encId: number): { segments: { a: PathPoint; b: PathPoint }[]; cost: number } | null` — points de départ candidats tout autour de la clôture à 1,5 m, tous les 0,5 m ; cibles = projection sur chaque segment atteignable + ses deux bouts ; on garde le segment droit valide (`checkSegment` avec `free`) le plus court ; sinon le meilleur L (coin `(p.x, t.z)` ou `(t.x, p.z)`) ; sinon `null`
  - `giftPaths(state): { state: GameState; linked: number[]; stuck: number[] }` — relie gratuitement chaque enclos non relié (du plus proche du réseau au plus loin, le réseau grandit à chaque ajout)
- Produces (actions, `src/sim/actions.ts`) :
  - `{ type: 'tracerChemin'; a: PathPoint; b: PathPoint }` → ajoute `{ id: nextId++, a, b }`, débite le prix
  - `{ type: 'detruireChemin'; id: number }` → refus « Le chemin de l'entrée ne peut pas être détruit. » pour `ENTRANCE_ID`, « Introuvable. » sinon si absent ; rien n'est remboursé
  - `{ type: 'relierEnclos'; encId: number }` → refus « Cet enclos est déjà relié. » / « Aucun chemin possible jusqu'à cet enclos. » / pièces ; sinon pose les segments de `linkPlan`
  - `checkPlacement` refuse un enclos qui chevauche un segment construit (`rectSegmentDistance < WIDTH_M / 2`) avec le texte existant « Il chevauche un chemin. »

- [ ] **Step 1 : tests qui échouent**
  - Un test par raison de `checkSegment` (6 cas) avec le texte exact ; un tracé valide de 10 m coûte 30 et `applyAction` le pose (`paths.length + 1`, `coins − 30`).
  - `détruire au milieu d'une chaîne` : chaîne entrée → A → B, enclos touchant B ; `removalImpact(A)` = [cet enclos] ; après `detruireChemin` A, il n'est plus relié et les pièces n'ont pas bougé.
  - `entrée indestructible` : `detruireChemin` −1 refusé avec le texte exact.
  - `relier` : enclos de départ sans chemin → `linkPlan` donne 1 segment de 3,5 m ; `relierEnclos` débite `cost` et le relie ; deuxième appel refusé « Cet enclos est déjà relié. ».
  - `enclos enfermé` : enclos entouré de 4 enclos collés → `linkPlan` = `null`, `giftPaths` le met dans `stuck`, ne plante pas.
  - `chemin offert en L` : un enclos dont la ligne droite vers le réseau traverse un autre enclos reçoit 2 segments et devient relié.
  - Placement : poser ou redimensionner un enclos sur un segment construit → « Il chevauche un chemin. ».
- [ ] **Step 2 :** `npx vitest run tests/sim` → échecs attendus.
- [ ] **Step 3 :** implémenter.
- [ ] **Step 4 :** `npx vitest run` → tout vert.
- [ ] **Step 5 :** commit `V2-1 tâche 2 : tracer, détruire, relier et chemin offert`.

### Tâche 3 : Visiteurs, ancienne partie, joueur automatique — agent · **Sonnet**

**Files :**
- Modify : `src/sim/economy.ts`, `src/save/save.ts`, `src/game/session.ts`, `src/main.ts` (affichage du message), `src/data/missions.ts` (texte de `pas-enclos`), `tests/balance/bot.ts`
- Test : `tests/sim/economy.test.ts`, `tests/game/session.test.ts`, `tests/balance/playthrough.test.ts`, `tests/sim/perf.test.ts`

**Interfaces :**
- Consumes : `linkedEnclosureIds`, `giftPaths`, action `relierEnclos`.
- Produces :
  - `visibleAnimals(state: GameState): Animal[]` (`src/sim/economy.ts`) — animaux des enclos reliés ; `appeal` et le nombre d'espèces de la boutique l'utilisent (le bonheur moyen reste sur tous les animaux)
  - `LoadResult` `ok` gagne `fromVersion: number`
  - `Session.pathsNotice: string | null` — si `fromVersion < 4` : `giftPaths` **avant** le rattrapage d'absence, puis texte « Nouveau à Clairbois : les chemins ! Les visiteurs ne voient que les enclos reliés à l'allée. Margaux a offert un chemin à N enclos. » (+ « À relier toi-même : Loups, Cerfs. » si `stuck` n'est pas vide ; rien si N = 0 et pas de `stuck`) ; affiché comme `priceNotice`.
  - Texte de `pas-enclos` : « Il faut de la place pour de nouveaux animaux. Touche la prairie et dessine un deuxième enclos, puis relie-le à l'allée par un chemin pour que les visiteurs le voient. »

- [ ] **Step 1 : tests qui échouent**
  - `enclos non relié sans attrait` : deux enclos de moutons identiques, l'un relié, l'autre non → `appeal` ne compte que le premier ; après `relierEnclos` sur le second, il augmente.
  - `attrait suit un déplacement` : redimensionner (action) l'enclos de départ pour l'éloigner de son chemin → `appeal` tombe à 0.
  - Session : une sauvegarde v3 avec un enclos loin de l'allée → après `startSession`, l'enclos est relié, `pathsNotice` contient « offert un chemin à 1 enclos » ; une sauvegarde v4 → `pathsNotice` `null`.
  - Joueur automatique : il appelle `relierEnclos` après chaque enclos construit ; les bornes de rythme existantes de `playthrough.test.ts` restent vertes.
  - `perf.test.ts` reste sous ses seuils.
- [ ] **Step 2 :** lancer les tests → échecs attendus.
- [ ] **Step 3 :** implémenter.
- [ ] **Step 4 :** `npx vitest run` → tout vert ; noter le rythme du joueur automatique dans le compte rendu.
- [ ] **Step 5 :** commit `V2-1 tâche 3 : seuls les enclos reliés attirent, chemin offert aux anciennes parties`.

### Tâche 4 : Chemins en 3D et éditeur de tracé — agent · **Sonnet**

**Files :**
- Create : `src/scene/pathsView.ts`, `src/scene/pathEditor.ts`
- Modify : `src/scene/path.ts` (export d'un disque de jonction), `src/main.ts`, `src/ui/bottomBar.ts` (bouton de la zone), `src/style.css`
- Test : `tests/scene/path.test.ts` (fonctions pures seulement)

**Interfaces :**
- Consumes : `state.paths`, `PATH_STYLE_BY_LEVEL`, `checkSegment`, `nearestOnNetwork`, `PATHS_TUNING`, action `tracerChemin`.
- Produces :
  - `createPathsView(world: World): { update(state: GameState): void }` — reconstruit les segments construits seulement quand `paths` ou le niveau change ; `createPath([a, b], { style, lanterns: style === 3, … })` par segment + disque aux bouts pour des jonctions propres ; mêmes textures que le décor.
  - `snapEnd(state, p: PathPoint, start: PathPoint, snap: number): PathPoint` (pure, dans `pathEditor.ts`) — point du réseau le plus proche à moins de `snap` (autre que `start`), sinon arrondi au demi-mètre.
  - `createPathEditor(world, canvas, rig, ctx: EditorContext-like { get; dispatch }): { start(from?: PathPoint): void; active(): boolean }`
    - sans `from` : panneau « Touche un chemin pour commencer » ; un tap à moins de `SNAP_M` (`SNAP_M_PHONE` sur téléphone) d'un chemin fixe le départ, sinon « Commence sur un chemin existant. »
    - ensuite : à la souris le fantôme suit le pointeur, au doigt un tap pose l'arrivée ; ruban vert ou rouge (demi-transparent, suit le relief), panneau « 12 m · 36 pièces » ou la raison de `checkSegment` ; **Valider** pose et repart du bout ; **Terminer** (ou Échap) ferme. Un glisser (> 6 px) tourne la caméra et ne pose rien.
  - Le picker est « occupé » quand l'un des deux éditeurs est actif.
  - Fiche d'une zone ouverte : bouton « Tracer un chemin » (icône existante la plus proche, sinon une nouvelle icône dans `icons.ts`).

- [ ] **Step 1 : tests qui échouent** : `snapEnd` accroche le chemin le plus proche à moins de `snap`, arrondit au demi-mètre sinon, n'accroche jamais `start` lui-même.
- [ ] **Step 2 :** `npx vitest run tests/scene` → échec attendu.
- [ ] **Step 3 :** implémenter vue, éditeur, branchements dans `main.ts` (`pathsView.update` dans la boucle comme `parkView`).
- [ ] **Step 4 :** `npx vitest run` et `npm run build` → verts.
- [ ] **Step 5 :** commit `V2-1 tâche 4 : chemins construits en 3D et éditeur de tracé`.

### Tâche 5 : Fiches — chemin, enclos non relié — agent · **Sonnet**

**Files :**
- Modify : `src/scene/picking.ts`, `src/ui/bottomBar.ts`, `src/main.ts`, `src/style.css`
- Test : `tests/ui/` (texte d'avertissement pur, si extrait dans un petit modèle)

**Interfaces :**
- Consumes : `segmentAt`, `removalImpact`, `linkPlan`, `isLinked`, actions `detruireChemin` / `relierEnclos`, `pathEditor.start`, `confirmGuard`.
- Produces :
  - `Pick` gagne `{ kind: 'chemin'; id: number; point: PathPoint }` ; le picker essaie objets → chemin (`segmentAt`, tolérance `WIDTH_M / 2 + 0.3`) → zone.
  - `pathWarning(state, id): string` (pure, `src/ui/pathModel.ts`) — « Non remboursé. » ou « Non remboursé. 2 enclos ne seront plus visités : Moutons, Cochons. » (nom de l'espèce, « Enclos vide » sinon).
  - Fiche d'un chemin : « Chemin · 12 m » (ou « Chemin de l'entrée » sans Détruire) ; **Prolonger** (`pathEditor.start(point)`) ; **Détruire** en deux clics avec `pathWarning` au premier.
  - Fiche d'un enclos non relié : texte rouge « Pas de chemin : les visiteurs ne le voient pas » ; bouton **Relier (N pièces)** si `linkPlan` existe, sinon **Tracer un chemin** ; même ligne rouge dans le volet Détails de l'enclos.

- [ ] **Step 1 : tests qui échouent** : `pathWarning` pour 0, 1 et 2 enclos coupés.
- [ ] **Step 2 :** lancer → échec attendu.
- [ ] **Step 3 :** implémenter.
- [ ] **Step 4 :** `npx vitest run` et `npm run build` → verts.
- [ ] **Step 5 :** commit `V2-1 tâche 5 : fiches du chemin et de l'enclos non relié`.

### Tâche 6 : Promeneurs sur le réseau réel — agent · **Sonnet**

**Files :**
- Create : `src/scene/pathGraph.ts`, `tests/scene/pathGraph.test.ts`
- Modify : `src/scene/visitorRoutes.ts`, `src/scene/visitorsView.ts`, `src/data/visuals.ts`, `tests/scene/visitorRoutes.test.ts`

**Interfaces :**
- Consumes : `allSegments`, `reachableIds`, `linkedEnclosureIds`, `cafeRoute`, `bridgeX`.
- Produces :
  - `buildPathGraph(segs: { a: PathPoint; b: PathPoint }[], extra: PathPoint[]): PathGraph` — coupe les segments aux croisements, aux départs en milieu de segment et aux points `extra` (projetés sur leur segment le plus proche) ; `PathGraph = { nodes: PathPoint[]; edges: { to: number; len: number }[][]; nodeAt(p: PathPoint): number }`
  - `shortestPath(g: PathGraph, from: number, to: number): number[]` (Dijkstra ; `[]` si inaccessible)
  - `networkRoute(state: GameState, bx: number, rng: () => number): RoutePoint[]` — entrée → jusqu'à `WALK_ROUTE.MAX_STOPS = 4` arrêts tirés au hasard parmi les enclos occupés **et reliés** (arrêt = point du réseau le plus proche du centre de l'enclos, `faceX/faceZ` = centre), dans l'ordre du plus proche → bout de l'allée → pont → village/café comme aujourd'hui → retour par le même chemin. Remplace `alleyStops` + `buildRoute` ; `WALKERS.STOP_MAX_GAP` disparaît s'il n'a plus d'usage.
  - Chaque promeneur reçoit son propre trajet au départ (les visites varient d'un promeneur à l'autre).

- [ ] **Step 1 : tests qui échouent**
  - `croisement` : deux segments en X → 5 nœuds, chemin le plus court passe par le croisement.
  - `inaccessible` : segment isolé → `shortestPath` = `[]`.
  - `networkRoute` : avec un enclos relié par un embranchement, le trajet passe par l'embranchement et s'arrête face à l'enclos ; un enclos non relié n'a jamais d'arrêt ; le trajet commence et finit à `ROUTE_START_X`.
- [ ] **Step 2 :** lancer → échecs attendus.
- [ ] **Step 3 :** implémenter.
- [ ] **Step 4 :** `npx vitest run` et `npm run build` → verts.
- [ ] **Step 5 :** commit `V2-1 tâche 6 : promeneurs sur les chemins construits`.

### Tâche 7 : Vérification d'ensemble, relecture et publication — chef (**Opus**) + relecture · **Opus**

- [ ] Navigateur (`?heure=14`) : nouvelle partie (chemin des moutons, allée), tracé valide / chacune des raisons rouges, enchaînement de segments, Relier, Détruire avec avertissement, attrait qui baisse puis remonte, niveaux 1 → 3 (terre, gravier, pavés + lanternes), promeneurs sur un embranchement, téléphone 375 × 812 (taps seulement).
- [ ] Ancienne partie : charger une sauvegarde v3 (copie de type « partie de Romain » avec enclos loin de l'allée) → chemins offerts, message unique.
- [ ] Relecture indépendante Opus de toute la branche ; corrections par un agent Sonnet (Opus si subtil).
- [ ] `progress.md` à jour ; fusion dans `main` **seulement avec l'accord de Romain** ; vérification en ligne.
