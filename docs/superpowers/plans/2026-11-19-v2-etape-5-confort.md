# V2 — Étape 5 : confort, décoration, déchets, satisfaction, animateur — plan de construction

> **Votes de Romain (19/11/2026)** — **D10 changée : une vraie fontaine en modèle CC-BY**, auteur cité dans `CREDITS.md` et l'écran de crédits (même exception que les 4 grands animaux de l'étape 6). Ajouter à la sous-tâche chef des modèles : chercher un modèle de fontaine low-poly CC-BY (ou CC0 s'il en apparaît un), le faire télécharger par Romain. Les autres décisions sont acceptées telles que proposées. Ordre des étapes : l'écran de crédits peut donc arriver dès cette étape (sinon à l'étape 6).

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal :** le joueur pose librement des objets (bancs, poubelles, toilettes, kiosque à boissons, fleurs, arbres, puits, lampadaires, statues) le long des chemins ; chacun sert la portion de chemin qui l'entoure. Les visiteurs salissent les chemins, les déchets se voient et se ramassent d'un clic (ou par l'agent d'entretien). Une jauge de **satisfaction** (icône dans la barre du haut) fait monter ou baisser la réputation, donc les visiteurs. L'**animateur** devient embauchable.

**Architecture :** l'état gagne `decor`, `waste` et `comfort` (sauvegarde **v8**). Tout est pur dans `src/sim/decor.ts` (pose, portée, déplacer, revendre) et `src/sim/comfort.ts` (satisfaction, déchets, agent, animateur) ; les chiffres et le catalogue sont dans `src/data/comfort.ts`. La portée se calcule sur des **points d'échantillon** des chemins reliés, mis en mémoire (une seule entrée, comme `linkedEnclosureIds`). La 3D (`decorView`, `wasteView`, `decorEditor`) et l'interface ne font que lire l'état ; les actions passent par `applyAction`.

**Tech Stack :** TypeScript, Three.js, Vitest (`export PATH="/c/Program Files/nodejs:$PATH"; npx vitest run`), `npm run build`.

**Spec :** `docs/superpowers/specs/2026-11-19-parc-de-clairbois-v2-design.md` §7 (confort), §4 (agent d'entretien, animateur), §12 « Étape 5 » et la note sur les modèles de déco (§12, dernier point) ; §1 contraintes.

**Branche :** `etape-v2-5-confort`, créée depuis `main` **après** la fusion de l'étape 4.

## Ce qu'on attend des étapes 1 à 4 (à revérifier au lancement)

Ce plan est écrit le 19/11/2026, pendant la construction de l'étape 1 (tâches 1 à 3 faites, tâche 4 en cours sur `etape-v2-1-chemins`) ; les étapes 2 à 4 ne sont que des plans. **Avant la tâche 1, le chef relit `main` et corrige ce plan** si un nom a changé ; un agent qui trouve un autre nom dans le code prend celui du code et le note dans son compte rendu.

| Étape | Ce que ce plan utilise | Où |
|---|---|---|
| 1 — Chemins (code vu) | `GameState.paths: PathSegment[]`, `PathPoint { x; z }` ; `src/sim/paths.ts` : `allSegments`, `reachableIds`, `pointSegmentDistance`, `closestPoint`, `rectSegmentDistance`, `nearestOnNetwork`, `checkSegment` (6 refus dans l'ordre), `removalImpact` ; `src/data/paths.ts` : `PATHS_TUNING.WIDTH_M = 2.2`, `PATH_AREA = { x: -34, z: -24, w: 30, d: 48 }`, `ENTRANCE_PATH` (x −36 → pont, z = 10) ; `visibleAnimals` ; `LoadResult.fromVersion` et le modèle `giftPaths` → `pathsNotice` de `startSession` ; `createPathEditor` (fantôme vert/rouge au tap, panneau, Valider/Terminer) ; `Pick` gagne `{ kind: 'chemin' }` ; `networkRoute` (tâche 6 de l'étape 1) | tâches 2, 3, 4, 7 |
| 2 — Personnel | `GameState.staff.employees: Employee[]`, `Employee { id; name; job: JobId; xpH; hiredAt; encIds }` ; `employeeLevel`, `efficiency(state)` (0,5 en dette), `JOBS.animateur = { 'Animateur', open: false, wage: 60 }`, `CANDIDATE_JOBS`, `staffCap`, `debtRefusal(state)` ; `STAFF_WALKERS.MODEL.animateur = 'promeneurCasual2'`, `staffRoute(state, e)` ; `coverAllUntil` et sa règle « pas décalé par `shiftDates` » (modèle de `neutralUntil` ici) ; le joueur automatique embauche | tâches 3, 4, 7 |
| 3 — Maladies | `CURRENT_VERSION = 6` ; emplacement 7 = centre vétérinaire ; `wellKeptPark()` dans `tests/sim/helpers.ts` | tâche 4 |
| 4 — Ferme | `CURRENT_VERSION = 7` ; `farmStep` avant `feedStep` ; `CANDIDATE_JOBS` contient déjà `['fermier', 0.2]` ; `Pick` gagne `{ kind: 'parcelle' }` ; `decor.ts` (décor du monde) refuse les arbres sur les champs | tâches 1, 3, 7 |
| 7 — Trophées (plan écrit) | attend de cette étape : `GameState.decor: DecorItem[]` (`{ id; kind; x; z }`), `GameState.waste`, actions `poserDeco`, `deplacerDeco`, `vendreDeco`, `ramasserDechets`, `checkDecorPlacement`, `satisfaction(state): number` (0..1), compteurs `dechets`, `dechetsMain`, `decorsPoses`, `visitesGuidees`. **Ce plan reprend ces noms.** | tous |

**Version :** cette étape fait `CURRENT_VERSION + 1` (**8** attendu) ; migration indexée par l'ancienne version (`MIGRATIONS[7]`). Si les étapes 2 à 4 ont fini sur une autre version, décaler d'autant.

## Global Constraints

- Règles pures et testées dans `src/sim/`, chiffres et catalogue dans `src/data/`, aucune logique dans `src/data/`.
- Le temps n'avance que par `advanceTo` (pas de 10 min) ; une action renvoie un nouvel état (`structuredClone`) ou un refus en français affichable tel quel.
- Sauvegarde versionnée v7 → v8, migration écrite en clair ; **la partie de Romain continue sans perte brutale** (pas de chute de réputation due à la mise à jour).
- « Objets à poser librement sur la carte ; bancs, poubelles, toilettes et kiosques doivent **toucher un chemin** pour servir. »
- « Chaque objet agit **autour de lui** (sert une portion de chemin, ordre d'idée un banc tous les 20 m). »
- « **Déchets visibles sur la carte**, ramassés d'un clic ou par l'agent d'entretien. » « Des chemins sales font baisser la satisfaction. »
- « Satisfaction affichée par une **icône dans la barre du haut** (visage + %), détail au clic (confort, propreté, déco, ce qui manque). »
- « Objets **déplaçables gratuitement**, **revendables à moitié prix**. »
- Animateur : « visites guidées, bonus de visiteurs et de satisfaction ».
- Un parc bien tenu tient **3 jours** sans le joueur ; 30 jours d'absence d'un grand parc rattrapés en **< 2 s** (`tests/sim/perf.test.ts`).
- Modèles 3D CC0 (Quaternius) ; une exception CC-BY seulement si Romain la choisit (D10).
- Téléphone et ordinateur : tout au tap (pas de glisser obligatoire), boutons ≥ 44 px, lisible en 375 × 812.
- Textes du jeu en français simple, tutoiement.

## Décisions du chef (à valider par Romain avec le plan)

- **D1 — Catalogue** (prix, niveau du village requis, rayon d'encombrement, effet) :

  | Objet | `kind` | Prix | Niveau | Rayon | Effet |
  |---|---|---|---|---|---|
  | Banc | `banc` | 40 | 1 | 0,9 m | confort sur 10 m autour ; les visiteurs dépensent plus au village |
  | Poubelle | `poubelle` | 30 | 1 | 0,4 m | sur 8 m autour, 85 % des déchets finissent dedans |
  | Toilettes | `toilettes` | 250 | 1 | 1,2 m | 40 visiteurs/h chacune |
  | Fleurs | `fleurs` | 20 | 1 | 0,6 m | déco 1 point |
  | Arbre | `arbre` | 35 | 1 | 1,2 m | déco 1,5 point |
  | Kiosque à boissons | `buvette` | 400 | 2 | 1,5 m | 10 % des visiteurs (au plus 15/h) dépensent 1,5 pièce ; +0,05 de satisfaction (une seule compte) |
  | Lampadaire | `lampadaire` | 60 | 2 | 0,3 m | déco 0,5 point, allumé la nuit |
  | Puits | `puits` | 300 | 3 | 1,2 m | déco 3 points (remplace la fontaine, D10) |
  | Statue | `statue` | 500 | 3 | 0,9 m | déco 3 points |

  Un objet **sert** s'il touche un chemin relié à l'entrée : son centre est à moins de `WIDTH_M / 2 + rayon + 1 m` d'un segment atteignable. Un objet qui ne touche rien se pose quand même (pur décor), mais ne compte pas, et le jeu le dit.
- **D2 — Satisfaction** (0 à 1, affichée en %) = 0,55 + 0,15 × part du chemin couverte par un banc + 0,15 × déco + 0,05 × kiosque + 0,05 par animateur (2 au plus) − 0,20 × manque de toilettes − 0,25 × saleté, bornée entre 0 et 1.
  - **déco** = min(1, points des objets qui servent ÷ (longueur des chemins reliés ÷ 10 m)) : un massif de fleurs tous les 10 m suffit ;
  - **toilettes** : besoin = visiteurs/h − 10 (rien sous 10/h) ; manque = 1 − min(1, toilettes qui servent × 40 ÷ besoin) ;
  - **saleté** = min(1, déchets ÷ max(3, longueur des chemins reliés ÷ 15 m)).
  Un parc neuf, propre, sans rien : 55 %. Tout bien fait : 100 %.
- **D3 — Effet sur les visiteurs.** La réputation (0 à 1) tend vers `min(1, satisfaction ÷ 0,5)` : elle monte de 0,01/h jusque-là, ou descend de 0,01/h ; le billet trop cher la fait toujours baisser comme en V1. Au-dessus de 50 %, la satisfaction ajoute du **bouche-à-oreille** : visiteurs × (1 + 0,3 × (satisfaction − 0,5) ÷ 0,5), soit +30 % au plus. À 55 % sans rien poser, on garde donc le rythme de la V1.
- **D4 — Déchets.** Les visiteurs en laissent 0,03 par visiteur (50 visiteurs/h → 1,5 par heure), à un point tiré au hasard sur les chemins reliés ; dans la portée d'une poubelle, 85 % sont évités. Au plus **60** déchets sur la carte. Un tap ramasse le déchet touché **et ceux à moins de 3 m** (plus facile au téléphone). Gratuit, aucune pièce.
- **D5 — Agent d'entretien.** En plus des enclos (étape 2), chaque agent ramasse **6 / 8 / 10 / 12 / 14 déchets par heure** selon son niveau, × efficacité (0,5 en dette), les plus anciens d'abord, où qu'ils soient.
- **D6 — Animateur.** Le métier s'ouvre (`JOBS.animateur.open = true`, `['animateur', 0.15]` dans `CANDIDATE_JOBS`, les autres poids réduits au prorata). Chacun des 2 premiers animateurs fait des visites guidées tant qu'au moins un enclos est relié : visiteurs × (1 + 0,08 / 0,09 / 0,10 / 0,11 / 0,12 selon son niveau, × efficacité) et +0,05 de satisfaction ; il compte 1 visite guidée par heure (compteur `visitesGuidees`). Un 3ᵉ animateur est payé mais n'ajoute rien (dit dans sa fiche). Sur la carte, il marche sur le trajet des promeneurs (`networkRoute`).
- **D7 — Bancs et village.** Les recettes des commerces du village sont × (1 + 0,2 × part du chemin couverte par un banc).
- **D8 — Pose.** Côté zoo seulement (même zone que les chemins, `PATH_AREA` + allée de l'entrée), jamais dans un enclos, sur un chemin, sous la brume ou sur un autre objet. L'objet se tourne seul face au chemin le plus proche. Un enclos ou un chemin ne peut pas être posé sur un objet. **Déplacer** est gratuit (mêmes règles) ; **Vendre** rend la moitié du prix (arrondi en dessous), en deux clics.
- **D9 — Kit de départ.** Nouvelle partie **et** ancienne partie : Margaux offre **1 banc, 1 poubelle et 1 toilettes**, posés le long de l'allée de l'entrée au premier endroit libre (recherche pure). Ancienne partie : comme pour Léa à l'étape 2, l'absence d'avant la mise à jour se rejoue **avec les règles d'avant** (pas de déchets, réputation V1) ; les nouvelles règles s'appliquent dès le retour du joueur. Message unique à l'ouverture.
- **D10 — Fontaine.** Aucune fontaine CC0 : on prend le **puits** du Medieval Village Pack, **déjà dans le jeu** (`MODELS.puits`), sans téléchargement. *Autre choix : une fontaine CC-BY (auteur cité dans `CREDITS.md` et l'écran de crédits), comme l'exception des 4 animaux de l'étape 6.*
- **D11 — Modèles.** Déjà présents : banc (`banc`, `banc2`), puits, fleurs (`fleurs`), arbres (`arbre1–3`). **À télécharger par Romain** (Poly Pizza, Quaternius, CC0 vérifié sur chaque page par le chef) : poubelle https://poly.pizza/m/i7HDuYDLkx, lampadaire https://poly.pizza/m/nFwrlcLvM5, stand pour le kiosque https://poly.pizza/m/DGIM5HGISb, cabane pour les toilettes https://poly.pizza/m/wxi3kAu5ey, et en option d'autres fleurs https://poly.pizza/m/U1ymDy8tbY et le banc https://poly.pizza/m/jLxjFxFRpw (si l'allure est meilleure que `Bench_1`). **Statue** : pas de lien ; proposition : le modèle d'un animal du parc (cerf), en pierre grise, sur un socle fait en Three.js (le trophée d'or de l'étape 7 fera la même chose en doré).
- **D12 — Missions et Gazette.** Aucune nouvelle mission (les quotidiennes « ramasser », « décorer », « satisfaction » arrivent à l'étape 7). Gazette : deux lignes seulement (« Tes agents ont ramassé N déchets. », « Satisfaction des visiteurs : 72 %. ») ; la rubrique « Propreté » complète est à l'étape 7.

## Review Focus

1. **Objet coupé du réseau** : on détruit le chemin qu'il touche, ou on déplace l'objet loin des chemins → il ne compte plus aussitôt (pas de valeur gardée en cache), sa fiche le dit ; les déchets restés sur un chemin détruit disparaissent (tests en tâches 2 et 3).
2. **Chevauchements croisés** : poser un enclos, en agrandir un, tracer un chemin sur un objet → refusé avec la raison ; déplacer un objet sur lui-même (même endroit) → accepté (tests en tâche 2).
3. **Longue absence** : 30 jours, grand parc, 40 objets → jamais plus de 60 déchets, réputation dans [0, 1], perfs sous le seuil ; une partie sans chemin relié ne fait ni déchet ni visite guidée et ne plante pas (tests en tâches 3 et 4).
4. **Ancienne partie** (beaucoup de visiteurs, aucune toilette) : la réputation ne chute pas pendant le rattrapage d'avant la mise à jour ; le kit est offert **une seule fois** ; si l'allée est bordée d'enclos, le kit se pose plus loin ou en partie, le message dit ce qui a été posé (tests en tâche 4).
5. **Tap sur un déchet au téléphone** : il est touchable (cible plus grande que le modèle), le tap ramasse au lieu de sélectionner l'enclos dessous ; pendant la pose d'un objet, un tap ne ramasse rien (vérification en tâches 7 et 9).

---

### Task 1: État v8, catalogue et chiffres du confort — agent · **Sonnet**

**Files :**
- Create : `src/data/comfort.ts`, `tests/data/comfort.test.ts`
- Modify : `src/sim/types.ts`, `src/sim/stats.ts`, `src/sim/newGame.ts`, `src/sim/advance.ts` (`shiftDates`), `src/save/migrations.ts`, `src/save/save.ts` (`looksLikeGame`), `tests/sim/helpers.ts`, `tests/save/migrations.test.ts`, `tests/save/save-robustness.test.ts`, `tests/sim/newGame.test.ts`, tout `version: 7` restant dans `src/` et `tests/`

**Interfaces :**
- Produces (`src/sim/types.ts`) :
  - `export type DecorKind = 'banc' | 'poubelle' | 'toilettes' | 'fleurs' | 'arbre' | 'buvette' | 'lampadaire' | 'puits' | 'statue'`
  - `export interface DecorItem { id: number; kind: DecorKind; x: number; z: number; rot: number }`
  - `export interface Waste { id: number; x: number; z: number; since: number }`
  - `export interface Comfort { neutralUntil: number; wasteCarry: number; pickCarry: number }` — `neutralUntil` : jusqu'à cette heure, règles d'avant (D9) ; les deux `Carry` gardent les fractions entre deux pas
  - `GameState.version: 8`, `decor: DecorItem[]`, `waste: Waste[]`, `comfort: Comfort`
  - `StatKey` gagne `'dechets' | 'dechetsMain' | 'decorsPoses' | 'visitesGuidees'`
- Produces (`src/data/comfort.ts`) :
  - `DECOR: Record<DecorKind, { name: string; withArticle: string; price: number; unlockLevel: 1 | 2 | 3; radius: number; rangeM?: number; decoPoints?: number; model: ModelKey | null }>` — valeurs de D1 ; `rangeM` : banc 10, poubelle 8 ; `model` des objets à télécharger = `null` jusqu'à la tâche 6
  - `DECOR_ORDER: DecorKind[]` (ordre du catalogue : D1)
  - `COMFORT_TUNING = { TOUCH_EXTRA_M: 1, SAMPLE_M: 1, BASE: 0.55, BENCH_W: 0.15, DECO_W: 0.15, DECO_PER_M: 10, BUVETTE_W: 0.05, ANIMATOR_W: 0.05, ANIMATOR_MAX: 2, ANIMATOR_VISITOR_BONUS: [0.08, 0.09, 0.1, 0.11, 0.12], TOILET_FREE_VISITORS_H: 10, TOILET_VISITORS_H: 40, TOILET_W: 0.2, DIRT_W: 0.25, DIRT_TOLERANCE_M: 15, DIRT_MIN: 3, REP_FULL_AT: 0.5, REP_MOVE_PER_H: 0.01, WORD_OF_MOUTH_MAX: 0.3, BENCH_SPEND_BONUS: 0.2, WASTE_PER_VISITOR: 0.03, BIN_CATCH: 0.85, MAX_WASTE: 60, PICK_RADIUS_M: 3, CLEANER_WASTE_PER_H: [6, 8, 10, 12, 14], BUVETTE_SHARE: 0.1, BUVETTE_MAX_CLIENTS_H: 15, BUVETTE_SPEND: 1.5, SELL_RATIO: 0.5 }`
  - `START_KIT: DecorKind[] = ['banc', 'poubelle', 'toilettes']`
- Migration : `7: (old) => ({ ...old, version: 8, decor: [], waste: [], comfort: { neutralUntil: 0, wasteCarry: 0, pickCarry: 0 }, stats: { ...old.stats, counts: { ...old.stats.counts, dechets: 0, dechetsMain: 0, decorsPoses: 0, visitesGuidees: 0 } } })`
- `newGame` : `decor: []` (le kit arrive en tâche 4), `waste: []`, `comfort` à zéro.
- `emptyState` (tests) : `version: 8`, `decor: []`, `waste: []`, `comfort: { neutralUntil: Number.MAX_SAFE_INTEGER, wasteCarry: 0, pickCarry: 0 }` avec le commentaire « les anciens tests gardent les règles d'avant ; un test du confort met `neutralUntil: 0` ».
- `shiftDates` décale `waste[].since`, **pas** `neutralUntil`.

- [ ] **Step 1 : tests qui échouent**
  - `tests/data/comfort.test.ts` : 9 objets, chacun dans `DECOR_ORDER` une fois ; prix > 0 ; `rangeM` défini pour banc (10) et poubelle (8) ; `decoPoints` = fleurs 1, arbre 1,5, lampadaire 0,5, puits 3, statue 3 ; `SELL_RATIO` 0,5.
  - `migrations.test.ts` : `MIGRATIONS[7]` → `version: 8`, champs ci-dessus, garde tout le reste (dont `paths`, `staff`, `farm`).
  - `save-robustness.test.ts` : une v8 sans `decor`, avec `kind: 'fusee'`, `x: 'a'`, un id en double, un `waste[].since` non fini ou `comfort.neutralUntil: NaN` est illisible ; une v7 valide se charge en v8.
  - `newGame.test.ts` : `version: 8`, `waste: []`, `comfort.neutralUntil: 0`.
- [ ] **Step 2 :** `npx vitest run tests/data/comfort.test.ts tests/save tests/sim/newGame.test.ts` → échecs attendus.
- [ ] **Step 3 :** implémenter (types, données, migration, `CURRENT_VERSION = 8`, validation, `STAT_KEYS`, `emptyState`, `shiftDates`).
- [ ] **Step 4 :** `npx vitest run` → tout vert.
- [ ] **Step 5 :** commit `V2-5 tâche 1 : état v8 et catalogue du confort`.

### Task 2: Pose, portée, déplacer, revendre (règles) — agent · **Sonnet**

**Files :**
- Create : `src/sim/decor.ts`, `tests/sim/decor.test.ts`
- Modify : `src/sim/actions.ts`, `src/sim/placement.ts`, `src/sim/paths.ts` (`checkSegment`, `detruireChemin`)
- Test : `tests/sim/decor.test.ts`, `tests/sim/placement.test.ts`, `tests/sim/paths.test.ts`

**Interfaces :**
- Consumes : tâche 1 ; `allSegments`, `reachableIds`, `pointSegmentDistance`, `closestPoint`, `rectSegmentDistance`, `PATHS_TUNING`, `PATH_AREA`, `ENTRANCE_PATH`, zones (`unlockLevel`), `debtRefusal` (étape 2).
- Produces (`src/sim/decor.ts`) :
  - `touchesPath(state: GameState, kind: DecorKind, x: number, z: number): boolean` — D1, segments **atteignables** seulement
  - `facingRot(state, x, z): number` — angle (rad, autour de y) qui tourne la face +Z vers le point le plus proche du réseau ; 0 sans chemin
  - `type DecorCheck = { ok: true; cost: number; serves: boolean } | { ok: false; reason: string; cost: number }`
  - `checkDecorPlacement(state, kind, x, z, opts?: { movingId?: number }): DecorCheck` — contrôles **dans cet ordre**, textes exacts :
    1. niveau du village < `unlockLevel` → « Il faut un village de niveau N. » (sauf déplacement)
    2. x > −4 → « La rivière ne se traverse que par le pont. » ; hors `PATH_AREA` et hors allée (x de −36 à −34, |z − 10| ≤ 4) → « Hors du parc. »
    3. zone dont `unlockLevel > village.level` → « Cette zone est encore sous la brume. »
    4. dans un enclos (`rectSegmentDistance` d'un segment nul (x, z)→(x, z) < `radius`) → « Il est dans un enclos. »
    5. à moins de `WIDTH_M / 2 + radius` d'un segment (entrée comprise) → « Il est sur le chemin. »
    6. à moins de `r1 + r2` d'un autre objet (sauf `movingId`) → « Trop près d'un autre objet. »
    7. pièces < prix (sauf déplacement) → « Pas assez de pièces (il en faut N). »
    `cost` = prix (0 pour un déplacement) ; `serves` = `touchesPath`.
  - `pathSamples(state): { x: number; z: number }[]` — points tous les `SAMPLE_M` sur les segments atteignables (bouts compris), **mémoire d'une entrée** clé = segments + niveau
  - `coverage(state): { lengthM: number; bench: number; bin: number; decoPoints: number; toilets: number; buvettes: number }` — `bench` / `bin` = part des échantillons à moins de `rangeM` d'un banc / d'une poubelle **qui sert** ; mémoire d'une entrée, clé = segments + objets (pas de cache par identité d'objet)
  - `findKitSpot(state, kind): { x: number; z: number } | null` — le long de `ENTRANCE_PATH`, de l'entrée vers le pont tous les 1 m, des deux côtés à `WIDTH_M / 2 + radius + 0.3`, premier point où `checkDecorPlacement` (sans le contrôle des pièces) est `ok` ; puis même recherche le long des segments construits ; sinon `null`
  - `placeKit(state): DecorKind[]` (en place) — pose `START_KIT` gratuitement (sans compter `decorsPoses`) et renvoie ce qui a été posé
- Produces (actions) :
  - `{ type: 'poserDeco'; kind: DecorKind; x: number; z: number }` — `debtRefusal` d'abord ; puis `checkDecorPlacement` ; ajoute `{ id: nextId++, kind, x, z, rot: facingRot }`, débite, `bump(stats, 'decorsPoses')`
  - `{ type: 'deplacerDeco'; id: number; x: number; z: number }` — « Introuvable. » ; `checkDecorPlacement` avec `movingId` ; gratuit, même en dette ; `rot` recalculé
  - `{ type: 'vendreDeco'; id: number }` — « Introuvable. » ; rend `Math.floor(price × SELL_RATIO)`
- `checkPlacement` (enclos) refuse « Il chevauche un objet. » si un objet est à moins de son `radius` du rectangle ; `checkSegment` gagne un 7ᵉ contrôle après « Il traverse un enclos. » : « Il passe sur un objet. » (objet à moins de `WIDTH_M / 2 + radius` du segment).
- `detruireChemin` retire aussi les déchets à plus de `WIDTH_M / 2 + 0,5 m` de tout segment atteignable restant.

- [ ] **Step 1 : tests qui échouent** (`tests/sim/decor.test.ts`, petit parc avec l'allée et un segment construit)
  - Un test par refus de `checkDecorPlacement` avec son texte exact ; poser un banc à 2 m du bord du chemin → −40 pièces, `decorsPoses` +1, `rot` face au chemin (à 1e-6 près).
  - `sert / ne sert pas` : banc collé au chemin `serves: true` ; à 6 m → posé mais `serves: false` ; à côté d'un segment isolé (non relié) → `false`.
  - `portée` : chemin droit de 40 m, un banc au milieu → `coverage.bench` ≈ 0,5 (±0,05) ; deux bancs à 10 et 30 m → ≈ 1.
  - `cache à jour` (Review 1) : déplacer le banc loin du chemin → `bench` tombe à 0 ; détruire le chemin qu'il touche → `serves` faux.
  - `déplacer` : gratuit ; vers un enclos refusé « Il est dans un enclos. » ; vers sa propre place accepté ; en dette accepté.
  - `vendre` : statue (500) → +250 ; poubelle (30) → +15 ; id inconnu → « Introuvable. ».
  - Chevauchements (Review 2) : enclos posé ou agrandi sur un banc → « Il chevauche un objet. » ; chemin tracé sur une poubelle → « Il passe sur un objet. ».
  - `déchets d'un chemin détruit` : 3 déchets sur un segment, `detruireChemin` → retirés ; ceux de l'allée restent.
  - `findKitSpot` / `placeKit` : nouvelle partie → les 3 objets posés le long de l'allée, tous `serves` ; allée bordée d'enclos de chaque côté → posés plus loin ou `null` sans erreur.
- [ ] **Step 2 :** `npx vitest run tests/sim` → échecs attendus.
- [ ] **Step 3 :** implémenter.
- [ ] **Step 4 :** `npx vitest run` → tout vert.
- [ ] **Step 5 :** commit `V2-5 tâche 2 : poser, déplacer et revendre les objets, portée le long des chemins`.

### Task 3: Satisfaction, déchets, agent, animateur, réputation (règles) — agent · **Sonnet**

**Files :**
- Create : `src/sim/comfort.ts`, `tests/sim/comfort.test.ts`
- Modify : `src/sim/economy.ts`, `src/sim/advance.ts` (ordre des pas), `src/sim/actions.ts`, `src/sim/types.ts` (événements), `src/data/staff.ts` (animateur ouvert), `src/data/missions.ts` (`ParkPace`)
- Test : `tests/sim/comfort.test.ts`, `tests/sim/economy.test.ts`, `tests/sim/staff.test.ts`

**Interfaces :**
- Consumes : tâche 2 (`coverage`, `pathSamples`) ; étape 2 (`employeeLevel`, `efficiency`, `JOBS`, `CANDIDATE_JOBS`) ; `random`, `chanceOver` (`src/sim/random.ts`) ; `linkedEnclosureIds`.
- Produces (`src/sim/comfort.ts`) :
  - `rawVisitorsPerHour(state, price?): number` — la formule actuelle de `visitorsPerHour`, **sans** bouche-à-oreille ni animateur (sert à la satisfaction : pas de boucle)
  - `activeAnimators(state): Employee[]` — les `ANIMATOR_MAX` premiers animateurs (id croissant), vide si aucun enclos relié
  - `satisfactionParts(state): { base: number; bancs: number; deco: number; buvette: number; animation: number; toilettes: number; proprete: number; total: number }` — D2 ; `toilettes` et `proprete` sont négatifs ou nuls
  - `satisfaction(state): number` = `satisfactionParts(state).total`
  - `comfortActive(state): boolean` = `state.time > state.comfort.neutralUntil`
  - `visitorFactor(state): number` — 1 si `!comfortActive` ; sinon (1 + bouche-à-oreille D3) × Π(1 + bonus de chaque animateur actif × `efficiency`)
  - `buvetteIncomePerHour(state): number` — D1 (une seule buvette qui sert compte pour la satisfaction ; chacune rapporte)
  - `comfortStep(state, events): void` — si `!comfortActive` : rien. Sinon, dans cet ordre :
    1. déchets : `wasteCarry += rawVisitors × WASTE_PER_VISITOR × h` ; tant que ≥ 1 : `wasteCarry -= 1`, point au hasard dans `pathSamples` ; s'il est dans la portée d'une poubelle qui sert, jeté à `BIN_CATCH` ; sinon ajouté si `waste.length < MAX_WASTE` (`since = time`)
    2. agents : `pickCarry += Σ CLEANER_WASTE_PER_H[niveau − 1] × efficiency × h` ; retire les plus anciens tant que `pickCarry ≥ 1` et qu'il reste des déchets (sinon `pickCarry = 0`) ; `bump('dechets')` par déchet ; événement `{ kind: 'dechetsRamasses'; at; n; byPlayer: false }` si n > 0
    3. animateurs : `bump('visitesGuidees', activeAnimators.length × h)`
  - `pickWaste(state, id): ActionResult` — action `{ type: 'ramasserDechets'; id: number }` : « Introuvable. » ; retire le déchet et ceux à moins de `PICK_RADIUS_M` ; `bump('dechets', n)` et `bump('dechetsMain', n)` ; ni pièce ni refus en dette
- Modify (`src/sim/economy.ts`) :
  - `visitorsPerHour` = `rawVisitorsPerHour × visitorFactor`
  - `incomePerHour.village` × (1 + `BENCH_SPEND_BONUS × coverage.bench`) si `comfortActive`, + `buvetteIncomePerHour`
  - réputation dans `economyStep` : billet trop cher → comme V1 ; sinon si `!comfortActive` → V1 (+`REPUTATION_GAIN_PER_H`) ; sinon tend vers `min(1, satisfaction ÷ REP_FULL_AT)` à `REP_MOVE_PER_H`, sans dépasser la cible
  - `ParkPace` gagne `wastePerDay: number` et `satisfactionPct: number` (attendus par l'étape 7)
- `step()` : `comfortStep` juste après `economyStep`.
- `JOBS.animateur.open = true` ; `['animateur', 0.15]` dans `CANDIDATE_JOBS`, les autres poids × 0,85.

- [ ] **Step 1 : tests qui échouent** (`tests/sim/comfort.test.ts`, `neutralUntil: 0`)
  - `parc neuf` : chemins reliés, aucun objet, aucun déchet, 5 visiteurs/h → `satisfaction` = 0,55.
  - `toilettes` : 50 visiteurs/h sans toilette → part `toilettes` = −0,2 ; 50/h + 1 toilette qui sert → 0 ; 90/h + 1 toilette → −0,1 ; 1 toilette qui ne touche pas de chemin compte pour 0.
  - `saleté` : 60 m de chemin (tolérance 4), 2 déchets → −0,125 ; 10 déchets → −0,25.
  - `déco` : 30 m de chemin, 3 fleurs qui servent → `deco` = 0,15 ; les mêmes à 6 m du chemin → 0.
  - `bornes` : tout au mieux → 1 ; tout au pire → ≥ 0.
  - `réputation` : satisfaction 0,3, réputation 1 → après 10 h, 0,9 (cible 0,6) ; satisfaction 0,6 → reste à 1 ; billet à 2 × le prix juste → baisse comme en V1 ; `neutralUntil` dans le futur → règle V1, aucun déchet.
  - `bouche-à-oreille` : satisfaction 1 → `visitorFactor` 1,3 (sans animateur) ; 0,55 → 1,03.
  - `déchets` : 100 visiteurs/h, pas de poubelle, 1 h → 3 déchets (à la graine près : entre 2 et 4) ; tout le chemin dans la portée de poubelles → en moyenne 85 % de moins sur 48 h (graine fixe) ; jamais plus de 60 sur 30 jours (Review 3).
  - `agent` : 10 déchets, un agent niveau 1, 1 h → 4 restent, les plus anciens partis, `dechets` +6, `dechetsMain` inchangé ; en dette → 3 ramassés.
  - `ramasser au clic` : 3 déchets en grappe (< 3 m) et 1 à 10 m → un tap en retire 3, `dechetsMain` +3.
  - `animateur` : un animateur niveau 1 → `visitorFactor` × 1,08 et +0,05 de satisfaction ; 3 animateurs → 2 comptent ; aucun enclos relié → aucun effet, `visitesGuidees` inchangé.
  - `bancs et village` : `coverage.bench` = 1 → recettes du village × 1,2.
  - `buvette` : 100 visiteurs/h, une buvette qui sert → `buvetteIncomePerHour` = min(10, 15) × 1,5 = 15 ; 300 visiteurs/h → 22,5 ; deux buvettes → le double, mais +0,05 de satisfaction seulement.
  - `staff.test.ts` : sur 200 renouvellements (graine fixe), au moins un animateur proposé.
  - `economy.test.ts` : avec `emptyState` (règles d'avant), tous les anciens chiffres inchangés.
- [ ] **Step 2 :** `npx vitest run tests/sim` → échecs attendus.
- [ ] **Step 3 :** implémenter.
- [ ] **Step 4 :** `npx vitest run` → tout vert, `tests/sim/perf.test.ts` compris.
- [ ] **Step 5 :** commit `V2-5 tâche 3 : satisfaction, déchets, agent d'entretien et animateur`.

### Task 4: Kit de départ, ancienne partie, joueur automatique, perfs — agent · **Sonnet**

**Files :**
- Modify : `src/sim/newGame.ts`, `src/game/session.ts`, `src/main.ts` (message), `tests/balance/bot.ts`
- Test : `tests/sim/newGame.test.ts`, `tests/game/session.test.ts`, `tests/sim/absence.test.ts`, `tests/sim/perf.test.ts`, `tests/balance/playthrough.test.ts`

**Interfaces :**
- Consumes : `placeKit`, `findKitSpot`, `satisfaction`, `comfortStep`, `poserDeco` ; modèle `giftFirstKeeper` / `staffNotice` (étape 2).
- Produces :
  - `newGame` appelle `placeKit` après avoir tracé `START_PATH`.
  - `giftComfort(state: GameState, nowMs: number): { state: GameState; placed: DecorKind[] }` — si `decor` est vide : `placeKit`, `comfort.neutralUntil = nowMs`.
  - `Session.comfortNotice: string | null` — si `fromVersion < 8`, **avant** le rattrapage : « Nouveau à Clairbois : le confort des visiteurs ! L'icône en haut montre leur satisfaction : bancs, poubelles, toilettes et décorations la font monter, les déchets la font baisser. Margaux t'offre » + liste (« un banc, une poubelle et des toilettes ») + « , posés le long de l'allée. » ; si rien n'a pu être posé : « Margaux voulait t'offrir un banc, une poubelle et des toilettes, mais l'allée est pleine : pose-les toi-même (ils sont dans ton volet Satisfaction). » + dans ce cas, `coins += prix du kit`.
  - Joueur automatique : à chaque visite, après les chemins, pose des toilettes quand le manque dépasse 0, une poubelle puis un banc quand `coverage.bin` / `bench` < 0,6 (au point libre le plus proche du milieu du plus long tronçon non couvert, recherche comme `findKitSpot`), un agent d'entretien dès 15 déchets, un animateur au niveau Village ; ne pose rien en dette. Le tableau du rapport gagne `satisfaction` et `déchets`.
- [ ] **Step 1 : tests qui échouent**
  - `newGame` : 3 objets posés, tous `serves`, `coins` inchangés par le kit.
  - Session (Review 4) : sauvegarde v7 d'un grand parc (100 visiteurs/h, réputation 1, aucune toilette), sauvegardée 3 jours plus tôt → après `startSession` : kit posé, `comfortNotice` contient « Margaux t'offre », **réputation encore 1** et aucun déchet (rattrapage avec les règles d'avant) ; recharger la partie v8 → `comfortNotice` `null`, toujours 3 objets.
  - `allée pleine` : v7 dont l'allée est bordée d'enclos → message « l'allée est pleine », pièces + prix du kit.
  - `absence.test.ts` : « un parc bien tenu tient 3 jours » reste vert avec les règles du confort actives, toilettes et poubelles suffisantes, 1 agent → satisfaction ≥ 0,5 à la fin, 0 mort, caisse ≥ 0.
  - `perf.test.ts` (Review 3) : `bigPark()` + 40 objets + 2 agents, `neutralUntil: 0`, 30 jours d'absence sous le seuil existant ; un parc sans aucun chemin relié ne plante pas.
  - `playthrough.test.ts` : bornes en vigueur après l'étape 4 inchangées, aucune mort.
- [ ] **Step 2 :** lancer → échecs attendus.
- [ ] **Step 3 :** implémenter. Si une borne du joueur automatique casse, l'agent **ne change pas les chiffres seul** : il rapporte les jours obtenus au chef, qui propose un réglage à Romain.
- [ ] **Step 4 :** `npx vitest run` → tout vert ; noter le rythme (avant / après) dans le compte rendu.
- [ ] **Step 5 :** commit `V2-5 tâche 4 : kit de départ, ancienne partie et joueur automatique`.

### Task 5: Petits textes du confort et de la Gazette — agent · **Haiku**

**Files :**
- Create : `src/ui/comfortModel.ts`, `tests/ui/comfortModel.test.ts`
- Modify : `src/sim/summary.ts`, `src/ui/gazetteModel.ts`
- Test : `tests/ui/gazetteModel.test.ts`

**Interfaces :**
- Consumes : `satisfactionParts`, `coverage`, `DECOR`, `checkDecorPlacement`, `touchesPath`, événement `dechetsRamasses`.
- Produces (`src/ui/comfortModel.ts`, fonctions pures, textes exacts) :
  - `mood(total: number): 'content' | 'moyen' | 'triste'` — ≥ 0,7 / ≥ 0,45 / sinon
  - `satisfactionLabel(state): string` → `'72 %'`
  - `partLines(state): { label: string; value: string }[]` — `Confort (bancs)` `'+9 %'`, `Décoration` `'+15 %'`, `Kiosque` `'+5 %'`, `Animation` `'+5 %'`, `Toilettes` `'−10 %'`, `Propreté` `'−6 % (4 déchets)'` (lignes à 0 % gardées pour bancs, déco, toilettes, propreté ; kiosque et animation seulement s'ils comptent)
  - `missingLines(state): string[]` — dans l'ordre : `'Il manque des toilettes : 1 toilette sert 40 visiteurs par heure.'` ; `'Des déchets traînent : pose des poubelles ou embauche un agent d’entretien.'` (dès 1 point de saleté) ; `'60 % du chemin n’a pas de banc.'` (si `bench` < 0,8) ; `'Ajoute des fleurs ou des arbres le long des chemins.'` (si déco < 0,5) ; `[]` sinon
  - `decorPanelText(state, kind, x, z, movingId?): { ok: boolean; text: string }` → `'Banc · 40 pièces'`, `'Banc · 40 pièces — ne touche pas de chemin : il ne servira pas.'`, `'Déplacer · gratuit'`, ou la raison du refus
  - `decorSheet(state, id): { title: string; detail: string; sellLabel: string }` → `{ 'Banc', 'Sert 20 m de chemin', 'Vendre (+20)' }` ; poubelle : `'Évite les déchets sur 16 m de chemin'` ; toilettes : `'Sert 40 visiteurs par heure'` ; décoration : `'Décoration'` ; ne sert pas : `'Ne touche pas un chemin relié : il ne sert pas.'`
- Produces (`Summary`) : `dechets: number` (ramassés par les agents) ; `satisfaction: number | null` (état final, `null` si règles d'avant).
- Gazette : rubrique « Visiteurs » gagne `'Tes agents ont ramassé 12 déchets.'` (si > 0) et `'Satisfaction des visiteurs : 72 %.'`.
- [ ] **Step 1 : tests qui échouent** : un test par fonction et variante (singulier / pluriel des déchets, 0, ne sert pas, déplacement) ; `summarize` sur deux `dechetsRamasses` ; Gazette avec et sans déchets.
- [ ] **Step 2 :** `npx vitest run tests/ui` → échecs attendus.
- [ ] **Step 3 :** implémenter.
- [ ] **Step 4 :** `npx vitest run` → tout vert.
- [ ] **Step 5 :** commit `V2-5 tâche 5 : textes du confort et de la Gazette`.

### Task 6: Modèles de décoration — chef (**Opus**, avec Romain) + agent · **Haiku**

À faire **dès le début de l'étape**, en parallèle des tâches 1 à 5 (Romain doit télécharger).

**Files :**
- Create : `public/models/deco/*.glb` (ou `.gltf` + `.bin`)
- Modify : `src/assets/manifest.ts`, `src/data/comfort.ts` (`model` des objets), `CREDITS.md`

- [ ] **Step 1 (chef) :** ouvrir chaque lien de D11, vérifier que la page indique **CC0** et l'auteur Quaternius ; donner à Romain la liste (nom, lien, format **glTF/GLB**) et lui demander de les mettre dans `_telechargements/deco/`. Faire trancher D10 (puits ou fontaine CC-BY) et la statue.
- [ ] **Step 2 (Haiku) :** copier dans `public/models/deco/` avec des noms simples (`poubelle.glb`, `lampadaire.glb`, `stand-boissons.glb`, `toilettes.glb`, et en option `fleurs2.glb`, `banc3.glb`) ; refuser un fichier de plus de 400 Ko (le signaler au chef).
- [ ] **Step 3 (Haiku) :** clés `poubelle`, `lampadaire`, `standBoissons`, `toilettes` (+ options) dans `MODELS` ; `DECOR[kind].model` : banc → `banc`, poubelle → `poubelle`, toilettes → `toilettes`, fleurs → `fleurs`, arbre → `arbre1`, buvette → `standBoissons`, lampadaire → `lampadaire`, puits → `puits`, statue → `cerf` (teinte pierre en tâche 7).
- [ ] **Step 4 :** `npx vitest run tests/assets` → vert (chaque fichier existe).
- [ ] **Step 5 :** `CREDITS.md` : un pack « Poly Pizza — Quaternius (CC0) » avec chaque modèle et son lien.
- [ ] **Step 6 :** commit `V2-5 tâche 6 : modèles de décoration`.

### Task 7: Objets et déchets en 3D, éditeur de pose (fantôme et portée) — agent · **Sonnet**

**Files :**
- Create : `src/scene/decorView.ts`, `src/scene/wasteView.ts`, `src/scene/decorEditor.ts`, `tests/scene/decorEditor.test.ts`
- Modify : `src/scene/picking.ts`, `src/scene/nightSky.ts` ou l'endroit où s'allument les lanternes (lampadaires la nuit), `src/scene/staffRoutes.ts` (animateur), `src/data/visuals.ts`, `src/main.ts`

**Interfaces :**
- Consumes : `state.decor`, `state.waste`, `DECOR`, `checkDecorPlacement`, `decorPanelText`, `touchesPath`, actions `poserDeco` / `deplacerDeco` / `ramasserDechets`, `requestModel`, `isPhone`, `networkRoute`, `staffRoute`.
- Produces :
  - `Pick` gagne `{ kind: 'objet'; id: number }` et `{ kind: 'dechet'; id: number }` ; `createPicker(…, decorTargets, wasteTargets)` (nouveaux paramètres en dernier, vides par défaut) ; ordre : déchet → objet → enclos → emplacement → chemin → zone.
  - `DECOR_VIEW = { WASTE_HIT_RADIUS_M: 0.8, WASTE_HIT_RADIUS_PHONE_M: 1.2, RANGE_RING_OPACITY: 0.35, GHOST_OPACITY: 0.55, STONE_COLOR: 0x9a9a92, STATUE_PLINTH_M: 0.6 }` dans `src/data/visuals.ts`.
  - `createDecorView(world, getState): { update(): void; targets(): Map<number, THREE.Object3D>; showRange(id: number | null): void }` — un modèle par objet (clone), tourné de `rot`, posé sur le relief ; reconstruit seulement ce qui change (ids ajoutés / retirés / déplacés) ; statue = cerf en pierre (`STONE_COLOR`, sans animation) sur un socle ; lampadaire allumé la nuit comme les lanternes de l'étape 6 V1 ; `showRange` dessine au sol l'anneau de portée (`rangeM`) de l'objet sélectionné.
  - `createWasteView(world, getState): { update(): void; targets(): Map<number, THREE.Object3D> }` — petit tas (papier et canette en formes simples, couleurs vives) par déchet, cible de clic invisible plus grande (rayon selon l'appareil).
  - `ghostRing(kind: DecorKind): number | null` (pure) — rayon de l'anneau à montrer (`rangeM`, sinon `null`).
  - `snapToQuarter(p: { x: number; z: number }): { x: number; z: number }` (pure) — arrondi au quart de mètre.
  - `createDecorEditor(world, canvas, ctx: { get(): GameState; dispatch(a: Action): boolean; models: … }): { start(kind: DecorKind): void; startMove(id: number): void; active(): boolean; cancel(): void }`
    - à la souris, le fantôme (modèle demi-transparent, teinté vert si `ok` sinon rouge) suit le pointeur ; au doigt, un tap le place ; l'anneau de portée suit le fantôme ; panneau `decorPanelText` ;
    - pose : **Poser** (reste en mode pour en poser un autre du même type), **Terminer** (ou Échap) ;
    - déplacement : l'objet d'origine est caché, **Valider** / **Annuler** ;
    - un glisser (> 6 px) tourne la caméra et ne pose rien ; le picker est « occupé » pendant l'édition (Review 5).
  - Animateur sur la carte : `staffRoute` d'un `animateur` = `networkRoute` (étape 1), modèle de `STAFF_WALKERS.MODEL.animateur`.
- `main.ts` : déchet touché → `dispatch({ type: 'ramasserDechets', id })` directement (retour visuel « +3 ramassés »), objet touché → sélection (barre du bas, tâche 8) et `showRange(id)`.

- [ ] **Step 1 : tests qui échouent** (`tests/scene/decorEditor.test.ts`) : `ghostRing('banc')` = 10, `ghostRing('fleurs')` = `null` ; `snapToQuarter({ x: 1.13, z: -2.6 })` = `{ x: 1.25, z: -2.5 }` ; `staffRoute` d'un animateur passe par l'allée et ne contient que des points du réseau.
- [ ] **Step 2 :** `npx vitest run tests/scene` → échecs attendus.
- [ ] **Step 3 :** implémenter et brancher (`update` dans la boucle comme `pathsView`).
- [ ] **Step 4 :** `npx vitest run` et `npm run build` → verts.
- [ ] **Step 5 :** le chef regarde dans le navigateur (`?heure=14` puis `?heure=23`) et **montre une capture à Romain** (objets, déchets, fantôme vert et rouge, anneau de portée, lampadaires la nuit) avant la tâche 8.
- [ ] **Step 6 :** commit `V2-5 tâche 7 : objets et déchets en 3D, pose avec fantôme et portée`.

### Task 8: Interface — satisfaction dans la barre du haut, volet, catalogue, fiche d'un objet — agent · **Sonnet**

**Files :**
- Create : `src/ui/comfortPanel.ts`, `src/ui/decorBar.ts`
- Modify : `src/ui/topBar.ts`, `src/ui/bottomBar.ts`, `src/ui/staffPanel.ts` (animateur), `src/ui/icons.ts`, `src/main.ts`, `src/style.css`

**Interfaces :**
- Consumes : tâche 5 (tous les textes), `decorEditor.start` / `startMove`, `decorView.showRange`, action `vendreDeco`, `createConfirmGuard`, `openDrawer` / `refreshDrawer`, `Session.comfortNotice`.
- Produces :
  - Barre du haut : `TopBarHandlers.onComfort()` ; case `satisfaction` (visage `ICONS.content` / `moyen` / `triste` selon `mood` + `satisfactionLabel`), bulle « Satisfaction des visiteurs : touche pour voir le détail » ; `data-alerte="oui"` sous 45 %. Sur téléphone : visage + nombre, sans « % » si la barre déborde.
  - `toggleComfortPanel(ctx: PanelContext): void` (volet `'satisfaction'`, titre « Satisfaction des visiteurs ») : grand visage + %, `partLines`, puis « Ce qui manque » (`missingLines`), puis **« Poser un objet »** : une carte par objet de `DECOR_ORDER` (icône, nom, prix, effet en une ligne) ; verrouillé « Village niveau N » en gris ; un tap ferme le volet et lance `decorEditor.start(kind)`.
  - `buildDecorBar(ctx, id, left, actions): () => void` (même forme que `buildBuildingBar`) : `decorSheet` ; **Déplacer** (`startMove`) ; **Vendre (+N)** en deux clics (premier clic « Vendre ce banc ? »).
  - Fiche d'une zone et d'un chemin : bouton **Décorer** qui ouvre le volet sur « Poser un objet ».
  - Volet Personnel : « Animateur » n'est plus « Bientôt » ; sa fiche dit « Visites guidées : +8 % de visiteurs, +5 % de satisfaction » ou « Déjà 2 animateurs : il n'ajoute rien. ».
  - `main.ts` : `comfortNotice` montré une fois, après les autres messages de mise à jour.
  - Téléphone 375 × 812 : volet ≤ 40 % de la hauteur avec défilement, cartes du catalogue sur 2 colonnes, boutons ≥ 44 px, panneau de l'éditeur au-dessus de la barre du bas.
- [ ] **Step 1 :** vérifier qu'aucune règle n'est ajoutée ici (tout texte vient de `comfortModel`) ; pas de nouveau test pur attendu.
- [ ] **Step 2 :** implémenter.
- [ ] **Step 3 :** `npx vitest run` et `npm run build` → verts.
- [ ] **Step 4 :** contrôle rapide dans le navigateur : volet, poser un banc, refus rouge, Déplacer, Vendre ; capture en 375 × 812 dans le compte rendu.
- [ ] **Step 5 :** commit `V2-5 tâche 8 : satisfaction, catalogue et fiche des objets`.

### Task 9: Vérification d'ensemble, relecture et publication — chef · **Opus** + relecture · **Opus**

- [ ] **Step 1 :** `npx vitest run` et `npm run build` → verts.
- [ ] **Step 2 :** navigateur (`?heure=14`), nouvelle partie : kit le long de l'allée, icône à 55 % puis plus avec des fleurs ; poser chaque objet (dont un qui ne touche pas de chemin : message) ; chaque raison rouge ; anneau de portée ; déplacer, vendre (moitié du prix) ; déchets qui apparaissent (`?debug` pour avancer le temps), tap qui ramasse la grappe ; agent qui ramasse seul ; toilettes qui manquent quand les visiteurs augmentent ; embaucher un animateur et le voir marcher ; détruire un chemin sous un banc (le banc ne sert plus) ; nuit (`?heure=23`, lampadaires) ; Gazette après une absence.
- [ ] **Step 3 :** ancienne partie : copie d'une sauvegarde v7 de type « partie de Romain » → kit offert, message unique, réputation intacte après le rattrapage ; rechargement → plus de message.
- [ ] **Step 4 :** téléphone 375 × 812 : barre du haut lisible, volet, pose au tap, tap sur un déchet, rien de sélectionné par erreur pendant la pose (Review 5).
- [ ] **Step 5 :** relecture indépendante par un agent **Opus** de toute la branche (contre la spec §7, ce plan et la Review Focus) ; corrections par un agent Sonnet (Opus si le défaut est subtil) ; tests verts.
- [ ] **Step 6 :** `progress.md` à jour (sous-tâches cochées, décisions D1–D12 telles que validées, nombre de tests, rythme du joueur automatique).
- [ ] **Step 7 :** **avec l'accord de Romain seulement** : fusion dans `main`, publication automatique, vérification du jeu en ligne.

## Suivi à recopier dans progress.md

| # | Sous-tâche | Agent · modèle | État |
|---|---|---|---|
| 1 | État v8 et catalogue du confort | agent · Sonnet | — |
| 2 | Poser, déplacer, revendre, portée le long des chemins | agent · Sonnet | — |
| 3 | Satisfaction, déchets, agent d'entretien, animateur | agent · Sonnet | — |
| 4 | Kit de départ, ancienne partie, joueur automatique | agent · Sonnet | — |
| 5 | Textes du confort et de la Gazette | agent · Haiku | — |
| 6 | Modèles de décoration (Romain télécharge) | chef · Opus + agent · Haiku | — |
| 7 | Objets et déchets en 3D, fantôme et portée (capture montrée à Romain) | agent · Sonnet | — |
| 8 | Barre du haut, volet Satisfaction, catalogue, fiche d'un objet | agent · Sonnet | — |
| 9 | Vérification d'ensemble, relecture et publication | chef · Opus + relecture · Opus | — |

Ordre : la tâche 6 commence en premier (attente des téléchargements) ; 1 → 2 → 3 → 4 ; 5 après 3 ; 7 après 2 et 6 ; 8 après 5 et 7 ; 9 à la fin.
