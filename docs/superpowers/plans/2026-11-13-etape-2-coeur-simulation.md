# Étape 2 — Cœur de la simulation : plan de développement

> **Pour les agents :** sous-skill requis : superpowers:subagent-driven-development (recommandé) ou superpowers:executing-plans pour exécuter ce plan tâche par tâche. Les étapes utilisent des cases à cocher (`- [ ]`).

**Objectif :** les règles du zoo tournent en coulisses, en temps réel : faim et garde-manger, propreté, maladie et mort, bonheur, reproduction et naissances, rattrapage du temps d'absence, sauvegarde qui survit aux mises à jour. Un panneau de test (`?debug`) permet de tout voir et de simuler une absence.

**Architecture :** `src/data/` (chiffres du jeu, aucune logique) ; `src/sim/` (fonctions pures sur un `GameState` sérialisable, sans DOM, sans Three.js, sans `Date.now()` : l'heure est toujours passée en paramètre) ; `src/save/` (sauvegarde `localStorage` versionnée et migrations). Une seule fonction fait avancer le jeu — `advanceTo(state, nowMs)` — par **pas fixes de 10 minutes alignés** : le jeu en direct et le rattrapage d'absence exécutent exactement les mêmes pas, donc donnent exactement le même résultat.

**Stack :** TypeScript strict, Vitest. Aucune nouvelle dépendance.

**Spec :** `docs/superpowers/specs/2026-11-12-parc-de-clairbois-v1-design.md` (§3 Zoo, §4 Soin et absence, §9 Architecture, §10 Tests).

**Hors périmètre (étapes suivantes) :** visiteurs, argent gagné, billet, marchand, achat de rations à la ferme (étape 4) ; affichage des animaux du `GameState` sur la carte, barres et fiches (étape 3) ; missions et résumé illustré (étape 5). Ici, l'argent ne fait que **diminuer** quand on agit (nettoyer, soigner).

## Contraintes globales

- Pas de simulation : **10 minutes** (`STEP_MS = 600_000`). L'état n'avance que par pas entiers ; le reste attend le pas suivant.
- Rattrapage plafonné à **30 jours** rejoués ; au-delà, l'horloge du jeu saute à « maintenant » sans rejouer.
- Négligence (spec §4) : affamé à **12 h** sans nourriture, malade à **24 h**, mort après **48 h** de maladie sans soin.
- Propreté : **100 % → 0 % en 24 h** ; à 0 %, chaque animal de l'enclos a **15 % de chances par jour** de tomber malade.
- Reproduction : femelle adulte + mâle adulte dans le même enclos, place libre, bonheur de la femelle **> 0,6**, pas affamée ni malade, pas déjà gestante → **25 % de chances par heure**.
- Âges : bébé < 1× gestation ≤ jeune < 2× gestation ≤ adulte.
- Capacité d'un enclos = `floor(surface / m² par animal)` (valeurs spec §3).
- Tout le hasard passe par l'état (`state.rng`) : même état de départ + même durée ⇒ même résultat.
- Sauvegarde : clé `parc-clairbois:sauvegarde`, format `{ version, savedAt, state }`, version courante **1**. Une sauvegarde illisible n'est **jamais** écrasée : elle est copiée sous `parc-clairbois:sauvegarde-illisible` avant de proposer une nouvelle partie.
- Textes visibles en français.

## Réglages choisis (non fixés par la spec — modifiables dans `src/data/`)

| Réglage | Valeur |
|---|---|
| Argent de départ | 500 |
| Départ | 1 enclos prairie 12 × 10 m (capacité 6 moutons), un couple de moutons adultes, 10 rations de fourrage, garde-manger de 200 rations |
| Satiété | 100 % tant qu'il mange ; sans nourriture, baisse linéaire jusqu'à 0 % en 12 h |
| Bonheur | 0,35 × satiété + 0,25 × propreté + 0,2 × espace + 0,2 × santé ; × 0,6 si espèce sociale seule ; 0 si affamé |
| « Espace » | 1 si animaux ≤ capacité, sinon capacité ÷ nombre |
| Nettoyer | 5 pièces |
| Soigner | max(50, 25 % du prix adulte) ; remet le compteur de faim à zéro si le garde-manger peut le nourrir, sinon le fait repartir de « maintenant » |
| Noms | liste de 60 prénoms d'animaux français, tirés au hasard |

## Points de vigilance

1. **Retour après une très longue absence** (des mois) : le chargement ne doit pas geler l'onglet. → plafond 30 jours, testé (tâche 6) avec une absence d'un an.
2. **Horloge de l'appareil reculée** (changement d'heure manuel, fuseau) : `nowMs < state.time` ne doit rien casser ni faire « rajeunir » le parc. → `advanceTo` ne fait rien si le temps recule, testé (tâche 6).
3. **Sauvegarde abîmée ou d'une version plus récente** (retour sur une ancienne version du site) : ne jamais perdre la partie du joueur. → tests tâche 8.
4. **Onglet fermé brutalement** : la dernière minute de jeu ne doit pas être perdue. → sauvegarde sur `pagehide` et `visibilitychange` (caché), tâche 9.
5. **Garde-manger partiellement suffisant** (assez pour une partie des animaux) : les animaux sans part comptent comme non nourris, sans nourriture négative. → test tâche 3.

---

### Tâche 1 : Données des espèces et hasard sérialisable

**Fichiers :**
- Créer : `src/data/species.ts`, `src/data/names.ts`, `src/data/tuning.ts`
- Modifier : `src/core/rng.ts`
- Tests : `tests/data/species.test.ts`, `tests/core/rng.test.ts`

**Interfaces :**
- Produit : `type SpeciesId = 'mouton' | 'cochon' | 'ane' | 'alpaga' | 'renard' | 'cerf' | 'cheval' | 'lama' | 'taureau' | 'loup'`, `type Biome = 'prairie' | 'foret' | 'montagne'`, `type Food = 'fourrage' | 'viande'`.
- Produit : `interface Species { id: SpeciesId; name: string; biome: Biome; price: number; gestationH: number; litter: [number, number]; appeal: number; diet: Food[]; rationsPerDay: number; spaceM2: number; social: boolean }` et `SPECIES: Record<SpeciesId, Species>` (valeurs exactes de la spec §3 ; `diet` du cochon = `['fourrage', 'viande']`).
- Produit : `ANIMAL_NAMES: readonly string[]` (60 prénoms).
- Produit : `TUNING` (objet `as const` avec toutes les valeurs des sections « Contraintes globales » et « Réglages choisis » : `STEP_MS`, `MAX_CATCHUP_DAYS: 30`, `HUNGRY_AFTER_H: 12`, `SICK_AFTER_H: 24`, `DEATH_AFTER_SICK_H: 48`, `DIRTY_AFTER_H: 24`, `DIRTY_SICK_PER_DAY: 0.15`, `BREED_PER_HOUR: 0.25`, `BREED_MIN_HAPPINESS: 0.6`, `START_COINS: 500`, `CLEAN_COST: 5`, …).
- Produit : `nextRandom(seed: number): [value: number, nextSeed: number]` (même mulberry32 que `createRng`, mais pur et sérialisable). `createRng` est réécrit au-dessus de `nextRandom`.

- [ ] **Étape 1 : écrire les tests qui échouent**

`tests/data/species.test.ts` : les 10 espèces ont un `id` égal à leur clé ; `SPECIES.mouton` vaut `{ price: 120, gestationH: 2, litter: [1, 2], rationsPerDay: 1, spaceM2: 20, biome: 'prairie', social: true }` (champs comparés un à un) ; `SPECIES.loup.diet` égale `['viande']` ; les 5 espèces sociales sont exactement mouton, cochon, loup, alpaga, lama ; `ANIMAL_NAMES.length` vaut 60 sans doublon.

Ajouter à `tests/core/rng.test.ts` :
```ts
it('nextRandom est pur et rejoue la même suite que createRng', () => {
  const r = createRng(42)
  let s = 42
  for (let i = 0; i < 5; i++) { const [v, n] = nextRandom(s); expect(v).toBe(r()); s = n }
  expect(nextRandom(42)).toEqual(nextRandom(42))
})
```

- [ ] **Étape 2 : `npm test`** → ÉCHEC (modules introuvables).
- [ ] **Étape 3 : implémenter** les trois fichiers de données et `nextRandom` ; `createRng(seed)` devient une fermeture qui appelle `nextRandom`.
- [ ] **Étape 4 : `npm test`** → tout réussi (les anciens tests `createRng` aussi).
- [ ] **Étape 5 : commit** — `Données des espèces et hasard sérialisable`

### Tâche 2 : État du jeu, nouvelle partie, enclos et âges

**Fichiers :**
- Créer : `src/sim/types.ts`, `src/sim/newGame.ts`, `src/sim/enclosure.ts`, `src/sim/animal.ts`, `src/sim/random.ts`
- Tests : `tests/sim/newGame.test.ts`, `tests/sim/enclosure.test.ts`, `tests/sim/animal.test.ts`

**Interfaces :**
- Produit (`types.ts`) :
```ts
export interface Rect { x: number; z: number; w: number; d: number } // mètres, coin nord-ouest + taille
export interface Enclosure { id: number; biome: Biome; species: SpeciesId | null; rect: Rect; cleanedAt: number }
export type Health = { status: 'ok' } | { status: 'malade'; since: number } // extensible en V2
export interface Animal {
  id: number; species: SpeciesId; sex: 'F' | 'M'; name: string; bornAt: number; enclosureId: number
  lastFedAt: number            // dernier pas où il a eu sa part
  health: Health
  pregnantSince: number | null
}
export interface Pantry { fourrage: number; viande: number; capacity: number }
export interface GameState {
  version: 1; time: number; rng: number; coins: number; nextId: number
  pantry: Pantry; enclosures: Enclosure[]; animals: Animal[]
}
export type GameEvent =
  | { kind: 'naissance'; at: number; animalId: number; motherId: number }
  | { kind: 'malade'; at: number; animalId: number; cause: 'faim' | 'saleté' }
  | { kind: 'mort'; at: number; animalId: number; name: string; species: SpeciesId }
  | { kind: 'gestation'; at: number; animalId: number }
  | { kind: 'repas'; at: number; fourrage: number; viande: number }
```
- Produit : `newGame(seed: number, nowMs: number): GameState` — heure alignée sur le pas : `time = Math.floor(nowMs / STEP_MS) * STEP_MS` ; contenu de « Réglages choisis » ; les deux moutons sont nés `2 × gestation` avant `time` (adultes), `lastFedAt = time`.
- Produit : `random(state: GameState): number` (avance `state.rng` en place) et `randomInt(state, min, max)` dans `random.ts`.
- Produit : `area(rect): number`, `capacity(enc: Enclosure): number` (0 si `species` null), `animalsIn(state, encId): Animal[]`, `cleanliness(enc, nowMs): number` (1 → 0 linéaire sur 24 h, borné).
- Produit : `ageStage(a: Animal, nowMs): 'bebe' | 'jeune' | 'adulte'`, `hoursWithoutFood(a, nowMs): number`, `isHungry(a, nowMs): boolean` (≥ 12 h), `satiety(a, nowMs): number` (1 − h/12, borné à 0).

- [ ] **Étape 1 : écrire les tests qui échouent**
  - `newGame(7, 1_000_000_000_123)` : `time % STEP_MS === 0` ; `coins === 500` ; 1 enclos prairie de 120 m² avec `species: 'mouton'` et `capacity === 6` ; 2 moutons, un `F` un `M`, tous deux `adulte` ; `pantry` = `{ fourrage: 10, viande: 0, capacity: 200 }` ; `newGame(7, t)` profondément égal à lui-même (déterminisme).
  - `cleanliness` : 1 à `cleanedAt`, 0,5 à +12 h, 0 à +24 h et à +40 h.
  - `ageStage` d'un mouton (gestation 2 h) : `bebe` à +1 h59, `jeune` à +2 h, `adulte` à +4 h.
  - `satiety` : 1 à `lastFedAt`, 0,5 à +6 h, 0 à +12 h et au-delà ; `isHungry` faux à +11 h59, vrai à +12 h.
- [ ] **Étape 2 : `npm test`** → ÉCHEC.
- [ ] **Étape 3 : implémenter** selon les interfaces.
- [ ] **Étape 4 : `npm test`** → réussi.
- [ ] **Étape 5 : commit** — `État du jeu, nouvelle partie, enclos et âges`

### Tâche 3 : Garde-manger et repas

**Fichiers :**
- Créer : `src/sim/feeding.ts`
- Test : `tests/sim/feeding.test.ts`

**Interfaces :**
- Consomme : `GameState`, `Animal`, `SPECIES`, `TUNING`.
- Produit : `feedStep(state: GameState, events: GameEvent[]): void` — pour chaque animal vivant, part du pas = `rationsPerDay × STEP_MS / 86_400_000` ; prise dans le premier aliment de son régime qui en a assez (cochon : fourrage d'abord) ; s'il y a la part, `lastFedAt = state.time` ; sinon rien n'est retiré et `lastFedAt` ne bouge pas. Les animaux sont servis par `id` croissant. Un seul événement `repas` par pas, avec les quantités retirées. Le stock ne descend jamais sous 0.
- Produit : `autonomyHours(state: GameState): number` — heures avant épuisement du **premier** aliment consommé (`Infinity` si personne ne mange cet aliment ; 0 si un aliment nécessaire est déjà à 0).

- [ ] **Étape 1 : écrire les tests qui échouent**
  - 2 moutons (1 ration/jour chacun), 10 fourrage : après un pas, `fourrage ≈ 10 − 2 × (1/144)`, `lastFedAt === time` pour les deux, un événement `repas`.
  - **Stock partiel** : fourrage = exactement une part : le mouton d'`id` le plus petit mange, l'autre non (`lastFedAt` inchangé) ; `fourrage === 0` (jamais négatif).
  - Un loup sans viande mais avec du fourrage : ne mange pas.
  - Un cochon sans fourrage mais avec de la viande : mange de la viande.
  - `autonomyHours` : 2 moutons, 10 fourrage → 120 h ; 1 loup + 1 mouton, 10 fourrage et 0 viande → 0 ; aucun animal → `Infinity`.
- [ ] **Étape 2 : `npm test`** → ÉCHEC.
- [ ] **Étape 3 : implémenter `feedStep` et `autonomyHours`.**
- [ ] **Étape 4 : `npm test`** → réussi.
- [ ] **Étape 5 : commit** — `Garde-manger, repas et autonomie`

### Tâche 4 : Propreté, maladie et mort

**Fichiers :**
- Créer : `src/sim/health.ts`
- Test : `tests/sim/health.test.ts`

**Interfaces :**
- Consomme : `cleanliness`, `hoursWithoutFood`, `random`.
- Produit : `healthStep(state: GameState, events: GameEvent[]): void` — dans cet ordre, pour chaque animal :
  1. malade depuis ≥ 48 h → retiré de `state.animals`, événement `mort` ;
  2. en bonne santé et ≥ 24 h sans nourriture → `malade` (cause `faim`) ;
  3. en bonne santé, enclos à propreté 0 → malade (cause `saleté`) avec probabilité `1 − (1 − 0,15)^(pas en jours)`.

- [ ] **Étape 1 : écrire les tests qui échouent**
  - Animal non nourri depuis 23 h50 → toujours `ok` ; depuis 24 h → `malade`, événement cause `faim`.
  - Malade depuis 47 h50 → vivant ; depuis 48 h → absent de `state.animals`, événement `mort` avec son nom.
  - Enclos propre : aucune maladie sur 1 000 pas. Enclos sale : sur 144 pas (1 jour) avec 200 animaux, entre 15 % et 40 % tombent malades (bornes larges, graine fixe).
- [ ] **Étape 2 : `npm test`** → ÉCHEC.
- [ ] **Étape 3 : implémenter `healthStep`.**
- [ ] **Étape 4 : `npm test`** → réussi.
- [ ] **Étape 5 : commit** — `Propreté, maladie et mort`

### Tâche 5 : Bonheur, reproduction et naissances

**Fichiers :**
- Créer : `src/sim/happiness.ts`, `src/sim/breeding.ts`
- Tests : `tests/sim/happiness.test.ts`, `tests/sim/breeding.test.ts`

**Interfaces :**
- Produit : `happiness(state: GameState, a: Animal): number` (formule de « Réglages choisis », bornée 0..1).
- Produit : `breedingStep(state: GameState, events: GameEvent[]): void` —
  1. **Naissances** : femelle gestante depuis ≥ `gestationH` → portée `randomInt(litter)` bébés (sexe 50/50, nom tiré dans `ANIMAL_NAMES`, `bornAt = time`, `lastFedAt = time`, même enclos, nouveaux `id` via `nextId`) ; `pregnantSince = null` ; un événement `naissance` par bébé. Une naissance peut dépasser la capacité.
  2. **Conceptions** : femelle éligible (contraintes globales) → gestante avec probabilité `1 − (1 − 0,25)^(pas en heures)` ; événement `gestation`.

- [ ] **Étape 1 : écrire les tests qui échouent**
  - `happiness` : mouton nourri, enclos propre, pas surpeuplé, en bonne santé, avec un congénère → 1 ; le même seul → 0,6 ; affamé → 0 ; malade (sinon parfait) → 0,8.
  - Couple de moutons heureux, de la place : sur 144 pas, la femelle devient gestante (graine fixe), puis 2 h plus tard 1 ou 2 bébés `bebe` apparaissent avec des noms de la liste et des `id` neufs.
  - Pas de conception si : le mâle est `jeune` ; l'enclos est plein (6/6) ; la femelle est affamée ; elle est malade ; elle est déjà gestante.
- [ ] **Étape 2 : `npm test`** → ÉCHEC.
- [ ] **Étape 3 : implémenter `happiness` et `breedingStep`.**
- [ ] **Étape 4 : `npm test`** → réussi.
- [ ] **Étape 5 : commit** — `Bonheur, reproduction et naissances`

### Tâche 6 : Faire avancer le temps et rattraper l'absence

**Fichiers :**
- Créer : `src/sim/advance.ts`, `src/sim/summary.ts`
- Tests : `tests/sim/advance.test.ts`, `tests/sim/absence.test.ts`

**Interfaces :**
- Consomme : `feedStep`, `healthStep`, `breedingStep`.
- Produit : `step(state: GameState): GameEvent[]` — un pas, en place : `time += STEP_MS`, puis `feedStep`, `healthStep`, `breedingStep`.
- Produit : `advanceTo(state: GameState, nowMs: number): { state: GameState; events: GameEvent[]; skippedMs: number }` — copie l'état (`structuredClone`), exécute `floor((nowMs − time) / STEP_MS)` pas, plafonnés à 30 jours ; au-delà du plafond, `time` saute au dernier pas aligné ≤ `nowMs` et `skippedMs` indique le temps non rejoué. Si `nowMs ≤ time` : état inchangé, aucun événement.
- Produit : `summarize(events: GameEvent[]): { naissances: number; morts: { name: string; species: SpeciesId }[]; malades: number; fourrage: number; viande: number }`.

- [ ] **Étape 1 : écrire les tests qui échouent** (`absence.test.ts` reprend les scénarios obligatoires de la spec §10)
  - **Déterminisme** : `advanceTo(s, t + 3 j)` donne le même état que 3 × `advanceTo(…, +1 j)` enchaînés, et que 432 appels de +10 min.
  - **Pas entiers** : `advanceTo(s, time + 9 min)` → `time` inchangé ; `+ 10 min` → un pas.
  - **Horloge qui recule** : `advanceTo(s, time − 1 h)` → état strictement égal, `events` vide.
  - **3 jours d'absence avec 2 jours de stock** (2 moutons dans un enclos de 40 m² — capacité 2, donc plein : pas de naissance —, fourrage pour 48 h ; la saleté est neutralisée en fixant `cleanedAt` à la fin de l'absence, pour isoler la règle de la faim) → les deux moutons sont **malades mais vivants** ; `summarize` compte 2 malades, 0 mort.
  - **5 jours sans stock** → les deux moutons sont **morts** ; `summarize(...).morts` contient leurs noms.
  - **Absence d'un an** : `advanceTo` revient en moins de 2 s, `skippedMs > 0`, `time` aligné et ≤ maintenant.
- [ ] **Étape 2 : `npm test`** → ÉCHEC.
- [ ] **Étape 3 : implémenter `step`, `advanceTo`, `summarize`.**
- [ ] **Étape 4 : `npm test`** → réussi.
- [ ] **Étape 5 : commit** — `Avancée du temps et rattrapage d'absence`

### Tâche 7 : Actions du joueur

**Fichiers :**
- Créer : `src/sim/actions.ts`
- Test : `tests/sim/actions.test.ts`

**Interfaces :**
- Produit : `type ActionResult = { ok: true; state: GameState } | { ok: false; reason: string }` (raison en français, affichable telle quelle).
- Produit (toutes pures, renvoient une copie) :
  - `cleanEnclosure(state, encId)` — coûte 5 ; `cleanedAt = state.time`.
  - `cureAnimal(state, animalId)` — coûte `max(50, 0,25 × prix)` ; seulement si malade ; santé `ok` ; `lastFedAt = state.time` (le compteur de faim repart de zéro ; s'il n'y a toujours rien à manger, il retombera malade dans 24 h).
  - `addRations(state, food, n)` — borne à `capacity` (sert au panneau de test ; l'achat à la ferme arrive à l'étape 4).
  - `renameAnimal(state, animalId, name)` — nom nettoyé (espaces en trop retirés), 1 à 20 caractères.
- Raisons de refus attendues : `"Pas assez de pièces (il en faut 5)."`, `"Cet animal n'est pas malade."`, `"Le garde-manger est plein."`, `"Le nom doit faire entre 1 et 20 caractères."`, `"Introuvable."` (id inconnu).

- [ ] **Étape 1 : écrire les tests qui échouent** — un test par action réussie (effet + coût exact : soigner un loup coûte 625, un mouton 50) et un par refus, avec la raison exacte ci-dessus ; l'état d'origine n'est jamais modifié.
- [ ] **Étape 2 : `npm test`** → ÉCHEC.
- [ ] **Étape 3 : implémenter les actions.**
- [ ] **Étape 4 : `npm test`** → réussi.
- [ ] **Étape 5 : commit** — `Actions : nettoyer, soigner, rations, renommer`

### Tâche 8 : Sauvegarde et migrations

**Fichiers :**
- Créer : `src/save/save.ts`, `src/save/migrations.ts`
- Test : `tests/save/save.test.ts`

**Interfaces :**
- Produit : `interface Storage { getItem(k: string): string | null; setItem(k: string, v: string): void }` (le `localStorage` du navigateur convient ; les tests passent un faux en mémoire).
- Produit : `saveGame(store: Storage, state: GameState, nowMs: number): void`.
- Produit : `loadGame(store: Storage): { kind: 'aucune' } | { kind: 'ok'; state: GameState } | { kind: 'illisible' } | { kind: 'trop-recente'; version: number }`. En cas d'`illisible`, la donnée brute est copiée sous `parc-clairbois:sauvegarde-illisible` (sans écraser une copie déjà présente).
- Produit : `MIGRATIONS: Record<number, (old: unknown) => unknown>` (vide pour l'instant : la version 1 est la première) et `CURRENT_VERSION = 1` ; `loadGame` applique en chaîne les migrations de `version` à `CURRENT_VERSION`.

- [ ] **Étape 1 : écrire les tests qui échouent** — aller-retour `saveGame` → `loadGame` profondément égal ; magasin vide → `aucune` ; JSON cassé → `illisible` et copie de secours présente ; `version: 2` → `trop-recente` et rien n'est écrasé ; une migration factice `0 → 1` injectée dans un test est bien appliquée.
- [ ] **Étape 2 : `npm test`** → ÉCHEC.
- [ ] **Étape 3 : implémenter.**
- [ ] **Étape 4 : `npm test`** → réussi.
- [ ] **Étape 5 : commit** — `Sauvegarde versionnée et migrations`

### Tâche 9 : Branchement dans le jeu et panneau de test

**Fichiers :**
- Créer : `src/game/session.ts`, `src/ui/debugPanel.ts`
- Modifier : `src/main.ts`, `src/style.css`

**Interfaces :**
- Produit : `startSession(store: Storage, nowMs: number): { state: GameState; summary: ReturnType<typeof summarize> | null; problem: 'illisible' | 'trop-recente' | null }` — charge (ou crée avec une graine aléatoire), rattrape l'absence, sauvegarde.
- Produit : `mountDebugPanel(get: () => GameState, set: (s: GameState) => void): void` — visible seulement avec `?debug` dans l'adresse. Affiche : heure du jeu, pièces, garde-manger et autonomie, chaque enclos (propreté, n/capacité) et chaque animal (nom, sexe, âge, satiété, santé, gestation, bonheur). Boutons : « +1 h », « +1 jour », « +3 jours » (avancent l'horloge du jeu), « Nettoyer », « +20 fourrage », « +20 viande », « Soigner » sur chaque malade, « Nouvelle partie » (avec confirmation dans le panneau, pas de `confirm()`).

- [ ] **Étape 1 :** dans `main.ts`, appeler `startSession(localStorage, Date.now())` avant la scène ; boucle : `advanceTo` une fois par seconde ; `saveGame` toutes les 30 s, sur `pagehide` et sur `visibilitychange` quand la page est cachée. `problem === 'trop-recente'` → `showError("Cette sauvegarde vient d'une version plus récente du jeu. Recharge la page pour obtenir la dernière version.")` sans rien écraser ; `'illisible'` → nouvelle partie et message « Ta sauvegarde était abîmée ; une copie a été mise de côté et une nouvelle partie commence. ».
- [ ] **Étape 2 : vérifier à la main** avec `?debug` : un couple de moutons ; « +3 jours » sans ajouter de fourrage → les moutons tombent malades ; « Soigner » les guérit et retire 50 pièces chacun ; recharger la page conserve tout ; fermer l'onglet 2 minutes puis rouvrir → l'heure du jeu a rattrapé.
- [ ] **Étape 3 : `npm test` et `npm run build`** → réussis.
- [ ] **Étape 4 : commit et publication** — `Simulation branchée dans le jeu, panneau de test`
