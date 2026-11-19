# V2 — Étape 4 : la ferme qui produit — plan de construction

> **Votes de Romain (19/11/2026)** — D2 validée : les 8 champs sont **à l'est du village** (« les champs de Clairbois »). Les autres décisions sont acceptées telles que proposées.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal :** des parcelles achetées une à une produisent du fourrage, le fermier le porte au garde-manger (ou le joueur le ramasse d'un clic), la grange agrandit le stock des champs ; le fourrage gratuit de la V1 disparaît.

**Architecture :** les parcelles possédées sont dans `GameState.plots` (sauvegarde v7) ; leurs 8 emplacements fixes sont une donnée de `src/data/farm.ts`. Une seule fonction pure `farmStep` (dans `src/sim/farm.ts`) fait pousser puis transporter à chaque pas de 10 min, avant le repas. La 3D (`plotsView`) et l'interface ne font que lire l'état ; les actions passent par `applyAction`.

**Tech Stack :** TypeScript, Three.js, Vitest (`export PATH="/c/Program Files/nodejs:$PATH"; npx vitest run`).

**Spec :** `docs/superpowers/specs/2026-11-19-parc-de-clairbois-v2-design.md` §6 (ferme), §4 (fermier), §8 (grange, emplacement par étape), §12 « Étape 4 » ; §1 contraintes.

## Ce qu'on attend des étapes 1, 2 et 3 (pas encore toutes codées)

Ce plan part de `main` **après la fusion des étapes 1 à 3**. Avant la tâche 1, le chef vérifie chaque point ci-dessous dans le code ; si un nom diffère, l'agent prend celui du code et le note dans son compte rendu (le plan ne change pas de sens).

- **Étape 1 (chemins, en cours sur `etape-v2-1-chemins`)** : `CURRENT_VERSION = 4`, `GameState.paths`, `src/data/paths.ts`, `Session.pathsNotice` affiché par `showNotice` dans `runGame.ts` (modèle à copier pour le message de la ferme). Les rues du village ne bougent pas.
- **Étape 2 (personnel, plan `2026-11-19-v2-etape-2-personnel.md`)** — on utilise :
  - `CURRENT_VERSION = 5` ; `GameState.staff.employees: Employee[]` avec `Employee { id; name; job: JobId; xpH; hiredAt; encIds }` et `JobId = 'soigneur' | 'entretien' | 'veterinaire' | 'fermier' | 'animateur'`.
  - `employeeLevel(e): StaffLevel` (1 à 5, tiré de `xpH`) ; `efficiency(state): number` (0,5 en dette, sinon 1) ; `staffCap(state): number` (3 sans maison, puis 6 / 10 / 15) ; `assignGaps` ; `STAFF_NAMES`.
  - `JOBS.fermier = { name: 'Fermier', open: false, wage: 50 }` : le métier est montré « Bientôt » dans le volet Personnel, sans candidat. **C'est cette étape qui l'ouvre** (tâche 2).
  - `CANDIDATE_JOBS` (tirage des métiers des candidats) ; les emplacements gagnent `only?: BuildingType` ; emplacement 6 = maison du personnel.
  - `STAFF_WALKERS.MODEL.fermier = 'promeneurFermier'` et `staffRoute(state, e)` (petit tour autour de la maison quand l'employé n'a pas d'enclos).
  - Le joueur automatique (`tests/balance/bot.ts`) sait embaucher.
- **Étape 3 (maladies, plan `2026-11-19-v2-etape-3-maladies.md`)** — `CURRENT_VERSION = 6` ; emplacement 7 `only: 'centreVeto'` (la borne `x ≤ 24` du test des emplacements a pu être élargie) ; vétérinaire ouvert dans `JOBS` et `CANDIDATE_JOBS` ; `wellKeptPark()` dans `tests/sim/helpers.ts` (parc de fin de V1 bien tenu : soigneurs, agents, centre, vétérinaires). La faim prolongée donne une indigestion : la ferme aide aussi la santé.
- **Étape 7 (plan `2026-11-19-v2-etape-7-trophees-finition.md`)** attend de cette étape : `GameState.farm.plots`, les actions `acheterParcelle`, `ameliorerParcelle`, `ramasserParcelle`, l'événement `recolte`, le bâtiment `grange` et les compteurs `fourrageRecolte` (tout le fourrage récolté) et `recolteMain` (ramassé par le joueur seulement). Les noms ci-dessous les reprennent.
- **Version** : cette étape fait `CURRENT_VERSION + 1` (7 attendu) ; la migration est indexée par l'ancienne version.
- **Place sur la carte** : si les emplacements ajoutés aux étapes 2 et 3 tombent sur les champs ou la grange prévus ici (D2, D3), le test de la tâche 1 échoue ; l'agent relance alors la recherche décrite en D2 et le chef montre le nouveau placement à Romain.

## Global Constraints

- Règles pures et testées dans `src/sim/`, chiffres dans `src/data/`, aucune logique dans `src/data/`.
- Le temps n'avance que par `advanceTo` (pas de 10 min) ; une action renvoie un nouvel état (`structuredClone`) ou un refus en français affichable tel quel.
- Sauvegarde versionnée : migration écrite en clair, sans appeler le jeu ; la partie de Romain continue sans perte brutale.
- Parcelles sur **6 à 8 emplacements fixes**, achetées une à une, **de plus en plus chères** ; on voit les cultures.
- Production **continue** dans le petit stock de chaque parcelle ; **pleine, elle s'arrête**.
- **Chaque parcelle s'améliore** : 3 niveaux (production et stock).
- Ferme complète et améliorée ≈ **la moitié du fourrage** consommé.
- La **production gratuite de la V1 est remplacée** : l'amélioration de la ferme garde les rations moins chères et **débloque des parcelles**.
- La viande reste achetée. Pas de potager à cette étape (étape 6).
- Un parc bien tenu tient **3 jours** sans le joueur.
- Modèles 3D **CC0** uniquement (Quaternius, packs déjà téléchargés).
- Téléphone et ordinateur : tout au tap, lisible en 375 × 812.
- Textes du jeu en français simple, tutoiement.

## Décisions du chef (à confirmer par Romain avec le plan)

- **D1 — 8 parcelles de 3 × 3 m.** Le nombre qu'on peut cultiver dépend du niveau de la ferme : **2 / 5 / 8** (niveaux 1 / 2 / 3). Le prix dépend du nombre de parcelles déjà possédées (pas de l'emplacement) : **100, 150, 220, 320, 450, 600, 800, 1 000** pièces. On choisit librement l'emplacement.
- **D2 — Où sont les champs.** Autour de la ferme il n'y a pas la place (rivière, rues, maisons, café, boutique) : calcul fait, 2 parcelles au plus. Les champs sont donc **à l'est du village, derrière le café et la boutique** (« les champs de Clairbois »), en deux colonnes. Emplacements proposés (centre, m) : `(28.1, 15.2)`, `(28.1, 18.8)`, `(28.1, 22.4)`, `(31.7, 8)`, `(31.7, 11.6)`, `(31.7, 15.2)`, `(31.7, 18.8)`, `(31.7, 22.4)`. Règle du test (tâche 1) : à ≥ 6,1 m de l'axe de la rivière, ≥ 3,6 m des rues du village, ≥ 6,6 m de chaque emplacement de bâtiment, ≥ rayon + 2,4 m de chaque décor de `VILLAGE_PROPS`, |x| ≤ 32, |z| ≤ 22,5, et ≥ 3,6 m entre deux parcelles. Si un emplacement des étapes 2-3 gêne : recherche sur une grille de 0,25 m de pas dans x ∈ [7, 32], z ∈ [−22, 22,5], la plus proche de la ferme, et validation sur image par Romain. *Autre choix possible : déplacer l'emplacement 0 (la ferme) — refusé, la ferme de Romain changerait de place.*
- **D3 — La grange** est un nouveau bâtiment du village (`'grange'`), sur un **nouvel emplacement réservé** (`{ id: 8, only: 'grange' }`, comme la maison du personnel et le centre) proposé en `(12.5, 21.5)` au nord de la ferme, débloqué au niveau **Village (2)** ; construction **700**, améliorations **1 200 / 2 500**. Elle multiplie le stock de chaque parcelle par **1,5 / 2 / 3**. Si la maison 2 du décor (11, 16) la gêne, on la décale (donnée de `village.ts`). Allure : scierie du pack médiéval (sans la scie) + bottes de foin + sacs.
- **D4 — Chiffres d'une parcelle** (niveau 1 / 2 / 3) : production **0,08 / 0,125 / 0,18** fourrage par heure (≈ 1,9 / 3 / 4,3 par jour), stock **4 / 6 / 9** (≈ 2 jours), amélioration **250** (niveau 2) puis **600** (niveau 3). Une parcelle ne dépasse pas le niveau de la ferme. Ferme complète : 8 × 4,3 ≈ **35 par jour**, la moitié des ≈ 70 fourrages par jour du grand parc de test (`bigPark()`, parc de fin de V1). Les gains en pièces restent modestes (le fourrage vaut 2 pièces) : l'intérêt est surtout l'autonomie. Réglage fin à l'étape 7.
- **D5 — Le fermier** devient embauchable (salaire de base 50, choisi à l'étape 2 ; un candidat sur 5 environ est fermier). Il porte en continu, à chaque pas : **2 fourrages par heure au niveau 1, + 0,5 par niveau** (4 au niveau 5), × l'efficacité (0,5 en dette). Il prend d'abord dans les parcelles les plus pleines et s'arrête quand le garde-manger est plein (rien n'est perdu : ça reste dans les champs). Un fermier suffit pour une ferme complète (1,44 par heure) ; deux servent seulement à rattraper vite. Sans fermier, les champs se remplissent puis s'arrêtent.
- **D6 — Ramasser d'un clic** : « Ramasser » sur une parcelle, « Tout ramasser » dans la barre de la ferme ; prend ce qui rentre dans le garde-manger, gratuit.
- **D7 — Autonomie** : avec au moins un fermier, l'autonomie compte ce que les champs apportent (consommation de fourrage moins l'apport par heure, et le stock des champs en plus). Sans fermier, elle ne change pas.
- **D8 — Ancienne partie** (avant v7) : le fourrage gratuit disparaît, Margaux offre des parcelles qui produisent à peu près autant : ferme niveau 2 → **3 parcelles niveau 1** (≈ 5,8/jour, contre 6) ; ferme niveau 3 → **5 parcelles niveau 2** (15/jour, contre 15). Plus **un fermier offert**, **Jules Moreau** (niveau 1), s'il reste une place (`employees.length < staffCap`) — contrairement à la vétérinaire de l'étape 3, il n'est pas donné si la maison est pleine. Un message unique le dit. Ferme niveau 1 : rien n'est offert (pas de fourrage gratuit en V1), le message présente les champs.
- **D9 — Nouvelle partie** : aucune parcelle au départ ; les rations s'achètent comme avant. Texte de la mission « Améliore la ferme » : « Une meilleure ferme débloque des parcelles et des rations moins chères. »
- **D10 — Gazette** : rubrique « Ferme » : « Le fermier a rangé N fourrages au garde-manger. » ; et « Tes champs sont pleins : ramasse ou embauche un fermier. » si au moins une parcelle est pleine sans fermier à la fin de l'absence.
- **D11 — Compteurs** `fourrageRecolte` (ramassé à la main ou porté par le fermier) et `recolteMain` (à la main seulement), pour les missions et trophées de l'étape 7. Pas de nouvelle mission à cette étape.
- **D12 — Le fermier sur la carte** : il fait le tour des parcelles cultivées (sinon de la ferme), avec le modèle prévu à l'étape 2.

## Review Focus

1. **Garde-manger plein** : le fermier et « Ramasser » s'arrêtent sans rien perdre ni dépasser la capacité ; les parcelles pleines s'arrêtent ; tout repart dès qu'il y a de la place (test en tâche 2).
2. **Longue absence** (3 jours puis 30 jours) : production et transport rejoués pas à pas, jamais de stock au-delà de la capacité, pas de ralentissement (test de perf en tâche 2, équilibre en tâche 7).
3. **Ancienne partie** : ferme 1, 2 ou 3, maison du personnel pleine ou non ; plus aucun fourrage gratuit ; le cadeau n'est fait **qu'une fois** (deuxième chargement : rien) (test en tâche 3).
4. **Fermier mal payé ou licencié** : le transport baisse ou s'arrête, les champs se remplissent, « Ramasser » marche toujours (test en tâche 2).
5. **Tap sur une parcelle au téléphone** : elle est touchable, pas cachée par un arbre du décor ; aucun arbre ne pousse sur les champs (test en tâche 5, vérification en tâche 8).

---

### Task 1: Tâche 1 — État v7, données des champs et production — agent · **Sonnet**

**Files :**
- Create : `src/data/farm.ts`, `src/sim/farm.ts`, `tests/sim/farm.test.ts`, `tests/data/plots.test.ts`
- Modify : `src/sim/types.ts`, `src/sim/newGame.ts`, `src/sim/stats.ts`, `src/save/migrations.ts`, `src/save/save.ts`, `src/data/economy.ts` (emplacement de la grange), `tests/sim/helpers.ts`, `tests/save/migrations.test.ts`, `tests/save/save-robustness.test.ts`, `tests/data/slots.test.ts`, tout `version: 6` restant

**Interfaces :**
- Produces (types) : `export interface Plot { id: number; level: 1 | 2 | 3; stock: number }` (`id` = index de l'emplacement dans `FARM_PLOTS`) ; `GameState.farm: { plots: Plot[] }` ; `StatKey` gagne `'fourrageRecolte'` et `'recolteMain'` ; `BuildingType` gagne `'grange'`.
- Produces (`src/data/farm.ts`) :
  - `FARM_PLOTS: { id: number; x: number; z: number }[]` — les 8 emplacements de D2, ids 0..7
  - `PLOT_TUNING = { SIZE_M: 3, PRICES: [100, 150, 220, 320, 450, 600, 800, 1000], UPGRADE_COST: [250, 600], PRODUCTION_PER_H: [0.08, 0.125, 0.18], STOCK: [4, 6, 9], PLOTS_BY_FARM_LEVEL: [2, 5, 8], FARMER_CARRY_BASE_PER_H: 2, FARMER_CARRY_PER_LEVEL: 0.5 }`
  - `GRANGE_STOCK_FACTOR = [1.5, 2, 3]`
  - `PLOTS_LAYOUT = { RIVER_MIN_M: 6.1, STREET_MIN_M: 3.6, SLOT_MIN_M: 6.6, PROP_EXTRA_M: 2.4, MAX_ABS_X: 32, MAX_ABS_Z: 22.5, SPACING_M: 3.6 }` (règles du test D2)
- Produces (`src/data/economy.ts`) : `BUILDINGS.grange = { name: 'Grange', withArticle: 'une grange', unlockLevel: 2, buildCost: 700, upgradeCost: [1200, 2500], share: 0, spend: [0, 0, 0], maxClientsPerH: [0, 0, 0] }` ; emplacement `{ id: 8, x: 12.5, z: 21.5, rot: …, unlockLevel: 2, only: 'grange' }` (rot : façade vers la ferme). `buildBuilding` refuse avec « Cet emplacement est réservé à la grange. » (autre bâtiment sur le 8) et « La grange se construit sur son emplacement, près de la ferme. » (grange ailleurs), comme pour la maison du personnel.
- Produces (`src/sim/farm.ts`) :
  - `plotCapacity(state: GameState, p: Plot): number` = `STOCK[p.level − 1] × facteur grange` (1 sans grange)
  - `plotsAllowed(state: GameState): number` = `PLOTS_BY_FARM_LEVEL[farmLevel − 1]` (0 sans ferme)
  - `nextPlotPrice(state: GameState): number | null` = `PRICES[farm.plots.length]`, `null` s'il n'y en a plus
  - `productionPerHour(state: GameState): number` (somme des parcelles)
  - `growStep(state: GameState): void` — chaque parcelle gagne `PRODUCTION_PER_H × pas`, plafonné à `plotCapacity`

- [ ] **Step 1 : tests qui échouent**
  - `tests/data/plots.test.ts` : 8 emplacements, ids 0..7 ; chaque règle de `PLOTS_LAYOUT` contre `riverDistance` (`src/scene/world.ts`), `VILLAGE_PATHS`, **tous** les `SLOTS` (y compris ceux des étapes 2-3), `VILLAGE_PROPS` et les autres parcelles. `tests/data/slots.test.ts` : le nouvel emplacement respecte les règles existantes (9 m, 4,5 m des rues, x de 8 à 24) et est à ≥ 7 m de l'axe de la rivière.
  - `tests/sim/farm.test.ts` : `parcelle niveau 1 en 6 h` → stock 0,48 ; `pleine, elle s'arrête` (stock 4 reste 4 après 10 h) ; `grange niveau 2` → capacité d'une parcelle niveau 3 = 18 ; `plotsAllowed` = 0 / 2 / 5 / 8 pour une ferme absente / 1 / 2 / 3 ; `nextPlotPrice` = 100 sans parcelle, 1 000 avec 7, `null` avec 8.
  - Migration : `MIGRATIONS[6]` donne `version: 7`, `farm: { plots: [] }`, `stats.counts.fourrageRecolte: 0` et `recolteMain: 0`, garde le reste (et ne touche pas aux bâtiments).
  - Validation : une sauvegarde v7 sans `farm.plots`, avec un `id` hors 0..7, deux fois le même `id`, un `level` hors 1..3 ou un `stock` négatif / non fini est illisible.
  - `newGame` : `version: 7`, `farm: { plots: [] }`.
  - Bâtiments : café sur l'emplacement 8 et grange sur l'emplacement 1 refusés (textes exacts) ; grange sur le 8 refusée au Hameau, acceptée au Village pour 700.
- [ ] **Step 2 :** `npx vitest run tests/sim/farm.test.ts tests/data tests/save` → échecs attendus.
- [ ] **Step 3 :** implémenter (types, données, `farm.ts`, migration `6: (old) => ({ ...old, version: 7, farm: { plots: [] }, stats: { ...old.stats, counts: { ...old.stats.counts, fourrageRecolte: 0, recolteMain: 0 } } })`, `CURRENT_VERSION = 7`, validation dans `looksLikeGame`, `STAT_KEYS`, `emptyState` des tests).
- [ ] **Step 4 :** `npx vitest run` → tout vert.
- [ ] **Step 5 :** commit `V2-4 tâche 1 : état v7, champs et production`.

### Task 2: Tâche 2 — Fermier, actions des champs, fin du fourrage gratuit — agent · **Sonnet**

**Files :**
- Modify : `src/sim/farm.ts`, `src/sim/advance.ts`, `src/sim/economy.ts`, `src/sim/actions.ts`, `src/sim/types.ts` (événement), `src/data/economy.ts` (retirer `freeFourragePerDay`), `src/sim/feeding.ts`
- Test : `tests/sim/farm.test.ts`, `tests/sim/economy.test.ts`, `tests/sim/feeding.test.ts`, `tests/sim/perf.test.ts`

**Interfaces :**
- Consumes : tâche 1 ; étape 2 (`state.staff.employees`, `employeeLevel`, `efficiency`, `JOBS`, `CANDIDATE_JOBS`).
- Produces (`src/sim/farm.ts`) :
  - `farmerCarryPerHour(state: GameState): number` — somme, sur les employés `job === 'fermier'`, de `(FARMER_CARRY_BASE_PER_H + FARMER_CARRY_PER_LEVEL × (employeeLevel(e) − 1)) × efficiency(state)`
  - `farmStep(state: GameState, events: GameEvent[]): void` — `growStep`, puis transport dans la limite de `farmerCarryPerHour × pas` et de la place libre du garde-manger, parcelles **les plus pleines d'abord** ; ajoute au `fourrage`, `bump(stats, 'fourrageRecolte', n)`, événement si n > 0
  - `collect(state: GameState, plotId?: number): ActionResult` — sans `plotId` : toutes les parcelles ; compte dans `fourrageRecolte` **et** `recolteMain`
  - `farmSupplyPerHour(state: GameState): number` = `min(productionPerHour, farmerCarryPerHour)`
- Produces (événement) : `{ kind: 'recolte'; at: number; fourrage: number }`
- Produces (actions) :
  - `{ type: 'acheterParcelle'; plot: number }` — refus dans cet ordre, textes exacts : « Introuvable. » (id hors 0..7) ; « Cette parcelle est déjà à toi. » ; « Il faut une ferme pour cultiver. » ; « Améliore la ferme pour cultiver plus de parcelles. » (`plots.length ≥ plotsAllowed`) ; « Pas assez de pièces (il en faut N). ». Sinon `{ id: plot, level: 1, stock: 0 }`, débit de `nextPlotPrice`.
  - `{ type: 'ameliorerParcelle'; plot: number }` — « Introuvable. » ; « Cette parcelle est déjà au niveau maximum. » ; « Améliore d'abord la ferme (niveau N). » (niveau visé > niveau de la ferme) ; pièces. Coût `UPGRADE_COST[level − 1]`. Compte dans `ameliorations`.
  - `{ type: 'ramasserParcelle'; plot?: number }` (sans `plot` : tout ramasser) — « Rien à ramasser. » (moins de 1 fourrage en tout) ; « Le garde-manger est plein. » ; sinon prend ce qui rentre (le reste reste dans la parcelle).
- `step()` : `farmStep` juste après `state.time += STEP_MS`, **avant** `feedStep`.
- `economyStep` ne donne plus de fourrage ; `FARM.freeFourragePerDay` est supprimé (et ses usages).
- `autonomyHours` (D7) : si `farmSupplyPerHour > 0`, fourrage net = consommation − apport, stock = garde-manger + stock des champs ; `Infinity` si le net ≤ 0.

- [ ] **Step 1 : tests qui échouent**
  - `fermier niveau 1` : 3 parcelles pleines (stock 4), fermier efficacité 1, 1 h (6 pas) → +2 au garde-manger (à 1e-9 près), prises sur les plus pleines ; `fourrageRecolte` +2, `recolteMain` inchangé ; un événement `recolte` par pas.
  - `garde-manger plein` (Review 1) : capacité atteinte → rien ne bouge, les parcelles se remplissent jusqu'à leur capacité et s'arrêtent ; après un repas qui libère 1 place, le fermier en porte au plus 1.
  - `fermier mal payé` (Review 4) : caisse sous zéro (efficacité 0,5) → 1 par heure ; fermier licencié (retiré de `staff.employees`) → 0, les champs se remplissent ; `ramasserParcelle` marche toujours.
  - Les textes exacts de chaque refus des 3 actions ; achat de 3 parcelles : 100 + 150 + 220 débités ; parcelle niveau 2 refusée avec une ferme niveau 1.
  - `ramasser partiel` : 5 de place, 9 dans les champs → +5, 4 restent, `recolteMain` +5.
  - `fermier ouvert` : `JOBS.fermier.open` vrai, `['fermier', 0.2]` ajouté à `CANDIDATE_JOBS` (les autres poids réduits au prorata) ; sur 200 renouvellements (graine fixe), au moins un fermier proposé.
  - `plus de fourrage gratuit` : ferme niveau 3, aucune parcelle, 24 h, pas d'animaux → `fourrage` inchangé.
  - Autonomie (D7) : bigPark avec 8 parcelles niveau 3 et un fermier → `autonomyHours` plus grand que sans fermier ; sans fermier, inchangé.
  - Perf (Review 2) : `bigPark()` + 8 parcelles + fermier, 30 jours d'absence sous la même limite que le test existant.
- [ ] **Step 2 :** `npx vitest run tests/sim` → échecs attendus.
- [ ] **Step 3 :** implémenter.
- [ ] **Step 4 :** `npx vitest run` → tout vert (adapter les anciens tests qui comptaient sur le fourrage gratuit, en le disant dans le compte rendu).
- [ ] **Step 5 :** commit `V2-4 tâche 2 : fermier, parcelles et fin du fourrage gratuit`.

### Task 3: Tâche 3 — Ancienne partie, Gazette et textes — agent · **Sonnet**

**Files :**
- Modify : `src/sim/farm.ts`, `src/game/session.ts`, `src/game/runGame.ts`, `src/sim/summary.ts`, `src/ui/gazetteModel.ts`, `src/data/missions.ts` (texte de `hist-ferme`), `src/data/buildingInfo.ts`, `src/ui/buildingInfo.ts`
- Test : `tests/game/session.test.ts`, `tests/sim/farm.test.ts`, `tests/ui/gazetteModel.test.ts`, `tests/ui/buildingInfo.test.ts`

**Interfaces :**
- Consumes : tâches 1-2 ; étape 2 (`staffCap`, forme d'`Employee`).
- Produces :
  - `giftFarm(state: GameState): { state: GameState; plots: number; farmer: boolean }` (`src/sim/farm.ts`) — D8 ; parcelles offertes sur les emplacements 0, 1, 2… (stock 0) ; fermier = `{ id: nextId++, name: 'Jules Moreau', job: 'fermier', xpH: 0, hiredAt: time, encIds: [] }` si `employees.length < staffCap(state)` ; ne fait rien s'il y a déjà des parcelles
  - `Session.farmNotice: string | null` — si `fromVersion < 7`, `giftFarm` **avant** le rattrapage d'absence, puis :
    - ferme 2 ou 3 : « Nouveau à Clairbois : les champs ! La ferme ne donne plus de fourrage gratuit : ce sont maintenant tes parcelles qui le font pousser. Margaux t'offre N parcelles » + « et un fermier pour porter la récolte au garde-manger. » ou « . Ramasse la récolte d'un clic, ou embauche un fermier. »
    - ferme 1 : « Nouveau à Clairbois : les champs ! Achète des parcelles à l'est du village pour faire pousser ton fourrage. »
  - `Summary.recolte: number` ; `Summary.champsPleins: boolean` (lu dans l'état final : une parcelle à sa capacité et aucun fermier)
  - Rubrique Gazette « Ferme » (D10), absente si les deux valent 0 / faux.
  - Fiche de la ferme : la ligne « Fourrage offert » devient « Parcelles » = `N/M (8 au niveau 3)` et une ligne « Les champs donnent » = `≈ X par jour` ; `BUILDING_ROLE.ferme` = « La ferme vend le fourrage et la viande ; l'améliorer rend les rations moins chères et permet de cultiver plus de parcelles. » ; `BUILDING_ROLE.grange` = « La grange agrandit le stock de chaque parcelle : les champs peuvent pousser plus longtemps sans être ramassés. »

- [ ] **Step 1 : tests qui échouent** (Review 3)
  - Sauvegarde v6 ferme niveau 3, maison avec une place → 5 parcelles niveau 2 + 1 fermier, message exact ; maison pleine → 5 parcelles, pas de fermier, phrase « Ramasse la récolte d'un clic… » ; ferme niveau 2 → 3 parcelles niveau 1 ; ferme niveau 1 → aucune parcelle, message des champs.
  - `cadeau une seule fois` : on recharge la partie sauvegardée en v7 → aucun message, aucune parcelle de plus.
  - Gazette : 12 fourrages portés → « Le fermier a rangé 12 fourrages au garde-manger. » ; champs pleins sans fermier → la phrase de D10.
  - Fiche de la ferme : niveau 2 avec 3 parcelles → « 3/5 (8 au niveau 3) ».
- [ ] **Step 2 :** `npx vitest run tests/game tests/ui tests/sim/farm.test.ts` → échecs attendus.
- [ ] **Step 3 :** implémenter (le message s'affiche comme `pathsNotice`).
- [ ] **Step 4 :** `npx vitest run` → tout vert.
- [ ] **Step 5 :** commit `V2-4 tâche 3 : ancienne partie, Gazette et fiches`.

### Task 4: Tâche 4 — Modèles des cultures et de la grange — agent · **Haiku**

**Files :**
- Create : `public/models/nature/Wheat.obj|.mtl`, `Corn_1.obj|.mtl`, `Corn_2.obj|.mtl`, `public/models/village/Sawmill.obj|.mtl`
- Modify : `src/assets/manifest.ts`, `CREDITS.md`

**Interfaces :**
- Produces : clés `ble`, `mais1`, `mais2` (Ultimate Nature Pack) et `grange` (Medieval Village Pack, `Sawmill.obj`) dans `MODELS`.

- [ ] **Step 1 :** copier les 4 modèles depuis `_telechargements/` (`Ultimate Nature Pack - Jun 2019/OBJ/`, `Medieval Village Pack - Dec 2020/Props/OBJ/` ou le dossier OBJ des bâtiments), en gardant les textures que le `.mtl` cite.
- [ ] **Step 2 :** ajouter les clés ; `npx vitest run tests/assets` → vert (le test vérifie que chaque fichier existe et que chaque `.obj` a son `.mtl`).
- [ ] **Step 3 :** `CREDITS.md` : citer les fichiers sous les packs déjà crédités.
- [ ] **Step 4 :** commit `V2-4 tâche 4 : modèles des cultures et de la grange`.

### Task 5: Tâche 5 — Les champs et la grange en 3D — agent · **Sonnet**

**Files :**
- Create : `src/scene/plotsView.ts`
- Modify : `src/scene/picking.ts`, `src/scene/decor.ts`, `src/scene/villageView.ts` (allure de la grange), `src/data/visuals.ts` (couleurs et hauteurs), `src/main.ts`
- Test : `tests/scene/plotsView.test.ts` (parties pures)

**Interfaces :**
- Consumes : `FARM_PLOTS`, `PLOT_TUNING.SIZE_M`, `plotCapacity`, `plotsAllowed`, `state.farm.plots`, modèles de la tâche 4.
- Produces :
  - `Pick` gagne `{ kind: 'parcelle'; plot: number }` ; `createPicker(…, plotTargets)` (nouveau paramètre en dernier, par défaut vide)
  - `plotLook(state: GameState, id: number): { kind: 'verrou' | 'libre' | 'cultivee'; level?: 1 | 2 | 3; fill?: number }` — fonction pure (`fill` = stock / capacité de 0 à 1)
  - `createPlotsView(world, getState): { update(): void; plotMeshes(): Map<number, THREE.Object3D>; setSelected(id: number | null): void }`
- Allure : terre labourée 3 × 3 m suivant le relief (comme `dirtSquare`) ; **verrou** = terre grise + panneau « Ferme ★★ » (niveau de ferme nécessaire) ; **libre** = terre brune + panneau « + » ; **cultivée** = rangées de blé (niveau 1), de maïs (2), de maïs haut + petite clôture (3) dont la hauteur suit `fill` (pousse visible, de 30 % à 100 % de la taille) ; on ne reconstruit une parcelle que si `kind`, `level` ou le dixième de `fill` change. Grange : `LOOKS.grange` = `grange` + `foin` + `sacs` (+ `charrette` au niveau 3).
- `decor.ts` : `free()` refuse aussi les points à moins de `SIZE_M` d'une parcelle (Review 5).
- D12 : `staffRoute` (étape 2) pour un `fermier` = tour des parcelles cultivées (coins du groupe décalés de 1 m), sinon petit tour autour de l'emplacement 0 (la ferme). Test pur dans `tests/scene/` à côté de ceux de `staffRoute`.

- [ ] **Step 1 : tests qui échouent** : `plotLook` (verrou au-delà de `plotsAllowed`, libre, cultivée avec `fill` 0,5 pour 2 sur 4) ; la clé de reconstruction ne change pas entre 0,51 et 0,55.
- [ ] **Step 2 :** `npx vitest run tests/scene` → échecs attendus.
- [ ] **Step 3 :** implémenter ; brancher `update` sur la boucle comme `villageView`, les parcelles dans le picker et la surbrillance de sélection.
- [ ] **Step 4 :** `npx vitest run` → vert ; `npm run build` sans erreur.
- [ ] **Step 5 :** le chef regarde dans le navigateur (`?heure=14`, puis `?heure=23`) et **montre une capture des champs et de la grange à Romain** avant de continuer.
- [ ] **Step 6 :** commit `V2-4 tâche 5 : champs et grange en 3D`.

### Task 6: Tâche 6 — Interface des champs (ordinateur et téléphone) — agent · **Sonnet**

**Files :**
- Modify : `src/ui/bottomBar.ts`, `src/ui/buildingBar.ts`, `src/ui/autonomyPanel.ts`, `src/ui/icons.ts`, `src/main.ts`, `src/style.css`
- Create : `src/ui/plotBar.ts`

**Interfaces :**
- Consumes : actions `acheterParcelle`, `ameliorerParcelle`, `ramasserParcelle` ; `plotLook`, `plotCapacity`, `nextPlotPrice`, `productionPerHour`, `farmSupplyPerHour`.
- Produces : `buildPlotBar(ctx: BuildingBarContext, plot: number, left: HTMLElement, actions: HTMLElement): () => void` (même forme que `buildBuildingBar`).
- Barre d'une parcelle :
  - verrou : « Parcelle · se débloque avec la ferme niveau N » ;
  - libre : « Parcelle libre » + bouton « Cultiver cette parcelle » (prix `nextPlotPrice`) ;
  - cultivée : « Parcelle ★★ · 3/6 fourrages · ≈ 3 par jour » + « Ramasser » + « Améliorer (niveau N) » (prix, désactivé au maximum).
- Barre de la ferme : bouton « Tout ramasser (N) » après les rations ; libellé et état rafraîchis sans reconstruire.
- Barre de la grange : comme un bâtiment (améliorer) ; icône `ICONS.grange` (nouveau dessin simple).
- Volet Autonomie : ligne « Les champs apportent ≈ N fourrages par jour » (avec fermier) ou « Tes champs produisent N par jour, mais personne ne les porte au garde-manger. » (sans fermier).
- Volet Personnel : « Fermier » n'est plus en gris « Bientôt » ; sa fiche dit « Porte N fourrages par heure au garde-manger ».
- Téléphone : la barre d'une parcelle tient en 375 × 812 (3 lignes au plus quand elle est sélectionnée, comme les bâtiments) ; la barre de la ferme garde son défilement horizontal.

- [ ] **Step 1 :** implémenter (pas de test DOM dans ce projet ; les fonctions pures utilisées sont déjà testées).
- [ ] **Step 2 :** `npx vitest run` et `npm run build` → verts.
- [ ] **Step 3 :** le chef vérifie dans le navigateur, ordinateur puis 375 × 812 : acheter une parcelle, refus « Améliore la ferme… », ramasser, tout ramasser, améliorer, construire la grange au niveau Village.
- [ ] **Step 4 :** commit `V2-4 tâche 6 : interface des champs`.

### Task 7: Tâche 7 — Joueur automatique et équilibrage — agent · **Sonnet** (chiffres validés par le chef)

**Files :**
- Modify : `tests/balance/bot.ts`, `tests/balance/playthrough.test.ts`
- Create : `tests/balance/farm.test.ts`

**Interfaces :**
- Consumes : tout ce qui précède ; embauche du bot de l'étape 2.

- [ ] **Step 1 : tests qui échouent** (`tests/balance/farm.test.ts`)
  - `ferme complète ≈ moitié` : `wellKeptPark()` (étape 3, sinon `bigPark()`) + ferme niveau 3 + 8 parcelles niveau 3 + 1 fermier, garde-manger rempli, 3 jours → fourrage porté / fourrage mangé entre **0,4 et 0,6**.
  - `3 jours sans le joueur` : même parc, garde-manger plein au départ, rations de viande suffisantes → aucune mort, aucun stock de parcelle au-delà de sa capacité, garde-manger jamais au-delà de sa capacité.
- [ ] **Step 2 :** le bot : à chaque visite, ramasse tout (s'il n'a pas de fermier) ; achète une parcelle quand il a `prix + 300` pièces et la place ; embauche un fermier dès 2 parcelles s'il a une place ; améliore les parcelles une fois les 8 achetées. Le tableau du rapport gagne une colonne « champs (fourrage/jour) ».
- [ ] **Step 3 :** `npx vitest run tests/balance` → les bornes de `playthrough.test.ts` en vigueur après l'étape 3 restent vertes, aucune mort. Si une borne casse, l'agent **ne change pas les chiffres seul** : il rapporte les jours obtenus au chef, qui propose un réglage à Romain.
- [ ] **Step 4 :** commit `V2-4 tâche 7 : joueur automatique et équilibre de la ferme`.

### Task 8: Tâche 8 — Vérification d'ensemble, relecture et publication — chef · **Opus** + relecture · **Opus**

- [ ] **Step 1 :** `npx vitest run` et `npm run build` → verts.
- [ ] **Step 2 :** vérification à la main dans le navigateur (serveur de dev, `?heure=14`) : nouvelle partie (acheter 2 parcelles, refus à la 3ᵉ, améliorer la ferme, 3ᵉ parcelle) ; les cultures poussent (`?debug` pour avancer le temps) ; « Ramasser » et « Tout ramasser » ; fermier embauché qui remplit le garde-manger ; garde-manger plein ; grange au niveau Village et capacité qui grandit ; Gazette après une absence ; nuit (`?heure=23`).
- [ ] **Step 3 :** ancienne partie : copie d'une sauvegarde v6 de ferme niveau 3 → message, 5 parcelles, fermier offert, plus de fourrage gratuit ; rechargement → plus de message.
- [ ] **Step 4 :** téléphone (375 × 812) : tap sur chaque sorte de parcelle, barre lisible, rien de caché par un arbre (Review 5).
- [ ] **Step 5 :** relecture indépendante par un agent **Opus** de toute la branche (contre la spec §6, ce plan et la Review Focus) ; corrections par un agent Sonnet (Opus si le bug est subtil) ; tests verts.
- [ ] **Step 6 :** `progress.md` à jour (sous-tâches cochées, décisions de l'étape 4).
- [ ] **Step 7 :** **avec l'accord de Romain seulement** : fusion dans `main`, publication automatique, vérification du jeu en ligne.

## Suivi à recopier dans progress.md

| # | Sous-tâche | Agent · modèle | État |
|---|---|---|---|
| 1 | État v7, champs et production | agent · Sonnet | — |
| 2 | Fermier, parcelles et fin du fourrage gratuit | agent · Sonnet | — |
| 3 | Ancienne partie, Gazette et fiches | agent · Sonnet | — |
| 4 | Modèles des cultures et de la grange | agent · Haiku | — |
| 5 | Champs et grange en 3D (capture montrée à Romain) | agent · Sonnet | — |
| 6 | Interface des champs (ordinateur et téléphone) | agent · Sonnet | — |
| 7 | Joueur automatique et équilibre de la ferme | agent · Sonnet | — |
| 8 | Vérification d'ensemble, relecture et publication | chef · Opus + relecture · Opus | — |

Ordre : 1 → 2 → 3 ; la tâche 4 peut se faire à tout moment avant la 5 ; 5 → 6 → 7 → 8.
