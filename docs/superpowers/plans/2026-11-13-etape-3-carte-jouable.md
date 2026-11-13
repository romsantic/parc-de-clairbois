# Étape 3 — Carte jouable : plan de développement

> **Pour les agents :** sous-skill requis : superpowers:subagent-driven-development (recommandé) ou superpowers:executing-plans pour exécuter ce plan tâche par tâche. Les étapes utilisent des cases à cocher (`- [ ]`).

**Objectif :** la carte montre **ta** partie et se joue sans le panneau de test : tes animaux (moutons compris) vivent dans tes enclos, tu sélectionnes un enclos d'un clic, tu le nettoies, tu soignes, tu poses un nouvel enclos dans une zone et tu tires sur ses coins pour le redimensionner. Barre de ressources en haut, barre de commande compacte en bas qui s'agrandit à la demande, retour visuel sur chaque action.

**Architecture :** la logique reste pure dans `src/sim/` (zones, règles de pose, coûts, nouvelles actions — testées). La 3D devient un **reflet de l'état** : `src/scene/parkView.ts` compare l'état du jeu à ce qui est affiché et ajoute, met à jour ou retire clôtures et animaux. Le décor fixe (village, arbres, rivière, pont, chemins) sort de `testScene.ts` dans `src/scene/decor.ts`. L'interface (`src/ui/`) lit l'état et envoie des actions ; tout passe par une seule fonction `dispatch(action)` dans `src/game/runGame.ts`, qui applique, sauvegarde et déclenche le retour visuel.

**Stack :** Three.js (`FBXLoader` en plus si le pack de ferme n'a pas de glTF), TypeScript strict, Vitest.

**Spec :** `docs/superpowers/specs/2026-11-12-parc-de-clairbois-v1-design.md` — §3 (zones, pose, prix, capacité, redimensionnement), §7 (barres compactes, volet, retour visuel, sélection, caméra), §8 (rendu).

**Hors périmètre :** argent gagné, visiteurs, marchand, achat de rations à la ferme, bâtiments du village (étape 4) ; missions de Margaux (étape 5 — la place de la mission dans la barre affiche « Les missions arrivent bientôt ») ; brume animée des zones verrouillées et visiteurs sur les chemins (étape 6). Le panneau `?debug` reste disponible pour ajouter des rations et tester.

## Contraintes globales

- Zones, chemins et prix dans `src/data/` ; aucune valeur en dur dans la 3D ou l'interface.
- Pose d'un enclos (spec §3) : entièrement dans une zone **débloquée**, sans chevaucher un autre enclos ni un chemin ; côté minimal **6 m** ; côtés arrondis au **demi-mètre**.
- Prix d'un enclos : **4 pièces par mètre de clôture + 1 pièce par m²** (réglage, `src/data/tuning.ts`). Agrandir : on paie la différence ; rétrécir : gratuit, sans remboursement, refusé si la capacité devient inférieure au nombre d'animaux.
- Niveau du village : **1 (hameau)** tant que l'étape 4 n'existe pas ; seule la prairie est débloquée. Forêt et montagne sont visibles, grisées, avec « Niveau 2 » / « Niveau 3 ».
- Barre du bas : une ligne de **48 px** maximum au repos ; volet dépliable au-dessus, **40 % de la hauteur d'écran** maximum, refermé par Échap, un second clic ou un clic sur la carte.
- Retour visuel (spec §7) : bouton vert ou rouge **0,9 s**, ressource qui s'allume avec « +n / −n » qui s'envole, message en bas de la carte **1,8 s**.
- Textes visibles en français ; noms d'animaux affichés en texte seulement (jamais en HTML).
- Toutes les actions passent par `dispatch` : une action refusée ne change rien et affiche sa raison.

## Points de vigilance

1. **Glisser un coin pour redimensionner sur téléphone** : le geste ne doit pas faire tourner la caméra en même temps. → la caméra est suspendue pendant l'édition (tâche 8), vérifié en mode mobile.
2. **Clic sur la carte qui traverse la barre du bas** : cliquer un bouton ne doit pas sélectionner l'enclos dessous. → la sélection ignore les clics venus de l'interface (tâche 5).
3. **Une naissance ou une mort pendant qu'on regarde** : l'animal apparaît ou disparaît sans recréer toute la scène ni faire sauter les autres. → `diffById` testé (tâche 4).
4. **Enclos posé puis partie rechargée** : il revient exactement au même endroit et à la même taille. → le rect est dans l'état sauvegardé ; vérifié à la main (tâche 9).
5. **Redimensionnement qui ferait chevaucher un chemin ou sortir de la zone** : la clôture fantôme passe au rouge avec la raison, et « Valider » est refusé. → tests de `checkPlacement` (tâche 2).

---

### Tâche 1 : Animaux de la ferme (mouton, cochon, lama)

**Fichiers :**
- Créer : `public/models/ferme/…`, `src/data/speciesModels.ts`
- Modifier : `src/assets/manifest.ts`, `src/scene/loadModels.ts`, `CREDITS.md`
- Test : `tests/data/speciesModels.test.ts`

**Interfaces :**
- Produit : `SPECIES_MODELS: Record<SpeciesId, { female: ModelKey; male: ModelKey; height: number }>` — cerf : biche/cerf ; taureau : vache/taureau ; cheval : `cheval`/`chevalBlanc` ; les autres : même modèle pour les deux sexes. Hauteurs reprises de la scène de test (alpaga 2,4, âne 2,1…), mouton 1,4, cochon 1,1, lama 2,3.
- Produit : `loadByExtension` accepte aussi `.fbx` (via `FBXLoader`, animations récupérées) si le pack n'existe qu'en FBX.

- [ ] **Étape 1 : Romain télécharge** le *Farm Animal Pack* de Quaternius (https://quaternius.com/packs/farmanimal.html, CC0) dans `_telechargements/`. Inventaire : noms des modèles, formats, noms des animations, licence relevée. Si ni mouton, ni cochon, ni lama n'y sont, s'arrêter et proposer d'autres espèces à Romain.
- [ ] **Étape 2 : écrire le test qui échoue** — chaque espèce de `SPECIES` a une entrée ; chaque clé citée existe dans `MODELS` ; `SPECIES_MODELS.cerf` vaut `{ female: 'biche', male: 'cerf', … }`.
- [ ] **Étape 3 : `npm test`** → ÉCHEC.
- [ ] **Étape 4 : copier les modèles utiles** dans `public/models/ferme/`, compléter `MODELS` (`mouton`, `cochon`, `lama`, `cheval`, `chevalBlanc`, `vache`, `taureau`, `loup`), `CREDITS.md`, `SPECIES_MODELS`, et le support FBX si besoin. Relier les noms d'animations du pack à `Walk` / `Idle` / `Eating` dans `CLIP_ALIASES`.
- [ ] **Étape 5 : `npm test`** → réussi (y compris le test du manifeste : fichiers présents).
- [ ] **Étape 6 : commit** — `Animaux de la ferme et modèle de chaque espèce`

### Tâche 2 : Zones, chemins, règles de pose et prix

**Fichiers :**
- Créer : `src/data/zones.ts`, `src/sim/placement.ts`
- Modifier : `src/data/tuning.ts`
- Test : `tests/sim/placement.test.ts`

**Interfaces :**
- Produit : `interface Zone { id: Biome; name: string; rect: Rect; unlockLevel: 1 | 2 | 3 }` et `ZONES: Zone[]` — côté zoo (ouest de la rivière, x de −34 à −4) : **forêt** z de −24 à −9 (niveau 2), **prairie** z de −8 à 8 (niveau 1), **montagne** z de 12 à 24 (niveau 3).
- Produit : `PATHS: Rect[]` — couloirs de chemin, dont l'allée du zoo z de 8,5 à 11,5 sur toute la largeur du zoo.
- Produit : `TUNING.FENCE_COST_PER_M: 4`, `TUNING.LAND_COST_PER_M2: 1`, `TUNING.MIN_SIDE_M: 6`, `TUNING.VILLAGE_LEVEL_V1: 1`.
- Produit : `enclosureCost(rect): number` = 4 × périmètre + surface ; `resizeCost(old, next): number` = `max(0, coût(next) − coût(old))`.
- Produit : `zoneAt(rect): Zone | null` (zone qui contient entièrement le rect) ; `snapRect(rect): Rect` (côtés et coins au demi-mètre).
- Produit : `checkPlacement(state, rect, ignoreId?: number): { ok: true; zone: Zone } | { ok: false; reason: string }` — raisons exactes : `"Un côté doit faire au moins 6 m."`, `"L'enclos doit rester dans une zone."`, `"Cette zone se débloque au niveau 2 du village."` (ou 3), `"Il chevauche un autre enclos."`, `"Il chevauche un chemin."`.

- [ ] **Étape 1 : écrire les tests qui échouent** — `enclosureCost({w:12,d:10})` = 296 ; `resizeCost` 12×10 → 14×10 = 30, et 14×10 → 12×10 = 0 ; `checkPlacement` : un 12×10 libre dans la prairie → ok avec `zone.id === 'prairie'` ; 5×10 → raison côté minimal ; à cheval sur prairie et forêt → « rester dans une zone » ; entièrement en forêt → « niveau 2 » ; sur l'enclos de départ → « autre enclos », mais ok avec `ignoreId` de cet enclos ; touchant l'allée → « chemin ». `snapRect({x:1.26, z:0, w:6.2, d:7.74})` = `{x:1.5, z:0, w:6, d:7.5}`.
- [ ] **Étape 2 : `npm test`** → ÉCHEC.
- [ ] **Étape 3 : implémenter** ; déplacer l'enclos de départ (`TUNING.START_ENCLOSURE`) pour qu'il soit dans la prairie et hors chemin. Les parties déjà commencées gardent leur enclos de départ là où il est (il reste utilisable ; seul son redimensionnement affichera la raison s'il déborde d'une zone) — pas de migration de sauvegarde pour ça.
- [ ] **Étape 4 : `npm test`** → réussi.
- [ ] **Étape 5 : commit** — `Zones, chemins, règles de pose et prix des enclos`

### Tâche 3 : Construire, redimensionner, soigner tout l'enclos

**Fichiers :**
- Modifier : `src/sim/actions.ts`
- Test : `tests/sim/enclosureActions.test.ts`

**Interfaces :**
- Consomme : `checkPlacement`, `enclosureCost`, `resizeCost`, `capacity`, `cureCost`.
- Produit : `buildEnclosure(state, rect): ActionResult` — rect arrondi, vérifié, payé ; nouvel enclos `{ species: null, biome: zone.id, cleanedAt: state.time }`.
- Produit : `resizeEnclosure(state, encId, rect): ActionResult` — vérifié (en ignorant lui-même), refusé avec `"Trop d'animaux pour cette taille (il en faut la place pour n)."` si la capacité tombe sous le nombre d'animaux ; paie `resizeCost`.
- Produit : `cureAllInEnclosure(state, encId): ActionResult` — soigne tous les malades de l'enclos, coût = somme ; refus `"Aucun animal malade ici."`.
- Produit : `type Action` (union `{ type: 'nettoyer'; encId } | { type: 'soignerTout'; encId } | { type: 'soigner'; animalId } | { type: 'construire'; rect } | { type: 'redimensionner'; encId; rect } | { type: 'renommer'; animalId; name } | { type: 'rations'; food; n }`) et `applyAction(state, action): ActionResult` qui aiguille vers la bonne fonction.

- [ ] **Étape 1 : écrire les tests qui échouent** — construire un 12×10 libre retire 296 pièces et ajoute un enclos vide de prairie ; construire sans assez de pièces → `"Pas assez de pièces (il en faut 296)."` ; construire sur un chemin → la raison de `checkPlacement` ; agrandir de 12×10 à 14×10 coûte 30 ; rétrécir un enclos de 6 moutons à 8×10 (capacité 4) → refus « Trop d'animaux… » ; `cureAllInEnclosure` avec 2 moutons malades coûte 100 ; `applyAction` aiguille chaque type (un test par type, vérifié par l'effet).
- [ ] **Étape 2 : `npm test`** → ÉCHEC.
- [ ] **Étape 3 : implémenter.**
- [ ] **Étape 4 : `npm test`** → réussi.
- [ ] **Étape 5 : commit** — `Actions : construire, redimensionner, soigner tout`

### Tâche 4 : La carte reflète la partie

**Fichiers :**
- Créer : `src/scene/decor.ts` (village, nature, pont, chemins — repris de `testScene.ts`, sans les enclos ni les troupeaux), `src/scene/parkView.ts`, `src/scene/fence.ts`, `src/scene/zonesView.ts`
- Supprimer : `src/scene/testScene.ts`
- Modifier : `src/main.ts`, `src/scene/animalActor.ts`
- Test : `tests/scene/diff.test.ts`

**Interfaces :**
- Produit : `diffById<T extends { id: number }>(shown: Set<number>, next: T[]): { added: T[]; removed: number[]; kept: T[] }`.
- Produit : `buildFence(world, rect): THREE.Group` (clôture du pack posée sur le relief, comme dans la scène de test) ; `fenceGhost(rect, valid: boolean)` (clôture translucide verte ou rouge).
- Produit : `createParkView(world, getState: () => GameState): { update(dt: number): void; enclosureMeshes(): Map<number, THREE.Object3D> }` — à chaque image : enclos ajoutés, retirés ou dont le rect a changé → clôture reconstruite ; animaux ajoutés → `AnimalActor` du bon modèle (`SPECIES_MODELS`, sexe), à la taille de bébé/jeune/adulte (× 0,5 / 0,75 / 1) ; animaux retirés → enlevés ; rect de déambulation = rect de l'enclos.
- Produit : `drawZones(world)` — sol légèrement teinté par zone ; zones verrouillées grisées avec un panneau « Niveau 2 » / « Niveau 3 » (texte en sprite).
- `AnimalActor` gagne `setBounds(b)` et `setScale(k)` (déjà construit, l'animal change de taille en grandissant).

- [ ] **Étape 1 : écrire le test qui échoue** — `diffById` : affichés {1,2,3}, prochains [2,3,4] → ajoutés [4], retirés [1], gardés [2,3].
- [ ] **Étape 2 : `npm test`** → ÉCHEC.
- [ ] **Étape 3 : implémenter** `diffById`, puis `decor`, `fence`, `zonesView`, `parkView` ; `main.ts` remplace `buildTestScene` par `buildDecor` + `drawZones` + `createParkView`.
- [ ] **Étape 4 : `npm test`** → réussi.
- [ ] **Étape 5 : vérifier à la main** — nouvelle partie : l'enclos de départ et ses deux moutons apparaissent dans la prairie ; avec `?debug`, « +3 jours » → les agneaux apparaissent, plus petits ; un animal mort disparaît ; les zones forêt et montagne sont grisées avec leur niveau.
- [ ] **Étape 6 : commit** — `La carte reflète la partie : enclos, animaux, zones`

### Tâche 5 : Sélectionner un enclos

**Fichiers :**
- Créer : `src/scene/picking.ts`
- Modifier : `src/scene/parkView.ts`

**Interfaces :**
- Produit : `createPicker(world, canvas, targets: () => Map<number, THREE.Object3D>, zones: Zone[]): { onPick(cb: (p: Pick) => void): void }` avec `type Pick = { kind: 'enclos'; id: number } | { kind: 'zone'; zone: Zone; point: { x: number; z: number } } | { kind: 'rien' }`. Un clic (pointeur relâché à moins de 6 px de l'appui, pour ne pas confondre avec une rotation de caméra) lance un rayon : enclos touché, sinon zone touchée au sol, sinon rien. Les clics dont la cible n'est pas le canevas sont ignorés.
- Produit : `parkView.setSelected(id: number | null)` — l'enclos sélectionné a un liseré lumineux au sol.

- [ ] **Étape 1 : implémenter** et brancher dans `main.ts` (la sélection est gardée dans `runGame`, voir tâche 7).
- [ ] **Étape 2 : vérifier à la main** — clic sur l'enclos : liseré ; glisser pour tourner la caméra : rien n'est sélectionné ; clic dans la prairie vide : zone sélectionnée ; clic sur un bouton de la barre : la sélection ne change pas.
- [ ] **Étape 3 : commit** — `Sélection d'un enclos ou d'une zone`

### Tâche 6 : Barre des ressources et retour visuel

**Fichiers :**
- Créer : `src/ui/topBar.ts`, `src/ui/feedback.ts`, `src/ui/format.ts`
- Modifier : `src/style.css`
- Test : `tests/ui/format.test.ts`

**Interfaces :**
- Produit : `formatAutonomy(hours: number): { text: string; level: 'ok' | 'attention' | 'urgent' }` — `Infinity` → `'∞'` ok ; 30 h → `'1 j 6 h'` ok ; 20 h → `'20 h'` attention (< 24 h) ; 5 h → `'5 h'` urgent (< 6 h) ; 0 → `'0 h'` urgent.
- Produit : `formatGameTime(ms: number): string` (ex. `'jeu. 14:20'`, fuseau de l'appareil).
- Produit : `mountTopBar(get: () => GameState): { pulse(resource: 'coins' | 'fourrage' | 'viande', delta: number): void }` — icônes et valeurs de la maquette validée (pièces, fourrage, viande, autonomie colorée, visiteurs grisés « —/h », « Hameau », heure du jeu) ; `pulse` allume la case et fait s'envoler « +n » ou « −n ».
- Produit (`feedback.ts`) : `flash(el: HTMLElement, ok: boolean)`, `toast(text: string, ok: boolean)`.

- [ ] **Étape 1 : écrire les tests qui échouent** pour `formatAutonomy` (5 cas ci-dessus) et `formatGameTime` (heure fixe, fuseau forcé dans le test).
- [ ] **Étape 2 : `npm test`** → ÉCHEC.
- [ ] **Étape 3 : implémenter** les trois fichiers et les styles (respect de `prefers-reduced-motion` : pas d'envol, seulement la couleur).
- [ ] **Étape 4 : `npm test`** → réussi.
- [ ] **Étape 5 : commit** — `Barre des ressources et retour visuel`

### Tâche 7 : Barre de commande compacte et volet

**Fichiers :**
- Créer : `src/ui/bottomBar.ts`, `src/ui/drawer.ts`
- Modifier : `src/game/runGame.ts`, `src/style.css`

**Interfaces :**
- Consomme : `applyAction`, `Pick`, `flash`, `toast`, `topBar.pulse`.
- Produit (`runGame.ts`) : `dispatch(action: Action, from?: HTMLElement): boolean` — applique via `applyAction`, sauvegarde, `flash(from, ok)`, `toast` (réussite : phrase de confirmation ; refus : la raison), `pulse` sur les pièces dépensées.
- Produit : `mountBottomBar(ctx: { get(): GameState; selection(): Pick; dispatch; startBuild(zone, point): void; startResize(encId): void })` — une ligne compacte (spec §7) :
  - **enclos sélectionné** : `Moutons 2/6`, mini-barre de propreté, « n malade(s) » ; icônes Nettoyer (5), Soigner tout (coût), Redimensionner, Détails ;
  - **zone sélectionnée** : nom de la zone ; icône « Nouvel enclos » (ou zone verrouillée : « Se débloque au niveau 2 ») ;
  - **rien** : « Clique un enclos ou une zone » ;
  - à droite : « Les missions arrivent bientôt », icônes Marchand et Gazette (désactivées avec info-bulle « Bientôt »), Replier.
- Produit (`drawer.ts`) : `openDrawer(title: string, render: (el: HTMLElement) => void)`, `closeDrawer()` — volet au-dessus de la ligne ; « Détails » y affiche la liste des animaux (nom, sexe, âge, satiété, santé, gestation, bonheur, Soigner, Renommer par champ de texte).
- La barre repliée ne laisse qu'une languette « ▲ ».

- [ ] **Étape 1 : implémenter** ; supprimer l'ancien bouton de mission flottant s'il gêne.
- [ ] **Étape 2 : vérifier à la main** — sélectionner l'enclos, « Nettoyer » : bouton vert, pièces −5 qui s'envolent, message « Enclos nettoyé » ; refaire tout de suite : bouton rouge « L'enclos est déjà propre » *(ajouter ce refus à `cleanEnclosure` avec son test si propreté > 0,95)* ; « Détails » ouvre le volet, Échap le ferme ; renommer un mouton ; barre repliée puis dépliée ; hauteur de la ligne ≤ 48 px.
- [ ] **Étape 3 : `npm test`** → réussi.
- [ ] **Étape 4 : commit** — `Barre de commande compacte et volet de détails`

### Tâche 8 : Poser et redimensionner un enclos

**Fichiers :**
- Créer : `src/scene/enclosureEditor.ts`
- Modifier : `src/scene/cameraRig.ts` (`setEnabled(on: boolean)`), `src/ui/bottomBar.ts`

**Interfaces :**
- Consomme : `fenceGhost`, `checkPlacement`, `snapRect`, `enclosureCost`, `resizeCost`, `dispatch`.
- Produit : `createEnclosureEditor(world, canvas, rig, ctx): { startBuild(zone, point): void; startResize(encId): void; active(): boolean }` —
  - **pose** : rect 10 × 8 m centré sur le point cliqué, ramené dans la zone ;
  - 4 **poignées** aux coins (sphères faciles à attraper, plus grosses sur écran tactile) ; glisser une poignée déplace ce coin sur le sol (rayon sur le plan y = 0), rect toujours `snapRect` ;
  - clôture fantôme **verte** si `checkPlacement` passe, **rouge** sinon ;
  - panneau flottant : « 12 × 10 m · capacité selon l'espèce · 296 pièces » (ou « +30 pièces » en redimensionnement), la raison en rouge si refus, boutons **Valider** et **Annuler** (Échap) ;
  - pendant l'édition, la caméra est suspendue (`rig.setEnabled(false)`) et le sélecteur ignore les clics ;
  - Valider → `dispatch({ type: 'construire', rect })` ou `redimensionner` ; succès → éditeur fermé, nouvel enclos sélectionné.

- [ ] **Étape 1 : implémenter.**
- [ ] **Étape 2 : vérifier à la main (souris puis mode mobile)** — clic dans la prairie → « Nouvel enclos » → fantôme vert, prix affiché ; tirer un coin vers le chemin → rouge « Il chevauche un chemin. », Valider refusé ; ramener → vert ; Valider → pièces dépensées (envol), nouvel enclos vide sélectionné ; Redimensionner l'enclos des moutons plus petit que 2 places → rouge « Trop d'animaux… » ; sur mobile, glisser une poignée ne fait pas tourner la caméra.
- [ ] **Étape 3 : `npm test`** → réussi.
- [ ] **Étape 4 : commit** — `Poser et redimensionner un enclos`

### Tâche 9 : Vérification d'ensemble et publication

- [ ] **Étape 1 :** `npm test`, `npm run build` → réussis.
- [ ] **Étape 2 :** à la main, sans `?debug` : une partie complète de 5 minutes (sélection, nettoyage, nouvel enclos, redimensionnement, détails, renommage) ; recharger → enclos et noms conservés au même endroit ; jour et nuit (`?heure=22`) ; mode mobile.
- [ ] **Étape 3 :** publication et vérification sur https://romsantic.github.io/parc-de-clairbois/ (après accord de Romain pour fusionner).
