# V2 — Étape 2 : personnel et maison du personnel — plan de construction

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal :** le parc a un personnel obligatoire et payé : des soigneurs gardent les animaux heureux et féconds, des agents d'entretien nettoient, un animateur attire du monde ; on embauche parmi des candidats, on affecte, on paie à minuit, et la maison du personnel limite l'effectif.

**Architecture :** le personnel vit dans `GameState.staff` (sauvegarde v5). Toutes les règles sont pures dans `src/sim/staff.ts` : couverture des soins (part des animaux de chaque enclos suivie par un soigneur), nettoyage automatique, expérience, candidats, paie et dette, appelées par un nouveau `staffStep` dans `step()`. Les autres règles lisent la couverture (`careCoverage`) : bonheur, naissances, saleté. L'interface (volet Personnel, fiches) et la 3D (employés décoratifs, maison) ne font que lire l'état et envoyer des actions.

**Tech Stack :** TypeScript, Three.js, Vitest (`export PATH="/c/Program Files/nodejs:$PATH"; npx vitest run`).

**Spec :** `docs/superpowers/specs/2026-11-19-parc-de-clairbois-v2-design.md` §4 (personnel) et §8 (maison du personnel, emplacement ajouté par l'étape) ; conception V1 pour le reste.

## Global Constraints

- Règles pures et testées dans `src/sim/`, chiffres dans `src/data/` (nouveau `src/data/staff.ts`), aucune logique dans `src/data/`.
- Le temps n'avance que par `advanceTo` (pas de 10 min) ; les actions passent par `applyAction` et renvoient un nouvel état (`structuredClone`) ou un refus en français affichable tel quel.
- Sauvegarde : `CURRENT_VERSION` passe de 4 à 5 ; migration écrite en clair, sans appeler le jeu ; la partie de Romain continue sans perte brutale.
- Personne ne démissionne ; licencier est gratuit ; pas de frais d'embauche.
- Dette jamais plus grande qu'une journée de salaires ; tant que la caisse est sous zéro : ni achat d'animal, ni construction (enclos, agrandissement, chemin, bâtiment, amélioration, garde-manger), ni embauche.
- Le soigneur ne nourrit pas (le repas reste automatique) ; le bouton « Nettoyer » reste.
- Employés sur la carte **décoratifs** : les règles ne dépendent jamais de leurs trajets.
- Un parc bien tenu (personnel suffisant, garde-manger, caisse) tient **3 jours** sans le joueur, sans mort ni dette.
- Téléphone et ordinateur : tout au tap, lisible en 375 × 812. Textes en français simple, tutoiement.

## Décisions du chef (à confirmer par Romain avec le plan)

- **D1 — Métiers actifs à cette étape** : soigneur, agent d'entretien et **animateur** (pour l'instant : +10 % de visiteurs, la satisfaction viendra à l'étape 5). Vétérinaire et fermier existent dans les données mais n'apparaissent parmi les candidats qu'aux étapes 3 et 4 (sinon on paierait quelqu'un qui n'a rien à faire). Les déchets (agent) et le dépistage (soigneur) arrivent aux étapes 5 et 3.
- **D2 — Soigneur** : s'occupe de 12 animaux (+3 par niveau d'expérience). La part non suivie d'un enclos : saleté 2× plus rapide, bonheur × 0,75, pas de naissances (tout est proportionnel : un enclos suivi à moitié a la moitié des chances de conception).
- **D3 — Agent d'entretien** : 4 enclos (+1 par niveau) ; il nettoie gratuitement un enclos dès que sa propreté passe sous 50 %.
- **D4 — Salaires par jour** : soigneur 60, agent 50, animateur 70 (vétérinaire 90, fermier 50 plus tard), +10 % par niveau. 5 niveaux d'expérience, atteints après 2, 5, 10 et 20 jours de travail.
- **D5 — Paie à minuit** (heure de l'appareil) : un jour entier pour chaque employé présent, même embauché le soir. Si la caisse ne suffit pas, elle descend sous zéro, au plus d'une journée de salaires ; tant qu'elle est sous zéro, les employés travaillent à moitié et achats/constructions/embauches sont bloqués. Les recettes remboursent seules la dette.
- **D6 — Candidats** : 3 + niveau du village (4 à 6), renouvelés toutes les 12 h. Hameau : tous niveau 1 ; Village : 1 sur 4 est niveau 2 ; Bourg : 3 sur 10 niveau 2 et 1 sur 10 niveau 3 (plus chers, plus efficaces).
- **D7 — Maison du personnel** : sans elle, 2 employés ; niveau 1 : 6 ; niveau 2 : 10 ; niveau 3 : 15. Construite dès le Hameau pour 400 pièces (améliorations 800 et 2 000), sur un **7ᵉ emplacement** ajouté au village, ouvert dès le Hameau.
- **D8 — Premier soigneur offert par Margaux** : nouvelle partie → Léa est déjà là, auprès des moutons (le texte du premier pas le dit). Ancienne partie → au premier chargement, Léa arrive, est affectée d'office (« Répartir ») et un message unique explique le personnel. Son salaire se paie comme les autres.
- **D8 bis — Nouveaux enclos** : un enclos construit ou peuplé que personne ne suit est confié d'office au premier soigneur (et au premier agent) qui a de la place ; « Répartir » refait tout au mieux.
- **D9 — Où gérer** : une case **Personnel** dans la barre du haut (« 3/6 ») ouvre le volet Personnel : employés (métier, niveau, salaire, enclos suivis, Affecter, Licencier en deux clics), candidats (Embaucher), bouton **Répartir**. La fiche d'un enclos montre son soigneur et son agent, ou une ligne rouge « Pas de soigneur : il se salit vite et ne fait plus de petits » avec Répartir.
- **D10 — Employés sur la carte** : 3 personnages Quaternius déjà téléchargés (pas de nouveau téléchargement) : soigneur = « Worker » femme, agent = « Worker » homme, animateur = « Medieval » femme. Ils flânent près de leurs enclos (animateur sur l'allée) ; au plus 8 (5 sur téléphone). Romain peut demander d'autres tenues.

## Review Focus

1. **Licencier ou laisser partir le dernier soigneur** d'un grand parc : les enclos deviennent « non suivis » tout de suite (saleté, bonheur, naissances), l'avertissement en deux clics le dit, rien ne plante (tests en tâches 2 et 3).
2. **Caisse déjà sous zéro à minuit** (deux nuits de suite sans recettes) : la dette reste plafonnée à une journée de salaires, jamais −2 jours (test en tâche 3).
3. **Absence de 3 jours puis plus de 30 jours** : une paie par minuit traversé, pas une de plus ni de moins ; le plafond des 30 jours décale les dates du personnel (`shiftDates`) (tests en tâches 3 et 4).
4. **Enclos vendu jusqu'au dernier animal, puis repeuplé, ou affectations vers un enclos qui n'existe plus** : la couverture ignore les ids inconnus, un enclos vide n'est jamais « non suivi » (test en tâche 2).
5. **Maison du personnel pleine** : embaucher est refusé avec la raison ; améliorer la maison rouvre des places ; un effectif au-dessus de la capacité (cas impossible sauf ancienne donnée) ne fait renvoyer personne (test en tâche 3).

---

### Task 1: État v5, données du personnel et premier soigneur — agent · **Sonnet**

**Files :**
- Create : `src/data/staff.ts`, `tests/sim/staff.test.ts`
- Modify : `src/sim/types.ts`, `src/data/economy.ts` (bâtiment `personnel`, emplacement 6), `src/data/buildingInfo.ts`, `src/data/names.ts`, `src/data/missions.ts` (texte de `pas-fiche`), `src/sim/newGame.ts`, `src/sim/advance.ts` (`shiftDates`), `src/save/migrations.ts`, `src/save/save.ts`, `tests/sim/helpers.ts`, `tests/save/migrations.test.ts`, `tests/save/save-robustness.test.ts`, `tests/data/slots.test.ts`, tout `version: 4` restant dans `src/` et `tests/`

**Interfaces :**
- Produces (types, `src/sim/types.ts`) :
  - `export type Job = 'soigneur' | 'entretien' | 'veterinaire' | 'fermier' | 'animateur'`
  - `export interface Employee { id: number; name: string; female: boolean; job: Job; xpH: number; hiredAt: number; enclosureIds: number[] }`
  - `export interface Candidate { id: number; name: string; female: boolean; job: Job; level: 1 | 2 | 3 }`
  - `export interface Staff { employees: Employee[]; candidates: Candidate[]; candidatesAt: number; payDay: number }` (`payDay` = `dayKey` de la dernière paie, −1 = jamais)
  - `GameState.version: 5`, `GameState.staff: Staff` ; `BuildingType` gagne `'personnel'`
- Produces (`src/data/staff.ts`) :
  - `JOBS: Record<Job, { title: string; titleF: string; wage: number; hireable: boolean }>` — soigneur/soigneuse 60, agent/agente d'entretien 50, vétérinaire 90, fermier/fermière 50, animateur/animatrice 70 ; `hireable` vrai pour soigneur, entretien, animateur seulement
  - `STAFF = { LEVEL_XP_H: [0, 48, 120, 240, 480], WAGE_PER_LEVEL: 0.1, KEEPER_ANIMALS: 12, KEEPER_PER_LEVEL: 3, CLEANER_ENCLOSURES: 4, CLEANER_PER_LEVEL: 1, CLEANER_CLEAN_BELOW: 0.5, GUIDE_BONUS: 0.1, GUIDE_BONUS_PER_LEVEL: 0.025, UNCARED_DIRT_FACTOR: 2, UNCARED_HAPPINESS_FACTOR: 0.75, UNPAID_EFFICIENCY: 0.5, ROOM_BASE: 2, ROOM_BY_HOUSE_LEVEL: [6, 10, 15], CANDIDATES_RESTOCK_H: 12, CANDIDATES_BASE: 3, CANDIDATE_LEVEL_ODDS: { 1: [1, 0, 0], 2: [0.75, 0.25, 0], 3: [0.6, 0.3, 0.1] }, GIFT_NAME: 'Léa' }`
  - `STAFF_NAMES: { name: string; female: boolean }[]` (dans `names.ts`, ≥ 30 prénoms, moitié-moitié)
- Produces (`src/data/economy.ts`) : `BUILDINGS.personnel = { name: 'Maison du personnel', withArticle: 'une maison du personnel', unlockLevel: 1, buildCost: 400, upgradeCost: [800, 2000], share: 0, spend: [0,0,0], maxClientsPerH: [0,0,0] }` ; `SLOTS` gagne `{ id: 6, …, unlockLevel: 1 }` à une place libre du village qui respecte les règles de `tests/data/slots.test.ts` (élargir la borne `x ≤ 24` du test si besoin, garder les autres) ; `BUILDING_ROLE.personnel` : « La maison du personnel loge tes employés : plus elle est grande, plus tu peux embaucher. »
- Migration : `4: (old) => ({ ...old, version: 5, staff: { employees: [], candidates: [], candidatesAt: old.time, payDay: -1 } })`
- `newGame` : `staff.employees = [{ id: nextId++, name: GIFT_NAME, female: true, job: 'soigneur', xpH: 0, hiredAt: time, enclosureIds: [encId] }]`, `candidates: []`, `candidatesAt: time` (premier tirage au premier pas), `payDay: dayKey(time, 0)`. Texte de `pas-fiche` : ajouter « Je t'offre aussi ta première soigneuse, Léa : elle veille déjà sur les moutons. »
- `shiftDates` décale `staff.candidatesAt` et `hiredAt`.

- [ ] **Step 1 : tests qui échouent**
  - `newGame` : `version: 5`, un employé soigneur « Léa » affecté à l'enclos des moutons, `payDay` = jour courant.
  - Migration : `MIGRATIONS[4]` donne `version: 5` et le `staff` vide ci-dessus, garde tout le reste ; une v4 complète se charge.
  - Validation : une v5 sans `staff`, avec un `job` inconnu, un `xpH` non fini, un `enclosureIds` qui n'est pas un tableau de nombres, ou un candidat de niveau 4 est illisible.
  - `BUILDINGS.personnel` existe, coûte 400 ; `SLOTS` a les ids 0 à 6 et le 6 respecte les distances du test.
- [ ] **Step 2 :** `npx vitest run tests/sim/staff.test.ts tests/save tests/data` → échecs attendus.
- [ ] **Step 3 :** implémenter (validation du `staff` dans `looksLikeGame`, `emptyState` des tests en v5).
- [ ] **Step 4 :** `npx vitest run` → tout vert.
- [ ] **Step 5 :** commit `V2-2 tâche 1 : état v5, données du personnel et première soigneuse`.

### Task 2: Effets du personnel dans la simulation — agent · **Sonnet**

**Files :**
- Create : `src/sim/staff.ts`
- Modify : `src/sim/advance.ts`, `src/sim/enclosure.ts` (`Roster` gagne la couverture), `src/sim/happiness.ts`, `src/sim/breeding.ts`, `src/sim/economy.ts` (bonus de l'animateur)
- Test : `tests/sim/staff.test.ts`, `tests/sim/happiness.test.ts`, `tests/sim/breeding.test.ts`, `tests/sim/perf.test.ts`

**Interfaces :**
- Consumes : tâche 1.
- Produces (`src/sim/staff.ts`) :
  - `employeeLevel(e: Employee): 1|2|3|4|5` (d'après `LEVEL_XP_H`) ; `xpForLevel(level): number`
  - `wage(job: Job, level: number): number` = `Math.round(JOBS[job].wage × (1 + WAGE_PER_LEVEL × (level − 1)))`
  - `isUnpaid(state): boolean` = `state.coins < 0` ; `efficiency(state): number` = 1 ou `UNPAID_EFFICIENCY`
  - `keeperCapacity(state, e): number` = `floor((KEEPER_ANIMALS + KEEPER_PER_LEVEL × (lvl − 1)) × efficiency)` ; `cleanerCapacity(state, e)` = `max(1, floor((CLEANER_ENCLOSURES + CLEANER_PER_LEVEL × (lvl − 1)) × efficiency))`
  - `careCoverage(state, roster?): Map<number, number>` — part (0 à 1) des animaux suivie, par enclos : les soigneurs dans l'ordre des ids, chacun répartit sa capacité sur ses `enclosureIds` dans l'ordre ; ids inconnus ignorés ; enclos vide → 1
  - `guideBonus(state): number` — somme sur les animateurs de `(GUIDE_BONUS + GUIDE_BONUS_PER_LEVEL × (lvl − 1)) × efficiency`
  - `staffStep(state, events)` (cette tâche : effets seulement ; la tâche 3 y ajoute paie et candidats) :
    1. saleté : pour chaque enclos, `cleanedAt -= (UNCARED_DIRT_FACTOR − 1) × (1 − couverture) × STEP_MS` ;
    2. agents : chaque agent nettoie (`cleanedAt = time`, gratuit, ne compte pas dans `stats.nettoyages`) ses `cleanerCapacity` premiers enclos dont la propreté est sous `CLEANER_CLEAN_BELOW` ;
    3. expérience : `xpH += STEP_MS / HOUR_MS` pour chaque employé ; passage de niveau → événement `{ kind: 'employeNiveau'; at; employeeId; name; level }` (ajouté à `GameEvent`).
  - `step()` : `feedStep` → **`staffStep`** → `healthStep` → `breedingStep` → …
  - `buildRoster` calcule `care: Map<number, number>` ; `happiness` × `1 − (1 − c) × (1 − UNCARED_HAPPINESS_FACTOR)` ; chance de conception × `c` ; `visitorsPerHour` × `(1 + guideBonus)`.

- [ ] **Step 1 : tests qui échouent**
  - Couverture : soigneur niveau 1 sur un enclos de 10 → 1 ; sur 2 enclos de 8 et 8 → premier 1, second 0,5 ; deux soigneurs sur un enclos de 20 → 1 ; enclos sans soigneur → 0 ; enclos vide → 1 ; id d'enclos inconnu ignoré.
  - Saleté : en 12 h, un enclos sans soigneur passe de propre à 0 ; suivi, il est à 0,5.
  - Bonheur : même enclos, suivi vs non suivi → rapport 0,75.
  - Naissances : enclos non suivi → aucune conception en 30 jours ; suivi → au moins une (graine fixe).
  - Agent : enclos à 0,4 de propreté nettoyé au pas suivant, `stats.counts.nettoyages` inchangé ; un agent niveau 1 avec 6 enclos sales n'en nettoie que 4 par pas.
  - Expérience : 48 h de travail → niveau 2 et un événement `employeNiveau` ; `wage('soigneur', 2)` = 66.
  - Caisse sous zéro : capacités divisées par 2 (12 → 6 animaux).
  - Animateur : visiteurs/h × 1,1 ; deux animateurs × 1,2.
  - `perf.test.ts` reste sous ses seuils.
- [ ] **Step 2 :** lancer → échecs attendus.
- [ ] **Step 3 :** implémenter.
- [ ] **Step 4 :** `npx vitest run` → tout vert (ajuster les anciens tests de bonheur/naissance qui supposaient un enclos sans soigneur : leur donner un soigneur dans `helpers.ts` plutôt que changer leurs attentes).
- [ ] **Step 5 :** commit `V2-2 tâche 2 : soigneurs, agents d'entretien et animateurs agissent`.

### Task 3: Paie, dette, candidats et actions — agent · **Sonnet**

**Files :**
- Modify : `src/sim/staff.ts`, `src/sim/actions.ts`, `src/sim/types.ts` (événement `paie`)
- Test : `tests/sim/staff.test.ts`, `tests/sim/actions.test.ts`

**Interfaces :**
- Consumes : tâches 1 et 2, `dayKey` (`src/sim/missions.ts`), `random`.
- Produces (`src/sim/staff.ts`) :
  - `dailyWages(state): number` — somme des salaires
  - `room(state): number` = `ROOM_BASE` sans maison, sinon `ROOM_BY_HOUSE_LEVEL[niveau − 1]`
  - `restockCandidates(state)` (en place) — `CANDIDATES_BASE + niveau du village` candidats, métiers tirés parmi `hireable`, niveau d'après `CANDIDATE_LEVEL_ODDS[niveau du village]`, prénoms de `STAFF_NAMES` ; `candidatesAt = time + CANDIDATES_RESTOCK_H`
  - dans `staffStep`, après les effets : candidats renouvelés si `time >= candidatesAt` ; paie si `dayKey(time) > payDay` (`payDay = −1` → on note le jour sans payer) : `coins = max(coins − W, −W)`, événement `{ kind: 'paie'; at; wages: W; debt: boolean }` (`debt` = caisse sous zéro après la paie)
  - `autoAssign(state): GameState` (pur, renvoie une copie) — soigneurs : enclos occupés du plus peuplé au moins peuplé, remplis dans l'ordre des capacités (un grand enclos peut prendre deux soigneurs) ; agents : tous les enclos répartis à tour de rôle dans la limite des capacités ; animateurs : rien
  - `layoffImpact(state, employeeId): { animals: number; enclosures: number }` — animaux qui ne seraient plus suivis / enclos plus nettoyés
- Produces (actions, `src/sim/actions.ts`) :
  - `{ type: 'embaucher'; candidateId: number }` → refus « Introuvable. », « La maison du personnel est pleine (N places). Agrandis-la pour embaucher. » (sans maison : « Construis la maison du personnel pour embaucher plus. ») ; l'employé reçoit `xpH = xpForLevel(candidat.level)` et quitte la liste des candidats ; un soigneur ou un agent embauché est aussitôt affecté par `autoAssign`
  - `{ type: 'licencier'; employeeId: number }` → retire l'employé, sans indemnité
  - `{ type: 'affecter'; employeeId: number; encId: number; on: boolean }` → soigneur ou agent seulement (« Ce métier ne s'affecte pas à un enclos. »)
  - `{ type: 'repartir' }` → `autoAssign`
  - Nouvel enclos ou nouvel animal (`construire`, `acheterAnimal`) : si l'enclos n'est suivi par personne, il est ajouté au premier soigneur (puis au premier agent) qui a encore de la place — sinon les cochons des premiers pas ne feraient jamais de petits
  - Dette : `applyAction` refuse, si `coins < 0`, `acheterAnimal`, `construire`, `redimensionner` (quand il coûte), `batir`, `ameliorer`, `agrandirGardeManger`, `tracerChemin`, `relierEnclos`, `embaucher` avec « Le parc a une dette de N pièces : pas d'achat ni de construction avant qu'elle soit remboursée. » (N arrondi au-dessus)

- [ ] **Step 1 : tests qui échouent**
  - Paie : à minuit, 2 employés niveau 1 (60 + 50) → `coins − 110`, un seul événement `paie` ; 3 jours d'avance → 3 paies ; nouvelle partie au premier minuit → 60.
  - Dette : caisse 20, salaires 110 → −90 ; caisse −90 au minuit suivant → −110 (plafond), jamais moins.
  - Blocage : avec `coins = −10`, `acheterAnimal` et `batir` refusés avec le texte exact ; `vendre` et `licencier` acceptés.
  - Candidats : nouvelle partie → 4 candidats au premier pas, tous niveau 1, jamais vétérinaire ni fermier ; renouvelés après 12 h (ids différents).
  - Embauche : sans maison, 2 employés max (texte exact) ; avec maison niveau 1, 6 ; candidat niveau 2 → employé niveau 2 ; soigneur embauché affecté.
  - `autoAssign` : 3 enclos de 10, 6 et 0 animaux, 2 soigneurs niveau 1 → tout est couvert ; 1 soigneur pour 30 animaux → les plus peuplés d'abord.
  - Licencier le dernier soigneur → `layoffImpact` = tous les animaux, couverture 0 partout.
  - Premiers pas : nouvelle partie, construire un 2ᵉ enclos puis y acheter les cochons → l'enclos est suivi par Léa (couverture 1).
- [ ] **Step 2 :** lancer → échecs attendus.
- [ ] **Step 3 :** implémenter.
- [ ] **Step 4 :** `npx vitest run` → tout vert.
- [ ] **Step 5 :** commit `V2-2 tâche 3 : paie, dette, candidats, embauche et affectation`.

### Task 4: Ancienne partie, Gazette, joueur automatique et 3 jours d'absence — agent · **Sonnet**

**Files :**
- Modify : `src/game/session.ts`, `src/main.ts` (affichage du message), `src/sim/summary.ts`, `src/ui/gazetteModel.ts`, `tests/balance/bot.ts`
- Test : `tests/game/session.test.ts`, `tests/ui/gazetteModel.test.ts`, `tests/sim/absence.test.ts`, `tests/balance/playthrough.test.ts`

**Interfaces :**
- Consumes : `autoAssign`, `staffStep`, actions de la tâche 3.
- Produces :
  - `Session.staffNotice: string | null` — si `fromVersion < 5` : **avant** le rattrapage, Léa (soigneuse niveau 1) est ajoutée, `autoAssign`, `payDay` = jour courant ; texte : « Nouveau à Clairbois : le personnel ! Margaux t'offre ta première soigneuse, Léa. Un enclos sans soigneur se salit deux fois plus vite, ses animaux sont moins heureux et ne font plus de petits. Embauche et répartis ton équipe dans le volet Personnel. » ; affiché après `pathsNotice` s'il y en a un.
  - `Summary` gagne `salaires: number`, `dette: boolean` (caisse finale sous zéro), `promus: string[]` (« Léa passe niveau 2 ») ; la Gazette affiche « Salaires payés : N pièces », la dette en rouge, les promotions.
  - Joueur automatique : à chaque passage, il construit la maison quand il lui faut une 3ᵉ place, l'améliore quand elle est pleine, embauche des soigneurs jusqu'à couvrir tous ses animaux (+1 en avance au-delà de 20 animaux), un agent par 4 enclos dès 3 enclos, un animateur au Village, puis `repartir`.
- [ ] **Step 1 : tests qui échouent**
  - Session : sauvegarde v4 avec 20 animaux → Léa présente et affectée, `staffNotice` non nul, une v5 → `null`.
  - Gazette : 2 paies + une promotion → lignes attendues ; dette signalée.
  - Absence (`absence.test.ts`) : parc bien tenu (bot à 10 jours, garde-manger plein pour 3 jours, caisse ≥ 3 jours de salaires) avancé de 72 h → 0 mort, aucune `paie` avec `debt`, caisse finale ≥ 0.
  - `playthrough.test.ts` : bornes inchangées (Village ≤ 4, Bourg 4–9, fin 14–24, 0 mort) ; aucun enclos occupé non suivi à la fin.
- [ ] **Step 2 :** lancer → échecs attendus.
- [ ] **Step 3 :** implémenter.
- [ ] **Step 4 :** `npx vitest run` → tout vert ; noter le rythme et les salaires du joueur automatique dans le compte rendu.
- [ ] **Step 5 :** commit `V2-2 tâche 4 : ancienne partie, Gazette, joueur automatique et absence`.

### Task 5: Modèles des employés — agent · **Sonnet** (comme pour les promeneurs : il faut alléger les fichiers par un petit script)

**Files :**
- Create : `public/models/personnel/soigneuse.glb`, `agent.glb`, `animatrice.glb`
- Modify : `src/assets/manifest.ts`, `CREDITS.md`, `tests/assets/manifest.test.ts`

**Interfaces :**
- Produces : clés `employeSoigneur`, `employeAgent`, `employeAnimateur` dans `MODELS` ; chaque fichier ≤ 1,3 Mo, animations « marche » et « attente » seulement (même méthode et même script que la tâche 7 de l'étape 6 de la V1, sources dans `_telechargements/personnages/` : femmes `Worker.gltf`, hommes `Worker.gltf`, femmes `Medieval.gltf`).

- [ ] **Step 1 :** test qui échoue : les 3 clés existent et pointent vers des fichiers présents.
- [ ] **Step 2 :** convertir et alléger ; crédits CC0 Quaternius.
- [ ] **Step 3 :** `npx vitest run` et `npm run build` → verts.
- [ ] **Step 4 :** commit `V2-2 tâche 5 : modèles des employés`.

### Task 6: Maison du personnel et employés sur la carte — agent · **Sonnet**

**Files :**
- Create : `src/scene/staffView.ts`, `tests/scene/staffView.test.ts`
- Modify : `src/scene/villageView.ts` (allure de la maison : `maison4` et petits objets), `src/data/visuals.ts` (`STAFF_WALKERS`), `src/main.ts`

**Interfaces :**
- Consumes : `state.staff`, `MODELS`, `wander.ts`, `visitorsView.ts` (même façon d'animer un personnage).
- Produces :
  - `STAFF_WALKERS = { MAX_DESKTOP: 8, MAX_MOBILE: 5, SPEED: 1.1, PAUSE_MIN_S: 4, PAUSE_MAX_S: 10, MARGIN_M: 1.2 }`
  - `staffSpots(state, e: Employee): PathPoint[]` (pure) — points le long des clôtures de ses enclos, à `MARGIN_M` à l'extérieur ; animateur : points de l'allée de l'entrée ; employé sans enclos : devant la maison du personnel (ou la mairie)
  - `createStaffView(world, opts: { mobile: boolean }): { update(state: GameState, dt: number): void; dispose(): void }` — un personnage par employé (les premiers par id jusqu'au maximum), qui marche d'un point à l'autre et s'arrête ; apparition/disparition en douceur à l'embauche et au licenciement ; la nuit, ils rentrent (disparaissent)
- [ ] **Step 1 : tests qui échouent** : `staffSpots` hors des clôtures, sur l'allée pour l'animateur, devant la maison sans enclos.
- [ ] **Step 2 :** lancer → échec attendu.
- [ ] **Step 3 :** implémenter et brancher dans la boucle de `main.ts`.
- [ ] **Step 4 :** `npx vitest run` et `npm run build` → verts.
- [ ] **Step 5 :** commit `V2-2 tâche 6 : maison du personnel et employés sur la carte`.

### Task 7: Interface — volet Personnel, fiches, dette — agent · **Sonnet**

**Files :**
- Create : `src/ui/staffPanel.ts`, `src/ui/staffModel.ts`, `tests/ui/staffModel.test.ts`
- Modify : `src/ui/topBar.ts`, `src/ui/bottomBar.ts`, `src/ui/buildingInfo.ts`, `src/ui/icons.ts`, `src/style.css`, `src/main.ts`

**Interfaces :**
- Consumes : `careCoverage`, `room`, `dailyWages`, `employeeLevel`, `wage`, `layoffImpact`, `keeperCapacity`, `cleanerCapacity`, actions `embaucher` / `licencier` / `affecter` / `repartir`, `confirmGuard`, `drawer`.
- Produces (pur, `src/ui/staffModel.ts`) :
  - `jobTitle(job, female): string`
  - `employeeLine(state, e): string` — « Léa · soigneuse niv. 2 · 66 pièces/jour · 14/15 animaux »
  - `enclosureCareLine(state, encId): { text: string; warn: boolean }` — « Soigneuse : Léa · Agent : Paul » ou « Pas de soigneur : il se salit vite et ne fait plus de petits » (`warn`), « Suivi à moitié : 4 animaux sans soigneur » (`warn`)
  - `layoffWarning(state, id): string` — « Sans indemnité. » + « 12 animaux n'auront plus de soigneur. » s'il y a lieu
  - `debtLine(state): string | null` — « Dette : 90 pièces. Pas d'achat ni de construction avant qu'elle soit remboursée. »
- Volet **Personnel** (case « Personnel 3/6 » de la barre du haut, nouvelle icône) : en tête effectif / places, salaires du jour, ligne de dette ; bouton **Répartir** ; employés (ligne + **Affecter** qui déplie la liste des enclos à cocher pour soigneurs et agents + **Licencier** en deux clics avec `layoffWarning`) ; candidats (métier, niveau, salaire, **Embaucher**, refus affiché par le retour visuel habituel) et « Nouveaux candidats dans 5 h ».
- Fiche d'un enclos (barre du bas) et volet Détails : `enclosureCareLine`, en rouge si `warn`, avec **Répartir**.
- Fiche de la maison du personnel (`buildingInfo`) : places occupées / places, prochain niveau, bouton « Ouvrir le personnel ».
- Barre du haut : pièces en rouge sous zéro ; un tap montre `debtLine`.

- [ ] **Step 1 : tests qui échouent** : `employeeLine`, `enclosureCareLine` (suivi, à moitié, sans soigneur, enclos vide sans ligne rouge), `layoffWarning`, `debtLine`.
- [ ] **Step 2 :** lancer → échecs attendus.
- [ ] **Step 3 :** implémenter.
- [ ] **Step 4 :** `npx vitest run` et `npm run build` → verts.
- [ ] **Step 5 :** commit `V2-2 tâche 7 : volet Personnel, fiches et dette`.

### Task 8: Vérification d'ensemble, relecture et publication — chef (**Opus**) + relecture · **Opus**

- [ ] Navigateur (`?heure=14`) : nouvelle partie (Léa près des moutons, texte de Margaux), candidats, embauche jusqu'à la limite, maison du personnel sur le 7ᵉ emplacement puis plus de places, Affecter / Répartir, enclos non suivi en rouge, Licencier en deux clics, paie à minuit (`?debug` ou avance du temps), dette et blocage d'un achat, employés qui flânent, téléphone 375 × 812.
- [ ] Ancienne partie : charger une sauvegarde v4 (type « partie de Romain ») → Léa offerte et affectée, message unique, Gazette avec la paie.
- [ ] Relecture indépendante Opus de toute la branche ; corrections par un agent Sonnet (Opus si subtil).
- [ ] `progress.md` à jour ; fusion dans `main` **seulement avec l'accord de Romain** ; vérification en ligne.
