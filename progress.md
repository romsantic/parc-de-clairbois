# Le Parc de Clairbois — où on en est

*Mis à jour le 16/11/2026. Ce fichier sert de point de départ à chaque nouvelle session de travail : le lire en premier.*

## Le joueur et la façon de travailler

- **Romain** joue et décide ; il parle français, aime avancer **étape par étape**, valider sur maquette ou en jouant, et qu'on lui explique simplement (pas de jargon).
- Chaque étape suit le même cycle : **plan écrit** (`docs/superpowers/plans/`) → relu et validé par Romain → **construction** en TDD (test qui échoue d'abord) sur une branche `etape-N-…` → vérification à la main dans le navigateur → **relecture indépendante** (agent sur le modèle le plus capable) → corrections → **fusion dans `main` avec l'accord de Romain** → publication automatique.
- **Méthode d'économie demandée par Romain (à partir de l'étape 4)** : le chef d'orchestre (modèle le plus capable) écrit le plan, gère tout ce qui passe par Romain (téléchargements, choix, vérifications visuelles) et la relecture finale ; les **tâches de code bien délimitées** du plan vont à des agents **Sonnet** ; les tâches **mécaniques** (copie de fichiers, inventaires) à **Haiku**. Une session par étape pour garder l'historique court.
- Toujours tenir ce fichier à jour à la fin d'une étape **et à la fin de chaque sous-tâche** (cocher la ligne dans « Suivi des sous-tâches »).

## Organisation des sessions (demandée par Romain le 16/11/2026)

- Découpage : **Version** (V1…V5) → **Étape** (une session par étape) → **Sous-tâche** (une tâche du plan de l'étape, confiée à un agent).
- **Session de pilotage** : courte, elle sert de tableau de bord avec Romain. Elle lance les sessions d'étape, suit leurs comptes rendus et répond aux questions. On la **vide (clear) quand une sous-tâche est finie**, puis elle repart de ce fichier. Elle ne code pas.
- **Session d'étape** : écrit le plan, le fait valider, confie chaque sous-tâche à un agent, vérifie, fait relire, fusionne avec l'accord de Romain et met à jour ce fichier.
- Tout ce qui doit survivre à un « clear » est écrit ici, jamais seulement dans la conversation.

## Modèle à utiliser selon le type de demande

**Règle permanente (Romain, 17/11/2026) : pour chaque sous-tâche, la session choisit d'elle-même l'agent et le modèle d'après ce tableau, sans que Romain ait à le redire.** Le choix est noté dans la colonne « Modèle » du suivi des sous-tâches.

| Type de demande | Qui | Modèle |
|---|---|---|
| Discussion avec Romain, choix de jeu, idées, maquettes | chef (session) | le plus capable (Opus) |
| Écrire un plan d'étape, découper en sous-tâches | chef | Opus |
| Tâche de code bien délimitée (règles, interface, 3D) avec tests | agent | **Sonnet** |
| Tâche mécanique : copier/renommer des fichiers, inventaires, listes de modèles, mises en forme | agent | **Haiku** |
| Recherche dans le code (« où est X ? ») | agent Explore | Haiku |
| Vérification à la main dans le navigateur | chef | Opus |
| Relecture finale d'une étape | agent de relecture | Opus |
| Correction d'un bug trouvé par la relecture | agent | Sonnet (Opus si le bug est subtil) |
| Mise à jour de ce fichier, commits, fusion (avec l'accord de Romain) | chef | Opus |

## Suivi des sous-tâches

**V1 — étape 4 : économie et village** (branche `etape-4-economie`, plan `docs/superpowers/plans/2026-11-16-etape-4-economie-et-village.md`)

| # | Sous-tâche | Modèle | État |
|---|---|---|---|
| 1 | État version 2, migration, vrai niveau du village | Sonnet | faite (f0e0489) |
| 2 | Attrait, visiteurs et billet (règles pures) | Sonnet | faite (9565d62) |
| 3 | Le parc gagne de l'argent à chaque pas | Sonnet | faite (580b614) |
| 4 | Actions du village et de la ferme | Sonnet | faite (9899db9) |
| 5 | Marchand d'animaux | Sonnet | faite (3e7a477) |
| 6 | Rééquilibrer la reproduction | Sonnet | faite (4ffcfeb) |
| 7 | Modèles des bâtiments | Haiku | faite (342b273) |
| 8 | Bâtiments et emplacements sur la carte | Sonnet | faite (ffa1f6e) |
| 9 | Chemins qui suivent le niveau du village | Sonnet | faite (319bc56) |
| 10 | Interface : billet, village, marchand | Sonnet | faite (24dedcd) |
| 11 | Vérification d'ensemble, relecture et publication | chef + relecture Opus | faite (997226d) |

**Sous-tâche 11 (17/11/2026)** — vérification dans le navigateur faite (café, billet, marchand, vente, niveaux 2 et 3, chemins de jour et de nuit, sauvegarde v1, téléphone). Corrections : emplacements visibles et panneaux lisibles (64fa8b9) ; relecture finale Opus (0 critique, 1 important, 14 mineurs) corrigée en bd75fde — double-clic qui contournait la confirmation de vente/achat, copie de la sauvegarde v1 avant migration, validation renforcée des sauvegardes, marchand réapprovisionné au passage de niveau, « Remplir » le garde-manger, emplacements du Bourg réservés (« Bientôt »), case du billet en rouge quand la réputation baisse, barre du bas à 48 px. Laissé : quelques chiffres encore en dur hors de `src/data/` (M12). 338 tests verts. **Fusionnée dans `main` (997226d) avec l'accord de Romain le 17/11/2026, publiée et vérifiée en ligne.**

**V1 — étape 5 : missions** (branche `etape-5-missions`, plan `docs/superpowers/plans/2026-11-17-etape-5-missions.md`) — **plan écrit le 17/11/2026, validé par Romain** (récompenses à récupérer par un bouton « Récupérer », pas automatiques)

| # | Sous-tâche | Agent · modèle | État |
|---|---|---|---|
| 1 | État version 3, compteurs et migration | agent · Sonnet | faite (db790fb) — 355 tests |
| 2 | Données des missions et moteur (premiers pas, histoire, passage de niveau) | agent · Sonnet | faite (9c1afd5) — 390 tests |
| 3 | Missions quotidiennes, série et bon de réduction | agent · Sonnet | faite (3fd385d) — 420 tests |
| 4 | Petits textes d'affichage (récompense, avancée, durée d'absence) | agent · Haiku | faite (ac6bd45) — 431 tests |
| 5 | Interface des missions (barre, volet, bannière, mise en évidence, autonomie) | agent · Sonnet | à faire |
| 6 | La Gazette de Clairbois (résumé d'absence) | agent · Sonnet | à faire |
| 7 | Vérification d'ensemble, relecture et publication | chef (Opus) + relecture · Opus | à faire |

Étape suivante (6 Finition V1) : ses sous-tâches seront ajoutées ici quand son plan sera écrit.

## Liens

- Jeu en ligne : https://romsantic.github.io/parc-de-clairbois/ (`?heure=14` force l'heure ; `?debug` affiche le panneau de test)
- Dépôt : https://github.com/romsantic/parc-de-clairbois (public ; chaque push sur `main` teste, construit et publie via GitHub Actions)
- Conception (source de vérité) : `docs/superpowers/specs/2026-11-12-parc-de-clairbois-v1-design.md`
- Plans des étapes faites : `docs/superpowers/plans/` · Crédits des modèles 3D : `CREDITS.md`

## Feuille de route V1

| Étape | État |
|---|---|
| 1. Fondations et test visuel (outillage, publication, packs 3D, monde, caméra) | ✅ fusionnée |
| 2. Cœur de la simulation (faim, garde-manger, santé, naissances, absence, sauvegarde) | ✅ fusionnée |
| 3. Carte jouable (zones, pose/redimensionnement d'enclos, sélection, barres, retour visuel) | ✅ fusionnée — vérifiée sur le téléphone de Romain |
| 4. Économie et village (visiteurs, attrait, billet réglable, bâtiments, niveaux du village, marchand, ferme et rations, chemins qui évoluent avec le niveau) | ✅ fusionnée le 17/11/2026 |
| **5. Missions** (Premiers pas avec Margaux, histoire, quotidiennes, résumé d'absence/Gazette) | **en cours** (branche `etape-5-missions`) |
| 6. Finition V1 (équilibrage, téléphone, brume des zones, visiteurs sur les chemins, jour/nuit, perfs) | à faire |

Après la V1 : V2 à V5 décrites en fin de spec (personnel et centre vétérinaire, routes à construire contre de l'argent, expéditions, musée, labo, saisons…).

## Décisions prises avec Romain (en plus de la spec)

- 3D low-poly Three.js, modèles **CC0 Quaternius** uniquement (animaux animés, nature, village médiéval, ferme). Kenney bloque les téléchargements.
- Espèces V1 : mouton, cochon, âne, alpaga (prairie) · renard, cerf, cheval sauvage (forêt) · lama, taureau, loup (montagne). Mouton/cochon/lama viennent du pack ferme (FBX, **pas d'animation de marche** : balancement simulé).
- Enclos : **zones de biome + pose libre et redimensionnement** par les coins ; prix 4 pièces/m de clôture + 1/m² ; tirer un coin au-delà du coin opposé **déplace** l'enclos (gardé volontairement).
- Barres : haut = ressources en icônes ; bas = **une ligne compacte (48 px)** qui s'agrandit en volet (détails, plus tard missions/marchand/Gazette) ; retour visuel vert/rouge + « +n » qui s'envole + message court.
- Chemins de terre texturés ; ils **évolueront avec le niveau du village** (gravier, pavés, puis routes en V2).
- Rester en **TypeScript** (pas de Rust : aucun besoin de performance à ce stade).

## Décisions de l'étape 4 (en plus de la spec)

- Chaque bâtiment est **unique** ; les 2 emplacements du Bourg affichent « Bientôt » (nouveaux bâtiments dans une évolution future).
- Passage de niveau **par un bouton** dans le volet du village (case village de la barre du haut), jamais automatique.
- Réglages initiaux (tous dans `src/data/economy.ts` / `tuning.ts`, à ajuster en jouant) : 4 visiteurs par point d'attrait ; prix juste 4 + 2 × (niveau − 1) + 0,4 × attrait ; population 10 + 5 par niveau de bâtiment + 1 par 30 clients ; seuils 50 / 150 ; marchand renouvelé toutes les 6 h ; 30 fourrage au départ, conception 10 %/h, repos de 2 × gestation après une naissance.

## À régler à l'étape 5 (déjà repéré)

- `missionGateOk` (`src/sim/village.ts`) renvoie toujours vrai : y brancher la mission du palier.
- Le tutoriel de Margaux s'appuie sur : ferme déjà construite, premier stock du marchand avec un couple de cochons, billet et café.
- Laissé de la relecture : quelques chiffres encore en dur hors de `src/data/` (M12). Petits défauts anciens : calculs O(N²) par pas, `JSON.stringify` du panneau de test.
- Les achats à la ferme (rations, amélioration, garde-manger) sont testés automatiquement mais pas encore essayés à la main.

## Architecture (où est quoi)

- `src/data/` chiffres du jeu (espèces, réglages, zones, modèles par espèce) — aucune logique.
- `src/sim/` règles pures et testées sur un `GameState` sérialisable ; **une seule** fonction fait avancer le temps : `advanceTo(state, now)` par pas fixes de 10 min (jeu en direct = rattrapage d'absence). Actions du joueur : `applyAction` / `previewEnclosure` dans `actions.ts`.
- `src/save/` sauvegarde versionnée (propriétaire par onglet, copies de secours, migrations).
- `src/game/` session + boucle (`runGame` : horloge, sauvegarde, `dispatch` avec retour visuel).
- `src/scene/` 3D : monde, décor, zones, vue du parc pilotée par l'état (`parkView`), éditeur d'enclos, sélection, caméra.
- `src/ui/` barres, volet, retour visuel, panneau de test.
- Tests : `tests/` (Vitest), 338 au 17/11/2026.

## Mémo technique (pièges déjà rencontrés)

- **Node** est installé mais pas dans le PATH des commandes de Claude : préfixer `export PATH="/c/Program Files/nodejs:$PATH";`.
- **GitHub CLI** : `"/c/Program Files/GitHub CLI/gh.exe"`, connecté au compte `romsantic`.
- Serveur de dev : `"/c/Program Files/nodejs/node.exe" node_modules/vite/bin/vite.js --port 5173 --strictPort` (en arrière-plan), puis navigateur intégré sur http://localhost:5173/?heure=14. Le panneau du navigateur intégré **masqué = animation en pause**.
- Un **autre onglet du jeu ouvert** déclenche « Ton parc est ouvert dans un autre onglet » (protection voulue) : fermer les onglets en trop.
- Modèles OBJ de Blender 2.79 : couleurs déjà linéaires (on annule la conversion dans `materials.ts`) ; arêtes `l` parasites à retirer ; un fichier manquant renvoie la page web (d'où la vérification « modèle vide »).
- Téléphone : la page en ligne peut rester en cache ~10 min après une publication (fermer/rouvrir l'onglet).
- Le dossier `_telechargements/` (packs zip) et `.superpowers/` (suivi de travail des agents) ne sont pas versionnés.
