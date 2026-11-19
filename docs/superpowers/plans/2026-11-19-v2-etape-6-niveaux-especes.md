# V2 — Étape 6 : niveaux 4 à 6, carte agrandie, 21 espèces, potager, restaurant, marchand itinérant — plan de construction

> **Votes de Romain (19/11/2026)** — D1 validée (étang au nord, forêt profonde à l'ouest, haute montagne au sud) ; D5 validée (loutre, lynx et aigle vendus seulement par le marchand itinérant). Les autres décisions sont acceptées telles que proposées. Si l'étape 5 a déjà créé l'écran de crédits (fontaine CC-BY), le réutiliser.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal :** Clairbois passe du Bourg (niveau 3) à trois nouveaux niveaux ; chacun ouvre une nouvelle zone sous la brume (4 étang, 5 forêt profonde, 6 haute montagne) avec 21 nouvelles espèces d'Europe (31 en tout). Le potager donne une 3ᵉ nourriture (fruits et légumes), le restaurant rapporte gros, un marchand itinérant passe environ une fois par semaine pendant 24 h, et de nouveaux personnages donnent les missions d'histoire.

**Architecture :** les règles restent pures dans `src/sim/` sur un `GameState` sérialisable (sauvegarde **vN+1**). Les espèces, zones, niveaux, missions, prix et textes sont des **données** (`src/data/`). Le niveau du village devient un type `VillageLevel = 1..6` utilisé partout où le code disait `1 | 2 | 3`. Les légumes sont un 3ᵉ aliment du garde-manger, produits par des parcelles « potager » qui réutilisent la mécanique des parcelles de l'étape 4. Le marchand itinérant est un petit automate pur (`travelerStep`) appelé à chaque pas. La 3D lit l'état : carte agrandie, brume des nouvelles zones, étang, routes larges et lampadaires, modèles Gobkit animés chargés à la demande.

**Tech Stack :** TypeScript strict, Three.js (`GLTFLoader`, `SkeletonUtils.clone()`), Vitest (`export PATH="/c/Program Files/nodejs:$PATH"; npx vitest run`), `npm run build` ; pour l'allègement des modèles seulement : `npx @gltf-transform/cli` (outil lancé à la main, pas ajouté aux dépendances).

**Spec :** `docs/superpowers/specs/2026-11-19-parc-de-clairbois-v2-design.md` — §8 (niveaux 4–6, zones, espèces, bâtiments, potager, marchand itinérant), §6 (potager reporté à cette étape), §1 (rythme, absence, anti-objectifs), §3 (allure des chemins aux niveaux 5–6), §12 (« Étapes 6 et 7 », liste des espèces et des modèles, candidats CC-BY). Conception V1 (`2026-11-12-parc-de-clairbois-v1-design.md`) pour le reste : espèces (§3), zones et brume, niveaux.

**Branche :** `etape-v2-6-niveaux`, créée depuis `main` **après** la fusion de l'étape 5.

---

## Ce que ce plan attend des étapes 1 à 5 (à revérifier au lancement — tâche 0)

Ce plan est écrit le 19/11/2026 pendant la construction de l'étape 1. Les noms ci-dessous sont **supposés** d'après le code de l'étape 1 et les plans des étapes 2, 3, 4 et 7. Si le code a pris un autre nom, l'agent prend celui du code et le note dans son compte rendu ; le sens du plan ne change pas.

| Étape | Ce que ce plan utilise |
|---|---|
| 1 — Chemins (branche `etape-v2-1-chemins`) | `CURRENT_VERSION = 4`, `GameState.paths: PathSegment[]` ; `src/data/paths.ts` : `PATHS_TUNING.WIDTH_M = 2.2`, `PATH_AREA: Rect` (côté zoo, x −34..−4, z −24..24), `ENTRANCE_PATH`, `PATH_STYLE_BY_LEVEL: Record<number, 1 \| 2 \| 3>` ; `src/sim/paths.ts` : `checkSegment` (refus « Cette zone est encore sous la brume. » quand le ruban entre dans une zone fermée), `linkedEnclosureIds` ; `src/scene/pathsView.ts` et `src/scene/path.ts` (`createPath(pts, { style, lanterns, ground, rng, width })`, `PathStyle = 1 \| 2 \| 3`) ; `LoadResult.fromVersion` et le modèle de message unique de `Session` (`pathsNotice`). |
| 2 — Personnel | `CURRENT_VERSION = 5` ; `GameState.staff` ; `JobId` dont `'fermier'` et `'veterinaire'` ; `staffCap`, `efficiency(state)` ; emplacements avec `only?: BuildingType` (emplacement 6 = maison du personnel) ; `BuildingData.upgradeCost: number[]` et `Building.level: number` si l'étape 3 a généralisé ; joueur automatique qui embauche. |
| 3 — Maladies | `CURRENT_VERSION = 6` ; bâtiment `'centreVeto'` (niveaux 1–5, emplacement 7) ; `Health` avec `disease` ; vétérinaire **Élise Fontaine** offerte aux anciennes parties ; `shiftDates` décale toutes les dates. |
| 4 — Ferme | `CURRENT_VERSION = 7` ; `GameState.farm.plots: Plot[]` avec `Plot { id; level: 1 \| 2 \| 3; stock }` ; `FARM_PLOTS: { id; x; z }[]` (8 emplacements, ids 0..7) ; `farmStep(state, events)` (pousse puis transport par le fermier) ; actions `acheterParcelle`, `ameliorerParcelle`, `ramasserParcelle` ; événement `recolte { fourrage; byPlayer }` ; compteurs `fourrageRecolte`, `recolteMain` ; bâtiment `'grange'` (emplacement 8) ; fermier **Jules Moreau** ; `plotsView`. |
| 5 — Confort | `CURRENT_VERSION = 8` (**vN = 8 attendu**, cette étape passe en **v9**) ; `GameState.decor: DecorItem[]` (`{ id; kind: DecorKind; x; z }`) ; catalogue des décorations avec un prix ; `checkDecorPlacement(state, kind, x, z)` ; mode de pose d'une décoration dans l'interface ; `satisfaction(state)` ; chargement éventuel d'un modèle de lampadaire Quaternius (`lampadaire`). |
| 7 (plan déjà écrit) attend de cette étape | `Village.level: 1..6` ; ~20 espèces dans `SPECIES` ; nourriture **`legumes`** et potager ; bâtiment **`restaurant`** ; `GameState.traveler { arrivesAt; leavesAt; offers }` ; événements **`itinerant { what: 'arrive' \| 'depart' }`** ; missions d'histoire 4–6 (portes 4, 5, 6 ; `'fin'` au niveau 6) ; personnages vétérinaire, fermier, garde de l'étang ; compteurs `legumesRecoltes`, `achatsItinerant` ; `recolte` porte aussi les légumes. Ce plan **reprend ces noms**. |

## Global Constraints

- Règles pures et testées dans `src/sim/`, chiffres et textes dans `src/data/`, aucune logique dans `src/data/`.
- Le temps n'avance que par `advanceTo` (pas de 10 min) ; les actions passent par `applyAction` et renvoient un nouvel état (`structuredClone`) ou un refus en français affichable tel quel.
- Sauvegarde **vN → vN+1** (v8 → v9 attendu) : migration écrite en clair, sans appeler le jeu ; **la partie de Romain continue sans rien perdre** (niveau, missions, animaux, argent).
- Une zone par niveau : **4 étang, 5 forêt profonde, 6 haute montagne**, sur une carte agrandie, **sous la brume** tant qu'elle est fermée. Passage de niveau **par un bouton**, jamais automatique (V1).
- 21 nouvelles espèces (liste de la spec §12), toutes d'Europe, soit **31** en tout.
- Modèles 3D **CC0** (Gobkit, Quaternius), **sauf ours, lynx, bison et élan** qui peuvent être **CC-BY** : auteur cité dans `CREDITS.md` **et** dans un écran de crédits du volet Options. Une espèce sans animation de marche garde le **balancement simulé** de la V1.
- Margaux reste la maire ; nouveaux personnages dans les missions (la vétérinaire, le fermier, le garde de l'étang), chacun avec sa petite histoire.
- Chemins plus larges avec trottoirs et **lampadaires aux niveaux 5–6** (spec §3).
- Potager et fruits/légumes comme **3ᵉ nourriture** ; **restaurant** (gros revenu par visiteur, débloqué tard) ; **marchand itinérant ≈ une fois par semaine pour 24 h**, annoncé dans la Gazette.
- Rythme : niveaux 4–6 ≈ **1 mois** de plus (un niveau toutes les 1 à 2 semaines) ; un parc bien tenu tient **3 jours** sans le joueur.
- Perfs : rattrapage de 30 jours d'un grand parc **< 2 s** ; jeu fluide sur téléphone avec 31 espèces (modèles chargés **à la demande**).
- Téléphone et ordinateur : tout au tap, lisible en 375 × 812, boutons ≥ 44 px. Textes en français simple, tutoiement ; noms en texte, jamais en HTML.

## Décisions du chef (à valider par Romain avec le plan)

- **D1 — Carte agrandie (forme).** Les nouvelles terres sont **du côté du zoo** (ouest de la rivière), là où sont déjà les zones et le réseau de chemins :
  - **Étang** (niv. 4) : au nord de la Forêt, au bord de la rivière — `{ x: −34, z: −40, w: 28, d: 16 }`. Un **grand étang** (cercle d'eau, centre `(−13, −33)`, rayon 4) occupe un coin : on ne peut y poser ni enclos ni chemin.
  - **Forêt profonde** (niv. 5) : à l'ouest de la Forêt et de l'Étang — `{ x: −56, z: −40, w: 22, d: 32 }`.
  - **Haute montagne** (niv. 6) : au sud de la Montagne — `{ x: −34, z: 24, w: 30, d: 16 }`.
  - Domaine jouable : `MAP_BOUNDS = { minX: −56, maxX: 34, minZ: −40, maxZ: 40 }` (au lieu de ±34 × ±24). Zone de tracé des chemins : `{ x: −56, z: −40, w: 52, d: 80 }`. L'entrée (x = −36, z = 10) ne bouge pas. Noms sous la brume : « Roselière », « Bois profond », « Sommets ». *Le chef montre une image vue de dessus à Romain avant la tâche 8.*
- **D2 — Noms des niveaux.** 4 **Petite ville**, 5 **Ville**, 6 **Grande ville** (Hameau, Village, Bourg inchangés). Message de passage : « Clairbois devient une petite ville ! », « … une ville ! », « … une grande ville ! ».
- **D3 — Seuils d'habitants** (réglés en tâche 11 puis à l'étape 7) : niveau 4 **250** (la mission de fin de la V1 devient la porte du niveau 4), niveau 5 **450**, niveau 6 **700** ; mission de fin de la V2 : **1 000 habitants**.
- **D4 — Espèces : tableau ci-dessous** (prix d'un adulte, gestation en heures, portée, attrait, régime par ordre de préférence, rations par jour, place en m², vit en groupe). Repères V1 : prix 120–2 500, gestation 2–18 h, attrait 1–4, place 12–50 m². Les nouvelles espèces coûtent plus cher (le parc rapporte plus), les grands animaux ont un attrait de 5–6.
- **D5 — Espèces rares** (vendues **seulement** par le marchand itinérant) : **loutre** (étang), **lynx** (forêt profonde), **aigle royal** (haute montagne). Le marchand habituel ne les propose jamais.
- **D6 — Biche.** Espèce à part du cerf de la V1 (choix de Romain) : id `biche`, nom « Biche des bois », modèle Gobkit (le modèle `biche` Quaternius reste la femelle du cerf).
- **D7 — Légumes.** 3ᵉ aliment `legumes` (« Fruits et légumes »), qui partage la **même capacité** du garde-manger. Achat à la ferme **3 pièces** (remise de la ferme comme les autres). **Potager** : **4 parcelles** de légumes (emplacements 8 à 11 de `FARM_PLOTS`, `crop: 'legumes'`), débloquées au **niveau 4** et **hors** de la limite 2 / 5 / 8 de la ferme ; prix **800, 1 100, 1 500, 2 000** ; production **0,06 / 0,09 / 0,13** par heure (niveaux 1/2/3), stock **3 / 5 / 7** (× la grange) ; amélioration 500 puis 1 000. Le fermier porte fourrage **et** légumes (la parcelle la plus pleine d'abord). Placement : même règle et même recherche que le D2 du plan de l'étape 4, le plus près des champs ; image montrée à Romain.
- **D8 — Qui mange des légumes.** Castor, canard, cygne, lièvre, écureuil, marmotte, sanglier en premier choix ; oie, biche, élan, chèvre, ours, hérisson en second choix. Aucune espèce V1 ne change de régime.
- **D9 — Restaurant.** Bâtiment `restaurant`, débloqué au **niveau 5**, sur un **nouvel emplacement réservé** (`only: 'restaurant'`, prochain numéro libre, 9 attendu ; proposé près de `(20, −19)`, vérifié par le test des emplacements). Construction **8 000**, améliorations **15 000 / 30 000** ; part des visiteurs **0,2** ; **6 / 8 / 10 pièces** par client ; **20 / 40 / 80** clients par heure au plus. Il compte dans les habitants comme les autres bâtiments. Allure : `auberge` du pack médiéval avec tables et tonneaux (`tonneau`, `etal`) devant ; aucun téléchargement.
- **D10 — Marchand itinérant.** À partir du **niveau 4** : il arrive à **10 h** (heure de l'appareil) et repart **24 h** après ; prochaine arrivée **6 à 8 jours** après la précédente. Premier passage : le lendemain 10 h au plus tard après le passage au niveau 4. Il propose **4 offres** : jusqu'à **2 animaux rares** (D5, seulement de zones ouvertes ; s'il n'y en a qu'une, un couple F + M ; s'il n'y en a aucune, les deux espèces ouvertes de plus fort attrait), **1 femelle déjà gestante** d'une espèce ouverte non rare (prix × 1,4 : c'est « l'animal expérimenté » de la spec), **1 décoration rare** (une décoration de l'étape 5, dorée, effet × 1,5, prix × 3). Pas de bon de réduction chez lui. Sur la carte : la **charrette** du pack médiéval près du pont, touchable, seulement quand il est là.
- **D11 — Nouveaux personnages.** **Élise, la vétérinaire** (celle de l'étape 3) ; **Jules, le fermier** (celui de l'étape 4 ; la constante `FERMIER` des anciennes missions prend ce nom) ; **Bastien, le garde de l'étang** (nouveau). La garde forestière, l'aubergiste et Margaux restent. Chacun se présente dans sa première mission.
- **D12 — Missions d'histoire 4–6** : 12 nouvelles missions **ajoutées à la fin** de `STORY` (index 11 à 22), voir tâche 4. La mission « Atteins 250 habitants » passe de `gate: 'fin'` à `gate: 4`. Une partie qui avait fini la V1 (index 11) reçoit tout de suite la première mission du niveau 4. Pas de nouvelle quotidienne (étape 7), sauf « Achète {n} rations » qui compte aussi les légumes.
- **D13 — Routes des niveaux 5–6.** Nouveau style **4** : route pavée plus large (**3,0 m** dessinés au lieu de 2,2) avec trottoirs clairs et **un lampadaire tous les 8 m**, côtés alternés, allumé la nuit (lueur comme les lanternes, sans vraie lumière). **Les règles gardent 2,2 m** (aucun enclos existant ne devient « sur le chemin ») : le trottoir peut passer sous une clôture. Lampadaires faits en Three.js (poteau + lanterne) en `InstancedMesh`, au plus 200 ; si l'étape 5 a apporté un modèle `lampadaire`, on l'utilise à la place. Les rues du village prennent aussi le style 4.
- **D14 — Modèles.** Gobkit (CC0, GLB animés, clips `idle` / `walk` / `attack` / `dead`, orientés +Z) : on garde **`idle` et `walk`** seulement ; un fichier par espèce dans `public/models/animaux-v2/<id>.glb`, **≤ 600 Ko** chacun, textures ≤ 512 px. Ours, lynx, bison, élan : choix CC-BY avec Romain (tâche 1, candidats de la spec §12) ; **en attendant**, substituts CC0 (lynx → `loup`, bison → `taureau`, élan → `cerf`, ours → `sanglier` Gobkit agrandi) pour que le jeu ne bloque pas.
- **D15 — Téléphone et perfs.** Modèles chargés à la demande (`requestModel`, déjà en place). Sur téléphone, un animal à plus de 45 m de la caméra ne rejoue son animation **qu'une image sur trois** ; au-delà de 120 animaux, les animaux ne projettent plus d'ombre sur téléphone.
- **D16 — Ancienne partie.** Migration : garde-manger `legumes: 0`, marchand itinérant pas encore prévu, nouveaux compteurs à 0. Message unique à l'ouverture si le parc est au Bourg : « Clairbois peut encore grandir : de nouvelles terres attendent sous la brume. Ouvre le volet du village pour devenir une petite ville. »

### Tableau des espèces (D4, à valider par Romain)

| Zone | id | Nom | Prix | Gestation (h) | Portée | Attrait | Régime | Rations/j | Place (m²) | Groupe | Modèle |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Étang | `castor` | Castor | 900 | 10 | 1–3 | 3 | légumes, fourrage | 2 | 20 | oui | Gobkit Vol.11 |
| Étang | `canard` | Canard colvert | 250 | 3 | 3–6 | 1 | légumes, fourrage | 1 | 6 | oui | Gobkit Vol.1 |
| Étang | `oie` | Oie cendrée | 350 | 4 | 2–5 | 1 | fourrage, légumes | 1 | 8 | oui | Gobkit Vol.4 |
| Étang | `cygne` | Cygne | 1 400 | 8 | 2–4 | 3 | légumes, fourrage | 2 | 25 | non | Gobkit Vol.12 |
| Étang | `loutre` *(rare)* | Loutre | 1 800 | 9 | 1–3 | 4 | viande | 2 | 20 | oui | Gobkit Vol.5 (loutre de mer) |
| Étang | `grenouille` | Grenouille verte | 150 | 2 | 4–8 | 1 | viande | 0,5 | 3 | oui | Quaternius (poly.pizza) |
| Étang | `martinPecheur` | Martin-pêcheur | 1 100 | 5 | 3–5 | 3 | viande | 0,5 | 6 | non | Gobkit Vol.7 |
| Forêt profonde | `sanglier` | Sanglier | 1 300 | 8 | 3–6 | 2 | légumes, fourrage, viande | 3 | 30 | oui | Gobkit Vol.2 |
| Forêt profonde | `hibou` | Hibou grand-duc | 2 000 | 7 | 1–3 | 4 | viande | 1 | 12 | non | Gobkit Vol.2 |
| Forêt profonde | `lievre` | Lièvre | 400 | 3 | 2–4 | 1 | légumes, fourrage | 1 | 8 | non | Gobkit Vol.4 |
| Forêt profonde | `herisson` | Hérisson | 350 | 3 | 3–5 | 2 | viande, légumes | 0,5 | 4 | non | Gobkit Vol.4 |
| Forêt profonde | `ecureuil` | Écureuil roux | 450 | 3 | 2–4 | 2 | légumes | 0,5 | 5 | oui | Gobkit Vol.4 |
| Forêt profonde | `biche` | Biche des bois | 1 600 | 11 | 1 | 3 | fourrage, légumes | 3 | 35 | oui | Gobkit Vol.4 |
| Forêt profonde | `ours` | Ours brun | 6 000 | 20 | 1–2 | 6 | viande, légumes | 5 | 70 | non | CC-BY (tâche 1) |
| Forêt profonde | `lynx` *(rare)* | Lynx | 4 000 | 12 | 1–3 | 5 | viande | 2 | 40 | non | CC-BY, statique |
| Forêt profonde | `bison` | Bison d'Europe | 5 000 | 20 | 1 | 5 | fourrage | 6 | 80 | oui | CC-BY, statique |
| Forêt profonde | `elan` | Élan | 4 500 | 18 | 1 | 5 | fourrage, légumes | 5 | 70 | non | CC-BY (tâche 1) |
| Haute montagne | `aigle` *(rare)* | Aigle royal | 7 000 | 16 | 1–2 | 6 | viande | 2 | 40 | non | Birds Pack |
| Haute montagne | `marmotte` | Marmotte | 600 | 4 | 2–5 | 2 | légumes, fourrage | 1 | 8 | oui | Gobkit Vol.2 |
| Haute montagne | `chevre` | Chèvre des montagnes | 1 800 | 9 | 1–2 | 3 | fourrage, légumes | 2 | 25 | oui | Gobkit Vol.2 |
| Haute montagne | `mouflon` | Mouflon | 3 000 | 12 | 1–2 | 4 | fourrage | 3 | 35 | oui | Gobkit Vol.11 |

Hauteur affichée (m, petits animaux un peu grossis pour rester visibles, à vérifier à l'œil) : castor 0,6 · canard 0,7 · oie 0,9 · cygne 1,2 · loutre 0,6 · grenouille 0,45 · martin-pêcheur 0,5 · sanglier 1,1 · hibou 0,8 · lièvre 0,6 · hérisson 0,5 · écureuil 0,55 · biche 1,9 · ours 1,9 · lynx 0,9 · bison 2,3 · élan 2,6 · aigle 0,9 · marmotte 0,5 · chèvre 1,3 · mouflon 1,3.

## Review Focus

1. **Partie de Romain au Bourg, V1 finie** (histoire à l'index 11, mission « 250 habitants » récupérée) : après la mise à jour, la première mission du niveau 4 arrive, le bouton « Devenir une petite ville » marche dès 250 habitants, rien n'est perdu ni rejoué, le message n'apparaît qu'une fois (tests en tâches 3 et 4).
2. **Absence pendant laquelle le marchand itinérant arrive et repart, ou absence plafonnée à 30 jours** : ses dates sont décalées par `shiftDates`, ses offres disparaissent à son départ, un achat après `leavesAt` est refusé, la prochaine visite est toujours dans le futur (tests en tâche 7).
3. **Garde-manger partagé à trois aliments** : la capacité compte fourrage + viande + légumes partout (achat, « Remplir », fermier, cadeau de mission) ; un animal dont le premier aliment manque passe au suivant ; l'autonomie compte les légumes (tests en tâche 5).
4. **Bords des nouvelles zones et étang** : un enclos à cheval sur deux zones, dans l'étang ou sous la brume est refusé avec une raison claire ; un chemin qui traverse l'étang ou une zone fermée aussi ; aucune nouvelle zone ne touche la rivière (tests en tâches 3 et 8).
5. **Modèle pas encore chargé, absent ou sans marche** (CC-BY pas encore choisi, fichier manquant, clips en minuscules `walk`) : l'animal apparaît dès que le modèle arrive, un modèle statique se balance, rien ne plante ; 200 animaux sur téléphone restent fluides (tests en tâche 9, vérification en tâche 12).

---

### Task 0: Tâche 0 — Vérifications et choix avec Romain — chef · **Opus**

- [ ] **Step 1 :** relire `main` (étapes 1 à 5 fusionnées) et corriger le tableau « Ce que ce plan attend » : version de sauvegarde (vN), noms de `farm.plots`, `FARM_PLOTS`, `farmStep`, `recolte`, emplacements réservés, `DecorItem` / `DecorKind`, pose de décoration, `shiftDates`, nombre de tests.
- [ ] **Step 2 :** montrer à Romain le tableau des espèces (D4), les décisions D1 à D16 et une image vue de dessus de la carte agrandie (D1) ; noter ses choix dans `progress.md` (« Décisions de l'étape V2-6 ») et corriger ce plan.
- [ ] **Step 3 :** créer la branche `etape-v2-6-niveaux` depuis `main` ; ajouter le tableau « Suivi des sous-tâches » de cette étape dans `progress.md` ; commit `progress.md : V2-6 plan validé`.

### Task 1: Tâche 1 — Téléchargement des modèles et choix CC-BY — chef · **Opus** (Romain télécharge)

**Files :** `_telechargements/` (non versionné), `CREDITS.md`

- [ ] **Step 1 :** donner à Romain la liste à télécharger dans `_telechargements/v2-animaux/` : Gobkit Vol.1 (canard), Vol.2 / animalB (sanglier, hibou, chèvre, marmotte), Vol.4 / animal006 (oie, lièvre, hérisson, écureuil, biche), Vol.5 (loutre de mer), Vol.7 / animal009 (martin-pêcheur), Vol.11 / animal011 (castor, mouflon), Vol.12 / animal012 (cygne), Birds Pack (aigle), grenouille Quaternius https://poly.pizza/m/9Z2V8fpazF.
- [ ] **Step 2 :** choisir avec Romain un modèle pour ours, lynx, bison, élan parmi les candidats de la spec §12 (ours « Running Brown Bear » animé ; élan « Moose(Dark) » animé ou « Low Poly Moose » ; lynx « Low-poly Lynx » ou « Bobcat Poly » statiques ; bison « Bizon » statique) ; Romain les télécharge (Sketchfab demande un compte gratuit : c'est Romain qui se connecte). Noter titre, auteur, lien, licence exacte (CC BY 3.0 / 4.0) et date.
- [ ] **Step 3 :** ouvrir chaque pack et noter, pour chaque espèce, le fichier source et les noms de clips trouvés (Haiku peut faire cet inventaire). Ajouter à `CREDITS.md` une ligne par pack Gobkit (CC0) et la grenouille, et une section **« Modèles sous licence CC-BY (attribution obligatoire) »** avec, pour chacun des 4 : titre, auteur, lien, licence, modifications (« réduit et recoloré » si c'est le cas). Commit `V2-6 tâche 1 : crédits des modèles des nouvelles espèces`.

### Task 2: Tâche 2 — Conversion et allègement des modèles — agent · **Sonnet** (Haiku si les fichiers n'ont qu'à être copiés)

**Files :**
- Create : `public/models/animaux-v2/*.glb` (21 fichiers), `tests/assets/animauxV2.test.ts`
- Modify : `src/assets/manifest.ts`, `tests/assets/manifest.test.ts`

**Interfaces :**
- Produces : `MODELS` gagne 21 clés, une par espèce, de même nom que l'id de l'espèce, sauf `biche` → clé **`bicheBois`** (la clé `biche` existe déjà : femelle du cerf) : `castor, canard, oie, cygne, loutre, grenouille, martinPecheur, sanglier, hibou, lievre, herisson, ecureuil, bicheBois, ours, lynx, bison, elan, aigle, marmotte, chevre, mouflon` → `'models/animaux-v2/<clé>.glb'`.

- [ ] **Step 1 : test qui échoue** — `animauxV2.test.ts` : pour chaque clé ci-dessus, le fichier existe sous `public/`, pèse **≤ 600 Ko**, commence par la signature `glTF` ; la somme des 21 fichiers ≤ 12 Mo.
- [ ] **Step 2 :** `npx vitest run tests/assets` → FAIL (fichiers absents).
- [ ] **Step 3 :** pour chaque espèce, extraire le modèle du pack (dans un dossier de travail du bloc-notes, jamais dans `public/` d'abord), garder seulement les clips `idle` et `walk` (les FBX/OBJ éventuels convertis en GLB), puis alléger : `npx @gltf-transform/cli prune`, `dedup`, `resize --width 512 --height 512`, `weld`. Nommer le fichier final d'après la clé. Les 4 CC-BY : si un modèle n'a pas de clip `walk`, le garder statique (balancement de la V1). Si un modèle choisi en tâche 1 manque encore, ne pas créer le fichier et le noter : `speciesModels` utilisera le substitut (D14) et le test l'ignore via une liste `PENDING_CC_BY` écrite dans le test.
- [ ] **Step 4 :** `npx vitest run tests/assets` → PASS ; compte rendu : tableau clé / taille / clips gardés / orientation vérifiée (+Z).
- [ ] **Step 5 :** commit `V2-6 tâche 2 : modèles allégés des nouvelles espèces`.

### Task 3: Tâche 3 — État vN+1 : niveaux 1–6, nouveaux biomes, légumes, 21 espèces, zones — agent · **Sonnet**

**Files :**
- Modify : `src/data/species.ts`, `src/data/speciesModels.ts`, `src/data/zones.ts`, `src/data/paths.ts` (`PATH_AREA`), `src/data/economy.ts` (`LEVEL_NAMES`, `LEVEL_POPULATION`, `FARM.foodPrice`, types de niveau), `src/sim/types.ts`, `src/sim/newGame.ts`, `src/sim/stats.ts`, `src/sim/merchant.ts` (`BIOME_NAMES`, `catalogue`), `src/sim/placement.ts`, `src/sim/paths.ts`, `src/save/migrations.ts`, `src/save/save.ts` (`looksLikeGame`), `src/sim/advance.ts` (`shiftDates`), `tests/sim/helpers.ts`, `tests/data/species.test.ts`, `tests/data/speciesModels.test.ts`, `tests/save/migrations.test.ts`, `tests/save/save-robustness.test.ts`, `tests/sim/placement.test.ts`, `tests/sim/paths.test.ts`, `tests/sim/merchant.test.ts`, tout `version: N` restant
- Create : `tests/data/zones.test.ts`

**Interfaces :**
- Produces (`src/data/species.ts`) :
  - `SpeciesId` gagne les 21 ids du tableau D4 ; `Biome = 'prairie' | 'foret' | 'montagne' | 'etang' | 'foretProfonde' | 'hauteMontagne'` ; `Food = 'fourrage' | 'viande' | 'legumes'` ; `export const FOODS: Food[] = ['fourrage', 'viande', 'legumes']` ; `FOOD_NAMES: Record<Food, string>` (« Fourrage », « Viande », « Fruits et légumes »).
  - `Species` gagne `rare?: true` ; les 21 lignes de D4 ajoutées à `SPECIES`.
- Produces (`src/sim/types.ts`) : `export type VillageLevel = 1 | 2 | 3 | 4 | 5 | 6` ; `Village.level: VillageLevel` ; `Pantry { fourrage; viande; legumes; capacity }` ; `StatKey` gagne `'legumesAchetes' | 'legumesRecoltes' | 'achatsItinerant'` ; `TravelerOffer = { id: number; kind: 'animal'; species: SpeciesId; sex: 'F' | 'M'; pregnant: boolean; price: number } | { id: number; kind: 'deco'; decor: DecorKind; price: number }` ; `Traveler { arrivesAt: number | null; leavesAt: number | null; offers: TravelerOffer[]; visits: number }` ; `GameState.traveler: Traveler` ; `GameState.version: N+1` ; `GameEvent` gagne `{ kind: 'itinerant'; at: number; what: 'arrive' | 'depart' }`.
- Produces (`src/data/zones.ts`) : `Zone.unlockLevel: VillageLevel` ; 3 nouvelles zones de D1 (`id` = biome) ; `export const PONDS: { x: number; z: number; r: number }[]` (l'étang de D1) ; `export const MAP_BOUNDS = { minX: -56, maxX: 34, minZ: -40, maxZ: 40 }`.
- Produces (`src/data/speciesModels.ts`) : 21 lignes (hauteurs de D4 ; femelle = mâle) ; `biche` → `bicheBois` ; substituts de D14 pour un CC-BY encore absent.
- Produces (`src/sim/pantry.ts`, nouveau, petit) : `pantryTotal(p: Pantry): number` (somme des 3 aliments) — à utiliser partout où le code écrit `p.fourrage + p.viande`.

- [ ] **Step 1 : tests qui échouent**
  - `species.test.ts` : 31 espèces ; chaque espèce a un biome qui existe dans `ZONES`, prix > 0, portée `[a, b]` avec 1 ≤ a ≤ b, régime non vide sans doublon, place > 0 ; exactement 3 rares (`loutre`, `lynx`, `aigle`) ; `SPECIES.ours.appeal === 6`, `SPECIES.bison.spaceM2 === 80`, `SPECIES.ecureuil.diet` = `['legumes']`.
  - `speciesModels.test.ts` : chaque espèce a un modèle dont la clé est dans `MODELS` et une hauteur entre 0,3 et 3.
  - `zones.test.ts` : 6 zones ; niveaux 1, 2, 3, 4, 5, 6 chacun une fois ; deux zones ne se chevauchent pas ; chaque zone est dans `MAP_BOUNDS` ; chaque point d'un quadrillage de 1 m de chaque zone est à ≥ 2,2 + 2 m de l'axe de la rivière (`riverDistance` de `src/scene/world.ts`) ; l'étang est entièrement dans la zone `etang` ; le couloir de l'allée et l'entrée ne touchent aucune nouvelle zone.
  - `placement.test.ts` : enclos dans la zone étang au niveau 3 → « Cette zone se débloque au niveau 4 du village. » ; au niveau 4 → accepté ; un enclos qui touche l'étang → « Il est dans l'étang. » ; à cheval sur Forêt et Forêt profonde → refusé (comme deux zones V1).
  - `paths.test.ts` : un segment qui traverse l'étang → « Il traverse l'étang. » ; un segment dans la Forêt profonde au niveau 4 → « Cette zone est encore sous la brume. », accepté au niveau 5.
  - `merchant.test.ts` : `catalogue(4)` contient `castor` mais ni `loutre` ni `sanglier` ; `catalogue(6)` a 28 espèces (31 − 3 rares) ; `acceptsSpecies` d'un canard dans un enclos de prairie → « Il faut un enclos d'étang. »
  - `migrations.test.ts` : une partie vN au niveau 3 avec l'histoire à l'index 11 → vN+1 avec `pantry.legumes === 0`, `traveler` = `{ arrivesAt: null, leavesAt: null, offers: [], visits: 0 }`, les 3 nouveaux compteurs à 0, tout le reste identique ; `looksLikeGame` refuse `village.level: 7`, `pantry.legumes: -1`, une offre itinérante sans `price`.
- [ ] **Step 2 :** `npx vitest run` → les nouveaux tests échouent.
- [ ] **Step 3 : implémenter.** Remplacer chaque `1 | 2 | 3` qui désigne **le niveau du village** par `VillageLevel` (pas `Building.level`). `BIOME_NAMES` : « étang », « forêt profonde », « haute montagne ». `catalogue(level)` exclut les espèces `rare`. Refus « Il est dans l'étang. » dans `checkPlacement` et « Il traverse l'étang. » dans `checkSegment` (distance cercle–rectangle et cercle–segment < rayon + demi-largeur). `PATH_AREA` = `{ x: -56, z: -40, w: 52, d: 80 }`. `newGame` : `legumes: 0`, `traveler` vide. `shiftDates` décale `traveler.arrivesAt` / `leavesAt` quand ils ne sont pas `null`. Migration `MIGRATIONS[N]` écrite en clair. `FARM.foodPrice.legumes = 3`. `LEVEL_NAMES` et `LEVEL_POPULATION` de D2–D3.
- [ ] **Step 4 :** `npx vitest run` et `npm run build` → tout passe (les anciens tests ne changent pas de sens).
- [ ] **Step 5 :** commit `V2-6 tâche 3 : état vN+1, 31 espèces, zones des niveaux 4 à 6`.

### Task 4: Tâche 4 — Niveaux 4–6 du village et missions d'histoire — agent · **Sonnet**

**Files :**
- Modify : `src/sim/village.ts`, `src/sim/missions.ts`, `src/data/missions.ts`, `src/game/runGame.ts` (message de passage), `src/game/session.ts` (message unique D16), `tests/sim/village.test.ts`, `tests/sim/missions.test.ts`, `tests/game/session.test.ts`

**Interfaces :**
- Consumes : `VillageLevel`, `LEVEL_POPULATION`, `LEVEL_NAMES` (tâche 3) ; nom réel du compteur des récoltes de légumes `legumesRecoltes` (tâche 3) ; bâtiments `centreVeto` (étape 3) et `restaurant` (tâche 6 — la mission le cite ; le type est ajouté **ici** à `BuildingType` si la tâche 6 n'est pas encore faite, sans données).
- Produces : `canLevelUp(state): { ok: true; level: VillageLevel } | { ok: false; reason: string }` (jusqu'à 6 ; au niveau 6 : « Clairbois est déjà une grande ville. ») ; `missionGateOk(state, level: 2 | 3 | 4 | 5 | 6)` ; `storyStart(level: VillageLevel)` ; `MissionDef.gate?: 2 | 3 | 4 | 5 | 6 | 'fin'` ; `LEVEL_UP_TEXT: Record<2 | 3 | 4 | 5 | 6, string>` dans `src/data/economy.ts` ; `Session.levelsNotice: string | null`.
- Produces (étape 7) : `'fin'` porté par la dernière mission du niveau 6.

**Personnages (D11)** dans `src/data/missions.ts` : `FERMIER = 'Jules, le fermier'`, `VETERINAIRE = 'Élise, la vétérinaire'`, `GARDE_ETANG = "Bastien, le garde de l'étang"` (Margaux, l'aubergiste et la garde forestière inchangés).

**Missions ajoutées à `STORY`** (index 11 à 22, dans l'ordre ; `hist-habitants-150` passe à `gate: 4`). Textes à relire par Romain :

| # | id | Titre | Personnage | Objectif | Récompense | Porte |
|---|---|---|---|---|---|---|
| 11 | `hist-etang-enclos` | Construis un enclos à l'étang | garde de l'étang | `enclos` biome `etang` n 1 | 2 000 | |
| 12 | `hist-potager` | Récolte 20 fruits et légumes | fermier | `compteur` `legumesRecoltes` n 20 | 2 500 | |
| 13 | `hist-especes-etang` | Possède 4 espèces de l'étang | garde de l'étang | `especes` n 4 biome `etang` | 3 000 | |
| 14 | `hist-centre-3` | Améliore le centre vétérinaire au niveau 3 | vétérinaire | `batiment` `centreVeto` niveau 3 | 3 000 | |
| 15 | `hist-habitants-450` | Atteins 450 habitants | Margaux | `habitants` 450 | 5 000 | 5 |
| 16 | `hist-restaurant` | Construis le restaurant | Margaux | `batiment` `restaurant` | 6 000 | |
| 17 | `hist-foret-profonde` | Possède 5 espèces de la forêt profonde | garde forestière | `especes` n 5 biome `foretProfonde` | 7 000 | |
| 18 | `hist-grands` | Fais naître un ours, un bison ou un élan | vétérinaire | `naissanceDe` `['ours', 'bison', 'elan']` | 8 000 | |
| 19 | `hist-habitants-700` | Atteins 700 habitants | Margaux | `habitants` 700 | 10 000 | 6 |
| 20 | `hist-montagne` | Possède 3 espèces de haute montagne | garde forestière | `especes` n 3 biome `hauteMontagne` | 10 000 | |
| 21 | `hist-itinerant` | Achète un animal au marchand itinérant | Margaux | `compteur` `achatsItinerant` n 1 | 12 000 | |
| 22 | `hist-habitants-1000` | Atteins 1 000 habitants | Margaux | `habitants` 1 000 | 20 000 | `'fin'` |

Premières phrases (chaque personnage se présente) : Bastien — « Bonjour, je suis Bastien, le garde de l'étang. Depuis tout petit, je compte les canards et les castors de la roselière. Construis-leur un enclos au bord de l'eau ! » ; Jules — « C'est Jules, de la ferme. J'ai bêché un coin de terre pour un potager : fruits et légumes, ça plaît aux castors comme aux écureuils. Récoltes-en 20 ! » ; Élise — « Élise, la vétérinaire. Les nouveaux animaux ont des besoins nouveaux : un centre bien équipé, c'est moins de soucis. » `STORY_DONE_MESSAGE` : « Toutes les missions sont faites : Clairbois est une grande ville, merci ! De nouvelles aventures arriveront bientôt. »

- [ ] **Step 1 : tests qui échouent**
  - `village.test.ts` : au niveau 3 avec 250 habitants et la mission `hist-habitants-150` réussie → `canLevelUp` = `{ ok: true, level: 4 }` ; au niveau 4 avec 449 habitants → « Il faut 450 habitants (encore 1). » ; au niveau 6 → « Clairbois est déjà une grande ville. » ; l'action `monterNiveau` au niveau 4 → niveau 5.
  - `missions.test.ts` : `STORY.length === 23` ; les index 0, 4, 8 sont inchangés (test existant) ; `storyStart(4) === 11`, `storyStart(5) === 16`, `storyStart(6) === 20` ; exactement une mission par porte 2…6 et une `'fin'` (la dernière) ; une partie à l'index 11, `current: null` → au pas suivant, `current.id === 'hist-etang-enclos'` ; `missionGateOk(state, 4)` vrai pour l'index 11.
  - `session.test.ts` : une sauvegarde vN au Bourg → `levelsNotice` = texte de D16 au premier chargement, `null` au second ; au Village → `null`.
- [ ] **Step 2 :** `npx vitest run tests/sim/village.test.ts tests/sim/missions.test.ts tests/game/session.test.ts` → FAIL.
- [ ] **Step 3 : implémenter** (données ci-dessus ; `runGame` affiche `LEVEL_UP_TEXT[level]` et `levelsNotice` comme `pathsNotice`).
- [ ] **Step 4 :** `npx vitest run` → PASS.
- [ ] **Step 5 :** commit `V2-6 tâche 4 : niveaux 4 à 6 et missions d'histoire avec les nouveaux personnages`.

### Task 5: Tâche 5 — Fruits et légumes, potager — agent · **Sonnet**

**Files :**
- Modify : `src/sim/feeding.ts`, `src/sim/actions.ts` (achat de rations, « Remplir », agrandissement), `src/sim/farm.ts` (étape 4), `src/data/farm.ts` (étape 4), `src/data/missions.ts` (quotidienne des rations), `src/sim/missions.ts` (récompense `legumes`), tout `p.fourrage + p.viande` de `src/` → `pantryTotal(p)`
- Test : `tests/sim/feeding.test.ts`, `tests/sim/farm.test.ts`, `tests/sim/actions.test.ts`, `tests/data/plots.test.ts`

**Interfaces :**
- Consumes : `FOODS`, `pantryTotal` (tâche 3) ; `Plot`, `FARM_PLOTS`, `farmStep`, `acheterParcelle`, `ramasserParcelle` (étape 4).
- Produces : `FARM_PLOTS` gagne `crop: 'fourrage' | 'legumes'` et `unlockLevel?: VillageLevel` ; 4 lignes `crop: 'legumes', unlockLevel: 4` (ids 8 à 11) ; `POTAGER` dans `src/data/farm.ts` = `{ PRICES: [800, 1100, 1500, 2000], PRODUCTION_PER_H: [0.06, 0.09, 0.13], STOCK: [3, 5, 7], UPGRADE: [500, 1000] }` ; événement `recolte { fourrage: number; legumes: number; byPlayer: boolean }` ; action d'achat de rations acceptant `food: 'legumes'` ; `consumptionPerHour` et `autonomyHours` sur les 3 aliments ; `Reward` gagne `legumes?: number`.

- [ ] **Step 1 : tests qui échouent**
  - `feeding.test.ts` : un castor avec `legumes: 0`, `fourrage: 5` mange du fourrage ; avec des légumes, il mange des légumes ; un écureuil sans légumes reste non nourri ; `autonomyHours` d'un parc de castors = légumes / consommation.
  - `actions.test.ts` : garde-manger capacité 100 avec 60 fourrage + 30 viande → acheter 20 légumes n'en met que 10 ; « Remplir » tient compte des légumes ; le prix des légumes suit la remise de la ferme.
  - `farm.test.ts` : une parcelle potager produit des légumes, pas du fourrage ; acheter une parcelle potager au niveau 3 → « Le potager s'ouvre au niveau 4 du village. » ; le 1ᵉʳ potager coûte 800, le 2ᵉ 1 100, indépendamment des parcelles de fourrage ; la limite 2 / 5 / 8 de la ferme ne compte pas les potagers ; le fermier porte les légumes au garde-manger et s'arrête quand il est plein ; `recolte.legumes` et les compteurs `legumesRecoltes` (et `recolteMain` seulement pour le fourrage, comme l'étape 4) avancent.
  - `plots.test.ts` : les emplacements 8 à 11 respectent la règle de place de l'étape 4 (rivière, rues, emplacements de bâtiments, décor, autres parcelles, bord de la carte).
- [ ] **Step 2 :** `npx vitest run tests/sim tests/data` → FAIL.
- [ ] **Step 3 : implémenter.** Placement des 4 potagers par la recherche du D2 de l'étape 4 (grille de 0,25 m, le plus près des champs) ; noter les coordonnées trouvées dans le compte rendu pour l'image montrée à Romain. La quotidienne des rations compte `fourrageAchete`, `viandeAchetee` et `legumesAchetes`.
- [ ] **Step 4 :** `npx vitest run` → PASS.
- [ ] **Step 5 :** commit `V2-6 tâche 5 : fruits et légumes, potager`.

### Task 6: Tâche 6 — Restaurant — agent · **Sonnet**

**Files :**
- Modify : `src/sim/types.ts` (`BuildingType` gagne `'restaurant'` si la tâche 4 ne l'a pas fait), `src/data/economy.ts` (`BUILDINGS.restaurant`, emplacement réservé), `src/data/buildingInfo.ts` (rôle), `src/scene/villageView.ts` (allure D9), `tests/data/slots.test.ts`, `tests/sim/villageActions.test.ts`, `tests/sim/economy.test.ts`

**Interfaces :**
- Consumes : `SLOTS` avec `only?` (étape 2), `BuildingData.unlockLevel: VillageLevel` (élargi ici si besoin).
- Produces : `BUILDINGS.restaurant` avec les chiffres de D9 ; emplacement `{ id: 9, only: 'restaurant', unlockLevel: 5 }` (numéro réel = prochain libre).

- [ ] **Step 1 : tests qui échouent** — construire le restaurant au niveau 4 → « Ce bâtiment se débloque au niveau 5 du village. » ; au niveau 5 avec 8 000 pièces → construit sur son emplacement, refusé ailleurs ; avec 100 visiteurs/h, 20 vont au restaurant et rapportent 120 pièces/h au niveau 1 (plafond 20 clients/h) ; `population` gagne 5 par niveau du restaurant ; le test des emplacements vérifie la distance aux autres emplacements, aux rues, à la rivière, aux décors et aux parcelles.
- [ ] **Step 2 :** `npx vitest run` → FAIL.
- [ ] **Step 3 : implémenter** (données + vue ; fiche : « Le restaurant : les visiteurs y dépensent beaucoup. Plus il est grand, plus il en sert. »).
- [ ] **Step 4 :** `npx vitest run` → PASS.
- [ ] **Step 5 :** commit `V2-6 tâche 6 : restaurant`.

### Task 7: Tâche 7 — Marchand itinérant (règles) — agent · **Sonnet**

**Files :**
- Create : `src/data/traveler.ts`, `src/sim/traveler.ts`, `tests/sim/traveler.test.ts`
- Modify : `src/sim/advance.ts` (appel à chaque pas), `src/sim/village.ts` / action `monterNiveau` (premier passage), `src/sim/actions.ts` (nouvelle action), `src/sim/summary.ts` (ligne de la Gazette), `src/ui/gazetteModel.ts`, `tests/ui/gazetteModel.test.ts`

**Interfaces :**
- Consumes : `Traveler`, `TravelerOffer`, événement `itinerant` (tâche 3) ; `dayKey` / heure locale (`utcOffsetMin`) ; `DecorKind`, catalogue et prix des décorations, `checkDecorPlacement` (étape 5) ; `buyAnimal`-like placement (`acceptsSpecies`).
- Produces (`src/data/traveler.ts`) : `TRAVELER = { FROM_LEVEL: 4, ARRIVE_HOUR: 10, STAY_H: 24, GAP_DAYS: [6, 8], PREGNANT_FACTOR: 1.4, DECO_FACTOR: 3, DECO_EFFECT: 1.5 }`.
- Produces (`src/sim/traveler.ts`) :
  - `nextArrival(time: number, utcOffsetMin: number, minGapDays: number): number` — prochaine heure locale `ARRIVE_HOUR` au moins `minGapDays` jours après `time`.
  - `travelerHere(state: GameState): boolean` — `arrivesAt !== null && arrivesAt <= time < leavesAt`.
  - `travelerStep(state: GameState, events: GameEvent[]): void` — arrivée (offres tirées, `visits++`, événement `arrive`), départ (offres vidées, prochaine arrivée tirée dans `GAP_DAYS` à partir de l'arrivée, événement `depart`).
  - `scheduleFirstVisit(state: GameState): void` — appelé au passage au niveau 4 : `arrivesAt = nextArrival(time, offset, 0)`.
  - Action `{ type: 'acheterItinerant'; offerId: number; encId?: number; x?: number; z?: number }` : animal → comme `buyAnimal` (`pregnantSince = time` pour une gestante), incrémente `achatsAnimaux` et `achatsItinerant` ; décoration → pose via `checkDecorPlacement` avec `rare: true` (`DecorItem` gagne `rare?: true`, effet × `DECO_EFFECT`).
  - `Summary` gagne `itinerant: 'la' | 'passe' | null` ; ligne de la Gazette : « Le marchand itinérant est au village jusqu'à {jour} {heure} h. » ou « Le marchand itinérant est passé pendant ton absence. »

- [ ] **Step 1 : tests qui échouent** (`traveler.test.ts`, `utcOffsetMin = 60`)
  - niveau 3 : `arrivesAt` reste `null`, jamais d'événement ;
  - passage au niveau 4 à 15 h → arrivée le lendemain 10 h locale ; à 9 h → le jour même 10 h ;
  - à l'arrivée : 4 offres (2 animaux rares de zones ouvertes, 1 gestante, 1 décoration) ; au niveau 4 seule la loutre est rare ouverte → offres loutre F **et** loutre M ; aucune offre ne vient d'une zone fermée ;
  - départ 24 h après, offres vides ; prochaine arrivée entre 6 et 8 jours après l'arrivée précédente, toujours à 10 h locale ;
  - acheter après `leavesAt` → « Le marchand itinérant est reparti. » ; une offre déjà achetée → « Introuvable. » ; pas assez d'argent → refus habituel ; la gestante achetée a `pregnantSince === time` et met bas au terme normal ;
  - **absence de 10 jours** rattrapée par `advanceTo` : exactement 1 ou 2 couples arrivée/départ dans les événements, état final cohérent ; **absence plafonnée à 30 jours** : `shiftDates` laisse `arrivesAt` dans le futur ou présent, jamais une visite « déjà finie » avec des offres ;
  - même graine → mêmes offres (déterminisme).
  - `gazetteModel.test.ts` : marchand présent à la fin → « … jusqu'à mardi 10 h. » ; arrivé puis reparti pendant l'absence → « … est passé pendant ton absence. »
- [ ] **Step 2 :** `npx vitest run tests/sim/traveler.test.ts tests/ui/gazetteModel.test.ts` → FAIL.
- [ ] **Step 3 : implémenter** (appel de `travelerStep` après `merchantStep` dans le pas).
- [ ] **Step 4 :** `npx vitest run` → PASS (dont `perf.test.ts`).
- [ ] **Step 5 :** commit `V2-6 tâche 7 : marchand itinérant`.

### Task 8: Tâche 8 — Carte agrandie en 3D : zones, brume, étang, caméra, routes larges et lampadaires — agent · **Sonnet**

**Files :**
- Modify : `src/scene/world.ts` (`MAP` → `MAP_BOUNDS`), `src/scene/cameraRig.ts` (`clampFocus`, `CAMERA_LIMITS.maxDistance` 60 → 75), `src/scene/zonesView.ts` (teintes et brume des 3 zones ; nombre de nappes de brume proportionnel à la surface, au plus 40 par zone, 20 sur téléphone), `src/scene/decor.ts` (étang : disque d'eau, nénuphars `nenuphar`, roseaux `herbe2` ; lisière de sapins autour de la forêt profonde ; rochers autour de la haute montagne ; aucun arbre dans les zones ni l'étang), `src/scene/fence.ts` ou la vue d'enclos (petite mare au centre d'un enclos d'étang, rayon `min(w, d) × 0.2`), `src/scene/path.ts` (style 4), `src/scene/pathsView.ts`, `src/data/paths.ts` (`PATH_STYLE_BY_LEVEL` jusqu'à 6), `src/data/visuals.ts` (teintes des zones, `ROAD = { WIDTH_M: 3, LAMP_EVERY_M: 8, LAMP_MAX: 200 }`)
- Test : `tests/scene/cameraRig.test.ts`, `tests/scene/fog.test.ts`, `tests/scene/path.test.ts`

**Interfaces :**
- Consumes : `ZONES`, `PONDS`, `MAP_BOUNDS` (tâche 3).
- Produces : `PathStyle = 1 | 2 | 3 | 4` ; `PATH_STYLE_BY_LEVEL = { 1: 1, 2: 2, 3: 3, 4: 3, 5: 4, 6: 4 }` ; `lampPositions(seg: { a: PathPoint; b: PathPoint }, every: number, offset: number, blocked: Rect[]): { x: number; z: number }[]` (pur, dans `path.ts`) ; `clampFocus(x, z)` borné par `MAP_BOUNDS`.

- [ ] **Step 1 : tests qui échouent** — `clampFocus(-70, 0)` → `x = -56` ; `clampFocus(0, 50)` → `z = 40` ; `zoneSignText` de l'étang au niveau 3 → « Roselière · s'ouvre au niveau 4 (Petite ville) » (format `s'ouvre au niveau {n} ({nom})` pour les niveaux 4–6 ; les textes V1 « s'ouvre au Village / au Bourg » ne changent pas) ; `lampPositions` d'un segment de 20 m, tous les 8 m, décalés de 1,8 m → 3 lampadaires alternés de part et d'autre ; un lampadaire dans un rect bloqué (enclos) est retiré ; `PATH_STYLE_BY_LEVEL[5] === 4`.
- [ ] **Step 2 :** `npx vitest run tests/scene` → FAIL.
- [ ] **Step 3 : implémenter.** Style 4 : texture de pavés plus claire au centre, bandes de trottoir de 0,4 m de chaque côté ; lampadaires en deux `InstancedMesh` (poteaux, lanternes) dont la lueur passe par `setNightGlow` ; reconstruits seulement quand la clé de `pathsView` change (ajouter les rects des enclos à la clé). Rues du village (`decor.setPathLevel`) au style 4 aux niveaux 5–6.
- [ ] **Step 4 :** `npx vitest run` et `npm run build` → PASS ; le chef regarde dans le navigateur (`?debug`, niveaux 3 → 6) : brume et panneaux des 3 zones, dissipation, étang, mare d'un enclos, routes et lampadaires de nuit (`?heure=23`).
- [ ] **Step 5 :** commit `V2-6 tâche 8 : carte agrandie, nouvelles zones et routes des niveaux 5-6`.

### Task 9: Tâche 9 — Les 31 espèces en 3D (clips Gobkit, balancement, perfs) — agent · **Sonnet**

**Files :**
- Modify : `src/scene/animalActor.ts`, `src/scene/parkView.ts`, `src/data/visuals.ts` (`ANIMALS_PERF = { FAR_M: 45, FAR_STRIDE: 3, NO_SHADOW_ABOVE: 120 }`)
- Test : `tests/scene/animalActor.test.ts`

**Interfaces :**
- Produces : `resolveClip(wanted, available)` reconnaît aussi les clips en minuscules (`walk`, `idle`) ; `hasWalk(available)` vrai pour `walk` ; `animationStride(distance: number, phone: boolean): 1 | 3` ; `castShadows(count: number, phone: boolean): boolean`.

- [ ] **Step 1 : tests qui échouent** — `hasWalk(['idle', 'walk', 'attack'])` → vrai ; `resolveClip('Walk', ['idle', 'walk'])` → `'walk'` ; `resolveClip('Eating', ['idle', 'walk'])` → `'idle'` ; `resolveClip('Idle', ['Armature|Idle'])` inchangé ; `animationStride(50, true) === 3`, `animationStride(50, false) === 1`, `animationStride(10, true) === 1` ; `castShadows(121, true) === false`, `castShadows(121, false) === true`.
- [ ] **Step 2 :** `npx vitest run tests/scene/animalActor.test.ts` → FAIL.
- [ ] **Step 3 : implémenter.** Les alias de clips se lisent sans tenir compte des majuscules ; `parkView` applique le pas d'animation selon la distance à la caméra et coupe les ombres des animaux au-delà du seuil (téléphone) ; un modèle qui échoue au chargement laisse l'espèce invisible avec un message dans la console, sans planter (comme la V1).
- [ ] **Step 4 :** `npx vitest run` → PASS ; le chef regarde chaque nouvelle espèce à côté des animaux Quaternius (`?debug` : donner un couple de chaque) : taille, sens de marche (+Z), balancement des modèles statiques.
- [ ] **Step 5 :** commit `V2-6 tâche 9 : nouvelles espèces animées et perfs d'affichage`.

### Task 10: Tâche 10 — Interface : marchand itinérant, légumes et potager, restaurant, niveaux, crédits — agent · **Sonnet**

**Files :**
- Modify : `src/ui/topBar.ts` (case du marchand itinérant : icône charrette + temps restant, seulement quand il est là ; légumes dans les ressources), `src/ui/merchantPanel.ts` ou nouveau `src/ui/travelerPanel.ts` (offres, « Acheter », choix de l'enclos ; décoration → mode de pose de l'étape 5), `src/scene/villageView.ts` (charrette près du pont, touchable, quand il est là), `src/ui/bottomBar.ts` (ferme : bouton « Légumes », parcelles potager), `src/ui/villagePanel.ts` (niveaux 4–6, seuils, nom du niveau suivant), `src/ui/optionsPanel.ts` (bouton « Crédits »), `src/ui/icons.ts`, `src/style.css`
- Create : `src/data/credits.ts`, `src/ui/creditsPanel.ts`, `tests/data/credits.test.ts`

**Interfaces :**
- Consumes : `travelerHere`, action `acheterItinerant` (tâche 7) ; `FOOD_NAMES` (tâche 3) ; `LEVEL_NAMES` (tâche 3).
- Produces : `CREDITS_LIST: { what: string; title: string; author: string; licence: string; url: string }[]` dans `src/data/credits.ts` (packs CC0, sons, et les 4 CC-BY).

- [ ] **Step 1 : test qui échoue** — `credits.test.ts` : chaque auteur CC-BY de `CREDITS_LIST` apparaît dans `CREDITS.md` (lu avec `fs`) ; chaque entrée a une licence et un lien `https://`.
- [ ] **Step 2 :** `npx vitest run tests/data/credits.test.ts` → FAIL.
- [ ] **Step 3 : implémenter** (textes : « Le marchand itinérant — encore 14 h », « Il vend des animaux qu'on ne trouve nulle part ailleurs. », « Femelle déjà gestante », « Décoration rare ») ; écran de crédits : liste simple, liens en texte, lisible en 375 × 812.
- [ ] **Step 4 :** `npx vitest run` et `npm run build` → PASS ; le chef vérifie dans le navigateur, sur ordinateur et en 375 × 812 : arrivée du marchand (`?debug`), achat d'une loutre, d'une gestante, pose d'une décoration rare, achat de légumes, potager, restaurant, passage aux niveaux 4, 5, 6, crédits.
- [ ] **Step 5 :** commit `V2-6 tâche 10 : interface du marchand itinérant, du potager, du restaurant et crédits`.

### Task 11: Tâche 11 — Rythme des niveaux 4–6 et perfs (joueur automatique) — agent · **Sonnet** + chef · **Opus** (choix des chiffres avec Romain)

**Files :**
- Modify : `tests/balance/bot.ts`, `tests/balance/playthrough.test.ts`, `tests/sim/helpers.ts`, `tests/sim/perf.test.ts`

**Interfaces :**
- Produces : `bigPark31(): GameState` (niveau 6, ≈ 220 animaux des 31 espèces, 25 enclos, potager complet, restaurant) dans les aides de test ; le joueur automatique monte jusqu'au niveau 6.

- [ ] **Step 1 : tests qui échouent** — `perf.test.ts` : 30 jours de rattrapage de `bigPark31()` en **< 2 s** ; `playthrough.test.ts` : le joueur automatique (2 visites par jour) atteint le niveau 6 en **moins de 70 jours**, sans mort de faim.
- [ ] **Step 2 :** `npx vitest run tests/balance tests/sim/perf.test.ts` → FAIL (le joueur s'arrête au niveau 3).
- [ ] **Step 3 : implémenter** — le joueur automatique, en plus de ce que font déjà les étapes 1–5 : monte de niveau dès que possible, construit des enclos dans les nouvelles zones reliés par un chemin, achète des couples des nouvelles espèces, achète et ramasse les potagers, achète des légumes s'il en manque, construit puis améliore le restaurant, achète un animal au marchand itinérant quand il est là et qu'il a la place.
- [ ] **Step 4 :** `npx vitest run` → PASS ; compte rendu : jour de passage aux niveaux 4, 5, 6 (cible D3 : 4 vers le jour 18, 5 vers 32, 6 vers 48) et temps du test de perf.
- [ ] **Step 5 (chef) :** si le rythme s'écarte de la cible de plus d'une semaine, proposer à Romain **2 ou 3 changements** simples (seuils D3, prix des espèces, chiffres du restaurant), appliquer son choix dans `src/data/`, relancer ; noter dans `progress.md`. Le réglage fin reste à l'étape 7.
- [ ] **Step 6 :** commit `V2-6 tâche 11 : joueur automatique jusqu'au niveau 6 et perfs`.

### Task 12: Tâche 12 — Vérification d'ensemble, relecture et publication — chef · **Opus** + relecture · **Opus**

- [ ] **Step 1 :** `npx vitest run` et `npm run build` → tout passe ; noter le nombre de tests.
- [ ] **Step 2 (chef) :** vérification dans le navigateur (serveur de dev, `?debug`, `?heure=14` puis `?heure=23`) : une **copie de la partie de Romain** (sauvegarde vN) se charge sans perte et affiche le message D16 une fois ; passage aux niveaux 4, 5, 6 ; brume qui se dissipe ; enclos et chemins dans les 3 zones ; les 21 espèces visibles et animées ou balancées ; potager, légumes, restaurant ; marchand itinérant (arrivée, achats, départ) ; Gazette après une absence de 8 jours ; routes et lampadaires de nuit ; écran de crédits ; téléphone 375 × 812 avec un grand parc (compteur d'images).
- [ ] **Step 3 :** relecture indépendante de toute la branche par un agent **Opus** (critiques, importants, mineurs) ; corrections par un agent **Sonnet** (Opus si le défaut est subtil) ; relancer les tests.
- [ ] **Step 4 :** mettre à jour `progress.md` (suivi des sous-tâches, décisions de l'étape, ce qui reste à regarder par Romain : textes des personnages, allure des nouvelles espèces, rythme).
- [ ] **Step 5 :** **avec l'accord de Romain seulement** : fusion dans `main`, publication automatique, vérification en ligne.
