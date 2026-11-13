# Étape 1 — Fondations et test visuel : plan de développement

> **Pour les agents :** sous-skill requis : superpowers:subagent-driven-development (recommandé) ou superpowers:executing-plans pour exécuter ce plan tâche par tâche. Les étapes utilisent des cases à cocher (`- [ ]`).

**Objectif :** un projet Vite + TypeScript publié automatiquement sur GitHub Pages, qui affiche une scène 3D de test (un enclos, 3 animaux animés, quelques maisons, éclairage final, caméra complète) pour que Romain valide le rendu avant la suite.

**Architecture :** `src/core/` pour les utilitaires purs (hasard), `src/scene/` pour Three.js (monde, caméra, lumière, acteurs), `src/assets/` pour la liste des modèles. Toute la logique non graphique (soleil, bornes de caméra, déambulation) est en fonctions pures testées ; Three.js ne fait qu'appliquer leurs résultats.

**Stack :** Node.js LTS, Vite, TypeScript (strict), Three.js (`GLTFLoader`, `OrbitControls`, `SkeletonUtils`), Vitest, GitHub Actions + GitHub Pages.

**Spec :** `docs/superpowers/specs/2026-11-12-parc-de-clairbois-v1-design.md` (surtout §7, §8, §9).

## Feuille de route de la V1

Chaque étape est jouable ou visible en ligne, et reçoit son propre plan détaillé quand on y arrive.

| Étape | Contenu | Spec |
|---|---|---|
| **1. Fondations et test visuel** (ce plan) | Outillage, publication, packs 3D, scène de test, caméra | §7, §8, §9 |
| 2. Cœur de la simulation | Données, état, horloge, faim, garde-manger, santé, naissances, rattrapage d'absence, sauvegarde et migrations | §3, §4, §9, §10 |
| 3. Carte jouable | Zones de biome, pose et redimensionnement des enclos (poignées, clôture fantôme, prix en direct), emplacements du village, sélection, barres du haut et du bas, actions sur les enclos, scène pilotée par l'état | §3, §7 |
| 4. Économie et village | Visiteurs, attrait, billet, bâtiments, niveaux du village, marchand | §3, §5, §6 |
| 5. Missions | Premiers pas avec Margaux, missions d'histoire, quotidiennes, résumé d'absence | §4, §6 |
| 6. Finition V1 | Équilibrage, téléphone, jour/nuit, visiteurs sur les chemins, brume des zones verrouillées | §7, §8 |

## Contraintes globales

- Interface et textes du jeu en **français**.
- TypeScript en mode `strict`. Aucune dépendance en dehors de `three`, `vite`, `typescript`, `vitest`, `@types/three`.
- Modèles 3D : **uniquement sous licence CC0**, chacun listé dans `CREDITS.md` (pack, auteur, URL, licence).
- Aucun téléchargement de pack sans l'accord explicite de Romain (nom, source, taille annoncés avant).
- Publication par GitHub Pages depuis la branche `main` ; Vite configuré avec `base: './'` pour fonctionner sous `https://<pseudo>.github.io/<dépôt>/`.
- Caméra : distance 12 à 60, angle polaire 0,35 à 1,25 rad (ne passe jamais sous le sol), boutons de quart de tour.
- `devicePixelRatio` plafonné à 2.

## Points de vigilance

1. **Chemins des fichiers sur GitHub Pages** : le site vit dans un sous-dossier ; un chemin absolu `/models/...` donne une page vide. → test dans la tâche 3 (`modelUrl` part de `import.meta.env.BASE_URL`) et vérification en ligne dans la tâche 2.
2. **Modèle introuvable ou corrompu** : la scène ne doit pas rester noire sans explication. → test dans la tâche 4 (`loadModels` rejette avec `AssetLoadError` qui nomme le modèle) ; l'écran affiche un message en français.
3. **WebGL indisponible** (vieux PC, navigateur bridé) : message clair au lieu d'une page vide. → tâche 4.
4. **Téléphone** : glisser pour tourner, pincer pour zoomer, pas de défilement de la page pendant le geste. → réglages `OrbitControls` + `touch-action: none` dans la tâche 5, vérifiés à la main en mode mobile.
5. **Heure qui dépasse 24 h ou négative** dans le calcul du soleil (l'horloge du jeu tournera longtemps). → test de bouclage dans la tâche 4.

---

### Tâche 1 : Outillage du projet

**Fichiers :**
- Créer : `package.json`, `tsconfig.json`, `vite.config.ts`, `index.html`, `src/main.ts`, `src/style.css`, `.gitignore`, `.gitattributes`, `README.md`
- Créer : `src/core/rng.ts`, `tests/core/rng.test.ts`

**Interfaces :**
- Produit : `createRng(seed: number): () => number` — générateur mulberry32, renvoie un nombre dans [0, 1).
- Produit : scripts npm `dev`, `build`, `preview`, `test` (`vitest run`).

- [ ] **Étape 1 : faire installer Node.js LTS par Romain** (installation logicielle sur son PC : c'est lui qui lance la commande)

```bash
winget install OpenJS.NodeJS.LTS
```
Puis dans un nouveau terminal : `node --version` → affiche `v22.x` ou plus récent.

- [ ] **Étape 2 : créer le projet** avec `npm create vite@latest . -- --template vanilla-ts` dans le dossier, puis `npm install three` et `npm install -D vitest @types/three`. Supprimer les fichiers de démonstration de Vite (`counter.ts`, logos). `.gitignore` : `node_modules`, `dist`, `serre-de-lune.html`. `.gitattributes` : `* text=auto eol=lf`. `vite.config.ts` : `base: './'`. `tsconfig.json` : `"strict": true`.

- [ ] **Étape 3 : écrire le test qui échoue** — `tests/core/rng.test.ts`

```ts
import { describe, it, expect } from 'vitest'
import { createRng } from '../../src/core/rng'

describe('createRng', () => {
  it('donne la même suite pour la même graine', () => {
    const a = createRng(42), b = createRng(42)
    expect([a(), a(), a()]).toEqual([b(), b(), b()])
  })
  it('donne des suites différentes pour des graines différentes', () => {
    expect(createRng(1)()).not.toBe(createRng(2)())
  })
  it('reste dans [0, 1)', () => {
    const r = createRng(7)
    for (let i = 0; i < 10_000; i++) { const x = r(); expect(x).toBeGreaterThanOrEqual(0); expect(x).toBeLessThan(1) }
  })
})
```

- [ ] **Étape 4 : lancer `npm test`** → ÉCHEC (module `rng` introuvable).

- [ ] **Étape 5 : implémenter `createRng(seed: number): () => number`** dans `src/core/rng.ts` (algorithme mulberry32).

- [ ] **Étape 6 : vérifier** — `npm test` → 3 tests réussis ; `npm run build` → crée `dist/` sans erreur TypeScript.

- [ ] **Étape 7 : commit** — `git add -A && git commit -m "Outillage : Vite, TypeScript, Vitest, Three.js"`

### Tâche 2 : Publication sur GitHub Pages

**Fichiers :**
- Créer : `.github/workflows/deploy.yml`
- Modifier : `README.md` (adresse du jeu)

**Interfaces :**
- Consomme : scripts `test` et `build` de la tâche 1.
- Produit : chaque push sur `main` lance les tests, construit et publie `dist/`.

- [ ] **Étape 1 : Romain crée le dépôt public vide** sur github.com (par ex. `parc-de-clairbois`, sans README) et donne son adresse. Dans *Settings → Pages*, source : **GitHub Actions**.

- [ ] **Étape 2 : écrire le workflow** `.github/workflows/deploy.yml` : déclenché sur `push` vers `main` et `workflow_dispatch` ; job `build` (`actions/checkout@v4`, `actions/setup-node@v4` avec `node-version: 22` et `cache: npm`, `npm ci`, `npm test`, `npm run build`, `actions/upload-pages-artifact@v3` avec `path: dist`) ; job `deploy` dépendant de `build` (`actions/deploy-pages@v4`, permissions `pages: write`, `id-token: write`, environnement `github-pages`).

- [ ] **Étape 3 : relier et pousser** — `git remote add origin <adresse>` puis `git push -u origin main`. La première fois, Windows peut ouvrir une connexion GitHub dans le navigateur : c'est Romain qui se connecte.

- [ ] **Étape 4 : vérifier** — l'onglet *Actions* du dépôt montre le workflow en vert ; `https://<pseudo>.github.io/parc-de-clairbois/` affiche la page (encore vide de 3D) sans erreur 404 dans la console.

- [ ] **Étape 5 : commit** — `git add -A && git commit -m "Publication automatique sur GitHub Pages" && git push`

### Tâche 3 : Packs 3D et liste des modèles

**Fichiers :**
- Créer : `public/models/<pack>/...` (fichiers `.glb`/`.gltf`), `CREDITS.md`
- Créer : `src/assets/manifest.ts`, `tests/assets/manifest.test.ts`

**Interfaces :**
- Produit : `type ModelKey` (union des clés de modèles), `MODELS: Record<ModelKey, string>` (chemin relatif à `public/`, ex. `'models/quaternius/Alpaca.gltf'`), `modelUrl(key: ModelKey): string` = `import.meta.env.BASE_URL + MODELS[key]`.
- Clés minimales pour la scène de test : 3 espèces animées (si possible chèvre, alpaga, renard ; sinon les plus proches du tableau §3 de la spec), `fence`, `tree`, `rock`, `house`, `houseSmall`, `townHall`.

- [ ] **Étape 1 : inventaire et accord** — consulter les packs candidats : Quaternius (animaux animés, nature), Kenney (*Nature Kit*, clôtures, chemins), KayKit (village). Présenter à Romain, pour chaque pack : nom exact, URL, licence relevée sur la page, taille, et les espèces disponibles par rapport aux 10 espèces de la spec. **Attendre son accord avant tout téléchargement.** Noter les espèces de la spec sans modèle : elles seront remplacées à l'étape 2 (données), avec son accord.

- [ ] **Étape 2 : télécharger les packs acceptés** dans un dossier temporaire à part, n'en copier que les modèles utiles dans `public/models/<pack>/`, et remplir `CREDITS.md` (pack, auteur, URL, licence CC0, date).

- [ ] **Étape 3 : écrire le test qui échoue** — `tests/assets/manifest.test.ts`

```ts
import { describe, it, expect } from 'vitest'
import { existsSync } from 'node:fs'
import { MODELS, modelUrl } from '../../src/assets/manifest'

describe('MODELS', () => {
  it.each(Object.entries(MODELS))('%s existe dans public/', (_k, path) => {
    expect(existsSync(`public/${path}`)).toBe(true)
  })
  it("n'utilise jamais de chemin absolu (cassé sur GitHub Pages)", () => {
    for (const path of Object.values(MODELS)) expect(path.startsWith('/')).toBe(false)
  })
  it('construit les URL à partir de BASE_URL', () => {
    const key = Object.keys(MODELS)[0] as keyof typeof MODELS
    expect(modelUrl(key)).toBe(import.meta.env.BASE_URL + MODELS[key])
  })
})
```

- [ ] **Étape 4 : lancer `npm test`** → ÉCHEC (module `manifest` introuvable).
- [ ] **Étape 5 : implémenter `src/assets/manifest.ts`** selon l'interface ci-dessus.
- [ ] **Étape 6 : lancer `npm test`** → tous les tests réussis.
- [ ] **Étape 7 : commit** — `git add -A && git commit -m "Packs 3D CC0 et liste des modèles"`

### Tâche 4 : Monde, lumière et chargement des modèles

**Fichiers :**
- Créer : `src/scene/sun.ts`, `tests/scene/sun.test.ts`
- Créer : `src/scene/loadModels.ts`, `tests/scene/loadModels.test.ts`
- Créer : `src/scene/world.ts`, `src/ui/errorScreen.ts`
- Modifier : `src/main.ts`, `src/style.css`

**Interfaces :**
- Consomme : `ModelKey`, `modelUrl` (tâche 3).
- Produit : `interface SunState { elevation: number /* degrés */; azimuth: number /* degrés */; intensity: number /* 0..1 */; skyTop: string; skyBottom: string /* couleurs hex */ }` et `sunForHour(hour: number): SunState`.
- Produit : `class AssetLoadError extends Error { key: ModelKey }` et `loadModels(keys: ModelKey[], load?: (url: string) => Promise<GLTF>): Promise<Map<ModelKey, GLTF>>` (le paramètre `load` permet de tester sans réseau ; par défaut `GLTFLoader.loadAsync`).
- Produit : `createWorld(canvas: HTMLCanvasElement, models: Map<ModelKey, GLTF>): World` avec `World { scene; camera; renderer; setHour(hour: number): void; update(dt: number): void; resize(): void }`.
- Produit : `showError(message: string): void` (écran plein, texte en français, bouton « Recharger »).

- [ ] **Étape 1 : écrire les tests qui échouent** — `tests/scene/sun.test.ts`

```ts
import { describe, it, expect } from 'vitest'
import { sunForHour } from '../../src/scene/sun'

describe('sunForHour', () => {
  it('soleil haut à midi', () => { expect(sunForHour(12).elevation).toBeCloseTo(60, 0) })
  it('soleil à l\'horizon vers 6 h et 18 h', () => {
    expect(Math.abs(sunForHour(6).elevation)).toBeLessThan(5)
    expect(Math.abs(sunForHour(18).elevation)).toBeLessThan(5)
  })
  it('nuit sombre mais jamais noire', () => {
    const n = sunForHour(0)
    expect(n.intensity).toBeLessThanOrEqual(0.2)
    expect(n.intensity).toBeGreaterThan(0)
  })
  it('boucle sur 24 h, y compris en négatif', () => {
    expect(sunForHour(25)).toEqual(sunForHour(1))
    expect(sunForHour(-1)).toEqual(sunForHour(23))
  })
})
```

et `tests/scene/loadModels.test.ts` : un `load` factice qui rejette pour `'house'` → `loadModels(['tree', 'house'], load)` rejette avec une `AssetLoadError` dont `key === 'house'` ; un `load` factice qui réussit → la `Map` contient les deux clés.

- [ ] **Étape 2 : lancer `npm test`** → ÉCHEC (modules introuvables).
- [ ] **Étape 3 : implémenter `sunForHour`** dans `src/scene/sun.ts` : élévation sinusoïdale (60° à 12 h, 0° à 6 h et 18 h, négative la nuit), intensité ramenée à un plancher de clair de lune (0,12) la nuit, couleurs de ciel interpolées entre nuit, aube et jour. Normaliser l'heure avec `((hour % 24) + 24) % 24`.
- [ ] **Étape 4 : implémenter `loadModels` et `AssetLoadError`** dans `src/scene/loadModels.ts`.
- [ ] **Étape 5 : lancer `npm test`** → tous les tests réussis.
- [ ] **Étape 6 : implémenter `createWorld`** dans `src/scene/world.ts` : `WebGLRenderer` (antialias, ombres `PCFSoftShadowMap`, `ACESFilmicToneMapping`, `SRGBColorSpace`, pixel ratio ≤ 2) ; ciel en dégradé (grande sphère à shader deux couleurs piloté par `skyTop`/`skyBottom`) ; `HemisphereLight` + `DirectionalLight` avec ombres, positionnée par `sunForHour` ; sol herbeux ; rivière (plan avec léger mouvement de vagues dans `update`). `setHour` utilise l'heure locale réelle au démarrage.
- [ ] **Étape 7 : brancher `src/main.ts`** : si `WebGL.isWebGL2Available()` est faux → `showError("Ton navigateur ne peut pas afficher la 3D. Essaie avec une version récente de Chrome, Firefox ou Edge.")` ; sinon charger les modèles, créer le monde, boucle `requestAnimationFrame`, `resize` sur redimensionnement. Une `AssetLoadError` → `showError(\`Le modèle « ${key} » n'a pas pu être chargé. Recharge la page ; si ça continue, le fichier manque dans le projet.\`)`.
- [ ] **Étape 8 : vérifier à la main** — `npm run dev` : ciel, sol, rivière animée et ombres visibles ; renommer temporairement un fichier de modèle → le message d'erreur s'affiche avec son nom ; remettre le fichier.
- [ ] **Étape 9 : commit** — `git add -A && git commit -m "Monde 3D : ciel, soleil selon l'heure, rivière, chargement des modèles"`

### Tâche 5 : Caméra

**Fichiers :**
- Créer : `src/scene/cameraRig.ts`, `tests/scene/cameraRig.test.ts`, `src/ui/cameraButtons.ts`
- Modifier : `src/main.ts`, `src/style.css`

**Interfaces :**
- Consomme : `World` (tâche 4).
- Produit : `interface Orbit { azimuth: number; polar: number; distance: number }`, `CAMERA_LIMITS = { minDistance: 12, maxDistance: 60, minPolar: 0.35, maxPolar: 1.25 }`, `clampOrbit(o: Orbit, limits = CAMERA_LIMITS): Orbit`, `quarterTurn(azimuth: number, dir: 1 | -1): number`.
- Produit : `createCameraRig(world: World, canvas: HTMLCanvasElement): { rotateQuarter(dir: 1 | -1): void; zoom(step: number): void; update(dt: number): void }`.

- [ ] **Étape 1 : écrire le test qui échoue** — `tests/scene/cameraRig.test.ts`

```ts
import { describe, it, expect } from 'vitest'
import { clampOrbit, quarterTurn, CAMERA_LIMITS } from '../../src/scene/cameraRig'

describe('clampOrbit', () => {
  it('ne passe jamais sous le sol ni au zénith', () => {
    expect(clampOrbit({ azimuth: 0, polar: 2, distance: 30 }).polar).toBe(CAMERA_LIMITS.maxPolar)
    expect(clampOrbit({ azimuth: 0, polar: 0, distance: 30 }).polar).toBe(CAMERA_LIMITS.minPolar)
  })
  it('borne le zoom', () => {
    expect(clampOrbit({ azimuth: 0, polar: 1, distance: 5 }).distance).toBe(12)
    expect(clampOrbit({ azimuth: 0, polar: 1, distance: 99 }).distance).toBe(60)
  })
})

describe('quarterTurn', () => {
  it('va au quart de tour suivant', () => {
    expect(quarterTurn(0, 1)).toBeCloseTo(Math.PI / 2)
    expect(quarterTurn(0.3, 1)).toBeCloseTo(Math.PI / 2)
    expect(quarterTurn(0.3, -1)).toBeCloseTo(0)
  })
})
```

- [ ] **Étape 2 : lancer `npm test`** → ÉCHEC.
- [ ] **Étape 3 : implémenter `clampOrbit` et `quarterTurn`** dans `src/scene/cameraRig.ts`.
- [ ] **Étape 4 : lancer `npm test`** → tous les tests réussis.
- [ ] **Étape 5 : implémenter `createCameraRig`** avec `OrbitControls` : `minDistance`/`maxDistance`/`minPolarAngle`/`maxPolarAngle` depuis `CAMERA_LIMITS`, `enableDamping`, déplacement de la vue (pan) limité au domaine, tactile : un doigt pour tourner, deux pour zoomer et déplacer. Le quart de tour anime l'azimut vers `quarterTurn(...)` en ~0,4 s. Le canevas a `touch-action: none`.
- [ ] **Étape 6 : ajouter les boutons** (`src/ui/cameraButtons.ts`) : tourner à gauche, tourner à droite, zoomer, dézoomer, en haut à droite, avec `aria-label` en français.
- [ ] **Étape 7 : vérifier à la main** — à la souris (glisser, molette, boutons) et en mode téléphone des outils du navigateur (glisser, pincer) : la caméra ne passe jamais sous le sol, la page ne défile pas.
- [ ] **Étape 8 : commit** — `git add -A && git commit -m "Caméra : rotation, inclinaison, zoom, quarts de tour, tactile"`

### Tâche 6 : Scène de test (enclos, animaux, village)

**Fichiers :**
- Créer : `src/scene/wander.ts`, `tests/scene/wander.test.ts`
- Créer : `src/scene/animalActor.ts`, `src/scene/testScene.ts`
- Modifier : `src/main.ts`

**Interfaces :**
- Consomme : `createRng` (tâche 1), `MODELS`/`ModelKey` (tâche 3), `World`, `loadModels` (tâche 4).
- Produit : `interface Bounds { minX: number; maxX: number; minZ: number; maxZ: number }`, `pickWanderTarget(b: Bounds, rng: () => number, margin = 0.5): { x: number; z: number }`, `stepToward(pos: { x: number; z: number }, target: { x: number; z: number }, speed: number, dt: number): { x: number; z: number; arrived: boolean }`.
- Produit : `class AnimalActor { constructor(gltf: GLTF, bounds: Bounds, rng: () => number); object: Object3D; update(dt: number): void }` — clone le modèle (`SkeletonUtils.clone`), joue l'animation de marche en mouvement et une animation de repos ou de broutage à l'arrêt (noms d'animations relevés dans les fichiers du pack).
- Produit : `buildTestScene(world: World, models: Map<ModelKey, GLTF>, rng: () => number): { update(dt: number): void }`.

- [ ] **Étape 1 : écrire le test qui échoue** — `tests/scene/wander.test.ts`

```ts
import { describe, it, expect } from 'vitest'
import { pickWanderTarget, stepToward } from '../../src/scene/wander'
import { createRng } from '../../src/core/rng'

const b = { minX: -5, maxX: 5, minZ: -3, maxZ: 3 }

describe('pickWanderTarget', () => {
  it('reste dans l\'enclos, avec la marge', () => {
    const r = createRng(1)
    for (let i = 0; i < 1000; i++) {
      const t = pickWanderTarget(b, r, 0.5)
      expect(t.x).toBeGreaterThanOrEqual(-4.5); expect(t.x).toBeLessThanOrEqual(4.5)
      expect(t.z).toBeGreaterThanOrEqual(-2.5); expect(t.z).toBeLessThanOrEqual(2.5)
    }
  })
})

describe('stepToward', () => {
  it('avance de speed × dt sans dépasser la cible', () => {
    expect(stepToward({ x: 0, z: 0 }, { x: 10, z: 0 }, 2, 1)).toEqual({ x: 2, z: 0, arrived: false })
    expect(stepToward({ x: 0, z: 0 }, { x: 1, z: 0 }, 2, 1)).toEqual({ x: 1, z: 0, arrived: true })
  })
})
```

- [ ] **Étape 2 : lancer `npm test`** → ÉCHEC.
- [ ] **Étape 3 : implémenter `pickWanderTarget` et `stepToward`** dans `src/scene/wander.ts`.
- [ ] **Étape 4 : lancer `npm test`** → tous les tests réussis.
- [ ] **Étape 5 : implémenter `AnimalActor`** : choisit une cible, marche vers elle en s'orientant, s'arrête 2 à 6 s (durée tirée avec `rng`), recommence.
- [ ] **Étape 6 : implémenter `buildTestScene`** : côté zoo, un enclos de prairie clôturé avec 3 animaux par espèce choisie (au moins 3 espèces au total sur 1 à 3 enclos), arbres et rochers autour ; de l'autre côté de la rivière, 3 maisons et la mairie avec un marqueur de mission « ! » qui flotte et tourne ; un chemin qui relie les deux. Disposition reprenant la maquette validée (zoo à gauche, village à droite, rivière entre les deux).
- [ ] **Étape 7 : vérifier à la main** — `npm run dev` : les animaux se promènent sans sortir de l'enclos, les animations s'enchaînent, les ombres suivent ; tourner la caméra tout autour ; pas d'erreur dans la console ; fluide sur le PC de Romain.
- [ ] **Étape 8 : commit et publication** — `git add -A && git commit -m "Scène de test : enclos, animaux animés, village" && git push`

### Tâche 7 : Validation du rendu par Romain

- [ ] **Étape 1 :** vérifier que la publication GitHub Pages est verte et que la scène s'affiche à l'adresse en ligne (y compris sur téléphone).
- [ ] **Étape 2 :** donner l'adresse à Romain et recueillir son avis sur : le style des packs, la lumière, la caméra, la fluidité.
- [ ] **Étape 3 :** appliquer les ajustements demandés (couleurs, lumière, choix des modèles), chacun dans un commit, puis republier.
- [ ] **Étape 4 :** consigner dans la spec (§3 et §8) la liste définitive des espèces et des packs retenus, et la faire valider. Ce document servira d'entrée au plan de l'étape 2.
