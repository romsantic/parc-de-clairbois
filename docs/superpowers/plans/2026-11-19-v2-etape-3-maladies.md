# V2 — Étape 3 : maladies et centre vétérinaire — plan de construction

> **Votes de Romain (19/11/2026)** — D1 validée (léger 24 h → grave 24 h → mortel 12 h). **D8 changée** : une nouvelle partie reçoit un **premier pas de plus** avec Margaux, « Construis le centre vétérinaire » (placé tôt dans les premiers pas, avant que le premier malade puisse arriver ; une ancienne partie qui refait les premiers pas le réussit aussitôt puisque le centre lui est offert). Les autres décisions sont acceptées telles que proposées.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal :** les animaux attrapent quatre maladies (parasites, indigestion, blessure, grippe) qui s'aggravent par stades ; on ne les soigne plus d'un clic mais au **centre vétérinaire**, où le vétérinaire soigne seul les malades repérés, même pendant l'absence.

**Architecture :** la santé d'un animal (`Health`) devient « en forme » ou « malade » avec maladie, stade, date de repérage et soin en cours ; tout est dans l'animal, donc rien à nettoyer quand il disparaît. Deux pas purs se suivent dans `step()` : `healthStep` (apparition, contagion, repérage, aggravation, mort) puis `vetStep` (file d'attente, début et fin des soins, débit de la caisse). Le centre est un bâtiment du village (`centreVeto`, 5 niveaux) ; tous les chiffres sont dans `src/data/diseases.ts`.

**Tech Stack :** TypeScript, Three.js, Vitest (`export PATH="/c/Program Files/nodejs:$PATH"; npx vitest run`).

**Spec :** `docs/superpowers/specs/2026-11-19-parc-de-clairbois-v2-design.md` §5 (maladies), §4 (vétérinaire, soigneur qui dépiste), §1 (absence de 3 jours), §12 « Étape 3 » ; conception V1 pour le reste.

## Ce que ce plan attend de l'étape 2 (personnel) — à revérifier au lancement

L'étape 2 n'est pas encore codée. Ce plan suppose qu'elle livre ce qui suit. **Au lancement de l'étape 3, le chef relit le code de l'étape 2 et corrige ce plan (noms, version) avant de confier la tâche 1.** Si un point manque, il est ajouté à la tâche 1.

| Attendu | Forme supposée | Utilisé par |
|---|---|---|
| Sauvegarde | `GameState.version: 5`, `CURRENT_VERSION = 5` (v4 = chemins, v5 = personnel). Cette étape passe en **v6**. | tâche 1 |
| Employés | `GameState.staff: Employee[]`, `Employee { id: number; name: string; job: Job; level: number; … }`, `Job = 'soigneur' \| 'entretien' \| 'veterinaire' \| 'fermier' \| 'animateur'` | tâches 1, 3 |
| Dépistage | `coveredAnimalIds(state: GameState): Set<number>` (`src/sim/staff.ts`) : animaux suivis par un soigneur | tâche 2 |
| Efficacité | `staffEfficiency(state: GameState, e: Employee): number` (> 0 ; plus bas si la paie n'a pas été versée, plus haut avec l'expérience) | tâche 3 |
| Embauche | action `{ type: 'embaucher'; candidateId: number }` et candidats de métier `veterinaire` | tâche 4 (joueur automatique) |
| Dette | caisse qui peut être négative (≤ une journée de salaires) ; achats d'animaux et constructions refusés tant qu'elle l'est | tâche 3 |
| Bâtiments à plus de 3 niveaux | `Building.level` et `BuildingData.upgradeCost` assez larges pour la maison du personnel. **Sinon, la tâche 1 généralise** : `upgradeCost: number[]`, `maxBuildingLevel(type) = upgradeCost.length + 1`, `Building.level: number` validé entre 1 et ce maximum. | tâches 1, 3 |
| Emplacement 6 | `SLOTS` compte 7 emplacements (0 à 6, le 6 pour la maison du personnel). Cette étape ajoute le **7**. | tâche 1 |
| Message de mise à jour | `LoadResult.fromVersion` et un message unique par nouveauté dans `Session` (comme `pathsNotice` de l'étape 1) | tâche 5 |
| Fabriques de test | `employee(id, job, over?)` dans `tests/sim/helpers.ts`, et `emptyState()` en v5 avec `staff: []` | tâches 1 à 4 |
| Joueur automatique | il embauche et affecte déjà soigneurs et agents d'entretien | tâche 4 |

### Écarts tranchés par Romain (19/11/2026, « Oui, lance »)

- **E1 — Vétérinaires recrutables dès que le centre existe** : tant qu'il n'y a pas de centre, aucun candidat vétérinaire ; avec le centre, `veterinaire` entre dans le tirage des candidats avec un poids de **0,2** (soigneur et agent gardent leurs poids relatifs). Le volet du personnel n'affiche plus « Bientôt » pour le vétérinaire quand le centre existe. → sim en **tâche 3** (`renewCandidates`), données en tâche 1 (`VET_CENTER.CANDIDATE_WEIGHT: 0.2`), affichage en tâche 7.
- **E2 — Un vétérinaire expérimenté soigne plus vite** : vitesse × (1 + `VET_CENTER.LEVEL_SPEEDUP` × (niveau − 1)), `LEVEL_SPEEDUP = 0.1` (niveau 5 = 40 % plus vite). `careDurationMs = careH × SPEED[niveau centre − 1] / (efficiency(state) × (1 + 0,1 × (employeeLevel(vet) − 1))) × HOUR_MS`. → données tâche 1, calcul tâche 3.
- **D8 (premier pas `pas-centre`)** : n'était dans aucune tâche → **tâche 5**. Les premiers pas sont rangés par **index** (`missions.tutorial.step`) : la tâche 5 insère `pas-centre` (« Construis le centre vétérinaire », Margaux, surbrillance de l'emplacement 7) juste après `pas-cafe`, et ajoute à `MIGRATIONS[5]` : `tutorial.step += 1` si `step` > index de `pas-cafe` (partie finie ou au-delà du café : on ne recule personne). Une partie migrée a le centre offert, donc si elle tombe sur ce pas, il réussit aussitôt.

### Revérifié contre le vrai code de l'étape 2 (19/11/2026, après fusion de `main`) — **ces lignes font foi**

| Attendu | Réalité dans le code | Conséquence pour ce plan |
|---|---|---|
| Sauvegarde | `CURRENT_VERSION = 5`, `version: 5` | conforme : passage en **v6** |
| Employés | `GameState.staff: Staff = { employees, candidates, renewAt, renewals, payDay, coverAllUntil }` ; `Employee { id, name, job: JobId, xpH, hiredAt, encIds }` — **pas de champ `level`** : `employeeLevel(e)` (`src/sim/staff.ts`) le déduit de `xpH` | lire `state.staff.employees` ; `JobId` au lieu de `Job` ; la vétérinaire offerte (migration) = `{ id, name: 'Élise Fontaine', job: 'veterinaire', xpH: 0, hiredAt: old.time, encIds: [] }` |
| Dépistage | pas de `coveredAnimalIds` ; `careCoverage(state).covered` (`src/sim/care.ts`) ; pendant le délai de grâce V1 (`time ≤ staff.coverAllUntil`) tous les animaux sont suivis | tâche 2 utilise `careCoverage(state).covered` (une fois par pas, pas par animal) |
| Efficacité | pas de `staffEfficiency` ; `efficiency(state)` (`src/sim/care.ts`) = 0,5 si caisse < 0, sinon 1 ; **aucun bonus d'expérience** | tâche 3 : durée du soin ÷ (`efficiency(state)` × bonus de niveau du vétérinaire — voir écart E2) |
| Embauche | action `embaucher` OK ; **mais `JOBS.veterinaire.open = false`** et `STAFF_TUNING.CANDIDATE_JOBS` ne tire que soigneurs et agents | tâche 1 ouvre le métier (voir écart E1) |
| Dette | `debtRefusal(state)` (`src/sim/staff.ts`) existe | conforme ; vaccination et soins utilisent aussi `debtRefusal` / attendent |
| Bâtiments à plus de 3 niveaux | `Building.level: 1 \| 2 \| 3`, `upgradeCost: [number, number]` | **tâche 1 généralise** comme prévu (`number[]`, `maxBuildingLevel`) |
| Emplacement 6 | existe : `{ id: 6, x: 17, z: -19, rot: 0, unlockLevel: 1, only: 'personnel' }` (au fond du village) ; **le champ `only` existe déjà** | tâche 1 ajoute le 7 avec `only: 'centreVeto'` en réutilisant la règle existante (ne pas la recréer) ; position hors du fond du village déjà pris |
| Message de mise à jour | `fromVersion` OK ; `Session.staffNotice` + `showNotice` dans `runGame.ts` | tâche 5 ajoute `vetNotice` sur ce modèle (`fromVersion < 6`) |
| Fabriques de test | **pas de `employee()`** ; `emptyState()` en v5 avec `staff.coverAllUntil = MAX_SAFE_INTEGER` (donc **tous les animaux suivis par défaut dans les tests**) | tâche 1 ajoute `employee(id, job, over?)` ; les tests « sans soigneur » doivent mettre `coverAllUntil` dans le passé |
| Joueur automatique | `tests/balance/bot.ts` embauche soigneurs et agents (choix du meilleur candidat par métier) | tâche 4 lui ajoute le centre et un vétérinaire |
| Premiers pas | 9 pas de Margaux dans `src/data/missions.ts` (`pas-fiche` … `pas-autonomie`) | D8 : `pas-centre` inséré avant `pas-gestation` (au plus tard), réussi aussitôt si le centre existe |

## Global Constraints

- Règles pures et testées dans `src/sim/`, chiffres dans `src/data/`, aucune logique dans `src/data/`.
- Le temps n'avance que par `advanceTo` (pas de 10 min) ; les actions passent par `applyAction` et renvoient un nouvel état ou un refus en français affichable tel quel.
- Sauvegarde versionnée : `CURRENT_VERSION` passe de 5 à 6 ; migration écrite en clair, sans appeler le jeu ; **la partie de Romain continue sans perte brutale** (aucun malade ne meurt à cause de la mise à jour).
- « On ne soigne qu'au centre vétérinaire, avec un vétérinaire. Le bouton « Soigner » de la V1 disparaît. »
- « Un parc bien tenu (personnel suffisant, stock, caisse) tient **3 jours** sans le joueur sans mort ni dette » — vérifié par un test (tâche 4).
- « Sans soigneur, la maladie n'est vue qu'au stade grave. » « La mort reste possible […] (annoncé dans la Gazette). »
- Centre à **5 niveaux** : 1 parasites + indigestion, 2 blessures, 3 grippe + quarantaine, 4 vaccination, 5 soins plus rapides et une place de vétérinaire de plus.
- Vaccination **par enclos, au clic du joueur**, payante, temporaire ; quarantaine **au clic du joueur** depuis la fiche de l'animal ; **icône au-dessus de l'animal malade**, couleur selon le stade.
- Téléphone et ordinateur : tout au tap, lisible en 375 × 812. Textes en français simple, tutoiement.
- Performances : `tests/sim/perf.test.ts` garde ses seuils (30 jours d'un grand parc < 2 s) ; pas de parcours O(N²) des animaux par pas.

## Décisions à valider par Romain

- **D1 — Stades et délais.** Léger 24 h → grave 24 h → mortel 12 h → mort (grippe : 18 h / 18 h / 12 h). Il faut donc au moins **2 jours et demi** entre le début d'une maladie et la mort (V1 : 2 jours). Un soin arrête tout de suite l'aggravation.
- **D2 — Causes et fréquences** (par animal) : parasites 15 %/jour quand l'enclos est sale (comme la V1) ; indigestion **à coup sûr** après 24 h sans manger (comme la V1) ; blessure 10 %/jour dans un enclos surpeuplé, 2 %/jour pour un renard ou un loup qui partage son enclos avec un autre prédateur ; grippe 0,5 %/jour au hasard **à partir du niveau Village** (avant, le centre ne pourrait pas la soigner), +25 %/jour par malade contagieux du même enclos ; un enclos vacciné est protégé de la grippe. Parasites : l'animal est un peu plus triste (bonheur × 0,7).
- **D3 — Soins.** Durée : 2 h (parasites, indigestion), 3 h (blessure, grippe), × 0,6 au niveau 5, divisée par l'efficacité du vétérinaire. Prix : 10 % / 25 % / 40 % du prix de l'espèce selon le stade (au moins 20 pièces) — un mouton léger coûte 20, un loup grave 625 (le prix de la V1). Le soin est payé **au début** ; **si la caisse ne suffit pas, l'animal attend** dans la file (pas de dette pour un soin). Ordre de la file : le stade le plus grave d'abord, puis le premier repéré.
- **D4 — Places.** Vétérinaires qui travaillent en même temps : 2 aux niveaux 1 à 4, 3 au niveau 5 (un vétérinaire en trop est payé mais attend). Quarantaine : 0 / 0 / 2 / 3 / 4 places.
- **D5 — Vaccination.** 10 pièces par animal (au moins 30), protège **5 jours** ; on peut revacciner quand il reste moins de 24 h. Il faut un vétérinaire.
- **D6 — Quarantaine.** Possible pour tout malade repéré (utile surtout pour la grippe) ; l'animal disparaît de son enclos sur la carte (« au centre »), ne contamine plus, continue de manger, et revient seul une fois guéri. Bouton « Remettre dans l'enclos » pour le sortir avant.
- **D7 — Centre.** 250 pièces au Hameau ; améliorations 500 / 1 200 / 2 500 / 5 000. Nouvel emplacement de village n° 7 réservé au centre. Allure : une maison du pack village (`maison2`) avec une enseigne à croix verte faite en Three.js, et quelques objets qui s'ajoutent aux niveaux 3 et 5.
- **D8 — Nouvelle partie.** Le centre n'est **pas** construit (le spec le veut « constructible dès le Hameau ») et il n'y a **pas** de nouveau premier pas : quand un malade est repéré sans centre ou sans vétérinaire, sa fiche le dit (« Personne ne peut le soigner : construis le centre vétérinaire au village et embauche un vétérinaire ») et la Gazette aussi. *Alternative si Romain préfère : un 10ᵉ premier pas « Construis le centre vétérinaire » (plus de travail : les parties finies refont ce pas).*
- **D9 — Partie existante.** À la mise à jour : le centre est construit (niveau 1, emplacement 7) et **Élise Fontaine**, vétérinaire niveau 1, est offerte (elle compte dans la limite d'employés, mais est donnée même si la maison est pleine). Chaque ancien « malade » devient une **indigestion** s'il n'a pas mangé depuis 24 h, sinon des **parasites** si son enclos est sale, sinon une indigestion ; il est **repéré** et repart au début de son stade (léger si malade depuis moins de 24 h, grave sinon). Un message unique l'annonce.
- **D10 — Missions.** La quotidienne « Soigne un animal » devient « Fais soigner un animal » (comptée quand le vétérinaire finit un soin ; tirée seulement s'il y a un malade soignable et un vétérinaire) ; nouvelle quotidienne « Vaccine un enclos » à partir du centre niveau 4. Pas de nouvelle mission d'histoire (les personnages comme la vétérinaire arrivent à l'étape 6).

## Review Focus

1. **Animal qui meurt pendant un soin ou en quarantaine, vétérinaire licencié en plein soin** : la place du vétérinaire et la place de quarantaine se libèrent, rien ne plante, la file repart (tests en tâche 3).
2. **Caisse trop basse** : le soin attend sans faire passer la caisse sous zéro, puis reprend tout seul dès que l'argent revient ; un malade en attente pour cette raison continue de s'aggraver (test en tâche 3).
3. **Absence plafonnée à 30 jours** : `shiftDates` décale aussi `stageSince`, `detectedAt`, `careUntil` et `vaccinatedUntil`, sinon tout malade meurt au retour (test en tâche 2).
4. **Ancienne sauvegarde** avec un malade depuis 47 h, un emplacement 7 déjà pris (impossible normalement) ou un centre déjà présent : personne ne meurt au chargement, la migration ne double rien (tests en tâche 1).
5. **Grippe au Hameau ou avec un centre de niveau 1–2** : elle n'apparaît pas avant le Village ; si elle arrive par contagion d'un animal acheté plus tard, la fiche dit clairement « Le centre doit être au niveau 3 pour la soigner » (tests en tâches 2 et 7).

---

### Task 1: Tâche 1 — État v6, données des maladies, centre et migration — agent · **Sonnet**

**Files :**
- Create : `src/data/diseases.ts`, `tests/data/diseases.test.ts`
- Modify : `src/sim/types.ts`, `src/data/economy.ts` (`BUILDINGS.centreVeto`, emplacement 7), `src/data/buildingInfo.ts` (rôle du centre), `src/save/migrations.ts`, `src/save/save.ts`, `src/sim/newGame.ts`, `src/sim/stats.ts`, `src/sim/health.ts` (adaptation minimale à la nouvelle forme), `src/sim/actions.ts` (adaptation minimale des soins V1 ; `buildEnclosure` avec `vaccinatedUntil: null` ; `buildBuilding` et l'emplacement réservé), `src/sim/advance.ts` (`shiftDates`), `tests/sim/helpers.ts`, `tests/save/migrations.test.ts`, `tests/save/save-robustness.test.ts`, `tests/data/slots.test.ts`, tout `version: 5` restant

**Interfaces :**
- Produces (`src/sim/types.ts`) :
  - `export type DiseaseId = 'parasites' | 'indigestion' | 'blessure' | 'grippe'`
  - `export type Stage = 1 | 2 | 3` (1 léger, 2 grave, 3 mortel)
  - `export type Health = { status: 'ok' } | { status: 'malade'; disease: DiseaseId; stage: Stage; stageSince: number; detectedAt: number | null; careUntil: number | null; vetId: number | null; quarantined: boolean }`
  - `Enclosure.vaccinatedUntil: number | null`
  - `BuildingType` gagne `'centreVeto'` ; `StatKey` gagne `'vaccinations'`
  - `GameEvent` : `malade` devient `{ kind: 'malade'; at; animalId; disease: DiseaseId }` (émis **au repérage**) ; nouveaux `{ kind: 'aggravation'; at; animalId; stage: 2 | 3 }`, `{ kind: 'soigne'; at; animalId; disease: DiseaseId; cost: number }` ; `mort` gagne `cause?: DiseaseId`
  - `GameState.version: 6`
- Produces (`src/data/diseases.ts`, chiffres de D1 à D7) :
  - `DISEASES: Record<DiseaseId, { name: string; centerLevel: 1 | 2 | 3; careH: number; stageH: [number, number, number]; contagious: boolean }>` — parasites `{ 'Parasites', 1, 2, [24,24,12], false }`, indigestion `{ 'Indigestion', 1, 2, [24,24,12], false }`, blessure `{ 'Blessure', 2, 3, [24,24,12], false }`, grippe `{ 'Grippe', 3, 3, [18,18,12], true }`
  - `STAGE_NAMES = ['léger', 'grave', 'mortel'] as const`
  - `HEALTH_TUNING = { DIRTY_PARASITES_PER_DAY: 0.15, INDIGESTION_AFTER_H: 24, OVERCROWD_INJURY_PER_DAY: 0.1, PREDATOR_FIGHT_PER_DAY: 0.02, PREDATORS: ['renard', 'loup'], FLU_PER_DAY: 0.005, FLU_MIN_VILLAGE_LEVEL: 2, FLU_CONTAGION_PER_DAY: 0.25, PARASITES_HAPPINESS: 0.7, CARE_PRICE_SHARE: [0.1, 0.25, 0.4], CARE_MIN_COST: 20 }`
  - `VET_CENTER = { SLOT: 7, PLACES: [2, 2, 2, 2, 3], QUARANTINE: [0, 0, 2, 3, 4], SPEED: [1, 1, 1, 1, 0.6], QUARANTINE_LEVEL: 3, VACCINE_LEVEL: 4, VACCINE_DAYS: 5, VACCINE_COST_PER_ANIMAL: 10, VACCINE_MIN_COST: 30, VACCINE_RENEW_BELOW_H: 24, GIFT_VET_NAME: 'Élise Fontaine' }`
  - `BUILDINGS.centreVeto = { name: 'Centre vétérinaire', withArticle: 'un centre vétérinaire', unlockLevel: 1, buildCost: 250, upgradeCost: [500, 1200, 2500, 5000], share: 0, … }` ; `SLOTS` gagne `{ id: 7, …, unlockLevel: 1, only: 'centreVeto' }` (champ `only` : l'emplacement n'accepte que ce bâtiment ; `buildBuilding` refuse le reste avec « Cet emplacement est réservé au centre vétérinaire. », et refuse le centre ailleurs qu'au 7). Position choisie par l'agent pour passer les tests de `tests/data/slots.test.ts` (élargir la borne `x ≤ 24` au besoin, en le disant).
- Produces (migration, `src/save/migrations.ts`) : `MIGRATIONS[5]`, écrite en clair (D9) :
  - chaque animal `malade` → `{ status: 'malade', disease, stage: (old.time − since ≥ 24 h ? 2 : 1), stageSince: old.time, detectedAt: old.time, careUntil: null, vetId: null, quarantined: false }` ; `disease` = `'indigestion'` si `old.time − lastFedAt ≥ 24 h`, sinon `'parasites'` si `old.time − enclos.cleanedAt ≥ 24 h`, sinon `'indigestion'`
  - `enclosures[].vaccinatedUntil = null` ; `stats.counts.vaccinations = 0`
  - ajoute `{ slot: 7, type: 'centreVeto', level: 1 }` **s'il n'y a pas déjà un centre et que l'emplacement 7 est libre**
  - ajoute la vétérinaire offerte (forme littérale de l'`Employee` de l'étape 2, `job: 'veterinaire'`, `level: 1`, `name: 'Élise Fontaine'`, `id: old.nextId`, puis `nextId + 1`) s'il n'y a aucun vétérinaire
- Validation (`looksLikeGame`) : santé `ok`, ou `malade` avec `disease` connue, `stage` 1–3, `stageSince` fini, `detectedAt` / `careUntil` / `vetId` finis ou `null`, `quarantined` booléen ; `vaccinatedUntil` fini ou `null` ; niveau du centre 1–5.
- Adaptation minimale pour que tout reste vert : `healthStep` crée `{ status: 'malade', disease: 'indigestion' | 'parasites', stage: 1, stageSince: now, detectedAt: now, careUntil: null, vetId: null, quarantined: false }` et meurt après `DEATH_AFTER_SICK_H` comme avant (la vraie règle arrive en tâche 2) ; les soins V1 remettent `{ status: 'ok' }` (ils disparaissent en tâche 3) ; `shiftDates` décale `stageSince`, `detectedAt`, `careUntil` (si non nuls) et `vaccinatedUntil`.

- [ ] **Step 1 : tests qui échouent**
  - `tests/data/diseases.test.ts` : 4 maladies, `centerLevel` 1, 1, 2, 3 ; stades > 0 ; `VET_CENTER.PLACES` et `QUARANTINE` ont 5 valeurs ; `BUILDINGS.centreVeto.upgradeCost.length === 4`.
  - `tests/data/slots.test.ts` : 8 emplacements (0 à 7), règles d'écart inchangées ; l'emplacement 7 n'accepte que `centreVeto`.
  - Migration : un mouton `malade` depuis 47 h et affamé depuis 30 h → `indigestion`, stade 2, `stageSince = time`, repéré ; un autre malade depuis 2 h, nourri, enclos sale → `parasites`, stade 1 ; centre ajouté sur l'emplacement 7 ; une vétérinaire « Élise Fontaine » ajoutée, `nextId` augmenté de 1 ; `vaccinations: 0` ; `vaccinatedUntil: null` partout ; une partie qui a déjà un vétérinaire n'en reçoit pas un second ; `VET_CENTER.SLOT === 7` (la migration écrit 7 en dur : le test compare).
  - `Review Focus 4` : partie migrée avec un malade depuis 47 h puis `advanceTo(+10 min)` → il est vivant.
  - Validation : santé `malade` sans `disease`, `stage: 4`, `vaccinatedUntil: 'x'`, centre niveau 6 → illisible.
  - `buildBuilding` : centre sur l'emplacement 7 au Hameau pour 250 → ok ; un café sur le 7 → refus avec le texte exact ; un second centre → refus « Clairbois a déjà un centre vétérinaire. ».
- [ ] **Step 2 :** `npx vitest run tests/data tests/save` → échecs attendus.
- [ ] **Step 3 :** implémenter (types, données, migration, `CURRENT_VERSION = 6`, validation, `newGame` en v6 avec `vaccinatedUntil: null`, `emptyState`/`enclosure()` des tests en v6, adaptations minimales ci-dessus).
- [ ] **Step 4 :** `npx vitest run` → tout vert.
- [ ] **Step 5 :** commit `V2-3 tâche 1 : état v6, données des maladies, centre vétérinaire et migration`.

### Task 2: Tâche 2 — Les maladies vivent : apparition, contagion, repérage, aggravation, mort — agent · **Sonnet**

**Files :**
- Modify : `src/sim/health.ts`, `src/sim/happiness.ts`, `src/sim/advance.ts`
- Test : `tests/sim/health.test.ts` (réécrit), `tests/sim/happiness.test.ts`, `tests/sim/absence.test.ts`, `tests/sim/advance.test.ts`

**Interfaces :**
- Consumes : tâche 1 (`Health`, `DISEASES`, `HEALTH_TUNING`, `STAGE_NAMES`) ; étape 2 (`coveredAnimalIds`) ; `buildRoster`, `capacity`, `cleanliness`, `chanceOver`, `random`.
- Produces (`src/sim/health.ts`) :
  - `isSick(a: Animal): boolean`
  - `isContagious(a: Animal): boolean` — grippe, ni en soin (`careUntil !== null`) ni en quarantaine
  - `isFluProtected(enc: Enclosure, now: number): boolean` — `vaccinatedUntil !== null && now < vaccinatedUntil`
  - `healthStep(state, events)` — pour chaque animal, dans cet ordre :
    1. **malade** : s'il est en soin, rien ne bouge (stade gelé) ; sinon, si `now − stageSince ≥ stageH[stage − 1]` : stade 3 → **mort** (`{ kind: 'mort', …, cause }`), sinon stade + 1, `stageSince = now`, événement `aggravation` ; **repérage** : s'il n'est pas repéré et qu'il est suivi par un soigneur, ou qu'il atteint le stade 2 → `detectedAt = now` et événement `malade`.
    2. **en forme** : une seule maladie peut commencer, tirée dans cet ordre : indigestion (≥ 24 h sans manger, certain) → parasites (propreté 0) → blessure (surpeuplé, ou prédateur avec un autre prédateur) → grippe (village ≥ `FLU_MIN_VILLAGE_LEVEL`, enclos non vacciné ; chance = base + contagion × nombre de contagieux de l'enclos, comptés **une fois par enclos** avant la boucle). Nouvelle maladie au stade 1, `detectedAt = now` (+ événement `malade`) seulement si l'animal est suivi par un soigneur.
  - Bonheur : terme santé 0 pour tout malade (inchangé) ; parasites → bonheur × `PARASITES_HAPPINESS`.
  - Un animal en quarantaine n'est compté ni comme contagieux ni comme occupant pour le surpeuplement.

- [ ] **Step 1 : tests qui échouent** (`tests/sim/health.test.ts`, en gardant le style des tests existants)
  - `indigestion après 24 h sans manger, pas avant` (stade 1, repérée si suivie par un soigneur, sinon non repérée et aucun événement).
  - `aggravation léger → grave → mortel → mort aux bons délais` : mort à 60 h exactement (pas à 60 h − 10 min), événement `mort` avec `cause: 'indigestion'` ; grippe : mort à 48 h.
  - `sans soigneur, repérée au stade grave` : événement `malade` émis à 24 h, pas avant.
  - `un animal en soin ne s'aggrave pas et ne meurt pas` (`careUntil` dans le futur, `stageSince` très ancien).
  - `parasites ~15 %/jour en enclos sale` (même fourchette que le test V1).
  - `blessure en enclos surpeuplé, jamais en enclos à sa capacité` ; `bagarre : 2 loups ensemble se blessent parfois, un loup seul jamais` (sur 200 jours simulés, fourchettes larges).
  - `pas de grippe au Hameau` (village 1, 1 000 animaux × 10 jours → 0) ; `grippe au Village ~0,5 %/jour`.
  - `contagion` : un grippé contagieux dans un enclos de 20 → bien plus de grippés qu'un enclos témoin ; en quarantaine ou en soin → comme le témoin ; enclos vacciné → aucun nouveau grippé.
  - `parasites rendent triste` (`happiness.test.ts`) : même animal, bonheur avec parasites = × 0,7 du bonheur malade sans parasites.
  - `Review Focus 3` (`advance.test.ts`) : une absence de 40 jours avec un malade en soin et un enclos vacciné → `stageSince`, `detectedAt`, `careUntil`, `vaccinatedUntil` décalés du temps sauté.
  - `absence.test.ts` : « 3 jours avec 2 jours de stock → malades mais vivants » garde son sens (indigestion) ; « 5 jours sans stock → morts » reste vrai ; le filtre `cause === 'faim'` devient `disease === 'indigestion'`.
- [ ] **Step 2 :** `npx vitest run tests/sim` → échecs attendus.
- [ ] **Step 3 :** implémenter (un `Roster` par pas, contagieux comptés par enclos : pas de O(N²)) ; `TUNING.SICK_AFTER_H`, `DEATH_AFTER_SICK_H`, `DIRTY_SICK_PER_DAY` disparaissent de `tuning.ts` au profit de `HEALTH_TUNING` (mettre à jour `autonomyPanel.ts`).
- [ ] **Step 4 :** `npx vitest run` → tout vert (`perf.test.ts` compris).
- [ ] **Step 5 :** commit `V2-3 tâche 2 : quatre maladies qui s'aggravent par stades`.

### Task 3: Tâche 3 — Le centre soigne : file d'attente, soins, vaccination, quarantaine — agent · **Sonnet**

**Files :**
- Create : `src/sim/vet.ts`, `tests/sim/vet.test.ts`
- Modify : `src/sim/advance.ts` (ordre des pas), `src/sim/actions.ts` (retrait de `soigner` / `soignerTout` / `cureAnimal` / `cureAllInEnclosure` / `cureCost`, nouvelles actions, `upgradeBuilding` jusqu'au niveau 5), `src/sim/merchant.ts` (texte de vente), `src/game/runGame.ts` (messages), `src/ui/debugPanel.ts` (bouton Soigner retiré, bouton « Rendre malade » de test à la place)
- Test : `tests/sim/actions.test.ts`, `tests/sim/enclosureActions.test.ts`, `tests/sim/merchant.test.ts`, `tests/sim/stats.test.ts`

**Interfaces :**
- Consumes : tâches 1–2 ; étape 2 (`state.staff`, `staffEfficiency`).
- Produces (`src/sim/vet.ts`) :
  - `centerLevel(state): 0 | 1 | 2 | 3 | 4 | 5` (0 = pas de centre)
  - `canTreat(state, d: DiseaseId): boolean` — `centerLevel ≥ DISEASES[d].centerLevel`
  - `workingVets(state): Employee[]` — vétérinaires, dans l'ordre d'embauche, au plus `PLACES[niveau − 1]` (aucun sans centre)
  - `careCost(a: Animal): number` — `max(CARE_MIN_COST, round(prix × CARE_PRICE_SHARE[stage − 1]))`
  - `careDurationMs(state, d: DiseaseId, vet: Employee): number` — `careH × SPEED[niveau − 1] / staffEfficiency × HOUR_MS`, arrondi au pas supérieur (au moins un pas)
  - `careQueue(state): Animal[]` — malades repérés, pas en soin, soignables : stade décroissant puis `detectedAt` croissant
  - `untreatable(state): Animal[]` — malades repérés que le centre ne sait pas encore soigner (ou pas de centre / pas de vétérinaire)
  - `quarantinePlaces(state): number`, `quarantineUsed(state): number`
  - `vaccineCost(state, encId): number` — `max(VACCINE_MIN_COST, VACCINE_COST_PER_ANIMAL × animaux)`
  - `vetStep(state, events)` — 1) soins finis (`careUntil ≤ now`) → `{ status: 'ok' }`, indigestion → `lastFedAt = now` (comme la V1), `bump('soins')`, l'animal sort de quarantaine ; soins dont le vétérinaire n'existe plus ou dont l'animal a disparu → annulés (le stade reprend) ; 2) chaque vétérinaire au travail et libre prend le premier de `careQueue` **dont il peut payer le prix** (sinon il essaie le suivant ; si aucun, il attend) : débit, `careUntil`, `vetId`, événement `soigne` avec le prix.
  - Ordre dans `step()` : repas → `healthStep` → `vetStep` → naissances → économie → marchand → missions.
- Produces (actions) :
  - `{ type: 'vacciner'; encId }` — refus exacts : « Le centre vétérinaire doit être au niveau 4. » ; « Il faut un vétérinaire au centre. » ; « Aucun animal dans cet enclos. » ; « Cet enclos est encore protégé N h. » (reste > `VACCINE_RENEW_BELOW_H`) ; pièces. Sinon débit, `vaccinatedUntil = time + VACCINE_DAYS j`, `bump('vaccinations')`.
  - `{ type: 'isoler'; animalId }` — refus : « Le centre vétérinaire doit être au niveau 3. » ; « Cet animal n'est pas malade. » ; « Sa maladie n'a pas encore été repérée. » ; « La quarantaine est pleine (N places). » ; « Il est déjà en quarantaine. »
  - `{ type: 'remettre'; animalId }` — sort de quarantaine ; refus « Il n'est pas en quarantaine. »
  - `sellAnimal` sur un malade : « Il doit guérir avant d'être vendu. »
  - Messages de `runGame` : « Enclos vacciné », « Animal en quarantaine », « Animal remis dans son enclos ».

- [ ] **Step 1 : tests qui échouent** (`tests/sim/vet.test.ts`, avec `employee(…, 'veterinaire')` de l'étape 2)
  - `un repéré est soigné seul` : centre 1, 1 vétérinaire, mouton indigestion léger → au pas suivant `careUntil` = +2 h, caisse − 20, événement `soigne` ; 2 h plus tard en forme, `stats.counts.soins + 1`.
  - `non repéré = pas soigné`.
  - `file d'attente` : 1 vétérinaire, 3 malades (léger ancien, grave récent, léger récent) → ordre grave, léger ancien, léger récent ; `careQueue` en montre 2 pendant le premier soin.
  - `places` : 3 vétérinaires au niveau 1 → 2 soignent à la fois ; au niveau 5 → 3, et les soins durent × 0,6.
  - `soignable selon le niveau` : blessure avec centre 1 → dans `untreatable`, pas soignée ; centre 2 → soignée.
  - `Review Focus 2` : caisse à 10, soin à 20 → l'animal attend, la caisse reste à 10 et ne passe jamais sous zéro ; caisse à 100 au pas suivant → soin commencé ; un malade moins cher derrière lui (mouton léger à 20 avec caisse 25, loup grave à 625 devant) est soigné en premier.
  - `Review Focus 1` : vétérinaire retiré de `staff` pendant un soin → soin annulé, l'animal reprend sa place dans la file ; animal mort ou retiré pendant un soin / en quarantaine → place libérée.
  - `sans centre` : vétérinaire embauché, pas de centre → personne n'est soigné.
  - Actions `vacciner`, `isoler`, `remettre` : chaque refus avec son texte exact, chaque réussite (coût, `vaccinatedUntil`, `quarantined`, `vaccinations + 1`) ; un animal guéri sort de quarantaine tout seul.
  - Amélioration du centre jusqu'au niveau 5 (500 / 1 200 / 2 500 / 5 000), refusée au-delà.
  - Les tests V1 de « Soigner » (`actions.test.ts`, `enclosureActions.test.ts`, `stats.test.ts`) sont **supprimés** ou remplacés par leur équivalent ci-dessus.
- [ ] **Step 2 :** `npx vitest run tests/sim` → échecs attendus.
- [ ] **Step 3 :** implémenter.
- [ ] **Step 4 :** `npx vitest run` et `npm run build` → verts (aucune référence restante à `soigner`, `soignerTout`, `cureCost`).
- [ ] **Step 5 :** commit `V2-3 tâche 3 : le vétérinaire soigne seul au centre, vaccination et quarantaine`.

### Task 4: Tâche 4 — Un parc bien tenu ne perd personne en 3 jours (test, réglages, joueur automatique) — agent · **Sonnet**

**Files :**
- Create : `tests/sim/wellKept.test.ts`
- Modify : `tests/sim/helpers.ts` (`wellKeptPark`), `src/data/diseases.ts` (réglages seulement si le test l'exige), `tests/balance/bot.ts`, `tests/balance/playthrough.test.ts`
- Test : `tests/sim/perf.test.ts`

**Interfaces :**
- Consumes : tout ce qui précède ; fabriques et actions de l'étape 2.
- Produces :
  - `wellKeptPark(): GameState` (`tests/sim/helpers.ts`) — `bigPark()` (village 3, 15 enclos, toutes espèces) **plus** : soigneurs couvrant tous les animaux, agents d'entretien couvrant tous les enclos (selon les règles de l'étape 2), centre niveau 3 sur l'emplacement 7, 2 vétérinaires, garde-manger rempli pour **4 jours** (capacité relevée si besoin), caisse = 3 jours de salaires + 3 000, aucun enclos vacciné (le centre 3 ne vaccine pas).
  - `hameauPark(): GameState` — nouvelle partie de niveau 1 avec 3 enclos de prairie, soigneur offert, centre niveau 1, 1 vétérinaire, garde-manger pour 4 jours.
  - Joueur automatique : il bâtit le centre dès qu'il a 250 pièces de côté au Hameau, embauche un vétérinaire (le moins cher des candidats `veterinaire`), monte le centre au niveau 2 au Village et 3 avant le Bourg, isole les grippés quand il le peut ; plus aucune action `soignerTout`.

- [ ] **Step 1 : tests qui échouent** (`tests/sim/wellKept.test.ts`)
  - `parc bien tenu : 3 jours sans le joueur, aucune mort ni dette` — pour les graines 1 à 20 : `advanceTo(wellKeptPark() avec rng = graine, +72 h)` → aucun événement `mort`, `coins ≥ 0` à chaque fin de journée (vérifié en avançant jour par jour), et **au moins une maladie** apparue sur l'ensemble des graines (sinon le test ne prouve rien).
  - `Hameau bien tenu : même chose` avec `hameauPark()`.
  - `contre-épreuve` : `wellKeptPark()` **sans aucun vétérinaire** → sur 20 graines et 6 jours, au moins une mort (les maladies comptent vraiment).
  - `playthrough.test.ts` : bornes de rythme existantes inchangées ; morts totales du joueur automatique ≤ la borne actuelle.
  - `perf.test.ts` : seuils inchangés.
- [ ] **Step 2 :** lancer → échecs attendus (fabrique absente).
- [ ] **Step 3 :** écrire les fabriques et l'adaptation du joueur automatique ; si le premier test échoue, ajuster **seulement** les chiffres de `src/data/diseases.ts` (fréquences, délais, places) et noter dans le compte rendu chaque chiffre changé et pourquoi (le chef les reporte dans D1–D4 pour Romain).
- [ ] **Step 4 :** `npx vitest run` → tout vert ; noter dans le compte rendu : nombre de malades et de soins sur 3 jours pour `wellKeptPark`, file d'attente maximale, dépenses de soins par jour, rythme du joueur automatique.
- [ ] **Step 5 :** commit `V2-3 tâche 4 : un parc bien tenu tient 3 jours sans mort`.

### Task 5: Tâche 5 — Missions, Gazette et message de mise à jour — agent · **Sonnet**

**Files :**
- Modify : `src/data/missions.ts`, `src/sim/missions.ts` (`POSSIBLE`), `src/sim/summary.ts`, `src/ui/gazetteModel.ts`, `src/game/session.ts`, `src/main.ts` (affichage du message, comme `pathsNotice`)
- Test : `tests/sim/daily.test.ts`, `tests/ui/gazetteModel.test.ts`, `tests/game/session.test.ts`

**Interfaces :**
- Consumes : événements `malade` / `soigne` / `mort.cause`, `careQueue`, `untreatable`, `centerLevel`, `workingVets`.
- Produces :
  - `DailyCondition` : `'malade'` devient « un malade dans `careQueue` ou en soin, et au moins un vétérinaire au travail » ; nouvelle `'vaccinable'` = centre ≥ 4, un vétérinaire, un enclos occupé non protégé ou à revacciner.
  - `quot-soin` : titre « Fais soigner un animal », texte « Un animal malade attend le vétérinaire au centre. », giver `GARDE`, compteur `soins` (même id : les anciennes parties restent lisibles ; `DAILY_LEGACY` inchangé).
  - Nouvelle quotidienne `quot-vacciner` : « Vaccine un enclos », texte « Protège un enclos de la grippe au centre vétérinaire. », compteur `vaccinations`, cible 1, récompense `coinsReward(p)`.
  - `Summary` gagne `soignes: number`, `soinsCout: number`, `maladies: Partial<Record<DiseaseId, number>>` ; `morts[]` gagne `cause?: DiseaseId` ; `malades` compte les **repérages**.
  - Gazette, rubrique « Santé » (pure, textes exacts) :
    - « 2 animaux sont tombés malades (1 grippe, 1 parasites). » / « Un animal est tombé malade (indigestion). »
    - « Le vétérinaire a soigné 3 animaux pour 240 pièces. » (seul s'il y a eu des soins)
    - « File d'attente au centre : 2 animaux. » si `careQueue(state).length > 0` à la fin
    - « Personne ne peut soigner 1 animal : il faut le centre vétérinaire et un vétérinaire. » si `untreatable` non vide sans centre ou sans vétérinaire ; « 1 animal attend que le centre passe au niveau 3. » sinon
    - Rubrique « Disparus » : « Noisette (grippe), Bête2 (indigestion) ».
  - `Session.healthNotice: string | null` — si `fromVersion < 6` : « Nouveau à Clairbois : le centre vétérinaire ! Margaux l'a fait construire et Élise Fontaine, vétérinaire, soigne maintenant les malades toute seule. » + « N animaux malades lui ont été confiés. » si N > 0 ; sinon `null`.

- [ ] **Step 1 : tests qui échouent** : chaque phrase ci-dessus pour 0, 1 et plusieurs ; `quot-soin` jamais tirée sans vétérinaire, tirée avec un malade dans la file ; `quot-vacciner` tirée seulement au centre 4 ; une quotidienne v3 `quot-soin#2` reste lisible ; session v5 → `healthNotice` contient « Élise Fontaine », session v6 → `null`.
- [ ] **Step 2 :** lancer → échecs attendus.
- [ ] **Step 3 :** implémenter.
- [ ] **Step 4 :** `npx vitest run` → tout vert.
- [ ] **Step 5 :** commit `V2-3 tâche 5 : missions et Gazette des maladies, message de mise à jour`.

### Task 6: Tâche 6 — Le centre et les malades sur la carte — agent · **Sonnet**

**Files :**
- Create : `src/scene/sickIcons.ts`, `tests/scene/sickIcons.test.ts`
- Modify : `src/scene/villageView.ts` (centre sur l'emplacement 7, `minLevel` jusqu'à 5), `src/scene/parkView.ts` (malades en quarantaine cachés, icônes), `src/data/visuals.ts` (couleurs), `src/main.ts`

**Interfaces :**
- Consumes : `state.animals[].health`, `AnimalActor.object`, `world`.
- Produces :
  - `sickIconStyle(h: Health): { color: string; visible: boolean } ` (pure) — en forme ou **non repéré** → invisible ; en soin → bleu `#3b82c4` ; stade 1 jaune `#e8c12a`, 2 orange `#e8862a`, 3 rouge `#d23a2a` (couleurs dans `src/data/visuals.ts`).
  - `createSickIcons(world): { update(state, actors: Map<number, AnimalActor>): void }` — une petite croix en sprite (canvas, une texture par couleur, partagée) qui suit chaque malade à 0,6 m au-dessus de sa tête, lisible de loin, qui pulse doucement au stade 3 ; les sprites ne sont recréés que quand la liste des malades change.
  - Animal en quarantaine : son acteur est caché (`object.visible = false`).
  - Centre : modèle `maison2` + enseigne à croix verte (Three.js) ; niveau 3 : `tonneau` + `caisse` ; niveau 5 : `banc2` et une deuxième enseigne. Fiche au clic : le picker existant des bâtiments marche tel quel.

- [ ] **Step 1 : tests qui échouent** : `sickIconStyle` pour les 6 cas (ok, non repéré, stades 1–3, en soin).
- [ ] **Step 2 :** lancer → échec attendu.
- [ ] **Step 3 :** implémenter.
- [ ] **Step 4 :** `npx vitest run` et `npm run build` → verts.
- [ ] **Step 5 :** commit `V2-3 tâche 6 : centre vétérinaire et icônes des malades sur la carte`.

### Task 7: Tâche 7 — Interface : fiches et volet du centre, téléphone — agent · **Sonnet**

**Files :**
- Create : `src/ui/healthModel.ts`, `tests/ui/healthModel.test.ts`
- Modify : `src/ui/bottomBar.ts` (fiche de l'animal, fiche et détails de l'enclos), `src/ui/buildingInfo.ts` + `src/data/buildingInfo.ts` (fiche du centre), `src/ui/villagePanel.ts` (construire le centre au 7), `src/ui/icons.ts` (icônes vaccin, quarantaine), `src/style.css`

**Interfaces :**
- Consumes : `careQueue`, `untreatable`, `quarantinePlaces`, `quarantineUsed`, `workingVets`, `vaccineCost`, `centerLevel`, `canTreat`, actions `vacciner` / `isoler` / `remettre`, `confirmGuard`.
- Produces (`src/ui/healthModel.ts`, pur) :
  - `healthLabel(state, a: Animal): { text: string; tone: 'vert' | 'jaune' | 'orange' | 'rouge' | 'bleu' }` — « En forme » ; « Grippe · grave » ; « En soin (encore 1 h 20) » ; « En file d'attente (2ᵉ) » ; « En quarantaine · Grippe · léger ». Un malade **non repéré** s'affiche « En forme » (le joueur ne le sait pas encore).
  - `healthHelp(state, a): string | null` — la phrase sous l'animal : « Personne ne peut le soigner : construis le centre vétérinaire au village et embauche un vétérinaire. » / « Le centre doit être au niveau 3 pour soigner la grippe. » / « Le soin attend : il faut 625 pièces dans la caisse. » / `null`.
  - `vetCenterView(state): { level: number; treats: string[]; nextUnlock: string | null; vets: string; queue: { name: string; label: string }[]; quarantine: string; vaccination: string | null }` — ex. `vets: '2 vétérinaires au travail sur 2 places'`, `quarantine: '1 / 2 places'`, `nextUnlock: 'Niveau 4 : vaccination des enclos'`.
- Écrans :
  - **Fiche de l'animal** (tableau du volet de l'enclos) : colonne Santé = `healthLabel` coloré ; plus de bouton Soigner ; bouton **Isoler** (malade repéré, centre ≥ 3, place libre) ou **Remettre** ; `healthHelp` en petit dessous.
  - **Enclos** : ligne « 2 malades » gardée (repérés seulement) ; bouton **Vacciner l'enclos (N pièces)** si centre ≥ 4, ou « Protégé encore 3 j » en vert.
  - **Fiche du centre** (clic sur le bâtiment) : niveau, maladies soignées, vétérinaires, file d'attente (5 premiers + « et 3 autres »), quarantaine, bouton **Améliorer (N pièces)** avec ce que le niveau suivant débloque.
  - Téléphone 375 × 812 : la file passe sous le reste, boutons ≥ 44 px, aucun texte coupé.

- [ ] **Step 1 : tests qui échouent** : `healthLabel` (5 cas ci-dessus + non repéré), `healthHelp` (4 cas), `vetCenterView` (centre 3 avec 2 vétérinaires, 3 en file, 1 en quarantaine ; pas de centre → niveau 0, `nextUnlock` « Niveau 1 : parasites et indigestion »).
- [ ] **Step 2 :** lancer → échec attendu.
- [ ] **Step 3 :** implémenter.
- [ ] **Step 4 :** `npx vitest run` et `npm run build` → verts.
- [ ] **Step 5 :** commit `V2-3 tâche 7 : fiches de santé, volet du centre vétérinaire`.

### Task 8: Tâche 8 — Vérification d'ensemble, relecture et publication — chef (**Opus**) + relecture · **Opus**

- [ ] Navigateur (`?heure=14`, `?debug` pour « Rendre malade ») : nouvelle partie → malade repéré sans centre (texte de la fiche) → bâtir le centre au 7 → embaucher un vétérinaire → soin seul, pièces débitées ; une maladie de chaque sorte ; file d'attente visible au centre avec 3 malades ; aggravation non soignée (icône jaune → orange → rouge) ; grippe et quarantaine (animal caché, revient guéri) ; vaccination ; amélioration 1 → 5 ; Gazette après une absence avec soins et une mort ; téléphone 375 × 812 (taps seulement).
- [ ] Ancienne partie : charger une sauvegarde v5 avec deux malades (dont un depuis 40 h) → centre et Élise présents, malades devenus indigestion / parasites, aucun mort, message unique.
- [ ] Relecture indépendante **Opus** de toute la branche ; corrections par un agent Sonnet (Opus si le bug est subtil).
- [ ] `progress.md` : sous-tâches cochées, décisions D1–D10 telles que validées, chiffres ajustés en tâche 4.
- [ ] Fusion dans `main` **seulement avec l'accord de Romain** ; vérification en ligne.
