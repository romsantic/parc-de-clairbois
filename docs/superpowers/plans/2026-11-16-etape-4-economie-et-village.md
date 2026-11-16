# Étape 4 — Économie et village : plan de développement

> **Pour les agents :** sous-skill requis : superpowers:subagent-driven-development (recommandé) ou superpowers:executing-plans pour exécuter ce plan tâche par tâche. Les étapes utilisent des cases à cocher (`- [ ]`).

**Objectif :** le parc gagne enfin de l'argent. Des visiteurs viennent selon l'attrait et le bonheur, paient un billet réglable (avec prix juste et estimation en direct) et dépensent au village. On construit et améliore la ferme, le café, la boutique et l'auberge sur des emplacements fixes ; la population grandit et, d'un clic, le village passe Hameau → Village → Bourg, ce qui débloque la forêt, la montagne et le reste du catalogue du marchand. On achète et revend des animaux au marchand. Les chemins changent d'allure à chaque niveau. La reproduction des moutons est rééquilibrée.

**Architecture :** comme aux étapes 2 et 3. Les chiffres vont dans `src/data/economy.ts` ; les règles pures et testées dans `src/sim/` (`economy.ts` pour attrait/visiteurs/billet/revenus, `village.ts` pour bâtiments/population/niveaux, `merchant.ts` pour le marchand). Un nouveau pas `economyStep` s'ajoute à `step()` dans `advance.ts` : le jeu en direct et le rattrapage d'absence gagnent l'argent de la même façon. Le format de sauvegarde passe en **version 2** avec une migration. La 3D (`villageView.ts`, chemins) et l'interface (barre du haut, volets billet/marchand, actions des bâtiments) lisent l'état et envoient des actions par `dispatch`.

**Stack :** Three.js, TypeScript strict, Vitest.

**Spec :** `docs/superpowers/specs/2026-11-12-parc-de-clairbois-v1-design.md` — §3 (attrait et visiteurs), §4 (garde-manger), §5 (bâtiments, niveaux, chemins, billet), §6 (marchand), §7 (barres, volet, retour visuel).

**Hors périmètre :** missions de Margaux, condition « mission du palier terminée », quotidiennes, Gazette et résumé d'absence affiché (étape 5 — on prévoit seulement le crochet `missionGateOk`) ; brume animée, visiteurs qui marchent sur les chemins, jour/nuit des lanternes (étape 6).

**Qui fait quoi (méthode de Romain) :** chaque tâche indique son agent. **Sonnet** pour le code bien délimité, **Haiku** pour le mécanique, **chef** (session principale) pour ce qui passe par Romain et les vérifications dans le navigateur. Relecture finale par un agent sur le modèle le plus capable.

## Décisions de réglage à valider par Romain

La spec ne fixe pas ces chiffres ; ce sont des **propositions** (tous dans `src/data/economy.ts` ou `tuning.ts`, faciles à changer après avoir joué).

| Sujet | Proposition |
|---|---|
| **Attrait** | Par espèce présente : attrait de base × (1 + 0,5 × √(n − 1)) où n = nombre d'animaux de l'espèce (bébés compris). 2 moutons = 1,5 ; 5 moutons = 2 ; une nouvelle espèce rapporte toujours plus qu'un animal de plus. |
| **Visiteurs/h** | attrait × bonheur moyen × multiplicateur du billet × réputation × bonus auberge (+20 %) × **4**. Départ (2 moutons heureux) ≈ 5 visiteurs/h. Le parc est ouvert jour et nuit en V1. |
| **Prix juste** | arrondi de 4 + 2 × (niveau − 1) + 0,4 × attrait. Départ : 5 pièces. |
| **Effet du prix** | rapport r = prix / prix juste : multiplicateur 1,3 jusqu'à r = 0,5, puis droites entre (0,5 ; 1,3), (1 ; 1), (1,5 ; 0,6), (2 ; 0,25), (3 ; 0). Meilleur revenu immédiat à r ≈ 1,1 (un peu au-dessus du prix juste, comme la spec). Curseur de 0 à 3 × prix juste. |
| **Réputation** | de 0 à 1 (départ 1). Au-dessus de 1,5 × le prix juste elle baisse de 2 %/h ; sinon elle remonte de 1 %/h. Les visiteurs sont × (0,5 + 0,5 × réputation). Affichée « bonne / moyenne / mauvaise » dans le volet du billet. |
| **Bâtiments** | voir le tableau ci-dessous. La **ferme est déjà construite** au départ (le tutoriel achète des rations avant de construire le café). |
| **6 emplacements, 4 bâtiments** | *Choix de Romain :* chaque bâtiment est **unique**. Les 2 emplacements du Bourg existent déjà sur la carte mais affichent « Bientôt » : de nouveaux bâtiments y viendront dans une évolution du jeu. Chaque commerce a une capacité de clients par heure : on l'améliore quand il est plein. |
| **Population** | 10 habitants de base + 5 par niveau de chaque bâtiment construit + 1 nouvel habitant pour **30 clients** servis au café, à la boutique ou à l'auberge (cumulé depuis le début). Elle ne baisse jamais. |
| **Passage de niveau** | *Choix de Romain :* **par un bouton**. Quand la population est atteinte (50 puis 150) et la mission du palier faite — à l'étape 4 la condition de mission est toujours vraie (`missionGateOk`), l'étape 5 la branchera — la case du village s'allume dans la barre du haut ; son volet montre « Passer au niveau Village ». Message « Clairbois devient un village ! », zones et chemins qui changent. |
| **Rations à la ferme** | Fourrage 2 pièces, viande 4. Ferme niveau 2 : −20 % et 6 fourrage gratuits par jour ; niveau 3 : −35 % et 15 fourrage par jour. Achat par 10 ou 50. |
| **Garde-manger** | 200 places au départ ; « moyen » 400 places pour 600 pièces dès le Hameau ; « grand » 800 places pour 2 000 pièces au Bourg. Bouton sur la ferme. |
| **Marchand** | Stock de 3 + niveau du village animaux, renouvelé toutes les 6 h. Espèces des zones débloquées ; sexe au hasard ; 70 % d'adultes, 30 % de jeunes. Prix d'achat : adulte = prix de la spec, jeune = 65 %. Revente : jeune 40 %, adulte 60 % (spec) ; bébé et animal malade refusés. **Premier stock** d'une partie : toujours un couple de cochons (pour le tutoriel de l'étape 5). |
| **Équilibrage moutons** | Fourrage de départ 10 → **30** ; chance de conception 25 %/h → **10 %/h** ; **repos après une naissance** = 2 × la gestation (4 h pour un mouton) ; l'autonomie affichée **compte les naissances attendues** (une femelle gestante compte pour elle + la portée moyenne). Cible testée : une nouvelle partie laissée 72 h n'a **aucun animal malade de faim** (sur 20 graines). |

**Bâtiments**

| | Construire | Améliorer → 2 / → 3 | Effet par niveau (1 / 2 / 3) | Niveau du village |
|---|---|---|---|---|
| Ferme | (déjà là) | 400 / 1 000 | rations −0 / −20 / −35 % ; fourrage gratuit 0 / 6 / 15 par jour | Hameau |
| Café | 300 | 600 / 1 200 | 40 % des visiteurs ; 3 / 4 / 5 pièces par client ; 10 / 25 / 50 clients/h max | Hameau |
| Boutique | 800 | 1 500 / 3 000 | 30 % des visiteurs ; (1 + 0,5 × nb d'espèces) × 1 / 1,25 / 1,5 pièces ; 10 / 25 / 50 clients/h max | Village |
| Auberge | 1 200 | 2 500 / 5 000 | +20 % de visiteurs ; 10 % des visiteurs dorment : 8 / 10 / 12 pièces par client ; 4 / 8 / 15 clients/h max | Village |

## Contraintes globales

- Tous les chiffres dans `src/data/` (`economy.ts`, `tuning.ts`) ; aucune valeur en dur dans `sim/`, la 3D ou l'interface.
- La simulation reste pure (aucun DOM, aucune horloge) ; l'argent est gagné **dans `step()`**, donc pareil en direct et pendant l'absence.
- Les pièces peuvent devenir décimales (revenus par pas de 10 min) ; l'affichage arrondit vers le bas ; les prix restent entiers.
- Format de sauvegarde **version 2** ; une partie v1 se charge sans rien perdre (migration testée).
- Niveaux du village : 1 Hameau, 2 Village, 3 Bourg. Seuils 50 et 150 habitants ; passage **par un bouton** (jamais automatique). Emplacements : 2 / 4 / 6. Zones : prairie / + forêt / + montagne.
- Chemins : terre battue (1), gravier clair bordé de pierres (2), pavés avec lanternes sur l'allée du zoo et la place (3) ; changement automatique au passage de niveau.
- Toutes les actions passent par `dispatch` ; refus = rien ne change + raison en français. Textes visibles en français ; noms d'animaux en texte seulement.
- Barre du bas : ligne ≤ 48 px ; volets ≤ 40 % de la hauteur.

## Points de vigilance

1. **Ancienne sauvegarde (v1) en cours sur le téléphone de Romain** : elle doit se charger avec la ferme construite, le billet au prix juste, la réputation à 1, le marchand qui se remplit au pas suivant, rien de perdu. → test de migration (tâche 1) + vérification à la main avec une sauvegarde v1 collée dans `localStorage` (tâche 11).
2. **30 jours d'absence** : le rattrapage reste rapide (4 320 pas avec l'économie) et ne produit pas de pièces infinies ni de `NaN`. → test « 30 jours, pièces finies et positives, durée < 2 s » (tâche 3).
3. **Plus aucun animal** (tous vendus ou morts) : 0 visiteur, pas de division par zéro, prix juste qui reste ≥ 1. → tests de `visitorsPerHour` et `fairPrice` (tâche 2).
4. **Acheter un animal sans enclos compatible** (mauvais biome, plein, autre espèce, zone verrouillée) : le bouton explique ce qui manque, aucune pièce dépensée. → tests de `buyAnimal` (tâche 5).
5. **Billet à 0 ou très cher** : 0 pièce → visiteurs ×1,3 mais aucune recette de billet ; ≥ 3 × prix juste → 0 visiteur, la réputation baisse, aucune erreur. → tests (tâches 2 et 3).

---

### Task 1 : État version 2, migration, vrai niveau du village — *Sonnet*

**Fichiers :**
- Modifier : `src/sim/types.ts`, `src/sim/newGame.ts`, `src/sim/advance.ts` (`shiftDates`), `src/save/migrations.ts`, `src/save/save.ts` (`looksLikeGame`), `src/data/tuning.ts` (retirer `VILLAGE_LEVEL_V1`), `src/sim/placement.ts`, `src/ui/bottomBar.ts`, `src/main.ts`, `tests/sim/helpers.ts`
- Test : `tests/save/migrations.test.ts`, `tests/sim/newGame.test.ts`

**Interfaces :**
- Produit (`types.ts`) :
  - `type BuildingType = 'ferme' | 'cafe' | 'boutique' | 'auberge'` ; `interface Building { slot: number; type: BuildingType; level: 1 | 2 | 3 }`
  - `interface Offer { id: number; species: SpeciesId; sex: 'F' | 'M'; stage: 'jeune' | 'adulte'; price: number }`
  - `interface Merchant { restockAt: number; restocks: number; offers: Offer[] }`
  - `interface Village { level: 1 | 2 | 3; clientsServed: number }`
  - `Animal` gagne `lastBirthAt: number | null`.
  - `GameState` : `version: 2` ; nouveaux champs `ticketPrice: number`, `reputation: number`, `village: Village`, `buildings: Building[]`, `merchant: Merchant`, `totalVisitors: number`.
  - `GameEvent` gagne `{ kind: 'recettes'; at; visiteurs: number; billets: number; village: number }`, `{ kind: 'stock'; at }`.
- Produit : `CURRENT_VERSION = 2` et `MIGRATIONS[1]` : ajoute `ticketPrice: 5`, `reputation: 1`, `village: { level: 1, clientsServed: 0 }`, `buildings: [{ slot: 0, type: 'ferme', level: 1 }]`, `merchant: { restockAt: state.time, restocks: 0, offers: [] }` (le stock se remplit au pas suivant), `totalVisitors: 0`, `lastBirthAt: null` sur chaque animal, `version: 2`. La migration est écrite **en clair** (pas d'appel aux fonctions du jeu, pour qu'elle ne change jamais).
- Produit : `newGame` crée directement l'état v2 (mêmes valeurs ; le stock du marchand est rempli en tâche 5).
- `checkPlacement` et la barre du bas lisent `state.village.level` ; `drawZones(world, level)` est appelé avec `state.village.level`.
- `shiftDates` décale aussi `merchant.restockAt` et `lastBirthAt`.

- [ ] **Étape 1 : écrire les tests qui échouent** — une partie v1 (copie littérale d'un état v1 de 2 moutons) passée par `loadGame` → `kind: 'ok'`, `version: 2`, `buildings` = la ferme niveau 1 au slot 0, `ticketPrice: 5`, `reputation: 1`, `village.level: 1`, animaux avec `lastBirthAt: null`, pièces/animaux/enclos inchangés ; `newGame` → `version: 2`, mêmes valeurs ; une partie v2 sans `village` → `illisible` ; `checkPlacement` en forêt avec `village.level: 2` → ok.
- [ ] **Étape 2 : `npm test`** → ÉCHEC.
- [ ] **Étape 3 : implémenter** ; mettre à jour `emptyState` des tests (v2, ferme au slot 0, billet 5…) pour que les 215 tests existants repassent.
- [ ] **Étape 4 : `npm test`** → réussi.
- [ ] **Étape 5 : commit** — `Sauvegarde v2 : niveau du village, bâtiments, billet, marchand (migration v1 → v2)`

### Task 2 : Attrait, visiteurs et billet (règles pures) — *Sonnet*

**Fichiers :**
- Créer : `src/data/economy.ts`, `src/sim/economy.ts`
- Test : `tests/sim/economy.test.ts`

**Interfaces :**
- Produit (`data/economy.ts`) : `ECONOMY` (`VISITORS_PER_APPEAL: 4`, `APPEAL_EXTRA_FACTOR: 0.5`, `FAIR_BASE: 4`, `FAIR_PER_LEVEL: 2`, `FAIR_PER_APPEAL: 0.4`, `PRICE_CURVE: [[0.5,1.3],[1,1],[1.5,0.6],[2,0.25],[3,0]]`, `REPUTATION_DROP_ABOVE: 1.5`, `REPUTATION_DROP_PER_H: 0.02`, `REPUTATION_GAIN_PER_H: 0.01`, `CLIENTS_PER_NEWCOMER: 30`, `BASE_POPULATION: 10`, `RESIDENTS_PER_LEVEL: 5`, `LEVEL_POPULATION: { 2: 50, 3: 150 }`, `LEVEL_NAMES: ['Hameau','Village','Bourg']`) ; `BUILDINGS: Record<BuildingType, { name; withArticle: string /* « un café » */; unlockLevel; buildCost: number | null; upgradeCost: [number, number]; share: number; spend: [number, number, number]; maxClientsPerH: [number, number, number] }>` avec les valeurs du tableau des bâtiments ; `FARM: { foodPrice: { fourrage: 2, viande: 4 }, discount: [0, 0.2, 0.35], freeFourragePerDay: [0, 6, 15] }` ; `SLOTS: { id: number; x: number; z: number; rot: number; unlockLevel: 1 | 2 | 3 }[]` (6 emplacements, positions choisies en tâche 8 — mettre des valeurs provisoires : `(28,16)`, `(18,6)`, `(22,12)`, `(25,-6)`, `(8,-7)`, `(30,6)`).
- Produit (`sim/economy.ts`) :
  - `appeal(state): number`
  - `averageHappiness(state): number` (0 sans animal)
  - `fairPrice(state): number` (entier ≥ 1)
  - `priceMultiplier(ratio: number): number` (interpolation de `PRICE_CURVE`, 1,3 sous 0,5, 0 au-delà de 3)
  - `visitorsPerHour(state, price = state.ticketPrice): number`
  - `incomePerHour(state, price = state.ticketPrice): { visiteurs: number; billets: number; village: number; clients: number }` — billets = visiteurs × prix ; pour chaque commerce : clients = min(visiteurs × part, max du niveau), revenu = clients × dépense.

- [ ] **Étape 1 : écrire les tests qui échouent** — 2 moutons → `appeal` 1,5 ; 5 moutons → 2 ; 2 moutons + 1 âne → 3,5 ; aucun animal → `appeal` 0, `visitorsPerHour` 0, `fairPrice` 4 ; `fairPrice` départ = 5 ; `priceMultiplier` : 0 → 1,3 ; 0,5 → 1,3 ; 1 → 1 ; 1,25 → 0,8 ; 2 → 0,25 ; 3 → 0 ; 4 → 0 ; `visitorsPerHour` de 2 moutons heureux (bonheur 1) au prix juste = 6 ; avec une auberge = 7,2 ; réputation 0 → moitié ; `incomePerHour` avec un café niveau 1 et 6 visiteurs/h → café 2,4 clients × 3 = 7,2 ; café plafonné à 10 clients/h quand 100 visiteurs/h ; prix 0 → billets 0 ; boutique avec 3 espèces : dépense (1 + 1,5) × 1 = 2,5.
- [ ] **Étape 2 : `npm test`** → ÉCHEC.
- [ ] **Étape 3 : implémenter.**
- [ ] **Étape 4 : `npm test`** → réussi.
- [ ] **Étape 5 : commit** — `Attrait, visiteurs, prix juste et revenus`

### Task 3 : Le parc gagne de l'argent à chaque pas — *Sonnet*

**Fichiers :**
- Créer : `src/sim/village.ts`
- Modifier : `src/sim/advance.ts`, `src/sim/summary.ts`
- Test : `tests/sim/village.test.ts`, `tests/sim/absence.test.ts`

**Interfaces :**
- Consomme : `incomePerHour`, `fairPrice`, `ECONOMY`, `BUILDINGS`, `FARM`.
- Produit (`village.ts`) :
  - `population(state): number` = `BASE_POPULATION + Σ RESIDENTS_PER_LEVEL × niveau + floor(clientsServed / CLIENTS_PER_NEWCOMER)`
  - `missionGateOk(state, level: 2 | 3): boolean` — renvoie `true` à l'étape 4 (commentaire : l'étape 5 vérifiera la mission du palier)
  - `canLevelUp(state): { ok: true; level: 2 | 3 } | { ok: false; reason: string }` — raisons : `"Clairbois est déjà un bourg."`, `"Il faut 50 habitants (encore n)."`, `"Il faut d'abord terminer la mission du palier."`
  - `farmLevel(state): 0 | 1 | 2 | 3` (0 sans ferme)
- Produit (`economy.ts`) : `economyStep(state, events)` — pour un pas (1/6 h) : ajoute billets + village aux pièces, `clients` à `village.clientsServed`, visiteurs à `totalVisitors`, événement `recettes` si > 0 ; réputation (baisse si prix > 1,5 × juste, sinon remonte ; bornée 0–1) ; fourrage gratuit de la ferme (dans la limite du garde-manger).
- `step()` : `feedStep`, `healthStep`, `breedingStep`, puis `economyStep`, `merchantStep` (tâche 5 — l'ajouter quand elle existe). Le niveau ne change **jamais** tout seul.
- `Summary` gagne `pieces: number`, `visiteurs: number`.

- [ ] **Étape 1 : écrire les tests qui échouent** — `population` d'une nouvelle partie = 15 ; avec café niveau 2 = 25 ; avec 300 clients servis = +10 ; `canLevelUp` à 49 habitants → « Il faut 50 habitants (encore 1). » ; à 50 → ok niveau 2 ; au niveau 3 → « déjà un bourg » ; 30 jours d'avance à 200 habitants → toujours niveau 1 (jamais automatique) ; `advanceTo` d'1 h avec 2 moutons heureux au prix juste (enclos plein et propreté neutralisée comme dans `absence.test.ts`, garde-manger rempli) → +30 pièces (6 visiteurs × 5) à 0,01 près ; prix à 2 × juste pendant 10 h → réputation 0,8 ; puis prix juste 10 h → 0,9 ; ferme niveau 3 → +15 fourrage en 24 h ; **30 jours d'absence** d'une nouvelle partie avec 200 fourrage : pièces finies, > 0, durée < 2 s ; `summarize` additionne pièces et visiteurs.
- [ ] **Étape 2 : `npm test`** → ÉCHEC.
- [ ] **Étape 3 : implémenter.**
- [ ] **Étape 4 : `npm test`** → réussi.
- [ ] **Étape 5 : commit** — `Recettes à chaque pas, réputation, population`

### Task 4 : Actions du village et de la ferme — *Sonnet*

**Fichiers :**
- Modifier : `src/sim/actions.ts`, `src/game/runGame.ts` (`successMessage`)
- Test : `tests/sim/villageActions.test.ts`

**Interfaces :**
- Produit :
  - `buildBuilding(state, slot, type): ActionResult` — refus : `"Cet emplacement se débloque au niveau n du village."`, `"Cet emplacement est déjà pris."`, `"Ce bâtiment se débloque au niveau n du village."`, `"Clairbois a déjà un café."` (avec `withArticle` : chaque bâtiment est unique), pièces.
  - `levelUp(state): ActionResult` — applique `canLevelUp` (refus = sa raison) et passe `village.level` au niveau suivant.
  - `upgradeBuilding(state, slot): ActionResult` — refus `"Ce bâtiment est déjà au niveau maximum."`, pièces.
  - `buyRations(state, food, n): ActionResult` — sans ferme : `"Il faut une ferme pour acheter des rations."` ; coût = `ceil(n × prix × (1 − remise))` ; refus `"Le garde-manger est plein."` ou `"Il n'y a de la place que pour k rations."` (aucun achat partiel), pièces.
  - `upgradePantry(state): ActionResult` — 200 → 400 (600 pièces), 400 → 800 (2 000 pièces, refus `"Le grand garde-manger se débloque au niveau 3 du village."`), refus `"Le garde-manger est déjà au plus grand."`. Valeurs dans `TUNING.PANTRY_SIZES` : `[{ capacity: 200 }, { capacity: 400, cost: 600, level: 1 }, { capacity: 800, cost: 2000, level: 3 }]`.
  - `setTicketPrice(state, price): ActionResult` — entier entre 0 et `3 × fairPrice` ; refus sinon `"Le prix doit être entre 0 et N pièces."`.
- `Action` gagne `{ type: 'batir'; slot; building }`, `{ type: 'ameliorer'; slot }`, `{ type: 'acheterRations'; food; n }`, `{ type: 'agrandirGardeManger' }`, `{ type: 'billet'; price }`, `{ type: 'monterNiveau' }`. L'ancienne action gratuite `rations` **sort de `Action`** (le panneau `?debug` garde `addRations` directement).
- Messages de réussite : « Café construit », « Café amélioré (niveau 2) », « +10 fourrage dans le garde-manger », « Garde-manger agrandi (400 places) », « Billet à 6 pièces », « Clairbois devient un village ! » / « … un bourg ! ».

- [ ] **Étape 1 : écrire les tests qui échouent** — construire un café au slot 1 : −300 pièces, bâtiment niveau 1 ; même slot → « déjà pris » ; slot 2 au niveau 1 → « niveau 2 » ; boutique au niveau 1 → « niveau 2 » ; deuxième café → « Clairbois a déjà un café. » ; `monterNiveau` à 50 habitants → niveau 2, à 30 → refus avec la raison de `canLevelUp` ; améliorer le café → −600, niveau 2 ; au niveau 3 → « maximum » ; 10 fourrage avec ferme niveau 1 = 20 pièces, niveau 2 = 16, niveau 3 = 13 ; garde-manger presque plein → refus avec la place restante ; agrandir 200 → 400 = 600 pièces ; 400 → 800 au niveau 1 → refus ; billet à 7 avec prix juste 5 → ok ; à 16 → refus « entre 0 et 15 » ; `applyAction` aiguille chaque nouveau type.
- [ ] **Étape 2 : `npm test`** → ÉCHEC.
- [ ] **Étape 3 : implémenter.**
- [ ] **Étape 4 : `npm test`** → réussi.
- [ ] **Étape 5 : commit** — `Actions : bâtir, améliorer, rations à la ferme, garde-manger, billet`

### Task 5 : Marchand d'animaux — *Sonnet*

**Fichiers :**
- Créer : `src/sim/merchant.ts`
- Modifier : `src/data/economy.ts` (`MERCHANT`), `src/sim/actions.ts`, `src/sim/advance.ts`, `src/sim/newGame.ts`, `src/game/runGame.ts`
- Test : `tests/sim/merchant.test.ts`

**Interfaces :**
- Produit : `MERCHANT = { RESTOCK_H: 6, BASE_STOCK: 3, ADULT_SHARE: 0.7, YOUNG_BUY_SHARE: 0.65, SELL_YOUNG: 0.4, SELL_ADULT: 0.6 }`.
- Produit (`merchant.ts`) :
  - `catalogue(level): SpeciesId[]` — espèces dont la zone du biome a `unlockLevel ≤ level`.
  - `restock(state): void` (en place) — `3 + niveau` offres tirées avec le hasard de la partie ; si `restocks === 0` : les deux premières sont un cochon F et un cochon M adultes ; `restocks++`, `restockAt = time + 6 h`, événement `stock`.
  - `merchantStep(state, events)` — `restock` quand `time ≥ restockAt`.
  - `acceptsSpecies(state, enc, species): string | null` — `null` si possible, sinon la raison : `"Il faut un enclos de prairie."` (forêt, montagne), `"Cet enclos accueille déjà une autre espèce."`, `"Cet enclos est plein."` (capacité calculée avec cette espèce).
  - `buyAnimal(state, offerId, encId): ActionResult` — retire l'offre, pièces, crée l'animal (nom au hasard ; né il y a 2 × gestation pour un adulte, 1,5 × pour un jeune ; nourri maintenant), `enc.species = species`.
  - `sellPrice(state, animal): number | null` (null pour un bébé) ; `sellAnimal(state, animalId): ActionResult` — refus `"Un bébé ne peut pas être vendu."`, `"Soigne-le avant de le vendre."`.
- Un enclos qui n'a plus d'animal accepte de nouveau n'importe quelle espèce de son biome (`acceptsSpecies` regarde les animaux présents, pas seulement `enc.species`).
- `newGame` appelle `restock` (premier stock avec le couple de cochons) ; `step()` appelle `merchantStep`.
- `Action` gagne `{ type: 'acheterAnimal'; offerId; encId }`, `{ type: 'vendre'; animalId }` ; messages « Cochon acheté », « Animal vendu (+72) ».

- [ ] **Étape 1 : écrire les tests qui échouent** — nouvelle partie : 4 offres, dont un cochon F et un cochon M adultes à 150 ; catalogue niveau 1 = 4 espèces de prairie, niveau 3 = 10 ; après 6 h : nouveau stock (offres différentes), `restocks` 2 ; acheter un cochon dans un enclos vide de prairie → −150, `species` cochon, animal adulte ; dans l'enclos des moutons → « autre espèce » ; un renard en prairie → « enclos de forêt » ; enclos plein → « plein » ; jeune alpaga = 390 ; vendre un mouton adulte → +72 ; un jeune → +48 ; un bébé → refus ; un malade → refus ; vendre tous les moutons puis acheter un cochon dans cet enclos → ok ; même graine → même stock (reproductible).
- [ ] **Étape 2 : `npm test`** → ÉCHEC.
- [ ] **Étape 3 : implémenter.**
- [ ] **Étape 4 : `npm test`** → réussi.
- [ ] **Étape 5 : commit** — `Marchand d'animaux : stock renouvelé, achat, revente`

### Task 6 : Rééquilibrer la reproduction — *Sonnet*

**Fichiers :**
- Modifier : `src/data/tuning.ts`, `src/sim/breeding.ts`, `src/sim/feeding.ts` (`autonomyHours`)
- Test : `tests/sim/breeding.test.ts`, `tests/sim/feeding.test.ts`, `tests/sim/absence.test.ts`

**Interfaces :**
- `TUNING.START_FOURRAGE: 30`, `TUNING.BREED_PER_HOUR: 0.1`, `TUNING.BIRTH_REST_FACTOR: 2`.
- `breedingStep` : une mère qui vient de mettre bas reçoit `lastBirthAt = now` ; une femelle ne conçoit pas tant que `now − lastBirthAt < BIRTH_REST_FACTOR × gestation`.
- `autonomyHours` : une femelle gestante consomme pour elle **plus** la portée moyenne × rations de l'espèce (les petits sont comptés dès maintenant).

- [ ] **Étape 1 : écrire les tests qui échouent** — une brebis qui a mis bas il y a 3 h ne conçoit jamais (100 pas avec chance forcée) ; à 4 h elle peut ; autonomie : 30 fourrage, 2 moutons dont une gestante (portée moyenne 1,5) → 30 / (3,5 / 24) ≈ 205,7 h ; **scénario** : pour les graines 1 à 20, `newGame` laissée 72 h → aucun événement `malade` de cause `faim`.
- [ ] **Étape 2 : `npm test`** → ÉCHEC.
- [ ] **Étape 3 : implémenter.** Si le scénario échoue encore, ajuster d'abord `START_FOURRAGE` (jamais au-delà de 50) et noter la valeur dans le commit.
- [ ] **Étape 4 : `npm test`** → réussi.
- [ ] **Étape 5 : commit** — `Équilibrage : repos après une naissance, conception plus lente, autonomie qui anticipe`

### Task 7 : Modèles des bâtiments — *Haiku*

**Fichiers :**
- Créer : `public/models/village/House_4.*`, `MarketStand_2.*`, `Gazebo.*`, `Bench_2.*`, `Crate.*`, `Bags.*`, `Bonfire_Lit.*`, `Blacksmith.*` (copiés depuis `_telechargements/village/Medieval Village Pack - Dec 2020/…`, fichiers `.obj` et `.mtl`)
- Modifier : `src/assets/manifest.ts` (clés `maison4`, `etal2`, `kiosque`, `banc2`, `caisse`, `sacs`, `feu`, `forge`), `CREDITS.md` (même pack, rien de nouveau à créditer si déjà listé)

- [ ] **Étape 1 :** copier les fichiers ; appliquer le même nettoyage que les OBJ déjà copiés (retirer les lignes `l` parasites, voir `progress.md`).
- [ ] **Étape 2 :** `npm test` → le test du manifeste vérifie que chaque fichier existe → réussi.
- [ ] **Étape 3 : commit** — `Modèles des bâtiments du village`

### Task 8 : Bâtiments et emplacements sur la carte — *Sonnet*

**Fichiers :**
- Créer : `src/scene/villageView.ts`
- Modifier : `src/scene/decor.ts` (retirer l'auberge, l'écurie et l'étal décoratifs : ils deviennent de vrais bâtiments), `src/scene/picking.ts`, `src/scene/zonesView.ts`, `src/main.ts`, `src/data/economy.ts` (positions définitives de `SLOTS`)

**Interfaces :**
- Produit : `createVillageView(world, getState): { update(): void; slotMeshes(): Map<number, THREE.Object3D>; setSelected(slot: number | null): void }` — chaque emplacement : libre et débloqué → carré de terre avec un petit panneau « + » ; verrouillé → panneau grisé « Niveau n » ; emplacement du Bourg débloqué mais sans bâtiment possible → panneau « Bientôt » ; occupé → le bâtiment. Allure par niveau : ferme = écurie + foin (+ moulin au niveau 3) ; café = étal 2 + bancs (+ kiosque au niveau 3) ; boutique = maison 4 + étal + caisses (+ sacs) ; auberge = auberge + tonneaux (+ feu au niveau 3). Échelle 1 / 1,08 / 1,15 et une petite enseigne avec 1 à 3 étoiles. Reconstruit seulement l'emplacement qui a changé.
- `Pick` gagne `{ kind: 'emplacement'; slot: number }` (libre ou bâti — l'interface lit l'état).
- `drawZones` devient `createZonesView(world): { setLevel(level): void }` : au passage de niveau, la zone débloquée perd son gris et son panneau.

- [ ] **Étape 1 : implémenter** ; choisir les 6 positions dans le village (hors rivière, hors chemins, loin de la mairie) et les écrire dans `SLOTS`.
- [ ] **Étape 2 : `npm test`** → réussi.
- [ ] **Étape 3 : vérifier à la main (chef)** — la ferme est à sa place ; l'emplacement 2 montre « + » ; 3 à 6 grisés ; clic sur un emplacement → sélection ; `?debug` niveau 2 → forêt débloquée, emplacements 3 et 4 libres ; au niveau 3, 5 et 6 affichent « Bientôt ».
- [ ] **Étape 4 : commit** — `Bâtiments du village et emplacements sur la carte`

### Task 9 : Chemins qui suivent le niveau du village — *Sonnet*

**Fichiers :**
- Modifier : `src/scene/path.ts`, `src/scene/decor.ts`
- Test : `tests/scene/path.test.ts`

**Interfaces :**
- Produit : `type PathStyle = 1 | 2 | 3` ; `createPath(points, { …, style })` — 1 : terre battue actuelle ; 2 : texture de gravier clair (grain fin, pas d'ornières) et petites pierres alignées sur les deux bords ; 3 : texture de pavés (joints en quadrillage décalé) et **lanternes** (poteau + petite boîte lumineuse, matériau émissif, pas de lumière réelle) tous les 8 m sur l'allée du zoo et le chemin de la place.
- Produit : `lanternPositions(points, every: number): Point[]` (fonction pure, testée).
- `buildDecor` renvoie aussi `setPathLevel(level)` : retire les chemins et les reconstruit dans le style du niveau ; appelé au démarrage et quand `village.level` change.

- [ ] **Étape 1 : écrire le test qui échoue** — `lanternPositions` sur une ligne droite de 20 m, tous les 8 m → 3 points (0, 8, 16) ; tracé de moins de 8 m → 1 point.
- [ ] **Étape 2 : `npm test`** → ÉCHEC.
- [ ] **Étape 3 : implémenter.**
- [ ] **Étape 4 : `npm test`** → réussi.
- [ ] **Étape 5 : vérifier à la main (chef)** — `?debug` niveau 1, 2, 3 : terre, gravier, pavés avec lanternes ; de jour et de nuit (`?heure=22`).
- [ ] **Étape 6 : commit** — `Les chemins changent d'allure avec le niveau du village`

### Task 10 : Interface — billet, village, marchand — *Sonnet*

**Fichiers :**
- Créer : `src/ui/ticketPanel.ts`, `src/ui/merchantPanel.ts`, `src/ui/buildingBar.ts`
- Modifier : `src/ui/topBar.ts`, `src/ui/bottomBar.ts`, `src/ui/format.ts`, `src/ui/debugPanel.ts`, `src/game/runGame.ts`, `src/style.css`
- Test : `tests/ui/format.test.ts`

**Interfaces :**
- Produit (`format.ts`) : `formatPerHour(visitors: number, coins: number): string` → `'≈ 42 visiteurs/h · 380 pièces/h'` (arrondis à l'unité) ; `reputationLabel(r): 'bonne' | 'moyenne' | 'mauvaise'` (≥ 0,8 / ≥ 0,5 / sinon) ; `formatCountdown(ms): string` → `'3 h 20'`, `'45 min'`.
- Barre du haut : visiteurs/h actifs ; nouvelle case **billet** « 🎟 5 » (clic → volet du billet) ; case village « Hameau · 15 hab. » qui **s'allume** (pastille) quand `canLevelUp` est ok ; `pulse` accepte aussi `'village'`.
- Volet du village (clic sur la case village) : population, « Prochain niveau : Village à 50 habitants (encore 12) », d'où viennent les habitants (bâtiments, nouveaux venus), et le bouton **Passer au niveau Village** (désactivé avec la raison tant que `canLevelUp` refuse).
- Volet du billet (`ticketPanel.ts`) : curseur de 0 à 3 × prix juste, pas de 1 ; « Prix juste : 5 pièces » ; estimation en direct avec `incomePerHour(state, prixDuCurseur)` ; réputation ; bouton **Valider** → `dispatch({ type: 'billet', price })`.
- Sélection d'un emplacement (`buildingBar.ts`, appelé par la barre du bas) :
  - **libre** : une icône par bâtiment pas encore construit, avec son prix (désactivée avec la raison si verrouillée) ; s'il n'en reste aucun : « De nouveaux bâtiments arriveront bientôt » ;
  - **ferme** : « Ferme ★ » ; Fourrage ×10, ×50, Viande ×10, ×50 (prix calculé), Améliorer (prix), Agrandir le garde-manger (prix) ;
  - **café / boutique / auberge** : nom, niveau, « ≈ n clients/h · m pièces/h » ; Améliorer.
- Volet marchand (`merchantPanel.ts`, icône Marchand activée) : « Nouveau stock dans 3 h 20 » ; une ligne par offre (espèce, ♀/♂, jeune/adulte, prix, **Acheter**). Enclos cible : l'enclos sélectionné s'il accepte, sinon le premier qui accepte ; affiché « → Enclos 2 ». Aucun → bouton désactivé avec la raison de `acceptsSpecies` du premier enclos du bon biome, ou « Il faut un enclos de forêt. ».
- Volet Détails : bouton **Vendre (72)** par animal, en deux clics (« Vendre ? » puis confirmation, annulé au bout de 3 s).
- Changement de niveau (bouton ou `?debug`) : `main.ts` surveille `state.village.level` à chaque image et appelle `zones.setLevel`, `decor.setPathLevel` et `villageView.update` quand il change.
- `?debug` : boutons « +20 habitants » (ajoute 600 clients servis) et « Niveau suivant ».

- [ ] **Étape 1 : écrire les tests qui échouent** pour `formatPerHour`, `reputationLabel`, `formatCountdown`.
- [ ] **Étape 2 : `npm test`** → ÉCHEC.
- [ ] **Étape 3 : implémenter.**
- [ ] **Étape 4 : `npm test`** → réussi.
- [ ] **Étape 5 : vérifier à la main (chef)** — régler le billet : l'estimation bouge en direct, Valider → message ; construire le café (−300 qui s'envole) ; acheter 10 fourrage ; acheter le couple de cochons dans un nouvel enclos ; vendre un agneau jeune ; pièces qui montent au fil des minutes ; `?debug` +20 habitants ×2 → la case village s'allume ; « Passer au niveau Village » → « Clairbois devient un village ! », forêt débloquée, chemins en gravier ; mode mobile : ligne ≤ 48 px, volets lisibles.
- [ ] **Étape 6 : commit** — `Interface : billet, bâtiments du village, marchand, vente`

### Task 11 : Vérification d'ensemble, relecture et publication — *chef*

- [ ] **Étape 1 :** `npm test`, `npm run build` → réussis.
- [ ] **Étape 2 :** à la main, sans `?debug` : partie neuve de 10 minutes (billet, café, rations, marchand, nouvel enclos, vente) ; recharger → tout est conservé ; coller une sauvegarde v1 dans `localStorage` → elle se charge (ferme, billet 5, animaux) ; nuit (`?heure=22`) ; mode mobile.
- [ ] **Étape 3 :** relecture indépendante de la branche (agent sur le modèle le plus capable) → corrections, un commit.
- [ ] **Étape 4 :** fusion dans `main` **après accord de Romain** ; vérifier https://romsantic.github.io/parc-de-clairbois/ ; mettre `progress.md` à jour (étape 4 faite, réglages retenus, ce qui reste pour l'étape 5).
