# Le Parc de Clairbois — où on en est

*Mis à jour le 19/11/2026. Ce fichier sert de point de départ à chaque nouvelle session de travail : le lire en premier.*

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
| 5 | Interface des missions (barre, volet, bannière, mise en évidence, autonomie) | agent · Sonnet | faite (254aedd + 8adca8f) — vérifiée dans le navigateur (premiers pas, Passer, quotidiennes, refus du village, sauvegarde v2, téléphone) |
| 6 | La Gazette de Clairbois (résumé d'absence) | agent · Sonnet | faite (48707f3 + a6add65) — vérifiée dans le navigateur (absence de 5 jours) — 462 tests |
| 7 | Vérification d'ensemble, relecture et publication | chef (Opus) + relecture · Opus | faite — relecture et corrections (6ceae07, 2af73bf), 493 tests — **fusionnée dans `main` (b3e7bd4) avec l'accord de Romain le 17/11/2026, publiée et vérifiée en ligne** |

**Sous-tâche 7 (17/11/2026)** — relecture Opus : 0 critique, 5 importants, quelques mineurs, tous corrigés en 6ceae07 (enclos de départ un peu sale pour que « Nettoie l'enclos » marche tout de suite ; Gazette aussi quand l'onglet est repris sans rechargement ; validation complète des sauvegardes v3 ; minuit qui ne recule pas ; quotidiennes versées d'office signalées « (récompense versée) » ; seuils d'autonomie dans `TUNING`). Deux nouveaux choix de Romain en 2af73bf : missions d'habitants **150** (porte du Bourg) et **250** (finale V1) ; bon −25 % **au choix** (case « Utiliser mon bon » par offre). Vérifié dans le navigateur (en lisant la page, panneau masqué) : les 9 premiers pas, Passer, quotidiennes, refus du village, sauvegarde v2, Gazette après 5 jours, bon de réduction, téléphone. Pas vu à l'œil : le « ! » doré qui se déplace sur la carte.

**V1 — étape 6 : finition** (branche `etape-6-finition`, fusionnée et supprimée ; plan `docs/superpowers/plans/2026-11-17-etape-6-finition-v1.md`) — **plan écrit et validé par Romain le 17/11/2026** (décisions D1 à D8 acceptées telles quelles, promeneurs Quaternius)

| # | Sous-tâche | Agent · modèle | État |
|---|---|---|---|
| 1 | Bouton « Recommencer à zéro » (volet Options ⚙) | agent · Sonnet | faite (a95b961 → d07ba25) — relue, vérifiée dans le navigateur (ordinateur et téléphone, double-clic rapide ignoré) — 502 tests |
| 2 | Perfs de la simulation (grand parc, 30 jours < 2 s) et compteur d'images | agent · Sonnet | faite (2961545 + f0ad802) — 30 jours d'absence d'un grand parc : 2–3 s → ≈ 1 s ; `bigPark()` réaliste et `crowdedPark()` de stress — 507 tests |
| 3 | Joueur automatique et rapport d'équilibrage | agent · Sonnet | faite (a1590a3 + 18de4b1) — relu ; rythme actuel : Village jour 3, Bourg jour 5, fin de la V1 jour 6 à 10 (cible 21), 100 000 pièces au jour 5 : économie trop généreuse (réglage en sous-tâche 5) — 514 tests |
| 4 | Missions du jour qui grandissent avec le parc | agent · Sonnet | faite (6385362) — relue ; cibles ≈ 3 h d'activité / ½ journée de rations / nombre d'enclos, récompense ≈ 1 h de recettes ; pas de sauvegarde v4 (champs facultatifs, anciennes quotidiennes lues) — 535 tests |
| 5 | Réglage de l'équilibre (chiffres choisis avec Romain) | chef (Opus) + agent · Sonnet | faite (e73f700 + 2bd7df7) — choix de Romain « B + recettes réduites » : habitants 1 pour 30 clients jusqu'à 2 400 puis 1 pour 350, Village à 40 habitants, prix juste 2 + 1/niveau + 0,05/attrait, commerces ×½ ; joueur automatique : Village jour 2-3, Bourg 6-7, fin 18-19 ; ancienne partie : billet remis au prix juste au chargement — 541 tests |
| 6 | Brume des zones fermées | agent · Sonnet | faite (76ded49 + d372414) — relue, vue dans le navigateur (panneaux « Bois sombre » / « Falaises » entiers, forêt ouverte au Village) ; dissipation pas vue en mouvement (panneau masqué) — 549 tests |
| 7 | Modèles des promeneurs (6 personnages Quaternius choisis par Romain) | agent · Sonnet (au lieu de Haiku : il faut alléger les fichiers par un petit script) | faite (7fe7da5) — 6 fichiers .glb de 1,1 à 1,25 Mo (au lieu de 3 Mo), marche + attente seulement, crédits ajoutés — 555 tests |
| 8 | Promeneurs sur les chemins | agent · Sonnet | faite (5815498 + 88a482e) — relue ; chargés en arrière-plan après l'ouverture du parc, sur le tablier du pont, moins nombreux la nuit ; vus marcher dans le navigateur (allée, pont, village) — 570 tests |
| 9 | La nuit (lanternes, fenêtres, étoiles, animaux calmes) | agent · Sonnet | faite (3fc7011 + 28644c6) — relue, vue dans le navigateur à 23 h (lune, étoiles près de l'horizon, fenêtres allumées) ; la caméra peut s'incliner un peu plus vers l'horizon — 575+ tests |
| 10 | Téléphone, perfs d'affichage et petits défauts gardés | agent · Sonnet | faite (ba4fc92) — relue, vue en 375×812 : avec une sélection, la barre du bas passe sur 3 lignes lisibles (~145 px) ; image allégée sur téléphone ; three.js dans un fichier à part ; Gazette et bon du marchand corrigés — 624 tests |
| 12 | Le « ! » doré reste sur l'endroit de la mission tant qu'elle n'est pas faite (aujourd'hui il revient sur la mairie quand on clique) ; clic sur la mission → caméra jusqu'au « ! » (demande de Romain) | agent · Sonnet | faite (8e9e9e1) — relue, vérifiée dans le navigateur (la caméra glisse jusqu'au « ! », qui reste sur l'enclos sélectionné) ; reste la hauteur de la bannière « Nouvelle mission » (à corriger à la fin) — 629 tests |
| 13 | Informations d'un bâtiment, de la mairie ou d'une maison au clic (demande de Romain) | agent · Sonnet | faite (a858625) — relue, vérifiée dans le navigateur (mairie, maison, ferme) — 640 tests |
| 14 | Choix des sons CC0 avec Romain (il télécharge), copie et crédits (demande de Romain) | chef (Opus) + agent · Sonnet (conversion des fichiers) | faite (8e5d31c) — 14 sons en mp3 (2,1 Mo en tout), crédits ; à écouter par Romain (clic, pièces, mission ; le « loup » est un aboiement faute de hurlement CC0) — 595 tests |
| 15 | Musique, ambiance et effets ; volumes Musique / Effets et Couper dans les Options (demande de Romain) | agent · Sonnet | faite (388cfdc + 63be383) — relue ; vérifiée dans le navigateur (volet, Couper/Remettre, réglages gardés, seuls les sons utiles chargés) ; **pas écoutée** (à faire par Romain) — 620 tests |
| 11 | *(après 12 à 15)* Vérification d'ensemble, textes relus par Romain, relecture et publication | chef (Opus) + relecture · Opus | relecture finale faite (Opus : 0 critique, 4 importants corrigés en e546f54) + choix de Romain en d28cd82 (billet jamais changé tout seul ; 2 textes de Margaux réécrits) — 646 tests ; **fusionnée dans `main` (be2455a) avec l'accord de Romain le 18/11/2026, publiée et vérifiée en ligne** |

**V2 — « Le village s'éveille »** — conception écrite avec Romain (questions et votes) et **validée le 19/11/2026** : `docs/superpowers/specs/2026-11-19-parc-de-clairbois-v2-design.md` (source de vérité de la V2, complète celle de la V1). Personnel obligatoire (5 métiers), 4 maladies soignées seulement au centre vétérinaire, ferme qui produit, chemins à construire, confort et satisfaction des visiteurs, niveaux 4–6 (étang, forêt profonde, haute montagne), ~20 espèces d'Europe, marchand itinérant, trophées. Rythme : niveaux 1–3 ≈ 18 jours, puis ≈ 1 mois pour 4–6 ; un parc bien tenu tient 3 jours sans le joueur.

| Étape V2 | Contenu | État |
|---|---|---|
| 1 | Chemins à construire | ✅ fusionnée dans `main` (4935132) avec l'accord de Romain le 19/11/2026, publiée et vérifiée en ligne |
| 2 | Personnel et maison du personnel | plan prêt et voté (branche `etape-v2-2-personnel`) — ✅ fusionnée dans `main` (9ccfb50) avec l'accord de Romain le 19/11/2026, publiée et vérifiée en ligne |
| 3 | Maladies et centre vétérinaire | plan prêt et voté (branche `etape-v2-3-maladies`) |
| 4 | Ferme qui produit (parcelles, fermier, grange) | plan prêt et voté (branche `etape-v2-4-ferme`) |
| 5 | Confort, décoration, déchets, satisfaction, animateur | plan prêt et voté (branche `etape-v2-5-confort`) |
| 6 | Niveaux 4–6, carte agrandie, espèces, potager, restaurant, marchand itinérant | plan prêt et voté (branche `etape-v2-6-niveaux-especes`) |
| 7 | Trophées, musée, équilibrage, finition | plan prêt et voté (branche `etape-v2-7-trophees`) |

**Préparation des étapes 2 à 7 (19/11/2026, pendant l'étape 1)** — Romain a voté les détails de chaque étape (§12 de la conception V2, 21 espèces choisies, CC-BY accepté pour ours, lynx, bison, élan et une fontaine) et validé la maquette de l'interface V2 (`docs/maquettes/v2-interface.png`). Les plans `docs/superpowers/plans/2026-11-19-v2-etape-{2..7}-*.md` sont écrits, avec les votes en tête. Chaque étape a sa branche `etape-v2-N-…`, partie de `plans-v2` (conception + plans + maquette, **aucun code**). **Au lancement d'une étape** : fusionner `main` (avec les étapes précédentes) dans sa branche, puis revérifier le tableau « ce qu'on attend des étapes précédentes » en tête du plan avant de coder. Emplacements de village réservés : 6 maison du personnel, 7 centre vétérinaire, 8 grange, puis restaurant et musée au prochain numéro libre.

**V2 — étape 1 : chemins à construire** (branche `etape-v2-1-chemins`, plan `docs/superpowers/plans/2026-11-19-v2-etape-1-chemins.md`) — plan écrit et **validé par Romain le 19/11/2026** (décisions D1 à D8 acceptées telles quelles)

| # | Sous-tâche | Agent · modèle | État |
|---|---|---|---|
| 1 | État v4, données et liaison des enclos | agent · Sonnet | faite (4284bc7) — relue (0 critique, 0 important) — 659 tests |
| 2 | Tracer, détruire, relier, chemin offert (règles) | agent · Sonnet | faite (9829e52) — relue (0 critique, 0 important) — 684 tests |
| 3 | Visiteurs, ancienne partie, joueur automatique | agent · Sonnet | faite (8bec3f3 + 521c884) — relue ; joueur automatique : Village jour 3, Bourg 7, fin 18-19 (il laisse des allées de 2,5 m et fait des enclos plus petits : place plus serrée, à regarder avec Romain) — 694 tests |
| 4 | Chemins en 3D et éditeur de tracé | agent · Sonnet | faite (bfa99fa + 6d67385) — relue ; pas encore vue dans le navigateur — 698 tests |
| 5 | Fiches : chemin, enclos non relié | agent · Sonnet | faite (93f9016) — relue (0 critique, 0 important) ; pas encore vue dans le navigateur — 701 tests |
| 6 | Promeneurs sur le réseau réel | agent · Sonnet | faite (4582e62) — relue (0 critique, 0 important) ; pas encore vus marcher dans le navigateur — 707 tests |
| 7 | Vérification d'ensemble, relecture et publication | chef (Opus) + relecture · Opus | vérifiée dans le navigateur (tracé vert/rouge et raisons, fiche chemin, Détruire, Relier, ancienne partie v3 → chemins offerts + message, pavés et lanternes, téléphone) ; relecture finale Opus (0 critique, 3 importants) corrigée en 1c8cdd6, 0304292, d00cb11, f2c7cf7, relue à nouveau (approuvée) — 713 tests ; **fusionnée dans `main` (4935132) avec l'accord de Romain le 19/11/2026, publiée et vérifiée en ligne** |

**Décisions de l'étape V2-1 (en plus de la spec)** : D1–D8 du plan acceptées par Romain. Chemin de l'entrée = allée entrée → pont + rues du village (fixes) ; on ne trace que côté zoo ; relié = chemin à moins de 1 m de la clôture ; 3 pièces/m, non remboursé ; bouton « Relier (N pièces) » ; chemin offert aux anciennes parties (droit, en L, sinon recherche sur grille) avec un message unique. À regarder par Romain : la place plus serrée (il faut laisser des allées entre les enclos), la tolérance du doigt pour toucher un chemin sur téléphone, les promeneurs sur un embranchement (pas vus marcher, panneau masqué). Laissé pour plus tard : couloirs de 2,2 à 3 m que la recherche du chemin offert ne voit pas (l'avis nomme alors les enclos à relier), chargement d'une vieille partie un peu lent sur téléphone (une seule fois).

**V2 — étape 2 : personnel et maison du personnel** (branche `etape-v2-2-personnel`, plan `docs/superpowers/plans/2026-11-19-v2-etape-2-personnel.md`, **voté par Romain le 19/11/2026**, D1–D12) — branche fusionnée et supprimée ; le dossier à part `D:/Claude IA Dossier/parc-clairbois-v2-2` est vide (verrouillé par Windows au moment du rangement, à supprimer)

| # | Sous-tâche | Agent · modèle | État |
|---|---|---|---|
| 1 | État v5, données du personnel, nouvelle partie | agent · Sonnet | faite (d325d6c) — relue (0 critique, 0 important) — 733 tests |
| 2 | Soigneurs et agents : qui suit quoi, effets, affectation | agent · Sonnet | faite (3d4e41d) — relue (0 critique, 0 important) ; joueur automatique rouge jusqu’à la tâche 5 (il n’embauche pas encore) — 750 tests verts + 6 du joueur automatique |
| 3 | Paie, dette, expérience et candidats | agent · Sonnet | faite (cbed073) — relue (0 critique, 0 important) — 764 tests verts + 3 du joueur automatique |
| 4 | Maison du personnel | agent · Sonnet | faite (d8a3d80) — relue (0 critique, 0 important) ; emplacement 6 en (17, −19) ; pas encore vue dans le navigateur — 774 tests verts + 3 du joueur automatique |
| 5 | Actions, dette, ancienne partie, joueur automatique | agent · Sonnet | faite (da2b633) — relue Opus (0 critique, 0 important) ; joueur automatique : Village j2-3, Bourg j5-6, fin j16-17 (avant j3/j7/j18-19), ~460 pièces de salaires/jour en fin — 797 tests |
| 6 | Petits textes du personnel et de la Gazette | agent · Haiku | faite (f5124e7) — relue (0 critique, 0 important) — 820 tests |
| 7 | Interface : volet Personnel, fiches, barre du haut | agent · Sonnet | faite (f6c5099 + 6b354ae) — relue, 1 correction (alerte de soins en rouge) ; vue par l’agent dans le navigateur (volet, cases d’enclos, Licencier, 375 × 812) sauf Embaucher — 820 tests |
| 8 | Employés visibles sur la carte | agent · Sonnet | faite (d51d3f6) — relue (0 critique, 0 important) — 826 tests |
| 9 | Vérification d’ensemble, relecture et publication | chef (Opus) + relecture · Opus | vérifiée dans le navigateur (Léa, embauche, limite 3, maison sur l’emplacement 6, dette −102 → blocage → remboursement, ancienne partie v4 + 3 jours : Léa, message, Gazette, 0 mort ; téléphone 375 × 812) ; relecture finale Opus (0 critique, 5 importants) corrigée en 099bad5 et relue (tout corrigé) — 835 tests ; **fusionnée dans `main` (9ccfb50) avec l’accord de Romain le 19/11/2026, publiée et vérifiée en ligne** (ancienne partie convertie : Léa, message, candidats) |

**Décisions de l'étape V2-2 (en plus du plan voté)** : maison du personnel au fond du village, derrière les emplacements du Bourg, en (17, −19) (choix de Romain : pas de place près de la mairie) ; paie « versée » = argent vraiment pris dans la caisse (la Gazette dit ce qui manque) ; pas de salaire pendant le rattrapage d'une ancienne partie (règles V1 jusqu'au retour du joueur) ; la paie ne peut jamais effacer une dette ; candidats tirés dès la nouvelle partie et à l'arrivée de Léa ; avis uniques affichés 20 s. Joueur automatique avec le personnel : Village jour 2-3, Bourg 5-6, fin 16-17 (un peu plus rapide qu'avant : les agents nettoient sans arrêt — à rééquilibrer à l'étape 7), ~460 pièces de salaires par jour en fin. À regarder par Romain : l'allure de la maison du personnel, les employés qui marchent (pas vus en mouvement, panneau masqué). Laissé pour plus tard : un enclos peut dépasser sa capacité quand plusieurs mères attendent des petits en même temps (règle V1, à traiter avec les blessures de l'étape 3) ; plus de place dans x 8–24 pour les emplacements 7 et 8 (étapes 3 et 4) ; deux candidats peuvent porter le même prénom.

**V2 — étape 3 : maladies et centre vétérinaire** (branche `claude/etape-v2-3-maladies-1c7710`, plan `docs/superpowers/plans/2026-11-19-v2-etape-3-maladies.md`, **voté par Romain le 19/11/2026**, D1–D10 avec D8 changée : premier pas « Construis le centre vétérinaire ») — lancée le 19/11/2026 après la fusion de l'étape 2. Écarts tranchés au lancement : **E1** vétérinaires recrutables dès que le centre existe (1 candidat sur 5) ; **E2** un vétérinaire expérimenté soigne 10 % plus vite par niveau.

| # | Sous-tâche | Agent · modèle | État |
|---|---|---|---|
| 1 | État v6, données des maladies, centre et migration | agent · Sonnet | faite (574d168, 079394d) — 861 tests ; emplacement 7 en (10, −26), à juger à l'œil |
| 2 | Les maladies vivent (apparition, contagion, repérage, aggravation, mort) | agent · Sonnet | faite (71239c2) — 875 tests |
| 3 | Le centre soigne : file, soins, vaccination, quarantaine | agent · Sonnet | faite (97dfb96) — 894 tests verts, 6 du joueur automatique rouges jusqu'à la tâche 4 |
| 4 | Un parc bien tenu tient 3 jours (test, réglages, joueur automatique) | agent · Sonnet | en cours |
| 5 | Missions (dont le premier pas du centre), Gazette, message de mise à jour | agent · Sonnet | à faire |
| 6 | Le centre et les malades sur la carte | agent · Sonnet | à faire |
| 7 | Interface : fiches et volet du centre, téléphone | agent · Sonnet | à faire |
| 8 | Vérification d'ensemble, relecture et publication | chef + relecture Opus | à faire |

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
| 5. Missions (Premiers pas avec Margaux, histoire, quotidiennes, résumé d'absence/Gazette) | ✅ fusionnée le 17/11/2026 |
| **6. Finition V1** (équilibrage, téléphone, brume des zones, visiteurs sur les chemins, jour/nuit, perfs, **bouton « Recommencer à zéro »**, son, fiches des bâtiments) | ✅ fusionnée le 18/11/2026 — **la V1 est terminée** |

Après la V1 : V2 à V5 décrites en fin de spec (personnel et centre vétérinaire, routes à construire contre de l'argent, expéditions, musée, labo, saisons…).

## Décisions prises avec Romain (en plus de la spec)

- 3D low-poly Three.js, modèles **CC0 Quaternius** uniquement (animaux animés, nature, village médiéval, ferme). Kenney bloque les téléchargements.
- Espèces V1 : mouton, cochon, âne, alpaga (prairie) · renard, cerf, cheval sauvage (forêt) · lama, taureau, loup (montagne). Mouton/cochon/lama viennent du pack ferme (FBX, **pas d'animation de marche** : balancement simulé).
- Enclos : **zones de biome + pose libre et redimensionnement** par les coins ; prix 4 pièces/m de clôture + 1/m² ; tirer un coin au-delà du coin opposé **déplace** l'enclos (gardé volontairement).
- Barres : haut = ressources en icônes ; bas = **une ligne compacte (48 px)** qui s'agrandit en volet (détails, plus tard missions/marchand/Gazette) ; retour visuel vert/rouge + « +n » qui s'envole + message court.
- Chemins de terre texturés ; ils **évolueront avec le niveau du village** (gravier, pavés, puis routes en V2).
- Rester en **TypeScript** (pas de Rust : aucun besoin de performance à ce stade).

## À prévoir à l'étape 6 (demandé par Romain le 17/11/2026)

- **Bouton « Recommencer à zéro »** accessible en jeu (pas seulement dans `?debug`) : efface la partie en cours et relance une nouvelle partie depuis le début. Confirmation en deux clics (comme la vente), avec un texte clair « Tout ton parc sera effacé ». Pas d'écran d'accueil ni de parties multiples : le jeu continue de s'ouvrir directement sur le parc.
- **Missions du jour de plus en plus difficiles** : la quantité demandée **et** la récompense de chaque quotidienne doivent suivre l'avancement réel du parc, pas seulement le niveau du village (aujourd'hui seules « visiteurs » et « pièces » voient leur cible grandir ; les récompenses sont × niveau). Exemple de Romain : « Acheter 30 rations » n'a plus d'intérêt avec un parc complet. Piste : régler chaque cible sur l'état du parc (consommation par jour, visiteurs par heure, recettes, nombre d'animaux…) et la récompense sur l'effort demandé. Fichiers : `src/data/missions.ts` (`DAILY_POOL`) et le tirage dans `src/sim/`.

## Décisions de l'étape 6 (en plus de la spec)

- **Équilibrage (choix de Romain « B + recettes réduites »)** : un habitant pour 30 clients jusqu'à 2 400 clients, puis un pour 350 ; Village à 40 habitants (150 et 250 inchangés) ; prix juste = 2 + 1 × (niveau − 1) + 0,05 × attrait ; dépense par client du café, de la boutique et de l'auberge divisée par 2. Joueur automatique : Village jour 2-3, Bourg 6-7, fin de la V1 jour 18-19.
- **Billet (Romain, 18/11)** : le jeu met un prix de base au début ; ensuite c'est le joueur qui décide, le prix n'est **jamais** changé automatiquement (même pour une ancienne partie).
- Ancienne partie : un message unique explique que le nombre d'habitants a été recalculé (niveau et missions gardés) ; repère `parc-clairbois:sauvegarde-reglages-etape6` dans le navigateur. Pas de sauvegarde v4 (champs facultatifs).
- Missions du jour : cible ≈ 3 h d'activité (visiteurs, pièces), ½ journée de rations, nombre d'enclos (2 à 6) ; récompense ≈ 1 h de recettes (≥ 30 pièces).
- Promeneurs : 6 personnages Quaternius habillés (Ultimate Modular Men / Women), chargés après l'ouverture du parc ; au plus 12 (8 sur téléphone), presque personne la nuit.
- Nuit : lune et étoiles près de l'horizon (la caméra peut s'incliner un peu plus), fenêtres et lanternes allumées, animaux plus calmes.
- Téléphone : avec une sélection, la barre du bas passe sur 3 lignes lisibles (~145 px) au lieu d'une ligne serrée (à confirmer par Romain en jouant).
- Son : musique de jour « A Small Fire Will Do », de nuit `night_tune3` (sans doute « Lonely Night », à confirmer), oiseaux / grillons, clics Kenney, pièces, marteau, cris (mouton, âne, cochon, cheval, taureau, loup = aboiement faute de hurlement CC0) ; Musique 40 % / Effets 70 % par défaut, réglages dans le navigateur. Renard, cerf, alpaga et lama sans cri.
- Demandes ajoutées en cours d'étape (Romain) : le « ! » reste sur l'endroit de la mission et un clic sur la mission y emmène la caméra ; fiches au clic pour les bâtiments, la mairie et les maisons ; musique et effets réglables.

## À regarder par Romain après la publication

- Écouter les sons (clic, pièces, mission, cris) et dire s'ils plaisent ; volume par défaut.
- La barre du bas sur 3 lignes au téléphone quand un bâtiment ou un enclos est sélectionné.
- La brume qui se dissipe au passage de niveau (pas vue en mouvement pendant les vérifications).

## Décisions de l'étape 5 (en plus de la spec)

- Récompenses **à récupérer par un bouton « Récupérer »** ; la mission suivante n'arrive qu'après le clic. Exception : une quotidienne réussie mais pas récupérée est versée d'office à minuit.
- Ordre : 9 premiers pas avec Margaux (bouton « Passer » qui donne les récompenses restantes), puis l'histoire ; les quotidiennes commencent après les premiers pas. Une ancienne partie refait les premiers pas (ce qui est déjà fait est réussi aussitôt).
- Histoire : Hameau = première naissance, améliorer la ferme, 3 espèces, 20 visiteurs/h (porte du Village) ; Village = auberge, 2 espèces de forêt, 2 jours d'autonomie, 150 habitants (porte du Bourg) ; Bourg = naissance d'un loup ou d'un taureau, les 10 espèces, 250 habitants (fin de la V1).
- Quotidiennes : 3 par jour à minuit (heure de l'appareil) ; un jour compte pour la série si les 3 sont réussies ; tous les 7 jours, un bon −25 % que le joueur utilise sur l'animal de son choix.
- Gazette : s'ouvre seule après au moins 1 h d'absence (rechargement ou onglet repris) ; l'icône la rouvre.

## Décisions de l'étape 4 (en plus de la spec)

- Chaque bâtiment est **unique** ; les 2 emplacements du Bourg affichent « Bientôt » (nouveaux bâtiments dans une évolution future).
- Passage de niveau **par un bouton** dans le volet du village (case village de la barre du haut), jamais automatique.
- Réglages initiaux (tous dans `src/data/economy.ts` / `tuning.ts`, à ajuster en jouant) : 4 visiteurs par point d'attrait ; prix juste 4 + 2 × (niveau − 1) + 0,4 × attrait ; population 10 + 5 par niveau de bâtiment + 1 par 30 clients ; seuils 50 / 150 ; marchand renouvelé toutes les 6 h ; 30 fourrage au départ, conception 10 %/h, repos de 2 × gestation après une naissance.

## Laissé pour l'étape 6 (repéré aux étapes 4 et 5)

- Petits défauts anciens : quelques chiffres encore en dur hors de `src/data/` (position de la mairie dans `decor.ts`…), calculs O(N²) par pas, `JSON.stringify` du panneau de test.
- Les achats à la ferme (rations, amélioration, garde-manger) sont testés automatiquement mais pas encore essayés à la main.
- Le « ! » doré qui se déplace au-dessus de la cible des premiers pas n'a pas été regardé à l'œil (panneau du navigateur masqué pendant la vérification).
- Textes des habitants écrits par un agent : à relire par Romain en jouant.
- Rattrapage de moins d'une heure en direct : ses événements ne sont pas gardés (sans conséquence, pas de Gazette en dessous d'une heure).
- Téléphone : avec un bâtiment sélectionné **et** une mission réussie, le titre de la mission dans la barre du bas devient très court (≈ 31 px) ; les 8 icônes de la ferme défilent dans une zone de 110 px. À revoir avec le reste de la finition téléphone.
- La Gazette peut s'ouvrir par-dessus un volet déjà ouvert (onglet repris après plus d'une heure) : fermer le volet avant de l'ouvrir.
- Premier pas « Ouvre la fiche de l'enclos des moutons » : n'importe quelle fiche d'enclos le valide (sans gêne au départ, un seul enclos).
- Marchand : cocher « Utiliser mon bon » reconstruit le volet (bouton Acheter inactif 400 ms) ; les cases cochées restent cochées après un achat si un autre bon reste.
- `npm run build` affiche un avertissement de taille du paquet JavaScript (déjà ancien) : découper le code si les perfs du chargement sur téléphone le demandent.

## Architecture (où est quoi)

- `src/data/` chiffres du jeu (espèces, réglages, zones, modèles par espèce, économie, missions) — aucune logique.
- Missions : données dans `src/data/missions.ts`, moteur pur dans `src/sim/missions.ts` (table `MEASURES` : une ligne par sorte d'objectif) ; compteurs dans `state.stats` ; mis à jour à chaque pas et après chaque action ; sauvegarde v3.
- `src/sim/` règles pures et testées sur un `GameState` sérialisable ; **une seule** fonction fait avancer le temps : `advanceTo(state, now)` par pas fixes de 10 min (jeu en direct = rattrapage d'absence). Actions du joueur : `applyAction` / `previewEnclosure` dans `actions.ts`.
- `src/save/` sauvegarde versionnée (propriétaire par onglet, copies de secours, migrations).
- `src/game/` session + boucle (`runGame` : horloge, sauvegarde, `dispatch` avec retour visuel).
- `src/scene/` 3D : monde, décor, zones, vue du parc pilotée par l'état (`parkView`), éditeur d'enclos, sélection, caméra.
- `src/ui/` barres, volet, retour visuel, panneau de test.
- Tests : `tests/` (Vitest), 646 au 18/11/2026 (étape 6) ; `tests/balance/` = joueur automatique (rythme de la V1).

## Mémo technique (pièges déjà rencontrés)

- **Node** est installé mais pas dans le PATH des commandes de Claude : préfixer `export PATH="/c/Program Files/nodejs:$PATH";`.
- **GitHub CLI** : `"/c/Program Files/GitHub CLI/gh.exe"`, connecté au compte `romsantic`.
- Serveur de dev : `"/c/Program Files/nodejs/node.exe" node_modules/vite/bin/vite.js --port 5173 --strictPort` (en arrière-plan), puis navigateur intégré sur http://localhost:5173/?heure=14. Le panneau du navigateur intégré **masqué = animation en pause**.
- Un **autre onglet du jeu ouvert** déclenche « Ton parc est ouvert dans un autre onglet » (protection voulue) : fermer les onglets en trop.
- Modèles OBJ de Blender 2.79 : couleurs déjà linéaires (on annule la conversion dans `materials.ts`) ; arêtes `l` parasites à retirer ; un fichier manquant renvoie la page web (d'où la vérification « modèle vide »).
- Téléphone : la page en ligne peut rester en cache ~10 min après une publication (fermer/rouvrir l'onglet).
- Le dossier `_telechargements/` (packs zip) et `.superpowers/` (suivi de travail des agents) ne sont pas versionnés.

## Suite

- La V1 est publiée. V2 : étapes 1 (chemins) et 2 (personnel) fusionnées et publiées le 19/11/2026 ; étape 3 (maladies et centre vétérinaire) à lancer dans sa propre session (attention : plus de place pour les emplacements 7 et 8 dans x 8–24, voir les décisions de V2-2).
