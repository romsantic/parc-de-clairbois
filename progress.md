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
| 5 | Marchand d'animaux | Sonnet | en cours |
| 6 | Rééquilibrer la reproduction | Sonnet | à faire |
| 7 | Modèles des bâtiments | Haiku | à faire |
| 8 | Bâtiments et emplacements sur la carte | Sonnet | à faire |
| 9 | Chemins qui suivent le niveau du village | Sonnet | à faire |
| 10 | Interface : billet, village, marchand | Sonnet | à faire |
| 11 | Vérification d'ensemble, relecture et publication | chef + relecture Opus | à faire |

Étapes suivantes (5 Missions, 6 Finition V1) : leurs sous-tâches seront ajoutées ici quand leur plan sera écrit.

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
| **4. Économie et village** (visiteurs, attrait, billet réglable, bâtiments, niveaux du village, marchand, ferme et rations, chemins qui évoluent avec le niveau) | **en cours** (voir « Suivi des sous-tâches ») |
| 5. Missions (Premiers pas avec Margaux, histoire, quotidiennes, résumé d'absence/Gazette) | à faire |
| 6. Finition V1 (équilibrage, téléphone, brume des zones, visiteurs sur les chemins, jour/nuit, perfs) | à faire |

Après la V1 : V2 à V5 décrites en fin de spec (personnel et centre vétérinaire, routes à construire contre de l'argent, expéditions, musée, labo, saisons…).

## Décisions prises avec Romain (en plus de la spec)

- 3D low-poly Three.js, modèles **CC0 Quaternius** uniquement (animaux animés, nature, village médiéval, ferme). Kenney bloque les téléchargements.
- Espèces V1 : mouton, cochon, âne, alpaga (prairie) · renard, cerf, cheval sauvage (forêt) · lama, taureau, loup (montagne). Mouton/cochon/lama viennent du pack ferme (FBX, **pas d'animation de marche** : balancement simulé).
- Enclos : **zones de biome + pose libre et redimensionnement** par les coins ; prix 4 pièces/m de clôture + 1/m² ; tirer un coin au-delà du coin opposé **déplace** l'enclos (gardé volontairement).
- Barres : haut = ressources en icônes ; bas = **une ligne compacte (48 px)** qui s'agrandit en volet (détails, plus tard missions/marchand/Gazette) ; retour visuel vert/rouge + « +n » qui s'envole + message court.
- Chemins de terre texturés ; ils **évolueront avec le niveau du village** (gravier, pavés, puis routes en V2).
- Rester en **TypeScript** (pas de Rust : aucun besoin de performance à ce stade).

## À régler à l'étape 4 (déjà repéré)

- **Équilibrage** : les moutons se reproduisent très vite (gestation 2 h, adulte en 4 h) ; une nouvelle partie laissée 3 jours tombe malade. Pistes : plus de fourrage au départ, repos après une naissance, autonomie qui anticipe les naissances.
- Aujourd'hui l'argent ne fait que baisser (aucun revenu) ; rations seulement via `?debug`.
- `TUNING.VILLAGE_LEVEL_V1 = 1` est un bouche-trou : à remplacer par le vrai niveau du village dans l'état (migration de sauvegarde v1 → v2 à écrire dans `src/save/migrations.ts`).
- Petits défauts laissés (sans effet visible) : autonomie avec les cochons, calculs O(N²) par pas, `JSON.stringify` du panneau de test.

## Architecture (où est quoi)

- `src/data/` chiffres du jeu (espèces, réglages, zones, modèles par espèce) — aucune logique.
- `src/sim/` règles pures et testées sur un `GameState` sérialisable ; **une seule** fonction fait avancer le temps : `advanceTo(state, now)` par pas fixes de 10 min (jeu en direct = rattrapage d'absence). Actions du joueur : `applyAction` / `previewEnclosure` dans `actions.ts`.
- `src/save/` sauvegarde versionnée (propriétaire par onglet, copies de secours, migrations).
- `src/game/` session + boucle (`runGame` : horloge, sauvegarde, `dispatch` avec retour visuel).
- `src/scene/` 3D : monde, décor, zones, vue du parc pilotée par l'état (`parkView`), éditeur d'enclos, sélection, caméra.
- `src/ui/` barres, volet, retour visuel, panneau de test.
- Tests : `tests/` (Vitest), 215 au 16/11/2026.

## Mémo technique (pièges déjà rencontrés)

- **Node** est installé mais pas dans le PATH des commandes de Claude : préfixer `export PATH="/c/Program Files/nodejs:$PATH";`.
- **GitHub CLI** : `"/c/Program Files/GitHub CLI/gh.exe"`, connecté au compte `romsantic`.
- Serveur de dev : `"/c/Program Files/nodejs/node.exe" node_modules/vite/bin/vite.js --port 5173 --strictPort` (en arrière-plan), puis navigateur intégré sur http://localhost:5173/?heure=14. Le panneau du navigateur intégré **masqué = animation en pause**.
- Un **autre onglet du jeu ouvert** déclenche « Ton parc est ouvert dans un autre onglet » (protection voulue) : fermer les onglets en trop.
- Modèles OBJ de Blender 2.79 : couleurs déjà linéaires (on annule la conversion dans `materials.ts`) ; arêtes `l` parasites à retirer ; un fichier manquant renvoie la page web (d'où la vérification « modèle vide »).
- Téléphone : la page en ligne peut rester en cache ~10 min après une publication (fermer/rouvrir l'onglet).
- Le dossier `_telechargements/` (packs zip) et `.superpowers/` (suivi de travail des agents) ne sont pas versionnés.
