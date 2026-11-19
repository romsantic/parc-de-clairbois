# V2 — Étape 7 : trophées, musée, équilibrage, finition — plan de construction

> **Votes de Romain (19/11/2026)** — La liste des 40 trophées (D1) sera **relue par Romain au lancement de l'étape 7**. Les autres décisions sont acceptées telles que proposées.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal :** la V2 devient un jeu fini qui dure ≈ 7 semaines : ~40 trophées en bronze / argent / or (pièces pour bronze et argent, objet de décoration unique pour l'or), un musée des trophées dans le village, de nouvelles missions du jour liées aux métiers de la V2, une Gazette qui raconte la paie, les maladies et le marchand itinérant, et un équilibre vérifié par le joueur automatique (niveaux 1–3 ≈ 18 jours, 4–6 ≈ 1 mois, 3 jours d'absence sans mort ni dette).

**Architecture :** les trophées sont des **données** (`src/data/trophies.ts`) mesurées par un moteur pur (`src/sim/trophies.ts`) appelé à chaque pas, juste après `missionsStep`, sur le même modèle que les missions (une ligne par sorte de mesure). Les médailles gagnées et leurs récompenses gelées vivent dans `GameState.trophies` (nouvelle version de sauvegarde). Le musée est un bâtiment du village comme les autres (`BuildingType` + emplacement). L'objet d'or est un objet de décoration de l'étape 5, marqué par son trophée, qui ne se vend pas. Le joueur automatique (`tests/balance/`) joue toute la V2 avec les vraies règles et sert de garde-fou de l'équilibre.

**Tech Stack :** TypeScript strict, Three.js, Vitest (`export PATH="/c/Program Files/nodejs:$PATH"; npx vitest run`).

**Spec :** `docs/superpowers/specs/2026-11-19-parc-de-clairbois-v2-design.md` — §9 (trophées et finition), §1 (rythme, absence, anti-objectifs), §12 (« Étapes 6 et 7 » : ~40 trophées, récompenses, personnages) ; conception V1 et plan de finition V1 (`2026-11-17-etape-6-finition-v1.md`, tâches 3 et 5 : joueur automatique et réglage) pour le reste.

---

## Avant de lancer cette étape : ce que le plan attend des étapes 1 à 6

Ce plan est écrit le 19/11/2026, **avant** que les étapes 1 à 6 de la V2 soient construites (l'étape 1 est en cours sur `etape-v2-1-chemins`). Les noms ci-dessous sont ceux que ce plan **suppose** ; au lancement, la session d'étape fait la tâche 0 (vérification) et corrige le plan là où le code a pris d'autres noms.

| Étape | Ce que ce plan utilise (noms supposés) |
|---|---|
| 1 — Chemins | `GameState.paths: PathSegment[]`, action `tracerChemin { a, b }`, `segmentLength` ou longueur calculable de `a`/`b`. Sauvegarde v4. |
| 2 — Personnel | `GameState.staff = { employees: Employee[]; candidates: … }` ; `Employee { id, name, job: 'soigneur' \| 'entretien' \| 'veterinaire' \| 'fermier' \| 'animateur', level, salary, … }` ; actions `embaucher`, `licencier`, `affecter` ; paie à minuit avec un événement `{ kind: 'paie'; at; total; paid; debt }` ; dette = `coins < 0` (bornée à une journée de salaires) ; bâtiment `maisonPersonnel`. |
| 3 — Maladies | `Health = { status: 'ok' } \| { status: 'malade'; disease: 'parasites' \| 'indigestion' \| 'blessure' \| 'grippe'; stage: 'leger' \| 'grave' \| 'mortel'; … }` ; bâtiment `veterinaire` (niveaux 1–5) avec file d'attente ; actions `vaccinerEnclos`, `quarantaine` ; événements `malade { disease }`, `soigne { animalId; disease; stage; cost }`, `mort { cause? }`. Le bouton « Soigner » de la V1 a disparu. |
| 4 — Ferme | `GameState.farm.plots` (6–8 parcelles, niveaux 1–3) ; actions `acheterParcelle`, `ameliorerParcelle`, `ramasserParcelle` ; événement `recolte { fourrage; byPlayer }` ; bâtiment `grange`. |
| 5 — Confort | `GameState.decor: DecorItem[]` (`{ id; kind; x; z }`) ; actions `poserDeco`, `deplacerDeco`, `vendreDeco` ; contrôle de pose pur (`checkDecorPlacement`) ; déchets (`GameState.waste`) et action `ramasserDechets` ; `satisfaction(state): number` (0..1) ; animateur et visites guidées. |
| 6 — Niveaux 4–6 | `Village.level: 1..6` ; ~20 espèces dans `SPECIES` ; nourriture `legumes` et potager ; bâtiment `restaurant` ; marchand itinérant `GameState.traveler { arrivesAt; leavesAt; offers }` avec événements `itinerant { what: 'arrive' \| 'depart' }` ; missions d'histoire des niveaux 4–6 (portes 4, 5, 6 ; `'fin'` déplacée au niveau 6) ; nouveaux personnages (la vétérinaire, le fermier, le garde de l'étang). |

**À revérifier au lancement (tâche 0) :**
1. Les vrais noms des champs, actions, événements et bâtiments du tableau ci-dessus ; la **version de sauvegarde** laissée par l'étape 6 (ce plan l'appelle **vN** ; cette étape passe en **vN+1**).
2. Les compteurs `StatKey` déjà créés par les étapes 2 à 6 (liste de la tâche 1) : ne créer que ceux qui manquent.
3. Ce que les étapes 2 à 6 ont **déjà** ajouté au joueur automatique, aux quotidiennes (`quot-soin` sans doute déjà retirée à l'étape 3) et à la Gazette : ne pas le refaire, compléter.
4. La liste définitive des ~20 espèces (trophées « Rois de la forêt », « Collectionneur » et statues dorées) et les seuils d'habitants des niveaux 4–6 (trophée « Clairbois grandit »).
5. Les « petits défauts gardés » notés dans `progress.md` aux étapes 1 à 6 (tâche 10), plus celui de la V1 : hauteur de la bannière « Nouvelle mission ».
6. Le tableau des trophées et les décisions D1 à D12 **validés par Romain** (sinon, les faire valider avant la tâche 1).

## Global Constraints

- Règles pures et testées dans `src/sim/`, chiffres et textes dans `src/data/`, aucune logique dans `src/data/`.
- Le temps n'avance que par `advanceTo` (pas de 10 min) ; les actions passent par `applyAction` et renvoient un nouvel état (`structuredClone`) ou un refus en français affichable tel quel.
- Sauvegarde vN → vN+1 : migration écrite en clair, sans appeler le jeu ; la partie de Romain continue sans rien perdre.
- Récompenses de trophée **à récupérer par un bouton**, comme les missions (choix V1 de Romain).
- Bronze et argent = **pièces** ; or = **objet de décoration unique** (spec §12).
- Rythme : niveaux 1–3 ≈ 18 jours ; 4–6 ≈ 1 mois de plus (un niveau toutes les 1 à 2 semaines) ; ≈ 7 semaines jusqu'au niveau 6 (spec §1).
- Un parc bien tenu (personnel suffisant, stock, caisse) tient **3 jours** sans le joueur, **sans mort ni dette** (spec §1).
- Rattrapage de 30 jours d'absence d'un grand parc V2 en **moins de 2 s** (règle V1, gardée).
- Téléphone et ordinateur : volets ≤ 40 % de la hauteur sur téléphone, boutons ≥ 40 px, lisible en 375 × 812.
- Textes du jeu en français simple, tutoiement ; noms (animaux, employés) en texte seulement, jamais en HTML.

## Décisions du chef (à valider par Romain avec le plan)

| # | Sujet | Proposition |
|---|---|---|
| D1 | **Liste des trophées** | Les 40 trophées du tableau ci-dessous, en 8 familles. Chaque trophée a 3 seuils (bronze, argent, or) ; une médaille gagnée **reste gagnée** même si la valeur redescend (vendre des animaux ne retire rien). |
| D2 | **Gagner et récupérer** | Le jeu vérifie les trophées à chaque pas, même pendant l'absence. Une médaille gagnée affiche une bannière (« Médaille d'argent : Grande famille ! ») et un point sur l'icône 🏆 ; la récompense se **récupère** dans le volet Trophées (bouton « Récupérer », et « Tout récupérer » quand il y en a plusieurs). Si plusieurs médailles tombent en même temps, **une seule** bannière (« 5 nouvelles médailles »). |
| D3 | **Pièces de bronze et d'argent** | Elles suivent l'avancement du parc, comme les quotidiennes : **bronze ≈ 2 h de recettes** (au moins 100), **argent ≈ 6 h** (au moins 500), arrondies à un chiffre rond, **gelées au moment où la médaille est gagnée**. |
| D4 | **Objet d'or** | Chaque or donne un objet de décoration unique, doré, avec le nom du trophée sur une plaque : une **statue dorée d'animal** (le modèle 3D de l'espèce, en doré, sur un socle) pour les trophées d'animaux, sinon une fontaine, un obélisque, une arche, un kiosque, une cloche ou une grande lanterne dorés (modèles de décoration de l'étape 5 teintés en or). Il se pose comme une décoration (doit toucher un chemin pour compter), compte comme une **fontaine ×2** pour la satisfaction, se déplace gratuitement, se **range** (retour dans le volet) mais **ne se vend pas**. |
| D5 | **Musée des trophées** | Bâtiment du village, constructible **au Village (niveau 2)**, 3 niveaux (prix de départ 1 500 / 4 000 / 10 000, à régler en tâche 9). Il expose les médailles : **12 / 40 / 120 places** selon le niveau ; chaque médaille exposée donne **+0,5 d'attrait** (or = +1,5). Sa fiche montre les médailles exposées et ouvre le volet Trophées. Un nouvel emplacement du village lui est réservé (règle de la spec §8). |
| D6 | **Partie existante** | À l'arrivée de cette version, les trophées comptés sur des **cumuls déjà connus** (naissances, visiteurs, pièces gagnées, nettoyages, ventes, achats, embauches…) et sur l'**état du parc** (espèces, animaux, caisse…) sont gagnés aussitôt, avec leurs récompenses à récupérer. Les **séries** (jours sans mort, sans dette, visiteurs ravis) et les **records d'un jour** partent de zéro. |
| D7 | **Nouvelles missions du jour** | Ajoutées au tirage : *Embauche un employé* (place libre et candidats), *Fais soigner {n} animaux* (centre + vétérinaire + un malade repéré), *Ramasse toi-même {n} déchets*, *Ramasse toi-même {n} fourrages aux parcelles*, *Vaccine {n} enclos* (centre niveau 4), *Pose {n} décorations*, *Atteins {n} % de satisfaction*, *Achète un animal au marchand itinérant* (quand il est là). Seul ce que **le joueur** fait compte pour « ramasser » et « récolter » (sinon l'agent d'entretien ou le fermier la réussiraient à sa place). Données par la vétérinaire, le fermier ou le garde de l'étang. |
| D8 | **Gazette enrichie** | Nouvelles rubriques : **Paie** (salaires versés, et caisse à découvert s'il y a une dette, avec « pas d'achat ni de construction tant que ce n'est pas remboursé ») ; **Santé** détaillée (nouveaux malades par maladie, animaux soignés, file d'attente au centre, morts par maladie) ; **Ferme** (fourrage et légumes récoltés) ; **Propreté** (déchets ramassés, satisfaction moyenne) ; **Marchand itinérant** (« est là jusqu'à mardi 18 h » ou « reviendra vers jeudi ») ; **Trophées** (médailles gagnées). Titre à la une, par ordre : une mort > une médaille d'or > une dette > le marchand itinérant est là > des naissances > les recettes. |
| D9 | **Rythme visé (joueur automatique, 2 ou 3 visites par jour)** | Village jour 2–4 ; Bourg jour 4–9 ; niveau 4 jour **14–24** (≈ 18) ; niveau 5 jour **26–40** (≈ 32) ; niveau 6 jour **40–56** (≈ 48, soit ≈ 7 semaines). Aucune mort et aucune dette pour un joueur attentif. |
| D10 | **« Parc bien tenu » pour le test d'absence** | Le parc du joueur automatique juste après une visite aux jours 10, 25 et 45 : on le laisse 72 h sans rien faire → **0 mort**, caisse **≥ 0** à chaque minuit (paie comprise), garde-manger jamais vide. |
| D11 | **Recommencer à zéro** | Les trophées font partie de la partie : ils repartent à zéro avec elle (pas de « palmarès » gardé à part). |
| D12 | **Ordre et méthode du réglage** | Comme à la V1 : le joueur automatique mesure, le chef propose à Romain **2 ou 3 changements de chiffres** expliqués simplement, Romain choisit, un agent les applique. On règle d'abord les salaires et les maladies (ce qui peut casser l'absence), puis le rythme. |

### Tableau des trophées (D1, à valider par Romain)

Sortes de mesure : **cumul** = total depuis le début de la partie ; **état** = valeur du parc à un moment ; **jour** = total d'une journée (minuit à minuit, heure de l'appareil) ; **série** = jours de suite. Objet d'or : S = statue dorée d'animal, F = fontaine, O = obélisque, A = arche, K = kiosque, C = cloche, L = grande lanterne.

| # | id | Nom | Ce qui compte | Sorte | Bronze | Argent | Or | Objet d'or | Étape |
|---|---|---|---|---|---|---|---|---|---|
| 1 | `naissances` | Berceau | naissances au parc | cumul | 10 | 50 | 150 | S (mouton) | V1 |
| 2 | `especes` | Collectionneur | espèces au parc en même temps | état | 5 | 10 | 20 | S (cerf) | 6 |
| 3 | `animaux` | Grande famille | animaux au parc en même temps | état | 30 | 80 | 150 | S (cochon) | V1 |
| 4 | `especesNees` | Arbre généalogique | espèces différentes nées au parc | état | 3 | 8 | 15 | A | V1 |
| 5 | `predateurs` | Rois de la forêt | naissances d'espèces qui mangent de la viande | cumul | 2 | 10 | 25 | S (loup) | V1/6 |
| 6 | `doyen` | Doyen | âge du plus vieil animal (jours) | état | 10 | 30 | 60 | S (âne) | V1 |
| 7 | `achats` | Bon client | animaux achetés | cumul | 10 | 40 | 120 | K | V1 |
| 8 | `ventes` | Éleveur | animaux vendus | cumul | 5 | 30 | 100 | S (cheval) | V1 |
| 9 | `sansMort` | Tous en vie | jours de suite sans mort | série | 7 | 30 | 90 | F | V1 |
| 10 | `soins` | Docteur | animaux soignés au centre | cumul | 10 | 50 | 200 | O | 3 |
| 11 | `depistage` | Œil de lynx | maladies soignées au stade léger | cumul | 10 | 50 | 150 | S (lynx) | 3 |
| 12 | `vaccins` | Bien protégés | enclos vaccinés | cumul | 5 | 25 | 100 | C | 3 |
| 13 | `quarantaine` | Isolement | animaux guéris en quarantaine | cumul | 3 | 15 | 40 | L | 3 |
| 14 | `clinique` | Clinique modèle | niveau du centre vétérinaire | état | 2 | 4 | 5 | O | 3 |
| 15 | `visiteursJour` | Jour d'affluence | visiteurs en un jour | jour | 500 | 1 000 | 3 000 | A | V1 |
| 16 | `visiteursTotal` | Grand public | visiteurs depuis le début | cumul | 10 000 | 100 000 | 1 000 000 | F | V1 |
| 17 | `visiteursH` | Heure de pointe | visiteurs par heure | état | 50 | 150 | 400 | L | V1 |
| 18 | `ravis` | Visiteurs ravis | jours de suite avec satisfaction ≥ 80 % toute la journée | série | 3 | 14 | 30 | F | 5 |
| 19 | `reputation` | Bonne réputation | réputation (%) | état | 60 | 80 | 95 | K | V1 |
| 20 | `guides` | Suivez le guide | visiteurs en visite guidée | cumul | 500 | 5 000 | 30 000 | A | 5 |
| 21 | `piecesTotal` | Tirelire | pièces gagnées depuis le début | cumul | 10 000 | 100 000 | 1 000 000 | O | V1 |
| 22 | `caisse` | Coffre-fort | pièces en caisse | état | 5 000 | 50 000 | 250 000 | C | V1 |
| 23 | `piecesJour` | Belle journée | recettes en un jour | jour | 1 000 | 5 000 | 20 000 | K | V1 |
| 24 | `sansDette` | Comptes en ordre | jours de suite sans dette, avec au moins un employé | série | 7 | 30 | 90 | C | 2 |
| 25 | `commerces` | Commerçant | pièces gagnées par les bâtiments du village | cumul | 5 000 | 50 000 | 300 000 | K | V1 |
| 26 | `embauches` | Recruteur | employés embauchés | cumul | 3 | 10 | 25 | O | 2 |
| 27 | `equipe` | Belle équipe | employés en même temps | état | 5 | 10 | 15 | A | 2 |
| 28 | `experience` | Vieux de la vieille | meilleur niveau d'un employé | état | 3 | 5 | 8 | L | 2 |
| 29 | `salaires` | Fiche de paie | salaires versés | cumul | 2 000 | 20 000 | 100 000 | C | 2 |
| 30 | `metiers` | Tous les métiers | métiers différents dans l'équipe | état | 3 | 4 | 5 | F | 2 |
| 31 | `nettoyages` | Grand ménage | enclos nettoyés (toi et les agents) | cumul | 50 | 300 | 1 000 | F | V1 |
| 32 | `dechets` | Ramasse-miettes | déchets ramassés (toi et les agents) | cumul | 50 | 500 | 2 000 | L | 5 |
| 33 | `decors` | Décorateur | objets de décoration posés | cumul | 10 | 40 | 100 | A | 5 |
| 34 | `chemins` | Bâtisseur | mètres de chemin construits | cumul | 100 | 500 | 1 500 | L | 1 |
| 35 | `moisson` | Moisson | fourrage récolté aux parcelles | cumul | 500 | 5 000 | 30 000 | S (bison) | 4 |
| 36 | `potager` | Potager généreux | fruits et légumes récoltés | cumul | 200 | 2 000 | 15 000 | K | 6 |
| 37 | `domaine` | Grand domaine | niveaux de parcelles (somme) | état | 3 | 10 | 20 | O | 4 |
| 38 | `habitants` | Clairbois grandit | habitants | état | 100 | 300 | 600 | C | V1/6 |
| 39 | `architecte` | Architecte | niveaux des bâtiments du village (somme) | état | 10 | 20 | 30 | A | V1 |
| 40 | `fidele` | Fidèle au poste | série de jours aux 3 quotidiennes réussies | état | 7 | 30 | 100 | S (alpaga) | V1 |

Les seuils 2, 5, 11, 28, 35, 37, 38 dépendent de chiffres des étapes 2 à 6 : ils sont recalés en tâche 0 (même esprit : bronze en quelques jours, argent vers le niveau 4–5, or en fin de partie ou au-delà). Les espèces des statues dorées sont remplacées si l'espèce n'existe pas.

## Review Focus

1. **Beaucoup de médailles d'un coup** (partie existante à l'arrivée, ou longue absence) : toutes sont enregistrées une par une avec leur récompense, une seule bannière groupée, la Gazette les regroupe (« 7 médailles gagnées ») → tests en tâches 2, 5 et 7.
2. **Minuit pendant une absence** : un rattrapage de plusieurs jours fait passer minuit plusieurs fois ; chaque jour ferme ses totaux et ses séries dans l'ordre ; une mort au milieu remet « Tous en vie » à zéro dès ce jour-là → test en tâche 2.
3. **Objet d'or unique** : récupérer deux fois, le poser deux fois, le vendre par l'action de vente de l'étape 5 → refusé chaque fois, jamais deux exemplaires → tests en tâche 3.
4. **Anciennes quotidiennes du jour** : une sauvegarde vN avec `quot-soin`, une quotidienne retirée ou un ancien id « #2 » se charge, la mission reste lisible et récupérable → test en tâche 6.
5. **Récompense quand le parc est à l'arrêt ou en dette** : recettes à 0 → le minimum (100 / 500) ; récupérer des pièces pendant une dette rembourse la dette d'abord (même caisse) et débloque les achats si elle repasse ≥ 0 → tests en tâche 2.

---

### Task 0: Tâche 0 — Vérifier le terrain et recaler le plan — chef (**Opus**) + agent Explore · **Haiku**

- [ ] **Step 1 :** agent Explore (Haiku) : relever dans `src/` les vrais noms du tableau « ce que le plan attend » (état, actions, événements, bâtiments, `StatKey`, `CURRENT_VERSION`, bot, quotidiennes, rubriques de la Gazette) et les signaler en face de chaque ligne.
- [ ] **Step 2 (chef) :** corriger ce plan (noms, version vN, seuils marqués « 6 », espèces des statues), relire avec Romain le tableau des trophées et D1–D12 s'ils ne sont pas encore validés.
- [ ] **Step 3 :** `npx vitest run` → tout vert sur `main` avant de créer la branche `etape-v2-7-trophees`.
- [ ] **Step 4 :** commit — `Plan V2-7 recalé sur le code des étapes 1 à 6`

### Task 1: Tâche 1 — Données des trophées, compteurs et sauvegarde vN+1 — agent · **Sonnet**

**Files :**
- Create : `src/data/trophies.ts`, `tests/data/trophies.test.ts`
- Modify : `src/sim/types.ts`, `src/sim/stats.ts`, `src/sim/newGame.ts`, `src/save/migrations.ts`, `src/save/save.ts` (validation), les endroits qui doivent compter (voir Step 3), `tests/sim/helpers.ts`, `tests/save/migrations.test.ts`, tout `version: N` restant

**Interfaces :**
- Produces (`src/data/trophies.ts`) :
  - `export type Tier = 1 | 2 | 3` (bronze, argent, or) ; `export const TIER_NAMES = ['', 'bronze', 'argent', 'or']`
  - `export type TrophyFamily = 'animaux' | 'sante' | 'visiteurs' | 'argent' | 'personnel' | 'proprete' | 'ferme' | 'village'`
  - `export type Gauge = 'especes' | 'animaux' | 'especesNees' | 'doyenJours' | 'clinique' | 'visiteursH' | 'reputationPct' | 'caisse' | 'equipe' | 'experience' | 'metiers' | 'domaine' | 'habitants' | 'architecte' | 'serieQuotidiennes'`
  - `export type DayTotal = 'visiteurs' | 'pieces'` ; `export type StreakKey = 'sansMort' | 'sansDette' | 'ravis'`
  - `export type TrophyMeasure = { kind: 'cumul'; stat: StatKey } | { kind: 'etat'; gauge: Gauge } | { kind: 'jour'; total: DayTotal } | { kind: 'serie'; streak: StreakKey }`
  - `export type GoldModel = { kind: 'statue'; species: SpeciesId } | { kind: 'objet'; base: 'fontaine' | 'obelisque' | 'arche' | 'kiosque' | 'cloche' | 'lanterne' }`
  - `export interface TrophyDef { id: string; name: string; family: TrophyFamily; /** « {n} naissances au parc » */ text: string; measure: TrophyMeasure; tiers: readonly [number, number, number]; gold: GoldModel }`
  - `export const TROPHIES: TrophyDef[]` — les 40 lignes du tableau, dans l'ordre. Compteur de chaque `cumul` : `naissances`→`naissances`, `predateurs`→`naissancesViande`, `achats`→`achatsAnimaux`, `ventes`→`ventes`, `soins`→`soinsCentre`, `depistage`→`soinsLegers`, `vaccins`→`vaccinations`, `quarantaine`→`guerisonsQuarantaine`, `visiteursTotal`→`visiteurs`, `guides`→`visitesGuidees`, `piecesTotal`→`piecesGagnees`, `commerces`→`piecesVillage`, `embauches`→`embauches`, `salaires`→`salaires`, `nettoyages`→`nettoyages`, `dechets`→`dechets`, `decors`→`decorsPoses`, `chemins`→`cheminMetres`, `moisson`→`fourrageRecolte`, `potager`→`legumesRecoltes` ; chaque `etat` a la `Gauge` de même nom (`doyen`→`doyenJours`, `reputation`→`reputationPct`, `fidele`→`serieQuotidiennes`)
  - `export const TROPHY_TUNING = { BRONZE_HOURS: 2, BRONZE_MIN: 100, SILVER_HOURS: 6, SILVER_MIN: 500, RAVIS_MIN: 0.8, GOLD_SATISFACTION_FACTOR: 2 }`
- Produces (`src/sim/types.ts`) :
  - `StatKey` gagne ceux qui manquent parmi : `embauches`, `salaires`, `soinsCentre`, `soinsLegers`, `vaccinations`, `guerisonsQuarantaine`, `dechets`, `dechetsMain`, `decorsPoses`, `cheminMetres`, `fourrageRecolte`, `recolteMain`, `legumesRecoltes`, `visitesGuidees`, `piecesVillage`, `naissancesViande`, `achatsItinerant` (+ `STAT_KEYS`)
  - `export interface Medal { trophyId: string; tier: Tier; at: number; coins: number /* 0 pour l'or */; claimed: boolean }`
  - `export interface TrophiesState { medals: Medal[]; day: { key: number; visiteurs: number; pieces: number; death: boolean; debt: boolean; minSatisfaction: number }; streaks: Record<StreakKey, number>; goldItems: { trophyId: string; placed: boolean }[] }`
  - `GameState.version: N+1`, `GameState.trophies: TrophiesState`
- Produces (`src/sim/stats.ts`) : `emptyTrophies(dayKey: number): TrophiesState`

- [ ] **Step 1 : tests qui échouent**
  - `tests/data/trophies.test.ts` : 40 trophées ; ids uniques ; `tiers` strictement croissants ; chaque `cumul` vise un `StatKey` de `STAT_KEYS` ; chaque statue vise une espèce de `SPECIES` ; chaque `text` contient `{n}`.
  - `tests/save/migrations.test.ts` : une sauvegarde vN se charge en vN+1 avec `trophies.medals = []`, séries à 0, nouveaux compteurs à 0, rien d'autre de changé ; une vN+1 sans `trophies` est refusée par la validation.
  - `newGame(1, T0).trophies` vide ; `version` = N+1.
  - Compteurs : une action `embaucher` réussie fait +1 `embauches` ; `tracerChemin` de 10 m fait +10 `cheminMetres` ; une paie de 240 fait +240 `salaires` ; les recettes du village d'un pas vont dans `piecesVillage` ; un soin au stade léger fait +1 `soinsCentre` et +1 `soinsLegers` ; un ramassage par le joueur fait +n `dechets` et `dechetsMain`, par l'agent seulement `dechets` (un test par compteur ajouté).
- [ ] **Step 2 :** `npx vitest run tests/data/trophies.test.ts tests/save tests/sim` → ÉCHEC.
- [ ] **Step 3 : implémenter** — les données ; les types ; la migration vN → vN+1 (ajoute `trophies` vide avec `day.key` = jour local de `state.time`, les compteurs manquants à 0) ; chaque `bump` à l'endroit où l'étape d'origine fait l'action (actions, paie, soins, ramassage, récolte, recettes, naissances d'espèces `diet` viande).
- [ ] **Step 4 :** `npx vitest run` → tout vert.
- [ ] **Step 5 :** commit — `V2-7 tâche 1 : données des trophées, compteurs et sauvegarde vN+1`

### Task 2: Tâche 2 — Moteur des trophées — agent · **Sonnet**

**Files :**
- Create : `src/sim/trophies.ts`, `tests/sim/trophies.test.ts`
- Modify : `src/sim/advance.ts` (appel après `missionsStep`), `src/sim/actions.ts`, `src/sim/types.ts` (événement)

**Interfaces :**
- Consumes : `TROPHIES`, `TROPHY_TUNING`, `TrophiesState` (tâche 1) ; `parkPace` et `niceRound` (missions V1) ; `dayKey` (`sim/missions.ts`) ; `satisfaction` (étape 5).
- Produces (`src/sim/trophies.ts`) :
  - `trophyValue(state: GameState, def: TrophyDef): number` — une ligne par sorte de mesure (table `TROPHY_MEASURES`, comme `MEASURES` des missions) et une par `Gauge`
  - `bestTier(state: GameState, trophyId: string): 0 | Tier`
  - `nextGoal(state: GameState, def: TrophyDef): { tier: Tier; target: number; value: number } | null` — `null` quand l'or est gagné
  - `medalCoins(state: GameState, tier: Tier): number` — `max(MIN, niceRound(coinsPerH × HOURS))`, 0 pour l'or
  - `trophiesStep(state: GameState, events: GameEvent[]): void` — en place : au changement de jour, ferme la journée (séries : `sansMort` +1 si pas de mort sinon 0 ; `sansDette` +1 si pas de dette et au moins un employé, sinon 0 ; `ravis` +1 si `minSatisfaction ≥ RAVIS_MIN` sinon 0) puis repart à zéro ; ajoute le pas aux totaux du jour (lus dans les événements `recettes` et `mort` du pas, et `coins < 0`) ; puis gagne **chaque** palier atteint et pas encore gagné (bronze, argent et or peuvent tomber ensemble)
  - `claimMedal(state: GameState, trophyId: string, tier: Tier): ActionResult` — verse `coins` ou ajoute `{ trophyId, placed: false }` à `goldItems`
- Produces (types) : `GameEvent` gagne `{ kind: 'trophee'; at: number; id: string; tier: Tier }` ; `Action` gagne `{ type: 'recupererMedaille'; id: string; tier: Tier }`

- [ ] **Step 1 : tests qui échouent** (`tests/sim/trophies.test.ts`)
  - `cumul` : `stats.counts.naissances = 10` puis un pas → une médaille bronze `naissances`, un événement `trophee` ; à 150 d'un coup → 3 médailles (1, 2, 3) dans cet ordre.
  - `reste gagnée` : bronze `animaux` gagné, on retire des animaux → toujours gagné, pas de nouvel événement.
  - `jour` : 400 visiteurs avant minuit, 400 après → pas de bronze `visiteursJour` (500) ; avec `utcOffsetMin = 60`, la journée se coupe à minuit local.
  - `série sur une absence` : `advanceTo` de 8 jours sans mort → bronze `sansMort` (7) ; une mort le jour 4 → série remise à 0 ce jour-là, bronze seulement au jour 11.
  - `sansDette` sans employé → reste 0.
  - `pièces gelées` : bronze gagné quand `coinsPerH = 300` → `coins = 600` ; le parc grandit ensuite, la médaille vaut toujours 600 ; parc à l'arrêt → 100 (bronze) et 500 (argent).
  - `récupérer` : verse les pièces une fois, la seconde fois « Récompense déjà récupérée. » ; une médaille non gagnée → « Cette médaille n'est pas encore gagnée. » ; l'or ajoute un objet à `goldItems` et 0 pièce.
  - `dette` : caisse −80, récupérer 100 → caisse 20.
  - `partie existante` (D6) : état migré avec `naissances = 60` et 12 espèces → bronze + argent `naissances`, bronze + argent `especes` au premier pas ; aucune série gagnée.
- [ ] **Step 2 :** `npx vitest run tests/sim/trophies.test.ts` → ÉCHEC.
- [ ] **Step 3 : implémenter** le moteur et l'action `recupererMedaille` dans `applyAction`.
- [ ] **Step 4 :** `npx vitest run` → tout vert (le joueur automatique aussi).
- [ ] **Step 5 :** commit — `V2-7 tâche 2 : moteur des trophées et récompenses`

### Task 3: Tâche 3 — Musée des trophées et objets d'or (règles) — agent · **Sonnet**

**Files :**
- Create : `tests/sim/museum.test.ts`
- Modify : `src/sim/types.ts` (`BuildingType` + `'musee'`), `src/data/economy.ts` (prix, niveaux, places, attrait), `src/data/village.ts` / `SLOTS` (nouvel emplacement, `unlockLevel: 2`), `src/sim/economy.ts` (`appeal`), `src/sim/trophies.ts`, `src/sim/actions.ts`, la satisfaction de l'étape 5, `src/data/buildingInfo.ts`

**Interfaces :**
- Produces :
  - `MUSEUM = { COST: [1500, 4000, 10000], SLOTS: [12, 40, 120], APPEAL_PER_MEDAL: 0.5, APPEAL_PER_GOLD: 1.5 }` dans `src/data/economy.ts`
  - `museumShown(state: GameState): Medal[]` — les médailles exposées : les plus hautes d'abord (or, argent, bronze), puis les plus anciennes, dans la limite des places
  - `museumAppeal(state: GameState): number` — 0 sans musée ; ajouté par `appeal()`
  - `Action` gagne `{ type: 'poserTrophee'; trophyId: string; x: number; z: number }` et `{ type: 'rangerTrophee'; trophyId: string }` ; l'objet posé est un `DecorItem` de l'étape 5 avec `trophyId` (déplacé par `deplacerDeco`)
  - satisfaction : un objet d'or compte comme `GOLD_SATISFACTION_FACTOR` × une fontaine

- [ ] **Step 1 : tests qui échouent** (`tests/sim/museum.test.ts`)
  - `batir` le musée au Hameau → refusé (emplacement fermé) ; au Village → accepté, coûte 1 500.
  - 15 médailles (dont 2 or), musée niveau 1 → 12 exposées, les 2 or en tête ; `museumAppeal` = 10 × 0,5 + 2 × 1,5 = 8 ; sans musée → 0 ; `appeal` augmente d'autant.
  - `poserTrophee` d'un objet non gagné → refusé ; posé une fois → `goldItems.placed = true`, un `DecorItem` avec `trophyId` ; une seconde pose → « Cet objet est déjà posé. » ; `vendreDeco` sur lui → « Un trophée ne se vend pas. » ; `rangerTrophee` → retiré de la carte, `placed = false`, reposable.
  - pose refusée pour les mêmes raisons qu'une décoration (dans un enclos, hors carte…).
  - un objet d'or touchant un chemin augmente la satisfaction de 2 × l'effet d'une fontaine au même endroit.
- [ ] **Step 2 :** `npx vitest run tests/sim/museum.test.ts` → ÉCHEC.
- [ ] **Step 3 : implémenter.**
- [ ] **Step 4 :** `npx vitest run` → tout vert.
- [ ] **Step 5 :** commit — `V2-7 tâche 3 : musée des trophées et objets d'or`

### Task 4: Tâche 4 — Modèles du musée et des objets dorés — chef (**Opus**) avec Romain, puis agent · **Haiku**

- [ ] **Step 1 (chef) :** chercher un bâtiment pour le musée dans les packs CC0 déjà téléchargés (`_telechargements/`, Quaternius village médiéval) ; sinon proposer à Romain un lien CC0 à télécharger. Les objets d'or réutilisent les modèles des espèces et ceux de décoration de l'étape 5 : rien à télécharger pour eux.
- [ ] **Step 2 (agent Haiku) :** vérifier la licence, copier le modèle dans `public/models/`, l'ajouter à `src/assets/manifest.ts` et à `CREDITS.md`.
- [ ] **Step 3 :** `npx vitest run tests/assets` → vert ; commit — `Modèle du musée des trophées (CC0)`

### Task 5: Tâche 5 — Interface des trophées et du musée — agent · **Sonnet**

**Files :**
- Create : `src/ui/trophyModel.ts` (pur, testé), `src/ui/trophyPanel.ts`, `src/scene/goldItems.ts`, `tests/ui/trophyModel.test.ts`, `tests/scene/goldItems.test.ts`
- Modify : `src/ui/topBar.ts` (icône 🏆 + point), `src/ui/missionBanner.ts` (bannière de médaille), `src/ui/buildingInfo.ts` (fiche du musée), `src/scene/villageView.ts` (musée), la vue des décorations de l'étape 5, `src/game/runGame.ts`, `src/style.css`

**Interfaces :**
- Consumes : `trophyValue`, `nextGoal`, `bestTier`, `museumShown` (tâches 2–3) ; actions `recupererMedaille`, `poserTrophee`, `rangerTrophee` ; mode de pose des décorations (étape 5).
- Produces :
  - `trophyRows(state: GameState): { family: TrophyFamily; id: string; name: string; tier: 0 | Tier; line: string /* « 37 / 50 naissances » ou « Or gagné » */; toClaim: Medal[] }[]`
  - `toClaimCount(state: GameState): number` (point sur l'icône)
  - `medalBanner(events: GameEvent[]): string | null` — « Médaille d'argent : Grande famille ! » pour une seule, « 5 nouvelles médailles » pour plusieurs, `null` sans médaille
  - `goldMaterial()` et `createGoldItem(def: GoldModel, name: string): Object3D` — modèle doré sur socle avec plaque

- [ ] **Step 1 : tests qui échouent** — `trophyRows` donne 40 lignes groupées par famille, la ligne « 37 / 50 naissances » au bon palier, « Or gagné » à la fin ; `toClaimCount` compte les médailles non récupérées ; `medalBanner` (0, 1, 5 médailles) ; `createGoldItem` d'une statue garde la forme de l'espèce et met le matériau doré sur chaque maillage.
- [ ] **Step 2 :** `npx vitest run tests/ui/trophyModel.test.ts tests/scene/goldItems.test.ts` → ÉCHEC.
- [ ] **Step 3 : implémenter** — volet Trophées (familles repliables, 3 pastilles par trophée, « Récupérer » / « Tout récupérer », « Poser » / « Ranger » pour l'or) ; bannière ; fiche du musée (niveau, médailles exposées / places, attrait gagné, bouton vers le volet) ; musée et objets d'or en 3D.
- [ ] **Step 4 :** `npx vitest run`, `npm run build` → réussis.
- [ ] **Step 5 (chef) :** vérifier dans le navigateur (`?debug` pour donner des médailles) : icône et point, volet sur ordinateur et en 375 × 812, Tout récupérer, pose et rangement d'une statue dorée, musée construit au Village, bannière groupée.
- [ ] **Step 6 :** commit — `V2-7 tâche 5 : volet Trophées, musée et objets d'or à l'écran`

### Task 6: Tâche 6 — Nouvelles missions du jour — agent · **Sonnet**

**Files :**
- Modify : `src/data/missions.ts` (`DAILY_POOL`, `DAILY_TUNING`, `Objective`, `DailyCondition`), `src/sim/missions.ts` (`POSSIBLE`, `MEASURES`), `src/sim/economy.ts` (`ParkPace` si besoin)
- Test : `tests/sim/daily.test.ts`

**Interfaces :**
- Produces :
  - `Objective` gagne `{ kind: 'satisfaction'; pct: number }` (réussie dès que `satisfaction × 100 ≥ pct` à un pas du jour)
  - `DailyCondition` gagne `'placeLibre' | 'maladeRepere' | 'dechets' | 'parcelles' | 'vaccin' | 'deco' | 'itinerant' | 'jamais'`
  - `ParkPace` gagne `wastePerDay: number`, `harvestPerDay: number`, `satisfactionPct: number`, `unvaccinated: number`
  - Nouvelles entrées de `DAILY_POOL` (D7) :

| id | titre | condition | cible | récompense |
|---|---|---|---|---|
| `quot-embaucher` | Embauche un employé | `placeLibre` | 1 | `coinsReward` |
| `quot-soigner` | Fais soigner {n} animaux | `maladeRepere` | min(3, malades repérés) | `coinsReward` |
| `quot-ramasser` | Ramasse toi-même {n} déchets | `dechets` | ¼ des déchets d'un jour, entre 5 et 30 | `coinsReward` |
| `quot-recolter` | Ramasse toi-même {n} fourrages aux parcelles | `parcelles` | ¼ de la récolte d'un jour, au moins 10 | `{ fourrage }` comme `quot-rations` |
| `quot-vacciner` | Vaccine {n} enclos | `vaccin` | min(2, enclos non vaccinés) | `coinsReward(p, COSTLY_FACTOR)` |
| `quot-deco` | Pose {n} décorations | `deco` | 1 jusqu'au niveau 3, puis 2 | `coinsReward(p, COSTLY_FACTOR)` |
| `quot-satisfaction` | Atteins {n} % de satisfaction | `toujours` (dès l'étape 5) | min(95, satisfaction actuelle + 5), arrondi à 5 | `coinsReward` |
| `quot-itinerant` | Achète un animal au marchand itinérant | `itinerant` | 1 | `coinsReward(p, COSTLY_FACTOR)` |

  - Compteurs : `quot-soigner` → `soinsCentre` ; `quot-ramasser` → `dechetsMain` ; `quot-recolter` → `recolteMain` ; `quot-vacciner` → `vaccinations` ; `quot-deco` → `decorsPoses` ; `quot-itinerant` → `achatsItinerant`.
  - Une quotidienne retirée du tirage (`quot-soin`) reste dans `DAILY_POOL` avec `possible: 'jamais'` pour que les anciennes missions du jour restent lisibles.

- [ ] **Step 1 : tests qui échouent** — chaque condition (vraie / fausse sur un petit état) ; cibles bornées (parc vide → minimums, `bigPark()` V2 → maximums) ; `quot-satisfaction` à 72 % → « Atteins 80 % de satisfaction », réussie quand la satisfaction touche 80 % ; un ramassage par l'agent ne fait pas avancer `quot-ramasser` ; `quot-soin` n'est jamais tirée mais une sauvegarde vN qui l'a dans `daily.list` se charge et se récupère ; même graine → même tirage.
- [ ] **Step 2 :** `npx vitest run tests/sim/daily.test.ts` → ÉCHEC.
- [ ] **Step 3 : implémenter.**
- [ ] **Step 4 :** `npx vitest run` → tout vert.
- [ ] **Step 5 :** commit — `V2-7 tâche 6 : missions du jour du personnel, de la ferme et du confort`

### Task 7: Tâche 7 — La Gazette enrichie — agent · **Sonnet**

**Files :**
- Modify : `src/sim/summary.ts`, `src/ui/gazetteModel.ts`, `src/ui/gazette.ts` si la mise en page doit suivre
- Test : `tests/sim/summary.test.ts` (créer s'il n'existe pas), `tests/ui/gazetteModel.test.ts`

**Interfaces :**
- Consumes : `Disease` (type des maladies de l'étape 3) ; événements `paie`, `malade`, `soigne`, `mort`, `recolte`, `itinerant`, `trophee`.
- Produces (`Summary` gagne) : `paie: { total: number; dette: number }` (dette = plus bas de la caisse sous zéro, 0 sinon) ; `maladies: Partial<Record<Disease, number>>` ; `soignes: number` ; `fileCentre: number` (lue dans l'état final) ; `mortsParMaladie: Partial<Record<Disease, number>>` ; `recolte: { fourrage: number; legumes: number }` ; `dechets: number` ; `satisfaction: number | null` (état final) ; `itinerant: { present: boolean; leavesAt?: number; nextAt?: number }` (état final + événements) ; `medailles: { id: string; tier: Tier }[]`
- `gazetteHeadline` suit l'ordre de D8 ; nouvelles rubriques `Paie`, `Santé`, `Ferme`, `Propreté`, `Marchand itinérant`, `Trophées`, chacune absente quand elle vaut 0.

- [ ] **Step 1 : tests qui échouent** — trois paies de 240 → « Salaires versés : 720 pièces » ; une dette de 80 → « Caisse à découvert : −80 pièces. Pas d'achat d'animal ni de construction tant que ce n'est pas remboursé. » ; 2 parasites + 1 grippe → « Nouveaux malades : 2 parasites, 1 grippe » ; 3 soignés et 2 en attente → « 3 animaux soignés · 2 en attente au centre » ; marchand présent → « Le marchand itinérant est là jusqu'à mardi 18 h » ; parti → « Il reviendra vers jeudi » ; 7 médailles → « 7 médailles gagnées » ; une seule or → titre « Médaille d'or : … ! » sauf s'il y a une mort ; absence calme sans personnel ni maladie → mêmes rubriques qu'en V1.
- [ ] **Step 2 :** `npx vitest run tests/sim/summary.test.ts tests/ui/gazetteModel.test.ts` → ÉCHEC.
- [ ] **Step 3 : implémenter.**
- [ ] **Step 4 :** `npx vitest run` → tout vert.
- [ ] **Step 5 (chef) :** Gazette vue dans le navigateur après une absence de 3 jours (`?debug`), sur ordinateur et téléphone.
- [ ] **Step 6 :** commit — `V2-7 tâche 7 : la Gazette raconte la paie, les maladies et le marchand`

### Task 8: Tâche 8 — Joueur automatique de la V2 et test d'absence — agent · **Sonnet**

**Files :**
- Modify : `tests/balance/bot.ts`, `tests/balance/playthrough.test.ts`
- Create : `tests/balance/absence.test.ts`

**Interfaces :**
- `playBot(opts: { seed: number; days: number; visitsPerDay: number; snapshotDays?: number[] }): Timeline` — `Timeline` gagne `snapshots: Record<number, GameState>` (l'état juste après la dernière visite de ces jours) et `debtDays: number`.
- `MilestoneKey` gagne `'niveau4' | 'niveau5' | 'niveau6' | 'especes20' | 'medailles20'`.
- `DayRow` gagne `staff`, `wages`, `sick`, `satisfaction`, `medals`.
- À chaque visite, en plus du jeu V1 (compléter ce que les étapes 2–6 n'ont pas déjà ajouté) : embaucher jusqu'à couvrir les animaux (soigneurs), les enclos (agents) et au moins un vétérinaire et un fermier, en gardant 1 jour de salaires en caisse ; « répartir » ; construire et améliorer maison du personnel, centre vétérinaire, grange, musée ; vacciner quand le centre le permet ; acheter et améliorer les parcelles quand elles se remboursent en ≤ 7 jours ; poser poubelles et bancs le long des chemins fréquentés ; monter aux niveaux 4–6 ; acheter les nouvelles espèces (marchand itinérant compris) ; récupérer les médailles et poser les objets d'or.

- [ ] **Step 1 : écrire le joueur et les tests**
  - `playthrough.test.ts` : bornes larges au départ (niveau 6 atteint en moins de 70 jours, 0 mort, `debtDays = 0`) ; garde le test de déterminisme ; une graine et 2 visites par jour dans `npx vitest run`, les 3 graines × 2 et 3 visites derrière `BALANCE_FULL=1` (pour que la suite reste sous 60 s).
  - `absence.test.ts` (D10) : pour les instantanés des jours 10, 25 et 45 d'une partie du bot, `advanceTo(+72 h)` sans action → aucun événement `mort`, `coins ≥ 0` après chaque paie, garde-manger jamais à 0, et `summarize` + `gazetteEdition` fonctionnent.
- [ ] **Step 2 :** `npx vitest run tests/balance` puis `BALANCE_FULL=1 npx vitest run tests/balance` ; joindre le tableau du rythme **actuel** au compte rendu (même si les bornes de D9 ne sont pas encore tenues : c'est la tâche 9).
- [ ] **Step 3 :** commit — `V2-7 tâche 8 : joueur automatique de la V2 et test d'absence de 3 jours`

### Task 9: Tâche 9 — Réglage de l'équilibre — chef (**Opus**) avec Romain, puis agent · **Sonnet**

- [ ] **Step 1 (chef) :** lire le rapport (rythme, salaires / recettes par jour, malades et morts, dettes, médailles par jour) ; comparer à D9 et D10 ; proposer à Romain **2 ou 3 changements** à la fois, expliqués simplement (ex. « le niveau 5 arrive au jour 22 : je propose un seuil de 450 habitants au lieu de 350 »), d'abord ce qui casse l'absence (D12).
- [ ] **Step 2 (agent Sonnet) :** appliquer les chiffres choisis dans `src/data/` (salaires, durées des stades, production, seuils, prix du musée, récompenses des médailles, seuils de trophées si un or tombe trop tôt) ; ajuster les tests qui dépendaient des anciens chiffres, en expliquant chaque changement ; resserrer les bornes de `playthrough.test.ts` sur D9.
- [ ] **Step 3 :** `npx vitest run` et `BALANCE_FULL=1 npx vitest run tests/balance` → réussis ; tableau du nouveau rythme et nombre de médailles bronze / argent / or au niveau 6 dans le compte rendu (repère : ≈ 35 bronze, ≈ 20 argent, ≤ 8 or).
- [ ] **Step 4 :** recommencer Step 1 à 3 tant que Romain le veut ; commit à chaque tour — `Équilibrage V2 : <résumé des chiffres>`

### Task 10: Tâche 10 — Finition : petits défauts gardés, téléphone, perfs — agent · **Sonnet**

**Files :** selon la liste relevée en tâche 0 ; au moins `tests/sim/perf.test.ts`, `tests/sim/helpers.ts`, `src/ui/missionBanner.ts`, `src/style.css`

**À faire :**
- `bigParkV2(): GameState` dans les aides de test : niveau 6, ≈ 200 animaux de 20 espèces, 20 enclos, 15 employés, 8 parcelles, 40 décorations, 40 médailles ; **30 jours de rattrapage en moins de 2 s**.
- Les petits défauts gardés aux étapes 1 à 6 (liste de `progress.md`, recopiée ici en tâche 0) et la hauteur de la bannière « Nouvelle mission » (V1).
- Téléphone (375 × 812) : barre du haut avec les icônes de la V2 (personnel, satisfaction, trophées) sans débordement ; volet Trophées ≤ 40 % de la hauteur ; boutons ≥ 40 px.

- [ ] **Step 1 : tests qui échouent** — `perf.test.ts` sur `bigParkV2()` ; un test par défaut calculable.
- [ ] **Step 2 :** `npx vitest run tests/sim/perf.test.ts` → ÉCHEC (ou temps noté s'il passe déjà).
- [ ] **Step 3 : implémenter.**
- [ ] **Step 4 :** `npx vitest run`, `npm run build` → réussis ; temps avant / après dans le message de commit.
- [ ] **Step 5 (chef) :** vérifier en 375 × 812 avec `bigParkV2()` collé par `?debug` : barre du haut, volets, images par seconde.
- [ ] **Step 6 :** commit — `V2-7 tâche 10 : finition téléphone, perfs et petits défauts`

### Task 11: Tâche 11 — Vérification d'ensemble, relecture et publication — chef (**Opus**) + relecture · **Opus**

- [ ] **Step 1 :** `npx vitest run`, `BALANCE_FULL=1 npx vitest run tests/balance`, `npm run build` → réussis.
- [ ] **Step 2 (chef) :** à la main, panneau du navigateur **visible**, sans `?debug` : nouvelle partie jusqu'à la première médaille ; volet Trophées, Récupérer, Tout récupérer ; musée construit, sa fiche, son attrait ; une statue dorée posée, déplacée, rangée ; quotidiennes nouvelles ; Gazette après 3 jours (`?debug`) ; coller une sauvegarde vN (copie de la partie de Romain si elle est fournie) → rien de perdu, médailles rétroactives à récupérer ; Recommencer à zéro → trophées vides ; mode téléphone.
- [ ] **Step 3 (chef → Romain) :** donner à Romain la liste des **textes** (noms et phrases des trophées, nouvelles quotidiennes, rubriques de la Gazette) pour relecture ; corriger ce qu'il veut changer.
- [ ] **Step 4 :** relecture indépendante de toute la branche (agent **Opus**) → corrections (Sonnet, Opus si subtil), un commit.
- [ ] **Step 5 :** fusion dans `main` **seulement avec l'accord de Romain** ; vérifier https://romsantic.github.io/parc-de-clairbois/ (et sur son téléphone) ; mettre `progress.md` à jour : **V2 terminée**, chiffres retenus, ce qui reste pour la V3.
