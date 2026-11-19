# V2 — Étape 2 : le personnel — plan de construction

> **Votes de Romain (19/11/2026)** — D5 (dette) validée telle quelle : tout est bloqué sauf rations, ventes, nettoyage et licenciement ; employés à 50 %. Les autres décisions sont acceptées telles que proposées (chiffres réglés à l'étape 7). Au lancement (19/11/2026), Romain a choisi l'emplacement de la maison du personnel : **au fond du village**, derrière les emplacements du Bourg (aucune place près de la mairie).

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal :** le parc a besoin d'employés payés chaque jour : des soigneurs qui suivent les animaux (sinon enclos plus sale, animaux moins heureux, pas de naissance) et des agents d'entretien qui nettoient ; on les embauche parmi des candidats, dans la limite de la maison du personnel.

**Architecture :** l'état gagne `staff` (sauvegarde v5). Les règles sont pures : `src/sim/care.ts` (qui suit quels animaux, effets, nettoyage par l'agent, affectation automatique) et `src/sim/staff.ts` (niveau, salaire, paie de minuit, dette, candidats, actions). Les chiffres vivent dans `src/data/staff.ts`. L'interface (volet Personnel, fiches) et les employés sur la carte ne font que lire l'état.

**Tech Stack :** TypeScript, Three.js, Vitest (`export PATH="/c/Program Files/nodejs:$PATH"; npx vitest run`), `npm run build`.

**Spec :** `docs/superpowers/specs/2026-11-19-parc-de-clairbois-v2-design.md` §4 (personnel), §8 (maison du personnel, emplacement), §12 « Étape 2 » ; conception V1 pour le reste.

**Branche :** `etape-v2-2-personnel`, créée depuis `main` **après** la fusion de l'étape 1 (chemins).

## Ce qui dépend de l'étape 1 (à revérifier au lancement)

Ce plan a été écrit pendant la construction de l'étape 1 (branche `etape-v2-1-chemins`, tâches 1 et 2 faites, tâche 3 en cours). Avant la tâche 1, le chef relit `main` et corrige le plan si l'un de ces points a changé :

> **Revérifié le 19/11/2026 au lancement** (`main` 4935132 fusionné, 713 tests) : les 7 points sont conformes (v4 + `MIGRATIONS[3]`, `fromVersion`, `pathsNotice`, actions `tracerChemin` / `relierEnclos` / `detruireChemin`, `visibleAnimals`, joueur automatique qui relie ses enclos — rythme de référence : Village jour 3, Bourg jour 7, fin jour 18-19 —, `Pick` `chemin`, `emptyState` en v4). Une seule correction : il n'y a **aucune place libre près de la mairie** qui respecte les règles des emplacements (≥ 9 m des autres, ≥ 4,5 m des rues, x de 8 à 24) ; l'emplacement 6 va donc **au fond du village, vers (17, −19)**, entre et derrière les emplacements 4 et 5 du Bourg (tâche 4 corrigée).

1. **Version de sauvegarde** : l'étape 1 met `CURRENT_VERSION = 4` et `MIGRATIONS[3]` (ajout de `paths`). Ici on ajoute `MIGRATIONS[4]` → v5. Si l'étape 1 a fini en une autre version, décaler d'autant.
2. **`LoadResult.fromVersion`** (ajouté par l'étape 1 dans `src/save/save.ts`) et le modèle « cadeau avant le rattrapage » de `startSession` (`giftPaths` puis `pathsNotice`) : la tâche 5 copie ce modèle pour `staffNotice`.
3. **Actions de l'étape 1** (`tracerChemin`, `relierEnclos`, `detruireChemin`) : les deux premières sont bloquées pendant une dette (tâche 5).
4. **`visibleAnimals`** dans `src/sim/economy.ts` : l'attrait ne compte que les enclos reliés ; le personnel, lui, s'occupe de tous les animaux (reliés ou non).
5. **`tests/balance/bot.ts`** : l'étape 1 lui fait relier chaque nouvel enclos ; la tâche 5 ajoute l'embauche par-dessus. Noter les dates de passage de niveau obtenues à la fin de l'étape 1 (point de comparaison).
6. **`Pick`** gagne `{ kind: 'chemin' }` à l'étape 1 : la barre du bas en tient compte (tâche 7).
7. **Nombre de tests** à la fin de l'étape 1 (pour le compte rendu) et `tests/sim/helpers.ts` (`emptyState` en v4 avec `paths: []`).

## Global Constraints

- Règles pures et testées dans `src/sim/`, chiffres dans `src/data/`, aucune logique dans `src/data/`.
- Le temps n'avance que par `advanceTo` (pas de 10 min) ; les actions passent par `applyAction` et renvoient un nouvel état (`structuredClone`) ou un refus en français affichable tel quel.
- Sauvegarde versionnée : `CURRENT_VERSION` passe de 4 à 5 ; migration écrite en clair, sans appeler le jeu ; la partie de Romain continue sans perte.
- Cinq métiers (soigneur, agent d'entretien, vétérinaire, fermier, animateur) ; paie chaque jour à minuit ; dette limitée à une journée de salaires ; personne ne démissionne ; licenciement sans indemnité.
- Sans soigneur, la part non suivie d'un enclos se salit **2× plus vite**, ses animaux sont moins heureux et n'ont plus de naissances ; on peut encore nettoyer à la main.
- Affectation automatique **modifiable** ; nombre d'employés limité par la maison du personnel : **3 sans maison**, puis 6 / 10 / 15.
- Premier soigneur offert par Margaux (nouvelle partie **et** partie existante, tout de suite).
- Gestion dans un **volet Personnel** ouvert par une nouvelle icône de la barre du haut.
- Téléphone et ordinateur : tout au tap, volet lisible en 375 × 812, boutons d'au moins 44 px.
- Textes du jeu en français simple, tutoiement. Modèles 3D CC0 déjà présents (aucun téléchargement à cette étape).

## Décisions laissées au constructeur (à faire valider par Romain avec le plan)

- **D1 — Métiers ouverts maintenant** : seulement **soigneur** et **agent d'entretien**. Vétérinaire (étape 3), fermier (étape 4) et animateur (étape 5) existent déjà dans les données et apparaissent dans le volet en gris « Bientôt », sans candidat.
- **D2 — Chiffres de départ** (réglés à l'étape 7) : salaire 60 pièces/jour (soigneur), 40 (agent), +20 % par niveau ; un soigneur suit 12 / 14 / 16 / 18 / 20 animaux selon son niveau ; un agent entretient 4 / 5 / 6 / 7 / 8 enclos ; niveaux 2 à 5 après 3, 7, 14 et 28 jours de travail.
- **D3 — Animal « suivi »** : dans chaque enclos, les animaux les plus anciens (plus petit numéro) sont suivis en premier. Un animal non suivi : bonheur × 0,7, pas de nouvelle gestation (une gestation déjà commencée va à son terme). L'enclos se salit plus vite en proportion des animaux non suivis.
- **D4 — Agent d'entretien** : il nettoie gratuitement un enclos confié dès que sa propreté passe sous 50 %. Ses nettoyages ne comptent pas pour la mission du jour « Nettoie n fois » (elle reste une action du joueur).
- **D5 — Dette** : paie à minuit, heure de l'appareil (comme les missions du jour). La caisse ne descend jamais sous −1 journée de salaires. Tant qu'elle est négative : employés à 50 %, et sont refusés construire / agrandir un enclos, bâtir / améliorer un bâtiment, agrandir le garde-manger, acheter un animal, tracer / relier un chemin, embaucher. Restent possibles : rations, ventes, nettoyage, billet, licencier.
- **D6 — Candidats** : 4, renouvelés toutes les 12 h ; niveau 1 (60 %), 2 (30 %), 3 (10 %) ; soigneur 60 %, agent 40 % ; le tout premier tirage contient au moins un soigneur et un agent ; pas de frais d'embauche.
- **D7 — Affectation automatique** : seulement à l'embauche, à un nouvel enclos, à l'achat d'un animal, à une naissance et au licenciement, et **seulement pour combler les trous** (elle ne retire jamais un enclos à un employé) ; le bouton **Répartir** refait toute la répartition.
- **D8 — Maison du personnel** : un 7ᵉ emplacement réservé, au fond du village derrière les emplacements du Bourg (vers x 17, z −19 : il n'y a pas de place libre près de la mairie) ; dès le Hameau ; 400 pièces, améliorations 900 puis 2 000 ; elle compte dans les habitants comme les autres bâtiments (+5 par niveau) ; allure faite avec des modèles déjà présents (maison, banc, tonneau).
- **D9 — Ancienne partie** : Léa (soigneuse) est offerte avant le rattrapage de l'absence, et **l'absence d'avant la mise à jour se rejoue avec les règles de la V1** (tous les animaux suivis) ; dès le retour du joueur, les nouvelles règles s'appliquent sans délai (choix de Romain). Message unique à l'ouverture.
- **D10 — Employés sur la carte** : on réutilise les modèles des promeneurs (fermier pour les soigneurs, aventurière pour les agents) ; chacun fait le tour de son premier enclos, ou flâne près de la maison du personnel (sinon de la mairie) ; au plus 8 (4 sur téléphone) ; pas de clic sur eux.
- **D11 — Barre du haut** : nouvelle case « Personnel » (icône + `2/3`), rouge s'il y a des animaux non suivis ou une dette ; le nombre de pièces passe en rouge quand il est négatif. Sur téléphone, seulement l'icône et le nombre.
- **D12 — Missions** : aucune nouvelle mission à cette étape (les index d'histoire sont figés dans la migration v2→v3 ; les quotidiennes du personnel arrivent à l'étape 7). On réécrit les textes de `pas-fiche` (Margaux présente Léa), `pas-gestation` et `hist-naissance` pour citer le soigneur, et la quotidienne « Une naissance » n'est tirée que s'il existe une femelle adulte **suivie** avec un mâle adulte.

## Review Focus

1. **Grosse partie existante avec un seul soigneur** (partie de Romain : des dizaines d'animaux) : le rattrapage de l'absence d'avant la mise à jour ne tue ni ne rend malade plus qu'en V1 ; au retour, les enclos non suivis sont signalés en rouge, rien ne plante (tests en tâches 2 et 5).
2. **Minuit pendant une longue absence avec une caisse vide** : plusieurs nuits de suite, la caisse reste à −1 journée de salaires au plus, les recettes remboursent, l'efficacité revient à 100 % ; une horloge qui recule ne paie pas deux fois ; le saut au-delà de 30 jours ne paie pas en double (tests en tâche 3).
3. **Emplacement réservé** : le « ! » de « Construis le café » (`freeSlot`) ne montre jamais l'emplacement de la maison ; on ne bâtit pas de café dessus, ni la maison ailleurs ; les anciennes sauvegardes (bâtiments sur 0–5) restent valides (tests en tâche 4).
4. **Choix manuels respectés** : après une naissance ou un achat, l'affectation automatique ne retire pas l'enclos qu'un joueur a confié à la main ; un enclos dont tous les animaux sont vendus ne bloque rien ; licencier le dernier soigneur laisse les animaux non suivis sans erreur (tests en tâches 2 et 5).
5. **Anciens tests** : `emptyState` garde les règles V1 (tous suivis) pour que les tests de bonheur, naissances, missions ne changent pas de sens ; les nouveaux tests activent les règles explicitement (`coverAllUntil: 0`) (tâche 1).

---

### Task 1: État v5, données du personnel, nouvelle partie — agent · **Sonnet**

**Files :**
- Create : `src/data/staff.ts`, `src/sim/staff.ts`, `tests/sim/staff.test.ts`
- Modify : `src/sim/types.ts`, `src/data/names.ts`, `src/sim/newGame.ts`, `src/sim/advance.ts` (`shiftDates`), `src/save/migrations.ts`, `src/save/save.ts` (`looksLikeGame`), `tests/sim/helpers.ts`, `tests/save/migrations.test.ts`, `tests/save/save-robustness.test.ts`, `tests/sim/newGame.test.ts`, tout `version: 4` restant dans `src/` et `tests/`

**Interfaces :**
- Produces (types, `src/sim/types.ts`) :
  - `export type JobId = 'soigneur' | 'entretien' | 'veterinaire' | 'fermier' | 'animateur'`
  - `export type StaffLevel = 1 | 2 | 3 | 4 | 5`
  - `export interface Employee { id: number; name: string; job: JobId; xpH: number; hiredAt: number; encIds: number[] }` — le niveau se déduit de `xpH` (jamais stocké)
  - `export interface Candidate { id: number; name: string; job: JobId; level: StaffLevel }`
  - `export interface Staff { employees: Employee[]; candidates: Candidate[]; renewAt: number; renewals: number; payDay: number; coverAllUntil: number }` — `payDay = -1` : pas encore de jour noté (le premier pas note le jour sans payer) ; `coverAllUntil` : jusqu'à cette heure du jeu, tous les animaux comptent comme suivis (D9)
  - `GameState.version: 5`, `GameState.staff: Staff`
- Produces (`src/data/staff.ts`) :
  - `JOBS: Record<JobId, { name: string; open: boolean; wage: number }>` — soigneur `{ 'Soigneur', true, 60 }`, entretien `{ "Agent d'entretien", true, 40 }`, veterinaire `{ 'Vétérinaire', false, 80 }`, fermier `{ 'Fermier', false, 50 }`, animateur `{ 'Animateur', false, 60 }`
  - `STAFF_TUNING = { XP_LEVEL_H: [0, 72, 168, 336, 672], WAGE_PER_LEVEL: 0.2, KEEPER_ANIMALS: [12, 14, 16, 18, 20], CLEANER_ENCLOSURES: [4, 5, 6, 7, 8], CLEAN_BELOW: 0.5, UNCOVERED_DIRT_FACTOR: 2, UNCOVERED_HAPPINESS: 0.7, DEBT_EFFICIENCY: 0.5, CAP_NO_HOUSE: 3, CAP_BY_HOUSE_LEVEL: [6, 10, 15], CANDIDATES: 4, RENEW_H: 12, CANDIDATE_LEVELS: [[1, 0.6], [2, 0.3], [3, 0.1]], CANDIDATE_JOBS: [['soigneur', 0.6], ['entretien', 0.4]] }`
  - `FIRST_KEEPER = { name: 'Léa', job: 'soigneur' as const }`
- Produces (`src/data/names.ts`) : `STAFF_NAMES: string[]` (au moins 30 prénoms français variés, sans « Léa » ni « Margaux »)
- Produces (`src/sim/staff.ts`) :
  - `employeeLevel(e: Employee): StaffLevel` — plus grand niveau dont le seuil `XP_LEVEL_H` est atteint
  - `wage(job: JobId, level: StaffLevel): number` = `Math.round(JOBS[job].wage × (1 + WAGE_PER_LEVEL × (level − 1)))`
  - `dailyWages(state: GameState): number` — somme des salaires des employés
  - `firstKeeper(state: GameState, encIds: number[]): Employee` — Léa, niveau 1, `id: state.nextId++`, `hiredAt: state.time`
- Migration : `4: (old) => ({ ...old, version: 5, staff: { employees: [], candidates: [], renewAt: old.time, renewals: 0, payDay: -1, coverAllUntil: 0 } })`
- `newGame` : Léa affectée à l'enclos de départ ; `candidates: []`, `renewAt: time` (le premier pas tire les candidats), `payDay: -1`, `coverAllUntil: 0`.
- `emptyState` (tests) : `version: 5`, `staff: { employees: [], candidates: [], renewAt: <time>, renewals: 0, payDay: -1, coverAllUntil: Number.MAX_SAFE_INTEGER }` avec un commentaire : « les anciens tests gardent les règles V1 ; un test du personnel met `coverAllUntil: 0` ».
- `shiftDates` décale `hiredAt` et `renewAt`, **pas** `coverAllUntil` (sinon le délai de D9 s'allongerait après un saut de 30 jours).

- [ ] **Step 1 : tests qui échouent**
  - `tests/sim/staff.test.ts` : `employeeLevel` vaut 1 à 0 h, 1 à 71,9 h, 2 à 72 h, 5 à 672 h et au-delà ; `wage('soigneur', 1)` = 60, `wage('soigneur', 3)` = 84, `wage('entretien', 2)` = 48.
  - `tests/sim/newGame.test.ts` : `version: 5` ; un seul employé, `name: 'Léa'`, `job: 'soigneur'`, `encIds` = [id de l'enclos des moutons], `xpH: 0` ; `payDay: -1`, `coverAllUntil: 0`.
  - `tests/save/migrations.test.ts` : `MIGRATIONS[4]` donne `version: 5` et le `staff` vide ci-dessus, garde tout le reste (dont `paths`).
  - `tests/save/save-robustness.test.ts` : une v5 sans `staff`, avec `job: 'pilote'`, `xpH: 'a'`, `encIds: 'x'`, un candidat `level: 7`, ou `payDay: NaN` est illisible ; une v4 valide se charge en v5.
- [ ] **Step 2 :** `npx vitest run tests/sim/staff.test.ts tests/sim/newGame.test.ts tests/save` → échecs attendus.
- [ ] **Step 3 :** implémenter types, données, `src/sim/staff.ts`, migration, `CURRENT_VERSION = 5`, validation (`staff` objet ; employés : `id` fini, `name` texte, `job` dans `JOBS`, `xpH` fini ≥ 0, `hiredAt` fini, `encIds` tableau de nombres finis ; candidats : `id`, `name`, `job` dans `JOBS`, `level` entier 1–5 ; `renewAt`, `renewals`, `payDay`, `coverAllUntil` finis), `newGame`, `emptyState`, `shiftDates`.
- [ ] **Step 4 :** `npx vitest run` → tout vert (anciens tests compris).
- [ ] **Step 5 :** commit `V2-2 tâche 1 : état v5 et données du personnel`.

### Task 2: Soigneurs et agents d'entretien — qui suit quoi, effets, affectation — agent · **Sonnet**

**Files :**
- Create : `src/sim/care.ts`, `tests/sim/care.test.ts`
- Modify : `src/sim/enclosure.ts` (`Roster.covered`), `src/sim/happiness.ts`, `src/sim/breeding.ts`, `src/sim/advance.ts` (ordre des pas), `src/sim/missions.ts` (`POSSIBLE.couple`), `src/data/missions.ts` (deux textes)
- Test : `tests/sim/care.test.ts`, `tests/sim/happiness.test.ts`, `tests/sim/breeding.test.ts`, `tests/sim/missions.test.ts`

**Interfaces :**
- Consumes : tâche 1 (`Staff`, `employeeLevel`, `STAFF_TUNING`).
- Produces (`src/sim/care.ts`, **sans importer `enclosure.ts`** pour éviter une boucle d'imports) :
  - `efficiency(state: GameState): number` — `DEBT_EFFICIENCY` si `state.coins < 0`, sinon 1
  - `keeperCapacity(state, e: Employee): number` = `Math.floor(KEEPER_ANIMALS[niveau − 1] × efficiency)`
  - `cleanerCapacity(state, e: Employee): number` = `Math.floor(CLEANER_ENCLOSURES[niveau − 1] × efficiency)`
  - `careCoverage(state): { covered: Set<number>; byEnclosure: Map<number, { animals: number; covered: number }> }` — si `state.time <= staff.coverAllUntil` : tous suivis. Sinon : soigneurs par id croissant ; chacun remplit ses `encIds` dans l'ordre avec sa capacité restante ; dans un enclos, les animaux non encore suivis sont pris par id croissant.
  - `careStep(state, events): void` — pour chaque enclos ayant des animaux : `u = 1 − suivis / animaux` ; `cleanedAt -= STEP_MS × (UNCOVERED_DIRT_FACTOR − 1) × u`, sans descendre sous `time − DIRTY_AFTER_H h` ; puis chaque agent nettoie (`cleanedAt = time`), parmi ses `cleanerCapacity` premiers `encIds`, ceux dont `cleanliness < CLEAN_BELOW` (gratuit, aucun compteur).
  - `assignGaps(state): void` (en place) — retire des `encIds` les enclos disparus ; tant qu'un enclos a des animaux non suivis et qu'un soigneur a de la capacité libre, ajoute l'enclos à celui qui en a le plus (égalité : plus petit id) ; donne chaque enclos occupé sans agent à l'agent qui a une place libre (le plus de place, puis plus petit id). Ne retire jamais un enclos encore existant.
  - `redistribute(state): void` (en place) — vide les `encIds` des soigneurs et agents, puis `assignGaps` en servant les enclos du plus peuplé au moins peuplé.
- `Roster` gagne `covered: Set<number>` (rempli par `buildRoster` via `careCoverage`) ; `happiness` multiplie par `UNCOVERED_HAPPINESS` un animal absent de `covered` (calcul direct par `careCoverage` quand on n'a pas de roster) ; `breedingStep` saute une femelle non suivie.
- Ordre de `step` : `feedStep`, `careStep`, `healthStep`, `breedingStep`, `economyStep`, `merchantStep`, (`staffStep` à la tâche 3), `missionsStep`.
- `POSSIBLE.couple` (missions) : vrai seulement s'il existe une femelle adulte **suivie** et un mâle adulte dans le même enclos.
- Textes (`src/data/missions.ts`) :
  - `pas-gestation` : « Pour qu'une femelle attende un petit, il faut un mâle et une femelle adultes, de la place dans l'enclos, un soigneur qui les suit, et des animaux heureux et bien nourris. Sois patient, ça vient tout seul ! »
  - `hist-naissance` : « Un parc vit quand les petits arrivent. Veille à ce que tes couples aient un soigneur, et attends ta première naissance. »
  - `pas-fiche` : après « …de ton village et de ton zoo. », ajouter « Je t'envoie Léa, notre soigneuse : elle s'occupe déjà de tes moutons. » (Margaux présente le premier soigneur dans une nouvelle partie).

- [ ] **Step 1 : tests qui échouent** (`tests/sim/care.test.ts`, tous avec `coverAllUntil: 0`)
  - `capacité` : un soigneur niveau 1 sur un enclos de 15 animaux → 12 suivis (les 12 plus petits id) ; deux soigneurs sur le même enclos → 15 ; un soigneur sur [A (8), B (8)] → A 8, B 4 ; caisse à −1 → 6 suivis.
  - `règles V1 gardées` : avec `coverAllUntil` dans le futur et aucun employé, tous les animaux sont suivis.
  - `salissure` : enclos sans soigneur, nettoyé à `t` → propreté 0 après 12 h ; à moitié suivi → 0,25 après 12 h ; entièrement suivi → 0,5 ; un enclos vide ne se salit pas plus vite.
  - `agent` : enclos confié à 40 % de propreté → propre au pas suivant, `coins` et `stats.counts.nettoyages` inchangés ; en dette, un agent niveau 1 avec 4 enclos n'en nettoie que les 2 premiers.
  - `bonheur` (`happiness.test.ts`) : même animal non suivi = suivi × 0,7.
  - `naissances` (`breeding.test.ts`) : en 30 jours, une femelle non suivie (couple sinon parfait) ne conçoit jamais ; suivie, elle conçoit.
  - `assignGaps` : nouvel enclos de 5 animaux → ajouté au soigneur qui a de la place ; un enclos confié à la main à Léa reste à Léa après une naissance ; un enclos supprimé disparaît des `encIds` ; aucun soigneur libre → rien ne plante, animaux non suivis.
  - `redistribute` : 2 soigneurs, 3 enclos (20, 6, 4 animaux) → les 30 animaux sont suivis.
  - `missions.test.ts` : « Une naissance » n'est pas tirée quand le seul couple n'est pas suivi.
- [ ] **Step 2 :** `npx vitest run tests/sim` → échecs attendus.
- [ ] **Step 3 :** implémenter.
- [ ] **Step 4 :** `npx vitest run` → tout vert, y compris `tests/sim/perf.test.ts`.
- [ ] **Step 5 :** commit `V2-2 tâche 2 : soigneurs, agents d'entretien et affectation`.

### Task 3: Paie, dette, expérience et candidats — agent · **Sonnet**

**Files :**
- Modify : `src/sim/staff.ts`, `src/sim/types.ts` (événements), `src/sim/advance.ts`
- Test : `tests/sim/staff.test.ts`, `tests/sim/absence.test.ts`

**Interfaces :**
- Consumes : tâche 1 (`wage`, `employeeLevel`, `dailyWages`, `STAFF_NAMES`), tâche 2 (`assignGaps`), `dayKey` (`src/sim/missions.ts`), `random` (`src/sim/random.ts`).
- Produces (`GameEvent`) :
  - `{ kind: 'paie'; at: number; due: number; paid: number }`
  - `{ kind: 'niveauEmploye'; at: number; employeeId: number; name: string; level: StaffLevel }`
  - `{ kind: 'candidats'; at: number }`
- Produces (`src/sim/staff.ts`) :
  - `renewCandidates(state, events?): void` (en place) — `CANDIDATES` candidats, métiers tirés dans `CANDIDATE_JOBS` (seulement `JOBS[job].open`), niveau dans `CANDIDATE_LEVELS`, prénom dans `STAFF_NAMES`, `id: nextId++` ; si `renewals === 0`, au moins un soigneur et un agent ; `renewals++`, `renewAt = time + RENEW_H h`.
  - `staffStep(state, events): void`, dans cet ordre :
    1. expérience : `xpH += STEP_MS / HOUR_MS` pour chaque employé ; s'il change de niveau → `niveauEmploye` ;
    2. paie : `d = dayKey(time, utcOffsetMin)` ; si `payDay === -1` → `payDay = d` sans payer ; si `d > payDay` → `payDay = d`, `due = dailyWages`, nouvelle caisse = `max(coins − due, −due)`, `paid` = ancienne caisse − nouvelle, événement `paie` (si `due > 0`) ;
    3. candidats : si `time >= renewAt` → `renewCandidates` ;
    4. si ce pas contient une `naissance` → `assignGaps`.
  - `staffStep` est appelé dans `step` entre `merchantStep` et `missionsStep`.

- [ ] **Step 1 : tests qui échouent**
  - `paie` : 500 pièces, salaires 100, passage de minuit → 400, `paie { due: 100, paid: 100 }` ; 30 pièces → −70 (`paid: 30`) ; déjà à −100 → reste −100 (`paid: 0`) ; `payDay: -1` → premier pas sans paie.
  - `horloge qui recule` : remettre `time` la veille puis avancer jusqu'au même minuit → une seule paie ce jour-là.
  - `trois nuits de dette` (`absence.test.ts`) : parc sans recettes, 3 jours → la caisse ne passe jamais sous −1 journée de salaires ; avec des recettes, elle repasse au-dessus de 0 et `efficiency` revient à 1.
  - `expérience` : `xpH` 71,9 → après un pas, niveau 2 et un événement `niveauEmploye` ; son salaire passe à 72.
  - `candidats` : premier tirage = 4 candidats dont au moins un soigneur et un agent, aucun métier fermé, `renewAt` = `time + 12 h` ; même graine → mêmes candidats.
  - `naissance` : une naissance dans un enclos plein pour Léa → l'affectation se complète au même pas si un autre soigneur a de la place.
- [ ] **Step 2 :** lancer → échecs attendus.
- [ ] **Step 3 :** implémenter.
- [ ] **Step 4 :** `npx vitest run` → tout vert.
- [ ] **Step 5 :** commit `V2-2 tâche 3 : paie de minuit, dette, expérience et candidats`.

### Task 4: Maison du personnel — agent · **Sonnet**

**Files :**
- Modify : `src/sim/types.ts` (`BuildingType` gagne `'personnel'`), `src/data/economy.ts` (`BUILDINGS`, `SLOTS`), `src/data/buildingInfo.ts`, `src/sim/actions.ts` (`buildBuilding`), `src/sim/village.ts` (`slotCanBuild`), `src/sim/staff.ts` (`staffCap`), `src/ui/missionModel.ts` (`freeSlot`), `src/ui/buildingBar.ts`, `src/ui/icons.ts`, `src/scene/villageView.ts`
- Test : `tests/data/slots.test.ts`, `tests/sim/villageActions.test.ts`, `tests/sim/staff.test.ts`, `tests/ui/missionModel.test.ts`

**Interfaces :**
- Produces :
  - `BUILDINGS.personnel = { name: 'Maison du personnel', withArticle: 'une maison du personnel', unlockLevel: 1, buildCost: 400, upgradeCost: [900, 2000], share: 0, spend: [0, 0, 0], maxClientsPerH: [0, 0, 0] }`
  - `SLOTS` : chaque emplacement gagne `only?: BuildingType` ; nouvel emplacement `{ id: 6, x: 17, z: -19, rot, unlockLevel: 1, only: 'personnel' }` (au fond du village, entre et derrière les emplacements 4 et 5 ; ajuster d'un mètre au plus si le décor le demande, façade tournée vers la place), qui respecte les règles de `tests/data/slots.test.ts` (≥ 9 m des autres, ≥ 4,5 m des chemins du village, x entre 8 et 24) et ne chevauche aucun élément de `VILLAGE_PROPS` (≥ somme des rayons + 1 m).
  - `buildBuilding` : refus « Cet emplacement est réservé à la maison du personnel. » (autre type sur un emplacement `only`) ; « La maison du personnel se construit sur son emplacement, au fond du village. » (maison ailleurs).
  - `slotCanBuild` respecte `only` ; `freeSlot` ignore les emplacements `only`.
  - `staffCap(state): number` — `CAP_NO_HOUSE` sans maison, sinon `CAP_BY_HOUSE_LEVEL[niveau − 1]`.
  - `BUILDING_ROLE.personnel` : « Le personnel y loge : plus elle est grande, plus tu peux embaucher. »
  - `ICONS.personnel` (deux silhouettes) ; `BUILD_ICON.personnel = ICONS.personnel` ; dans la barre d'un emplacement `only`, seul le bouton de son bâtiment ; une maison construite affiche « Maison du personnel · niveau N · 2/6 employés » et le bouton Améliorer.
  - `LOOKS.personnel` : `maison3` (h 3.6), `banc` devant, `tonneau` sur le côté, `caisse` au niveau 3.

- [ ] **Step 1 : tests qui échouent**
  - `slots.test.ts` : 7 emplacements, ids 0..6, règles d'espacement inchangées, l'emplacement 6 a `only: 'personnel'`.
  - `villageActions.test.ts` : café sur l'emplacement 6 refusé, maison sur l'emplacement 1 refusée (textes exacts) ; maison sur 6 au Hameau → −400 pièces ; une sauvegarde v5 avec des bâtiments sur 0–5 reste valide.
  - `staff.test.ts` : `staffCap` = 3, puis 6 / 10 / 15 après construction et deux améliorations.
  - `missionModel.test.ts` : après le café, `freeSlot` au Hameau rend `null` (jamais l'emplacement 6).
- [ ] **Step 2 :** lancer → échecs attendus.
- [ ] **Step 3 :** implémenter (données, règles, barre, allure 3D).
- [ ] **Step 4 :** `npx vitest run` et `npm run build` → verts.
- [ ] **Step 5 :** commit `V2-2 tâche 4 : maison du personnel et son emplacement`.

### Task 5: Actions du joueur, dette, ancienne partie, joueur automatique — agent · **Sonnet**

**Files :**
- Modify : `src/sim/staff.ts`, `src/sim/actions.ts`, `src/game/session.ts`, `tests/balance/bot.ts`
- Test : `tests/sim/staff.test.ts`, `tests/sim/actions.test.ts`, `tests/game/session.test.ts`, `tests/sim/absence.test.ts`, `tests/balance/playthrough.test.ts`, `tests/sim/perf.test.ts`

**Interfaces :**
- Consumes : tâches 1 à 4 (`firstKeeper`, `assignGaps`, `redistribute`, `cleanerCapacity`, `staffCap`, `wage`), `LoadResult.fromVersion` et le modèle `pathsNotice` (étape 1).
- Produces (actions, `src/sim/actions.ts` → fonctions dans `src/sim/staff.ts`) :
  - `{ type: 'embaucher'; candidateId: number }` — refus « Introuvable. » ; dette ; « Plus de place à la maison du personnel (N employés au plus). » ; sinon employé `{ id: nextId++, name, job, xpH: XP_LEVEL_H[level − 1], hiredAt: time, encIds: [] }`, candidat retiré, `assignGaps`.
  - `{ type: 'licencier'; employeeId: number }` — retire l'employé, `assignGaps` ; aucune indemnité.
  - `{ type: 'affecter'; employeeId: number; encIds: number[] }` — refus « Ce métier ne s'occupe pas d'un enclos. » (autre que soigneur / agent) ; « Introuvable. » (enclos inconnu) ; agent : « Il ne peut entretenir que N enclos. » (au-delà de sa capacité **hors dette**) ; doublons retirés, ordre gardé.
  - `{ type: 'repartir' }` — `redistribute`.
  - `debtRefusal(state): ActionResult | null` — `{ ok: false, reason: "Rembourse d'abord la dette : il manque N pièces." }` (N = `Math.ceil(−coins)`) si `coins < 0` ; appliqué dans `run` à `construire`, `redimensionner` (seulement si le prix est > 0), `batir`, `ameliorer`, `agrandirGardeManger`, `acheterAnimal`, `tracerChemin`, `relierEnclos`, `embaucher`.
  - `applyAction` appelle `assignGaps` après un `construire` ou un `acheterAnimal` réussi.
- Produces (session) :
  - `giftFirstKeeper(state: GameState, nowMs: number): GameState` — si aucun soigneur : ajoute Léa, `assignGaps`, `coverAllUntil = nowMs` (D9).
  - `Session.staffNotice: string | null` — si `fromVersion < 5`, **avant** le rattrapage : « Nouveau à Clairbois : le personnel ! Margaux t'envoie Léa, ta première soigneuse. Sans soigneur, un enclos se salit plus vite et ses animaux n'ont plus de petits. Embauche la suite dans le volet Personnel (icône en haut). » + si des animaux restent non suivis : « Léa ne peut suivre que 12 animaux : N attendent un soigneur. »
- Joueur automatique (`tests/balance/bot.ts`) : à chaque visite, s'il y a des animaux non suivis, embauche le meilleur soigneur candidat (sinon construit / améliore la maison quand c'est plein) ; un agent dès 3 enclos, puis un par `CLEANER_ENCLOSURES[0]` enclos ; ne fait rien de bloqué par la dette.

- [ ] **Step 1 : tests qui échouent**
  - Chaque refus d'action avec son texte exact ; embaucher avec 3 employés et sans maison refusé ; embaucher un soigneur niveau 2 → `xpH` 72 et un enclos non suivi lui est confié.
  - `dette` : `coins = -10` → `acheterAnimal`, `batir`, `tracerChemin`, `embaucher` refusés (« il manque 10 pièces ») ; `acheterRations` refusé seulement pour manque de pièces ; `vendre` et `licencier` acceptés.
  - `licencier le dernier soigneur` → animaux non suivis, pas d'erreur, `careCoverage` vide.
  - `choix manuel gardé` : `affecter` Léa à [B] seulement ; acheter un animal dans A → A va à un autre soigneur libre ou reste non suivi, Léa garde [B] (+ A seulement si elle a de la place).
  - Session : sauvegarde v4 d'un grand parc (`bigPark()` réglé en v4, sauvegardé 3 jours plus tôt) → après `startSession`, Léa est là, `staffNotice` contient « Margaux t'envoie Léa » et « attendent un soigneur », **aucune mort ni maladie de plus** que le même parc rattrapé sans personnel (`coverAllUntil` dans le futur) ; une sauvegarde v5 → `staffNotice` `null`.
  - `absence.test.ts` : « un parc bien tenu tient 3 jours » : parc moyen avec assez de soigneurs et d'agents, garde-manger plein, caisse positive → 3 jours sans le joueur : 0 mort, caisse ≥ 0.
  - `perf.test.ts` : nouveau cas `bigPark()` avec `coverAllUntil: 0` et 6 employés, 30 jours d'absence sous le seuil existant.
  - `playthrough.test.ts` : bornes inchangées (0 mort, Village ≤ jour 4, Bourg jours 4–9, fin jours 14–24).
- [ ] **Step 2 :** lancer → échecs attendus.
- [ ] **Step 3 :** implémenter. Si les bornes du joueur automatique cassent, ajuster d'abord **uniquement** les salaires et capacités de `src/data/staff.ts` et le noter dans le compte rendu (le chef en parle à Romain).
- [ ] **Step 4 :** `npx vitest run` → tout vert ; noter le rythme du joueur automatique (avant / après) dans le compte rendu.
- [ ] **Step 5 :** commit `V2-2 tâche 5 : embaucher, licencier, affecter, dette et ancienne partie`.

### Task 6: Petits textes du personnel et de la Gazette — agent · **Haiku**

**Files :**
- Create : `src/ui/staffModel.ts`, `tests/ui/staffModel.test.ts`
- Modify : `src/sim/summary.ts`, `src/ui/gazetteModel.ts`
- Test : `tests/ui/gazetteModel.test.ts`

**Interfaces :**
- Consumes : `employeeLevel`, `wage`, `dailyWages`, `staffCap`, `keeperCapacity`, `cleanerCapacity`, `careCoverage`, `enclosureLabel` (`src/ui/merchantPanel.ts`), événements de la tâche 3.
- Produces (`src/ui/staffModel.ts`, fonctions pures, textes exacts) :
  - `stars(level: StaffLevel): string` → `'★'.repeat(level)`
  - `employeeLine(state, e): { title: string; detail: string }` — soigneur : `{ title: 'Léa — Soigneur ★★', detail: '12/14 animaux suivis · 72 pièces/jour' }` ; agent : `'3/5 enclos · 48 pièces/jour'` ; métier fermé : `'60 pièces/jour'`
  - `candidateLine(c): string` → `'Hugo — Agent d’entretien ★ · 40 pièces/jour'`
  - `staffHeader(state): string` → `'Personnel 2/3 · salaires 100 pièces/jour'`
  - `debtLine(state): string` → `''` ou `'Dette : 85 pièces. Tes employés travaillent moitié moins bien, et tu ne peux ni acheter ni construire tant qu’elle n’est pas remboursée.'`
  - `careWarning(state, encId): string` → `''`, `'1 animal sans soigneur : pas de petit pour lui.'` ou `'3 animaux sans soigneur : l’enclos se salit plus vite et ils n’auront pas de petits.'`
  - `encStaffNames(state, encId): string` → `'Soigneur : Léa · Entretien : Hugo'`, `'Soigneur : personne'` si aucun
- Produces (`Summary`) : `salaires: number` (somme des `paid`), `salairesDus: number` (somme des `due`), `niveaux: { name: string; level: StaffLevel }[]`.
- Produces (Gazette) : rubrique « Personnel » : `'Salaires versés : 120 pièces.'` ; si `salairesDus > salaires` : `'Caisse vide à minuit : il manque 45 pièces de salaires.'` ; `'Léa passe au niveau 2.'` (une ligne par montée). Titre à la une : après les morts et avant les naissances, `'Caisse vide : les salaires n’ont pas été payés en entier'` quand `salairesDus > salaires`.

- [ ] **Step 1 : tests qui échouent** : un test par fonction et par variante ci-dessus (singulier / pluriel, 0, métier fermé) ; `summarize` sur deux `paie` et une `niveauEmploye` ; Gazette avec et sans dette.
- [ ] **Step 2 :** `npx vitest run tests/ui` → échecs attendus.
- [ ] **Step 3 :** implémenter.
- [ ] **Step 4 :** `npx vitest run` → tout vert.
- [ ] **Step 5 :** commit `V2-2 tâche 6 : textes du personnel et de la Gazette`.

### Task 7: Interface — volet Personnel, fiches d'enclos, barre du haut — agent · **Sonnet**

**Files :**
- Create : `src/ui/staffPanel.ts`
- Modify : `src/ui/topBar.ts`, `src/ui/bottomBar.ts`, `src/main.ts`, `src/style.css`

**Interfaces :**
- Consumes : tâche 6 (tous les textes), actions de la tâche 5, `openDrawer` / `refreshDrawer` / `closeDrawer`, `createConfirmGuard`, `formatCountdown`, `iconButton`, `ICONS.personnel`, `Session.staffNotice`.
- Produces :
  - Barre du haut : `TopBarHandlers.onStaff()` ; case `personnel` (icône + `n/N`, bulle « Personnel : touche pour embaucher et affecter ») ; `data-alerte="oui"` s'il y a des animaux non suivis ou une dette ; case pièces `data-dette="oui"` quand `coins < 0` (rouge dans `style.css`).
  - `toggleStaffPanel(ctx: PanelContext): void` (volet `'personnel'`, titre « Personnel ») :
    - en tête `staffHeader`, puis `debtLine` en rouge s'il y a lieu, bouton **Répartir** ;
    - « Employés » : une carte par employé (`employeeLine`), bouton **Enclos** (soigneur / agent) qui déplie une liste à cocher d'enclos (`enclosureLabel`) envoyant `affecter`, bouton **Licencier** en deux clics (`createConfirmGuard`, premier clic « Licencier Léa ? Sans indemnité. ») ;
    - « Candidats » : « Nouveaux candidats dans 5 h 20 » (`formatCountdown(renewAt − time)`), une carte par candidat (`candidateLine`) avec **Embaucher** (désactivé avec la raison quand c'est plein ou en dette) ;
    - « Bientôt » : Vétérinaire, Fermier, Animateur en gris.
    - Rafraîchi par `refreshDrawer` sans perdre la liste dépliée (même méthode que les cases du marchand).
  - Barre du bas, enclos sélectionné : `careWarning` en rouge sous le nom quand il n'est pas vide ; volet Détails de l'enclos : ligne `encStaffNames` et bouton **Personnel** qui ouvre le volet.
  - `main.ts` : `staffNotice` montré une fois comme `priceNotice` / `pathsNotice` (l'un après l'autre s'il y en a plusieurs).
  - Téléphone 375 × 812 : cartes sur une colonne, boutons ≥ 44 px, la barre du haut tient sur la largeur (case Personnel réduite à l'icône + nombre).

- [ ] **Step 1 :** vérifier qu'aucune logique n'est ajoutée ici (tout texte vient de `staffModel`) ; pas de nouveau test pur attendu.
- [ ] **Step 2 :** implémenter.
- [ ] **Step 3 :** `npx vitest run` et `npm run build` → verts.
- [ ] **Step 4 :** contrôle rapide dans le navigateur (serveur de dev, `?heure=14`) : ouvrir le volet, embaucher, cocher un enclos, licencier ; capture en 375 × 812 dans le compte rendu.
- [ ] **Step 5 :** commit `V2-2 tâche 7 : volet Personnel et fiches d'enclos`.

### Task 8: Employés visibles sur la carte — agent · **Sonnet**

**Files :**
- Create : `src/scene/staffView.ts`, `src/scene/staffRoutes.ts`, `tests/scene/staffRoutes.test.ts`
- Modify : `src/data/visuals.ts`, `src/scene/visitorsView.ts` (partage des modèles chargés), `src/main.ts`

**Interfaces :**
- Consumes : `state.staff.employees`, `state.enclosures`, `SLOTS`, `MAIRIE`, `WALKER_MODELS` et leur chargement en arrière-plan, `cachedWalkHeight`.
- Produces :
  - `STAFF_WALKERS = { MAX_DESKTOP: 8, MAX_MOBILE: 4, FENCE_GAP_M: 1.2, MODEL: { soigneur: 'promeneurFermier', entretien: 'promeneuseAventuriere', veterinaire: 'promeneuseTailleur', fermier: 'promeneurFermier', animateur: 'promeneurCasual2' } }` dans `src/data/visuals.ts`
  - `staffRoute(state, e: Employee): RoutePoint[]` (pure) — premier enclos existant de `encIds` : les 4 coins de la clôture décalés de `FENCE_GAP_M` vers l'extérieur, en boucle, avec un arrêt tourné vers le centre de l'enclos ; sans enclos : petit tour autour de l'emplacement de la maison du personnel, sinon de la mairie.
  - `createStaffView(world, getState): { update(dt: number): void }` — un personnage par employé (au plus `MAX_*`), reconstruit quand la liste des employés ou leurs premiers enclos changent ; même marche / attente que les promeneurs ; rien quand les modèles ne sont pas encore chargés.
- [ ] **Step 1 : tests qui échouent** (`staffRoutes.test.ts`) : tous les points de la boucle sont à ≥ 1 m à l'extérieur du rectangle de l'enclos ; employé sans enclos → points à moins de 6 m de la maison (ou de la mairie sans maison) ; enclos supprimé → repli sur la maison.
- [ ] **Step 2 :** `npx vitest run tests/scene` → échec attendu.
- [ ] **Step 3 :** implémenter et brancher dans `main.ts` (mise à jour dans la boucle comme `visitorsView`).
- [ ] **Step 4 :** `npx vitest run` et `npm run build` → verts.
- [ ] **Step 5 :** commit `V2-2 tâche 8 : employés visibles autour de leurs enclos`.

### Task 9: Vérification d'ensemble, relecture et publication — chef (**Opus**) + relecture · **Opus**

- [ ] Navigateur (`?heure=14`), nouvelle partie : Léa présente et visible près des moutons, volet Personnel, candidats et compte à rebours, embaucher jusqu'au plafond de 3 (refus lisible), construire puis améliorer la maison (6, puis 10), affecter à la main, Répartir, licencier en deux clics, ligne rouge « sans soigneur » sur un enclos, agent qui nettoie seul (avancer l'heure avec `?debug`), paie de minuit et dette (caisse rouge, achats refusés avec le texte), Gazette après une absence (salaires, montée de niveau).
- [ ] Téléphone 375 × 812 : barre du haut lisible, volet en une colonne, tout au tap.
- [ ] Ancienne partie : charger une copie de sauvegarde v4 de type « partie de Romain » (beaucoup d'animaux) → Léa offerte, message unique, aucune mort due au rattrapage, enclos non suivis signalés.
- [ ] Relecture indépendante Opus de toute la branche ; corrections par un agent Sonnet (Opus si le défaut est subtil).
- [ ] `progress.md` à jour (suivi des sous-tâches, décisions D1–D12 telles que validées, nombre de tests) ; fusion dans `main` **seulement avec l'accord de Romain** ; vérification en ligne.
