# Étape 6 — Finition de la V1 : plan de développement

> **Pour les agents :** sous-skill requis : superpowers:subagent-driven-development (recommandé) ou superpowers:executing-plans pour exécuter ce plan tâche par tâche. Les étapes utilisent des cases à cocher (`- [ ]`).

**Objectif :** la V1 devient un jeu fini qu'on a envie d'ouvrir chaque jour. Un **bouton « Recommencer à zéro »** en jeu ; des **missions du jour qui grandissent avec le parc** ; un **rythme de progression vérifié** par un joueur automatique ; la carte prend vie (**brume** sur les zones fermées, **promeneurs** sur les chemins, **nuit** avec lanternes et fenêtres allumées) ; le jeu reste **fluide sur téléphone**, même avec un grand parc ; les petits défauts gardés aux étapes 4 et 5 sont réglés.

**Architecture :** inchangée. Les chiffres vont dans `src/data/` ; les règles dans `src/sim/` (pures, testées) ; l'affichage dans `src/scene/` et `src/ui/`. Le joueur automatique est un **test** (`tests/balance/`) qui joue avec les vraies règles (`applyAction`, `advanceTo`) : il sert à régler l'équilibre et empêche de le casser plus tard. Les promeneurs, la brume et la nuit sont **purement visuels** (rien dans la sauvegarde).

**Stack :** Three.js, TypeScript strict, Vitest.

**Spec :** `docs/superpowers/specs/2026-11-12-parc-de-clairbois-v1-design.md` — §1 (critère de réussite), §3 (attrait et visiteurs), §4 (absence), §6 (quotidiennes), §7 (brume, téléphone), §8 (jour/nuit, promeneurs).

**Hors périmètre :** tout ce qui est V2 et après (personnel, routes à construire, niveaux 4–5, saisons) ; parties multiples et écran d'accueil (choix de Romain : le jeu s'ouvre toujours directement sur le parc).

**Qui fait quoi (méthode de Romain) :** chaque tâche indique son agent et son modèle, choisis d'après le tableau de `progress.md`. **Sonnet** pour le code bien délimité, **Haiku** pour le mécanique, **chef** (session d'étape, Opus) pour ce qui passe par Romain, les vérifications dans le navigateur et la relecture finale (agent Opus).

## Décisions à valider par Romain

**Toutes validées par Romain le 17/11/2026, telles quelles.** Tous les chiffres iront dans `src/data/`, faciles à changer après avoir joué.

| # | Sujet | Proposition |
|---|---|---|
| D1 | **Où mettre « Recommencer à zéro »** | Une petite **roue ⚙** à droite de la barre du haut ouvre un volet « Options » avec le bouton **Recommencer à zéro**. Premier clic : le bouton devient rouge « Tout ton parc sera effacé — confirmer ? » ; second clic : nouvelle partie, les premiers pas avec Margaux reprennent. Une copie de l'ancienne partie est gardée en secret dans le navigateur (au cas où), sans bouton pour la rappeler. |
| D2 | **Rythme de la V1** (pour un joueur qui passe 2 ou 3 fois par jour, 10 minutes) | Passage au **Village vers le 2ᵉ jour**, au **Bourg vers le 7ᵉ jour**, **fin de la V1 (250 habitants, 10 espèces) vers le 21ᵉ jour**. Le joueur automatique mesure le rythme actuel ; on ajuste les chiffres jusqu'à tomber à peu près dessus. |
| D3 | **Missions du jour qui grandissent** | La **quantité** suit l'état réel du parc au moment du tirage (minuit) : visiteurs et pièces ≈ **3 heures** de l'activité du parc ; rations ≈ **une demi-journée** de ce que mangent les animaux ; nettoyages = **nombre d'enclos** (2 à 6) ; vendre/acheter : 1 animal, 2 quand le parc en a plus de 20. La **récompense** suit l'effort : environ **1 heure de recettes du parc** (au moins 30 pièces), un peu plus pour les missions qui coûtent (acheter des rations ou un animal), et en nourriture pour celles du fermier. Chiffres arrondis (« Accueille 150 visiteurs », pas 147). Une mission tirée ne change plus de la journée. |
| D4 | **Promeneurs sur les chemins** | De petits personnages marchent sur les chemins : ils arrivent par la route, passent le pont, longent les enclos, s'arrêtent devant les animaux, vont au café. **Leur nombre suit les visiteurs par heure** (au plus 12 à l'écran, 8 sur téléphone) ; **moins la nuit** (presque personne entre 22 h et 6 h). **Modèles** : soit des personnages **Quaternius** animés (CC0, plus jolis, il faut que tu télécharges un pack comme pour les animaux), soit de **petits bonshommes simples** dessinés par le jeu (rien à télécharger). Proposition : **Quaternius**, avec les bonshommes simples en secours si le pack ne convient pas. |
| D5 | **Visiteurs la nuit (règles)** | Aujourd'hui, la simulation fait venir **autant de visiteurs la nuit que le jour**. Proposition : **garder ainsi** dans les règles (l'absence reste rentable, c'est simple), et ne réduire que les promeneurs **affichés** la nuit. Autre choix possible : moins de visiteurs la nuit, compensé par l'auberge (la spec parle de « revenu de nuit ») — plus réaliste, mais il faudra rééquilibrer. |
| D6 | **Brume des zones fermées** | Des **nappes de brume blanche** qui dérivent lentement au-dessus de la forêt et de la montagne tant qu'elles sont fermées, avec un panneau « **Bois sombre** · s'ouvre au Village » et « **Falaises** · s'ouvre au Bourg ». Au passage de niveau, la brume **se dissipe en 3 secondes** et le vrai nom de la zone apparaît. |
| D7 | **La nuit** | **Lanternes** (chemins pavés du Bourg) et **fenêtres des maisons** qui s'allument au crépuscule ; **étoiles et lune** dans le ciel ; les animaux **bougent moins** la nuit (ils marchent moins souvent, restent couchés plus longtemps). Passage du jour à la nuit en douceur. |
| D9 | **Le « ! » doré** *(demande et choix de Romain, 17/11, précisé le même soir)* | Défaut actuel : un clic sur l'endroit marqué renvoie le « ! » sur la mairie. Le « ! » **reste au-dessus de l'endroit de la mission tant qu'elle n'est pas faite** ; un clic sur la mission emmène la caméra jusqu'à lui (tâche 12). |
| D10 | **Informations des bâtiments** *(demande et choix de Romain, 17/11)* | Clic sur un bâtiment, la mairie ou une maison → sa fiche (tâche 13). |
| D11 | **Son** *(demande de Romain, 17/11 ; proposition à valider)* | Musique calme folk/pastorale + ambiance nature, effets doux ; volumes **Musique** et **Effets** séparés, avec **Couper**, dans le volet Options ; fichiers CC0 choisis et téléchargés par Romain (tâches 14 et 15). |
| D8 | **Petit défaut gardé** : premier pas « Ouvre la fiche de l'enclos des moutons » | N'importe quelle fiche d'enclos le valide. Proposition : **laisser ainsi** (au début, il n'y a qu'un enclos ; une ancienne partie peut ne plus avoir de moutons). |

## Contraintes globales

- Tous les chiffres nouveaux dans `src/data/` (y compris ceux encore en dur repérés aux étapes 4 et 5, comme la position de la mairie dans `decor.ts`).
- La simulation reste pure ; les promeneurs, la brume et la nuit n'entrent pas dans `GameState`.
- Sauvegarde : si les quotidiennes doivent retenir leur cible et leur récompense, on passe en **version 4** avec une migration écrite en clair et testée (une partie v3 se charge sans rien perdre, ses quotidiennes du jour restent valables).
- Téléphone : barre du bas ≤ 48 px, volets ≤ 40 % de la hauteur, aucune ligne coupée illisible, au moins **30 images/s** sur un téléphone moyen avec un grand parc.
- Rattrapage de 30 jours d'absence **< 2 s** avec un grand parc (≈ 150 animaux, 15 enclos).
- Textes visibles en français ; noms d'animaux en texte seulement (jamais en HTML).

## Points de vigilance

1. **Ancienne partie de Romain** (v3 en ligne) : elle doit se charger sans rien perdre, avec ses quotidiennes du jour. → test de migration (tâche 4) + essai à la main (tâche 11).
2. **Recommencer à zéro** ne doit jamais se déclencher par un seul clic, ni par un double-clic rapide (même piège que la vente à l'étape 4). Un autre onglet ouvert ne doit pas réécrire l'ancienne partie par-dessus la nouvelle. → tests (tâche 1).
3. **Quotidiennes impossibles ou absurdes** : un parc vide (0 visiteur/h) ou énorme doit donner des cibles raisonnables (bornes mini et maxi). → tests (tâche 4).
4. **Équilibrage** : changer un chiffre peut casser un test existant ou les premiers pas (« les récompenses suffisent pour café + enclos + cochons »). → le joueur automatique et les tests des premiers pas tournent après chaque réglage (tâche 5).
5. **Perfs d'affichage** : promeneurs, brume et lumières de nuit ajoutent du travail à chaque image ; on mesure avant et après (compteur d'images dans `?debug`, tâche 2), surtout en mode téléphone.

---

### Task 1 : Bouton « Recommencer à zéro » — *agent · Sonnet*

**Fichiers :**
- Créer : `src/ui/optionsPanel.ts`
- Modifier : `src/ui/topBar.ts` (roue ⚙), `src/game/runGame.ts` (sortir la remise à zéro de `mountDebugPanel` dans une fonction `restartGame()` partagée par le panneau de test et le volet Options), `src/style.css`
- Test : `tests/game/restart.test.ts`

**Interfaces :**
- `restartGame()` : garde une copie de la partie actuelle (`RESET_BACKUP_KEY`), remet le décalage de test à 0, crée une nouvelle partie (`newGame` + `utcOffsetMin` local, comme `freshGame` de `session.ts`), sauvegarde, et remet l'affichage à neuf (sélection, volets, bannière, Gazette oubliée).
- Volet Options : bouton **Recommencer à zéro** en deux clics (comme la vente : le second clic n'est accepté qu'après 400 ms ; le bouton revient à l'état normal si on ferme le volet), texte « Tout ton parc sera effacé ».

- [ ] **Étape 1 : écrire les tests qui échouent** — après `restartGame` : pièces de départ, un enclos, deux moutons, premiers pas à l'étape 0, la copie de secours contient l'ancienne partie ; deux clics trop rapprochés n'effacent rien.
- [ ] **Étape 2 : `npm test`** → ÉCHEC.
- [ ] **Étape 3 : implémenter.**
- [ ] **Étape 4 : `npm test`, `npm run build`** → réussis.
- [ ] **Étape 5 : vérifier à la main (chef)** — roue ⚙ visible sur ordinateur et téléphone, deux clics, nouvelle partie, rechargement → c'est bien la nouvelle partie.
- [ ] **Étape 6 : commit** — `Options : bouton « Recommencer à zéro »`

### Task 2 : Perfs de la simulation et compteur d'images — *agent · Sonnet*

**Fichiers :**
- Modifier : `src/sim/happiness.ts`, `src/sim/breeding.ts`, `src/sim/feeding.ts`, `src/sim/economy.ts`, `src/sim/advance.ts` (regrouper une fois par pas les animaux par enclos et par espèce au lieu de chercher dans toute la liste pour chaque animal), `src/ui/debugPanel.ts` (compteur d'images par seconde ; `JSON.stringify` seulement quand on ouvre l'export)
- Test : `tests/sim/perf.test.ts`, `tests/sim/helpers.ts` (fabrique d'un grand parc)

**Interfaces :**
- `bigPark(): GameState` dans les aides de test : 15 enclos, ≈ 150 animaux des 10 espèces, garde-manger plein.
- Aucune règle ne change : les tests existants doivent repasser à l'identique (mêmes graines → mêmes résultats).

- [ ] **Étape 1 : écrire le test qui échoue** — 30 jours de rattrapage sur `bigPark()` en moins de 2 s.
- [ ] **Étape 2 : `npm test`** → ÉCHEC (ou réussite trop juste : noter le temps avant).
- [ ] **Étape 3 : implémenter.**
- [ ] **Étape 4 : `npm test`** → réussi, temps noté avant/après dans le message de commit.
- [ ] **Étape 5 : commit** — `Simulation plus rapide avec un grand parc`

### Task 3 : Joueur automatique et rapport d'équilibrage — *agent · Sonnet*

**Fichiers :**
- Créer : `tests/balance/bot.ts`, `tests/balance/playthrough.test.ts`

**Interfaces :**
- `playBot(opts: { seed: number; days: number; visitsPerDay: number }): Timeline` — joue avec les vraies règles : à chaque visite, il récupère les missions, garde le garde-manger à plus d'un jour, nettoie les enclos sales, soigne, règle le billet au prix juste, construit et améliore quand il peut, pose des enclos et achète les espèces qui manquent, vend le surplus quand un enclos est plein, passe au niveau suivant dès que possible ; entre deux visites, il laisse le temps passer (`advanceTo`).
- `Timeline` : jour et heure de chaque passage de niveau, des 3 / 5 / 10 espèces, des 150 et 250 habitants, de la fin de l'histoire ; pièces, habitants, visiteurs/h et animaux chaque jour ; morts éventuelles.
- Le test imprime un petit tableau lisible (pour le chef et Romain) et vérifie seulement des **bornes larges** (fourchettes de la décision D2, réglées en tâche 5) : pas de mort avec un joueur attentif, niveau 2 atteint, fin de V1 atteinte en moins de 40 jours.

- [ ] **Étape 1 : écrire le joueur et le test** (bornes très larges au départ).
- [ ] **Étape 2 : `npm test`** → réussi ; joindre le tableau du rythme **actuel** (3 graines, 2 et 3 visites par jour) au compte rendu.
- [ ] **Étape 3 : commit** — `Équilibrage : joueur automatique et rapport de rythme`

### Task 4 : Missions du jour qui grandissent avec le parc — *agent · Sonnet*

**Fichiers :**
- Modifier : `src/data/missions.ts` (`DAILY_POOL` : chaque quotidienne dit sur quoi se règle sa cible et sa récompense), `src/sim/missions.ts` (`drawDaily`, `dailyDef`), `src/sim/types.ts`, `src/save/migrations.ts` et `src/save/save.ts` si la version change, `src/sim/economy.ts` (exposer l'estimation de visiteurs/h et de recettes/h si elle n'existe pas déjà)
- Test : `tests/sim/daily.test.ts`, `tests/save/migrations.test.ts`

**Interfaces :**
- `parkPace(state): { visitorsPerH: number; coinsPerH: number; rationsPerDay: number; enclosures: number; animals: number }` — l'état du parc au moment du tirage.
- Chaque entrée de `DAILY_POOL` gagne `target(p: ParkPace): number` et `reward(p: ParkPace, n: number): Reward` (règles de la décision D3, bornées et arrondies à un chiffre « rond ») ; les anciens `scale` / `targetScale` disparaissent.
- La cible et la récompense **tirées** sont gardées avec la mission (`MissionProgress` gagne `n?` et `reward?`) ; l'ancien format « quot-pieces#2 » reste lu tel quel (missions du jour d'une partie v3).

- [ ] **Étape 1 : écrire les tests qui échouent** — parc de départ → cibles proches d'aujourd'hui (nettoyer 2, ~50 visiteurs, 30 rations) ; `bigPark()` → rations ≥ 150, visiteurs et pièces bien plus hauts, récompense plus haute ; parc à 0 visiteur/h → cibles minimales, jamais 0 ; la cible ne change pas dans la journée même si le parc grandit ; une partie v3 avec des quotidiennes « #2 » se charge et ses missions restent valables ; même graine → même tirage.
- [ ] **Étape 2 : `npm test`** → ÉCHEC.
- [ ] **Étape 3 : implémenter.**
- [ ] **Étape 4 : `npm test`** → réussi (le joueur automatique aussi).
- [ ] **Étape 5 : commit** — `Missions du jour réglées sur l'avancement du parc`

### Task 5 : Réglage de l'équilibre — *chef (Opus) avec Romain, puis agent · Sonnet*

- [ ] **Étape 1 (chef) :** lire le rapport du joueur automatique, comparer au rythme de la décision D2, proposer à Romain **2 ou 3 changements de chiffres** expliqués simplement (ex. « le Bourg arrive au jour 15 : je propose 3 visiteurs de plus par point d'attrait »).
- [ ] **Étape 2 (agent Sonnet) :** appliquer les chiffres validés dans `src/data/` ; ajuster les tests qui dépendaient des anciens chiffres (en expliquant chaque changement) ; resserrer les bornes du test de rythme sur la décision D2.
- [ ] **Étape 3 :** `npm test` → réussi ; tableau du nouveau rythme dans le compte rendu.
- [ ] **Étape 4 : commit** — `Équilibrage de la V1 : <résumé des chiffres>`

### Task 6 : Brume des zones fermées — *agent · Sonnet*

**Fichiers :**
- Modifier : `src/scene/zonesView.ts` (nappes de brume, panneaux, dissipation), `src/data/zones.ts` (nom caché de chaque zone : « Bois sombre », « Falaises »), `src/main.ts` (mise à jour à chaque image)
- Test : `tests/scene/fog.test.ts` (la partie calculable : opacité pendant la dissipation, nom affiché selon le niveau)

**Interfaces :**
- `createZonesView(world)` gagne `update(dt)` ; `setLevel(level)` lance la dissipation (3 s) quand une zone s'ouvre pendant la partie, et l'affiche directement ouverte au chargement.
- Brume : quelques grands panneaux semi-transparents à texture douce qui dérivent lentement (pas de calcul lourd ; ≤ 12 panneaux en tout).

- [ ] **Étape 1 : écrire les tests qui échouent.**
- [ ] **Étape 2 : `npm test`** → ÉCHEC.
- [ ] **Étape 3 : implémenter.**
- [ ] **Étape 4 : `npm test`, `npm run build`** → réussis.
- [ ] **Étape 5 : vérifier à la main (chef)** — de jour et de nuit, sur ordinateur et téléphone ; passage au Village avec `?debug` → la brume se dissipe.
- [ ] **Étape 6 : commit** — `Brume sur les zones fermées, dissipée au passage de niveau`

### Task 7 : Modèles des promeneurs — *agent · Haiku* (seulement si Romain choisit Quaternius en D4)

- [ ] **Étape 1 (chef) :** donner à Romain le lien du pack de personnages Quaternius (CC0) et lui demander de le déposer dans `_telechargements/`.
- [ ] **Étape 2 (agent Haiku) :** vérifier la licence, copier 4 à 6 personnages variés dans `public/models/visiteurs/`, les ajouter à `src/assets/manifest.ts` et à `CREDITS.md`, noter le nom de leurs animations (marche, attente).
- [ ] **Étape 3 :** `npm test` (test du manifeste) → réussi ; commit — `Modèles des promeneurs (Quaternius, CC0)`

### Task 8 : Promeneurs sur les chemins — *agent · Sonnet*

**Fichiers :**
- Créer : `src/scene/visitorsView.ts`, `src/scene/visitorRoutes.ts` (trajets : route → pont → allée du zoo → arrêts devant les enclos → place du village → café → retour)
- Modifier : `src/data/tuning.ts` ou un nouveau `src/data/visuals.ts` (nombre maxi, vitesse, heures creuses), `src/main.ts`
- Test : `tests/scene/visitorRoutes.test.ts` (trajets toujours sur les chemins, jamais dans la rivière ni dans un enclos ; nombre affiché selon visiteurs/h, l'heure et l'appareil)

**Interfaces :**
- `visitorsShown(visitorsPerH, hour, mobile): number` — fonction pure (décision D4).
- `createVisitorsView(world, getState)` : `update(dt)` ; fait apparaître et disparaître les promeneurs en douceur au bout de la route ; un promeneur s'arrête quelques secondes devant un enclos occupé, se tourne vers lui, repart. Si les modèles ne sont pas encore chargés, rien ne s'affiche (pas d'erreur).

- [ ] **Étape 1 : écrire les tests qui échouent.**
- [ ] **Étape 2 : `npm test`** → ÉCHEC.
- [ ] **Étape 3 : implémenter.**
- [ ] **Étape 4 : `npm test`, `npm run build`** → réussis.
- [ ] **Étape 5 : vérifier à la main (chef)** — promeneurs sur le pont et devant les enclos, aucun qui traverse une clôture ou l'eau, moins la nuit (`?heure=23`), images par seconde avant/après.
- [ ] **Étape 6 : commit** — `Des promeneurs sur les chemins`

### Task 9 : La nuit — *agent · Sonnet*

**Fichiers :**
- Modifier : `src/scene/sun.ts` (quantité de nuit 0..1, fonction pure), `src/scene/world.ts` (étoiles et lune), `src/scene/path.ts` (lanternes qui s'allument), `src/scene/villageView.ts` et `src/scene/decor.ts` (fenêtres allumées), `src/scene/animalActor.ts` / `src/scene/wander.ts` (moins de mouvement la nuit)
- Test : `tests/scene/sun.test.ts`, `tests/scene/wander.test.ts`

**Interfaces :**
- `nightAmount(hour): number` — 0 en plein jour, 1 en pleine nuit, transition douce au crépuscule et à l'aube.
- Lumières : matériaux qui brillent (émissifs) plutôt que de vraies lampes, pour rester léger sur téléphone ; au plus 2 ou 3 vraies lumières en tout.

- [ ] **Étape 1 : écrire les tests qui échouent** — `nightAmount` à 12 h, 19 h, 23 h, 6 h ; un animal la nuit fait des pauses plus longues.
- [ ] **Étape 2 : `npm test`** → ÉCHEC.
- [ ] **Étape 3 : implémenter.**
- [ ] **Étape 4 : `npm test`, `npm run build`** → réussis.
- [ ] **Étape 5 : vérifier à la main (chef)** — `?heure=12`, `19`, `23`, `6` sur ordinateur et téléphone ; captures pour Romain.
- [ ] **Étape 6 : commit** — `La nuit : lanternes, fenêtres, étoiles, animaux plus calmes`

### Task 10 : Téléphone, perfs d'affichage et petits défauts gardés — *agent · Sonnet*

**Fichiers :** selon les points ; principalement `src/ui/bottomBar.ts`, `src/ui/buildingBar.ts`, `src/ui/gazette.ts`, `src/ui/merchantPanel.ts`, `src/scene/world.ts`, `src/scene/decor.ts`, `src/data/`, `vite.config.ts`, `src/style.css`

**À faire :**
- **Téléphone** : avec un bâtiment sélectionné **et** une mission réussie, le titre de la mission ne doit plus devenir minuscule (le raccourcir proprement ou n'afficher que « Récupérer ») ; les 8 icônes de la ferme tiennent sans défiler dans 110 px (deux rangées ou icônes plus petites) ; tous les boutons font au moins 40 px de côté au doigt.
- **Perfs d'affichage** : ombres moins fines et image un peu moins dense sur téléphone (`setPixelRatio` ≤ 1,5, ombres 1024) ; Three.js dans un fichier séparé du reste du code (fin de l'avertissement de taille du paquet).
- **Gazette** : fermer le volet ouvert avant de l'afficher.
- **Marchand** : cocher « Utiliser mon bon » ne reconstruit plus tout le volet (plus de bouton Acheter inactif 400 ms) ; les cases se décochent après un achat.
- **Chiffres en dur** restants hors de `src/data/` (position de la mairie dans `decor.ts`, etc.) : les déplacer dans `src/data/`.

- [ ] **Étape 1 : écrire les tests qui échouent** quand c'est calculable (ex. réglages selon l'appareil, chiffres déplacés).
- [ ] **Étape 2 : implémenter.**
- [ ] **Étape 3 : `npm test`, `npm run build`** → réussis, **sans** avertissement de taille.
- [ ] **Étape 4 : vérifier à la main (chef)** — mode téléphone (375 × 812) : barre du bas, ferme, marchand avec un bon, Gazette par-dessus un volet ; images par seconde avec `bigPark()` collé via `?debug`.
- [ ] **Étape 5 : commit** — `Finition téléphone, perfs d'affichage et petits défauts`

### Task 12 : Le « ! » doré mène à la mission — *agent · Sonnet* (demande de Romain, 17/11 ; faite avant la tâche 11)

**Choix de Romain :** « les deux », précisé ensuite : *« ajd quand je click sur le symbole !, il se remet sur la mairie et ce n'est pas le but »*.
- Le « ! » **reste au-dessus de l'endroit de la mission tant qu'elle n'est pas réussie**, même quand le joueur a cliqué ou sélectionné cet endroit (aujourd'hui il retourne sur la mairie : c'est le défaut à corriger). Une fois la mission réussie, il passe à la prochaine chose à faire (ou sur la mairie quand Margaux a une nouvelle mission non lue).
- Un clic sur la mission (zone mission de la barre du bas, ou titre de la mission dans le volet Missions) **fait glisser la caméra** jusqu'au « ! » (en douceur, ~0,8 s), sans changer le zoom plus que nécessaire ; s'il n'y a pas de « ! », rien ne bouge.

**Fichiers :** `src/ui/missionModel.ts` (`markerPosition` garde la cible même quand elle est sélectionnée), `src/scene/decor.ts`, `src/scene/cameraRig.ts` (`focusOn(x, z)`), `src/ui/bottomBar.ts`, `src/ui/missionPanel.ts`, `src/main.ts`
**Test :** `tests/ui/missionModel.test.ts`, `tests/scene/cameraRig.test.ts`

- [ ] **Étape 1 : écrire les tests qui échouent** — cible sélectionnée → le « ! » reste au-dessus de la cible ; mission réussie → il passe à la suivante ; nouvelle mission non lue sans cible → mairie ; `focusOn` amène le point visé au centre en restant dans les bornes de la caméra.
- [ ] **Étape 2 : `npm test`** → ÉCHEC.
- [ ] **Étape 3 : implémenter.**
- [ ] **Étape 4 : `npm test`, `npm run build`** → réussis.
- [ ] **Étape 5 : vérifier à la main (chef)** — premiers pas : clic sur la mission → la caméra va au « ! » ; clic sur l'enclos ou la ferme → le « ! » reste dessus jusqu'à la réussite ; ordinateur et téléphone.
- [ ] **Étape 6 : commit** — `Le « ! » reste sur l'endroit de la mission et la caméra peut y aller`

### Task 13 : Informations d'un bâtiment au clic — *agent · Sonnet* (demande de Romain, 17/11 ; faite avant la tâche 11)

**Choix de Romain :** bâtiments, mairie **et** maisons.
- **Ferme, café, boutique, auberge** : nom, niveau (n/3), à quoi il sert (une phrase), ce qu'il rapporte par heure en ce moment, clients par heure et maximum, prix de l'amélioration suivante (ou « niveau maximum »). Les actions existantes (améliorer, rations…) restent dans la barre du bas.
- **Mairie** : « Mairie de Clairbois — Margaux, la maire », niveau du village et son nom, habitants, ce qu'il manque pour le niveau suivant (habitants et mission), bouton vers le volet du village.
- **Maisons et décors du village** : une petite phrase (« Maison d'habitant », « Puits », « Étal du marché »…), sans action.
- S'affiche dans le volet de la barre du bas, comme les autres fiches ; textes et chiffres dans `src/data/`.

**Fichiers :** `src/scene/picking.ts` (mairie et maisons cliquables), `src/scene/decor.ts` / `src/scene/villageView.ts` (noms des objets), `src/data/` (phrases), créer `src/ui/buildingInfo.ts` (+ modèle pur testable), `src/ui/bottomBar.ts`, `src/ui/buildingBar.ts`
**Test :** `tests/ui/buildingInfo.test.ts` (textes et chiffres de la fiche pour chaque bâtiment et la mairie)

- [ ] **Étape 1 : écrire les tests qui échouent.**
- [ ] **Étape 2 : `npm test`** → ÉCHEC.
- [ ] **Étape 3 : implémenter.**
- [ ] **Étape 4 : `npm test`, `npm run build`** → réussis.
- [ ] **Étape 5 : vérifier à la main (chef)** — clic sur chaque bâtiment, la mairie et quelques maisons ; téléphone (volet ≤ 40 % de la hauteur).
- [ ] **Étape 6 : commit** — `Informations des bâtiments au clic`

### Task 14 : Choix et téléchargement des sons — *chef (Opus) avec Romain, puis agent · Haiku* (demande de Romain, 17/11 ; avant la tâche 11)

- [ ] **Étape 1 (chef) :** proposer à Romain une courte liste de sons **CC0 uniquement** (OpenGameArt et Freesound filtrés CC0) avec leurs liens : 1 musique calme folk/pastorale (guitare, flûte, cordes douces) qui boucle, sa variante plus douce pour la nuit si elle existe, une ambiance nature (oiseaux le jour, grillons la nuit, rivière), et 5 effets courts (clic de bois, tintement de pièces, cloche de mission réussie, construction, petit cri d'animal). Romain écoute, choisit et télécharge dans `_telechargements/sons/`.
- [ ] **Étape 2 (agent Haiku) :** vérifier la licence de chaque fichier, convertir ou garder en `.ogg`/`.mp3` léger (musique ≤ 1,5 Mo, effet ≤ 50 Ko), copier dans `public/sons/`, lister dans `src/assets/manifest.ts` et `CREDITS.md`.
- [ ] **Étape 3 :** `npm test` → réussi ; commit — `Sons d'ambiance et effets (CC0)`

### Task 15 : Musique, ambiance et effets, avec leurs réglages — *agent · Sonnet* (demande de Romain, 17/11 ; avant la tâche 11)

**Proposition (D11, à valider avec Romain) :**
- Dans le volet **Options** (roue ⚙) : deux réglages séparés, **Musique** et **Effets**, chacun avec un curseur de volume et un bouton **Couper**. Réglages gardés dans le navigateur (`localStorage`), hors de la sauvegarde de partie. Volume de départ bas : musique ≈ 40 %, effets ≈ 70 %.
- Musique en boucle, plus douce la nuit ; ambiance nature discrète (oiseaux le jour, grillons la nuit) réglée avec la musique.
- Effets : clic de bois à la sélection d'un enclos ou d'un bâtiment, tintement de pièces (Récupérer, ventes), cloche quand une mission est réussie, son de construction, petit cri quand on touche un animal.
- Le navigateur bloque le son avant le premier toucher : la musique démarre au premier clic. Son coupé quand l'onglet est caché.

**Fichiers :** créer `src/audio/sound.ts` (lecture, volumes, mise en sourdine, fondu jour/nuit) et `src/audio/settings.ts` (réglages purs + `localStorage` protégé par try/catch) ; modifier `src/ui/optionsPanel.ts`, `src/game/runGame.ts` (effets sur les actions réussies), `src/main.ts`, `src/data/` (volumes de départ, noms des fichiers)
**Test :** `tests/audio/settings.test.ts` (volumes bornés 0..1, couper/rétablir garde le volume, lecture d'un réglage illisible → valeurs par défaut)

- [ ] **Étape 1 : écrire les tests qui échouent.**
- [ ] **Étape 2 : `npm test`** → ÉCHEC.
- [ ] **Étape 3 : implémenter.**
- [ ] **Étape 4 : `npm test`, `npm run build`** → réussis.
- [ ] **Étape 5 : vérifier à la main (chef)** — premier clic → musique ; curseurs et Couper ; réglages gardés après rechargement ; jour/nuit ; onglet caché → silence ; téléphone.
- [ ] **Étape 6 : commit** — `Musique d'ambiance et effets sonores, réglables dans les Options`

### Task 11 : Vérification d'ensemble, relecture et publication — *chef (Opus) + relecture · Opus*

- [ ] **Étape 1 :** `npm test`, `npm run build` → réussis.
- [ ] **Étape 2 :** à la main, sans `?debug`, panneau du navigateur **visible** : nouvelle partie et premiers pas, avec le « ! » doré qui se déplace au-dessus de chaque cible (pas encore vu à l'œil) ; achats à la ferme (rations, amélioration, garde-manger — jamais essayés à la main) ; quotidiennes d'un petit et d'un grand parc ; brume, promeneurs, nuit ; Recommencer à zéro ; coller une sauvegarde v3 → tout est conservé ; mode téléphone.
- [ ] **Étape 3 (chef → Romain) :** donner à Romain la liste des **textes des habitants** (premiers pas, histoire, quotidiennes) pour qu'il les relise ; corriger ceux qu'il veut changer.
- [ ] **Étape 4 :** relecture indépendante de la branche (agent Opus) → corrections (Sonnet, Opus si subtil), un commit.
- [ ] **Étape 5 :** fusion dans `main` **après accord de Romain** ; vérifier https://romsantic.github.io/parc-de-clairbois/ (et sur le téléphone de Romain) ; mettre `progress.md` à jour : **V1 terminée**, réglages retenus, ce qui reste pour la V2.
