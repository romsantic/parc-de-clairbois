# Étape 5 — Missions : plan de développement

> **Pour les agents :** sous-skill requis : superpowers:subagent-driven-development (recommandé) ou superpowers:executing-plans pour exécuter ce plan tâche par tâche. Les étapes utilisent des cases à cocher (`- [ ]`).

**Objectif :** le joueur a toujours quelque chose à faire et une raison de revenir. Margaux, la maire, guide les **premiers pas** (9 petites missions avec le bouton concerné mis en évidence). Puis les **missions d'histoire** s'enchaînent, une à la fois ; la dernière de chaque palier ouvre le passage au niveau suivant du village (on branche enfin `missionGateOk`). Chaque jour, **3 missions quotidiennes** renouvelées à minuit, avec une **série** de jours qui récompense la fidélité. Au retour d'une absence, **La Gazette de Clairbois** raconte ce qui s'est passé.

**Architecture :** comme aux étapes précédentes. Les missions sont des **données** (`src/data/missions.ts`) ; un petit **moteur** pur et testé (`src/sim/missions.ts`) mesure l'avancée de chaque mission, la termine, verse la récompense et passe à la suivante. Il tourne **à la fin de chaque pas** (`step()`, donc aussi pendant l'absence) **et juste après chaque action** du joueur (`applyAction`), pour que le retour soit immédiat. L'avancée se lit soit dans l'état du parc (« un café existe », « 3 espèces »), soit dans des **compteurs** cumulés (`stats` : nettoyages, ventes, naissances…) : une mission à compteur retient la valeur du compteur quand elle commence et compte la différence. Ajouter un nouveau type de mission (missions extraordinaires de la V3) = ajouter une sorte d'objectif et sa fonction de mesure, sans rien réécrire. Le format de sauvegarde passe en **version 3** avec une migration. L'interface (zone mission de la barre du bas, volet Missions, bannière, marqueur « ! », Gazette) lit l'état et envoie des actions par `dispatch`.

**Stack :** Three.js, TypeScript strict, Vitest.

**Spec :** `docs/superpowers/specs/2026-11-12-parc-de-clairbois-v1-design.md` — §4 (résumé d'absence), §5 (passage de niveau), §6 (premiers pas, missions d'histoire, quotidiennes), §7 (barre du bas, marqueur « ! », bannière, Gazette).

**Hors périmètre :** missions extraordinaires et animaux rares (V3) ; Gazette complète avec avis et nouvelles (V5) ; équilibrage fin, brume animée, visiteurs sur les chemins (étape 6).

**Qui fait quoi (méthode de Romain) :** chaque tâche indique son agent et son modèle, choisis d'après le tableau de `progress.md`. **Sonnet** pour le code bien délimité, **Haiku** pour le mécanique, **chef** (session d'étape, Opus) pour ce qui passe par Romain, les vérifications dans le navigateur et la relecture finale (agent Opus).

## Décisions de jeu à valider par Romain

Ce sont des **propositions** (tous les chiffres dans `src/data/missions.ts`, faciles à changer après avoir joué).

| Sujet | Proposition |
|---|---|
| **Récompense** *(choix de Romain, 17/11 : bouton)* | Quand la mission est réussie (même pendant l'absence), elle passe en vert avec un bouton **Récupérer** (dans la zone mission de la barre du bas et dans le volet Missions). Un clic verse la récompense (« +100 » s'envole, message « Récompense récupérée : … »), puis la mission suivante arrive. La mission suivante d'histoire ou des premiers pas n'arrive **qu'après** le clic. Une mission du jour réussie mais pas récupérée à minuit est versée d'office (rien n'est perdu). |
| **Ordre** | D'abord les 9 premiers pas avec Margaux, puis les missions d'histoire. Les **missions quotidiennes commencent après les premiers pas** (ou dès qu'on les passe), pour ne pas tout mélanger au début. |
| **Passer le tutoriel** | Bouton « Passer les premiers pas » dans le volet Missions, en deux clics : donne les récompenses des étapes restantes, puis on enchaîne sur les missions d'histoire. |
| **Ancienne partie** *(choix de Romain)* | Elle commence aussi par les premiers pas ; ce qui est déjà fait (café construit, couple de cochons, deuxième enclos) est réussi tout de suite : il suffit de cliquer « Récupérer » pour passer au suivant. Le bouton « Passer » reste possible. |
| **Missions d'histoire déjà couvertes** *(choix de Romain : remplacer)* | La spec prévoyait « Construire le café » au Hameau (déjà fait dans les premiers pas), « débloque le redimensionnement » (il existe déjà) et « 50 habitants » au Village (déjà atteint pour y arriver). Proposition : remplacées, voir le tableau ci-dessous. |
| **Série des quotidiennes** *(choix de Romain : 3 missions ; −25 % sur 1 achat)* | Un jour compte si **les 3 missions du jour** sont faites. Au **7ᵉ jour** de suite : **−25 % sur le prochain achat** chez le marchand (bon gardé jusqu'à ce que tu choisisses l'animal sur lequel l'utiliser *(choix de Romain, 17/11)*), puis la série continue (nouveau bon tous les 7 jours). Sauter un jour remet la série à zéro, rien d'autre. |
| **Minuit** | Minuit à l'heure de l'appareil. Pendant une longue absence, les jours manqués cassent la série ; au retour, 3 nouvelles missions du jour. |
| **Gazette** | S'ouvre toute seule au retour si l'absence a duré **au moins 1 heure**. L'icône Gazette de la barre du bas la rouvre à tout moment (dernière édition). |

**Premiers pas avec Margaux** (une à la fois ; le bouton concerné clignote doucement)

| # | Mission | Réussie quand… | Bouton mis en évidence | Récompense |
|---|---|---|---|---|
| 1 | Ouvrir la fiche de l'enclos des moutons | le volet « Animaux de l'enclos » est ouvert | Détails (après avoir cliqué l'enclos) | 20 pièces |
| 2 | Acheter 20 fourrages à la ferme | 20 fourrages achetés | la ferme, puis Fourrage ×10 | 20 fourrages |
| 3 | Nettoyer l'enclos | un nettoyage | Nettoyer | 10 pièces |
| 4 | Régler le prix du billet | le billet est validé une fois | case Billet en haut | 20 pièces |
| 5 | Construire le café | le café existe | l'emplacement libre | 150 pièces |
| 6 | Poser un deuxième enclos dans la prairie | 2 enclos de prairie | la prairie | 150 pièces |
| 7 | Acheter un couple de cochons | une truie et un verrat adultes au parc | Marchand | 100 pièces |
| 8 | Attendre la première gestation | une femelle devient gestante | — (Margaux explique les conditions) | 20 fourrages |
| 9 | Vérifier l'autonomie | la case Autonomie est ouverte (petit volet qui explique) | case Autonomie en haut | 50 pièces |

Calcul : avec 500 pièces au départ, les récompenses suffisent pour enchaîner café (300), enclos (~130 à 190) et cochons (300) sans attendre.

**Missions d'histoire** (présentées par un habitant ; la dernière du palier ouvre le niveau suivant, en plus des habitants)

| Palier | Mission | Présentée par | Récompense |
|---|---|---|---|
| Hameau | Première naissance au parc | Margaux | 150 pièces + 30 fourrages |
| Hameau | Améliorer la ferme *(remplace « Construire le café »)* | Le fermier | 200 pièces |
| Hameau | Posséder 3 espèces *(récompense en pièces : le redimensionnement existe déjà)* | Margaux | 300 pièces |
| Hameau | 20 visiteurs par heure → **ouvre le passage au Village** | Margaux | 400 pièces |
| Village | Construire l'auberge | L'aubergiste | 500 pièces |
| Village | Posséder 2 espèces de forêt | La garde forestière | 800 pièces |
| Village | 2 jours d'autonomie au garde-manger | Le fermier | 100 fourrages + 50 viandes |
| Village | 150 habitants *(au lieu de 50 ; choix de Romain, 17/11)* → **ouvre le passage au Bourg** | Margaux | 1 000 pièces |
| Bourg | Faire naître un loup ou un taureau | La garde forestière | 1 500 pièces |
| Bourg | Posséder les 10 espèces | Margaux | 3 000 pièces |
| Bourg | 250 habitants *(choix de Romain, 17/11)* → **fin de la V1** : grande fête, message de Margaux | Margaux | 5 000 pièces |

Après la dernière : « Toutes les missions sont faites, merci ! De nouvelles aventures arriveront bientôt. »

**Missions quotidiennes** (3 tirées au hasard chaque jour parmi celles possibles ; récompense × niveau du village)

| Mission | Possible si… | Récompense (Hameau) |
|---|---|---|
| Nettoyer 2 fois | toujours | 30 pièces |
| Accueillir 50 × niveau visiteurs | toujours | 40 pièces |
| Acheter 30 rations | il y a une ferme | 15 fourrages |
| Vendre un animal | un animal vendable | 50 pièces |
| Acheter un animal | toujours | 40 pièces |
| Une naissance | un couple adulte dans un enclos | 50 pièces + 10 fourrages |
| Gagner 300 × niveau pièces | toujours | 30 pièces |
| Soigner un animal | un animal malade | 30 pièces |

## Contraintes globales

- Tous les textes et chiffres des missions dans `src/data/missions.ts` ; aucune valeur en dur dans `sim/` ni l'interface.
- La simulation reste pure (aucun DOM, aucune horloge système) : l'heure locale arrive par `state.utcOffsetMin` (mis à jour par la session au chargement).
- Une mission ne recule jamais : une fois réussie, elle reste réussie ; sa récompense n'est versée qu'**une seule fois**, au clic sur **Récupérer** (un double-clic ne la verse pas deux fois).
- Les récompenses en nourriture respectent la place du garde-manger (le surplus est perdu, le message le dit : « +20 fourrages (garde-manger plein : 5 perdus) »).
- Format de sauvegarde **version 3** ; une partie v2 se charge sans rien perdre (migration écrite en clair, testée).
- Toutes les actions passent par `dispatch` ; les actions d'observation (« fiche ouverte », « autonomie vue ») sont **silencieuses** (ni message, ni éclair vert).
- Textes visibles en français ; noms d'animaux en texte seulement (jamais en HTML).
- Barre du bas : ligne ≤ 48 px ; volets ≤ 40 % de la hauteur ; la bannière « Nouvelle mission » ne cache jamais la barre du haut.

## Points de vigilance

1. **Ancienne sauvegarde v2 sur le téléphone de Romain** (café, cochons, peut-être niveau 2) : elle se charge, commence les premiers pas, et les étapes déjà faites sont réussies aussitôt (un clic sur Récupérer chacune) ; si le village est déjà au niveau 2, les missions d'histoire commencent au palier Village. → test de migration (tâche 1) + test du moteur (tâche 2) + essai à la main (tâche 7).
2. **30 jours d'absence** : les quotidiennes se renouvellent 30 fois sans bloquer, la série retombe à 0, les quotidiennes réussies mais pas récupérées sont versées d'office à minuit (une seule fois), l'histoire attend le clic sans avancer, et le rattrapage reste < 2 s. → tests (tâches 2 et 3).
3. **Passage de niveau** : impossible tant que la dernière mission du palier n'est pas faite, même avec assez d'habitants ; la raison s'affiche dans le volet du village. → tests de `canLevelUp` (tâche 2).
4. **Minuit et changement d'heure** : un pas qui franchit minuit renouvelle les quotidiennes une seule fois ; un fuseau différent (`utcOffsetMin`) décale bien minuit. → tests (tâche 3).
5. **Mission impossible** (ex. « vendre un animal » sans animal vendable) : jamais tirée ; et si le joueur vend tout après le tirage, la mission reste simplement non faite. → tests (tâche 3).

---

### Task 1 : État version 3, compteurs et migration — *Sonnet*

**Fichiers :**
- Modifier : `src/sim/types.ts`, `src/sim/newGame.ts`, `src/sim/advance.ts` (`step`, `shiftDates`), `src/sim/actions.ts` (`applyAction` compte les actions réussies), `src/sim/breeding.ts`, `src/sim/economy.ts`, `src/save/migrations.ts`, `src/save/save.ts` (`looksLikeGame`), `src/game/session.ts` (`utcOffsetMin`), `tests/sim/helpers.ts`
- Test : `tests/save/migrations.test.ts`, `tests/sim/stats.test.ts`

**Interfaces :**
- Produit (`types.ts`) :
  - `type StatKey = 'nettoyages' | 'fourrageAchete' | 'viandeAchetee' | 'ventes' | 'achatsAnimaux' | 'naissances' | 'gestations' | 'visiteurs' | 'piecesGagnees' | 'soins' | 'billetsRegles' | 'ficheEnclosVue' | 'autonomieVue' | 'ameliorations'`
  - `interface Stats { counts: Record<StatKey, number>; birthsBySpecies: Partial<Record<SpeciesId, number>> }`
  - `interface MissionProgress { id: string; base: number /* valeur du compteur au début */; done: boolean /* réussie */; claimed: boolean /* récompense récupérée */ }`
  - `interface MissionsState { tutorial: { step: number /* 0..9, 9 = fini */; current: MissionProgress | null; skipped: boolean }; story: { index: number; current: MissionProgress | null }; daily: { dayKey: number; list: MissionProgress[]; streak: number; lastFullDay: number | null; coupons: number }; unread: boolean /* nouvelle mission pas encore lue → « ! » */ }`
  - `GameState` : `version: 3` ; nouveaux champs `stats: Stats`, `missions: MissionsState`, `utcOffsetMin: number`.
  - `GameEvent` gagne `{ kind: 'mission'; at: number; track: 'tutoriel' | 'histoire' | 'quotidienne'; id: string }` et `{ kind: 'quotidiennes'; at: number }` (renouvelées).
- Produit : `CURRENT_VERSION = 3`, `MIGRATIONS[2]` en clair : `stats` à zéro (sauf `visiteurs = totalVisitors`), `missions` = premiers pas à l'étape 0, histoire à l'index 0 (palier 1) ou au premier index du palier 2/3 si `village.level` vaut 2 ou 3 (lire l'index depuis une constante écrite dans la migration, pas depuis les données), quotidiennes vides (`dayKey: -1`), `unread: true`, `utcOffsetMin: 0`.
- Compteurs : `applyAction` incrémente après une action réussie (nettoyer → `nettoyages`, acheterRations → `fourrageAchete`/`viandeAchetee` de `n`, vendre → `ventes`, acheterAnimal → `achatsAnimaux`, soigner/soignerTout → `soins` (nombre d'animaux), billet → `billetsRegles`, ameliorer → `ameliorations`) ; `breedingStep` → `naissances`, `birthsBySpecies`, `gestations` ; `economyStep` → `visiteurs`, `piecesGagnees` (billets + village).
- Nouvelle action `{ type: 'vu'; what: 'ficheEnclos' | 'autonomie' }` → incrémente le compteur correspondant (toujours réussie).
- `session.ts` règle `state.utcOffsetMin = -new Date(now).getTimezoneOffset()` au chargement (avant le rattrapage).

- [ ] **Étape 1 : écrire les tests qui échouent** — une partie v2 (copie littérale) → `version: 3`, `stats.counts.visiteurs` = son `totalVisitors`, autres compteurs 0, `missions.tutorial.step` 0 ; une v2 au niveau 2 → histoire au premier index du palier Village ; `newGame` → v3, compteurs à 0 ; nettoyer → `nettoyages` 1 ; acheter 10 fourrages → `fourrageAchete` 10 ; action refusée → aucun compteur ne bouge ; une naissance pendant `advanceTo` → `naissances` 1 et `birthsBySpecies.mouton` 1 ; 1 h de visites → `visiteurs` et `piecesGagnees` > 0 ; `vu` autonomie → `autonomieVue` 1 ; v3 sans `missions` → `illisible`.
- [ ] **Étape 2 : `npm test`** → ÉCHEC.
- [ ] **Étape 3 : implémenter** ; mettre à jour `emptyState` des tests pour que les 338 tests existants repassent.
- [ ] **Étape 4 : `npm test`** → réussi.
- [ ] **Étape 5 : commit** — `Sauvegarde v3 : compteurs et état des missions (migration v2 → v3)`

### Task 2 : Données des missions et moteur (premiers pas + histoire + passage de niveau) — *Sonnet*

**Fichiers :**
- Créer : `src/data/missions.ts`, `src/sim/missions.ts`
- Modifier : `src/sim/village.ts` (`missionGateOk`), `src/sim/advance.ts` (`step` appelle `missionsStep` en dernier), `src/sim/actions.ts` (`applyAction` appelle `updateMissions` après une action réussie ; nouvelle action `passerTutoriel`), `src/sim/summary.ts`
- Test : `tests/sim/missions.test.ts`, `tests/sim/village.test.ts`

**Interfaces :**
- Produit (`data/missions.ts`) :
  - `type Objective = { kind: 'compteur'; stat: StatKey; n: number } | { kind: 'batiment'; building: BuildingType; level?: 1 | 2 | 3 } | { kind: 'especes'; n: number; biome?: Biome } | { kind: 'couple'; species: SpeciesId } | { kind: 'enclos'; biome: Biome; n: number } | { kind: 'visiteursH'; n: number } | { kind: 'habitants'; n: number } | { kind: 'autonomie'; hours: number } | { kind: 'naissanceDe'; species: SpeciesId[] }`
  - `interface Reward { coins?: number; fourrage?: number; viande?: number }`
  - `interface MissionDef { id: string; title: string /* une ligne */; text: string /* ce que dit l'habitant */; giver: string; objective: Objective; reward: Reward; highlight?: HighlightId; gate?: 2 | 3 | 'fin' }` ; `type HighlightId = 'detailsEnclos' | 'ferme' | 'nettoyer' | 'billet' | 'emplacementLibre' | 'prairie' | 'marchand' | 'autonomie'`
  - `TUTORIAL: MissionDef[]` (9), `STORY: MissionDef[]` (11, valeurs des tableaux ci-dessus), `DAILY_POOL` (tâche 3), `MISSIONS_TUNING = { DAILY_COUNT: 3, STREAK_DAYS: 7, COUPON_DISCOUNT: 0.25, GAZETTE_MIN_ABSENCE_H: 1 }`.
- Produit (`sim/missions.ts`) :
  - `progress(state, def, mp): { value: number; target: number }` — une fonction par sorte d'objectif (table `MEASURES: Record<Objective['kind'], …>` : ajouter une sorte = ajouter une ligne).
  - `currentMission(state): { track: 'tutoriel' | 'histoire'; def: MissionDef; mp: MissionProgress } | null`
  - `updateMissions(state, events)` (en place) : démarre la mission suivante si besoin (`base` = compteur actuel, `unread = true`), la marque réussie (`done = true`, événement `mission`) quand `value ≥ target` — **sans verser la récompense** ; la mission suivante (premiers pas ou histoire) ne démarre qu'après `claimMission` ; à la fin des premiers pas, l'histoire commence au palier du niveau actuel du village.
  - `missionsStep(state, events)` = `updateMissions` (+ quotidiennes en tâche 3).
  - `giveReward(state, reward): { lost: number }` — nourriture dans la limite du garde-manger.
  - `claimMission(state, track, id?): ActionResult` — refus `"Cette mission n'est pas encore réussie."` ou `"Récompense déjà récupérée."` ; verse la récompense (`giveReward`), `claimed = true`, passe à la mission suivante et appelle `updateMissions` (la suivante peut être réussie aussitôt, ex. café déjà construit).
  - `skipTutorial(state): ActionResult` — refus `"Les premiers pas sont déjà terminés."` ; verse les récompenses des étapes restantes, `skipped = true`.
- `missionGateOk(state, level)` = la mission d'histoire marquée `gate: level` est faite (index d'histoire au-delà).
- `Action` gagne `{ type: 'recuperer'; track: 'tutoriel' | 'histoire' | 'quotidienne'; id?: string }`, `{ type: 'passerTutoriel' }` et `{ type: 'lireMission' }` (met `unread = false`, silencieuse).
- `Summary` gagne `missions: string[]` (titres des missions réussies).

- [ ] **Étape 1 : écrire les tests qui échouent** — nouvelle partie : mission courante = premier pas n°1 ; `vu ficheEnclos` → pas n°1 réussi, pièces inchangées, mission n°2 **pas** démarrée ; `recuperer` → +20 pièces, mission n°2 démarrée ; deuxième `recuperer` → refus « déjà récupérée » ; `recuperer` d'une mission pas réussie → refus ; acheter 10 puis 10 fourrages → n°2 réussi ; une partie qui a déjà le café et 2 enclos de prairie : arrivée au pas n°5 → réussi aussitôt ; `recuperer` → n°6 démarre et est réussi aussitôt ; `passerTutoriel` au pas n°3 → récompenses des pas 3 à 9 versées, histoire au palier 1 ; deuxième `passerTutoriel` → refus ; au palier Hameau, « Posséder 3 espèces » réussi avec mouton + cochon + âne ; `canLevelUp` avec 60 habitants mais la mission « 20 visiteurs/h » pas faite → « Il faut d'abord terminer la mission du palier. » ; une fois faite → ok ; récompense nourriture avec garde-manger presque plein → `lost` > 0 ; tutoriel fini au niveau 2 → histoire au premier mission du palier Village ; dernière mission faite → `currentMission` null ; 30 jours d'absence avec une mission d'histoire réussie → elle attend, aucune pièce versée pour elle, l'histoire n'avance pas.
- [ ] **Étape 2 : `npm test`** → ÉCHEC.
- [ ] **Étape 3 : implémenter.**
- [ ] **Étape 4 : `npm test`** → réussi.
- [ ] **Étape 5 : commit** — `Missions : premiers pas avec Margaux, histoire, passage de niveau`

### Task 3 : Missions quotidiennes, série et bon de réduction — *Sonnet*

**Fichiers :**
- Modifier : `src/data/missions.ts` (`DAILY_POOL`), `src/sim/missions.ts`, `src/sim/merchant.ts` (`buyAnimal` applique le bon), `src/sim/summary.ts`
- Test : `tests/sim/daily.test.ts`, `tests/sim/merchant.test.ts`

**Interfaces :**
- Produit (`data/missions.ts`) : `DAILY_POOL: (MissionDef & { possible: DailyCondition; scale: boolean })[]` avec `type DailyCondition = 'toujours' | 'ferme' | 'animalVendable' | 'couple' | 'malade'` (valeurs du tableau ; objectifs « 50 × niveau » et récompenses × niveau quand `scale`).
- Produit (`sim/missions.ts`) :
  - `dayKey(time, utcOffsetMin): number` — numéro du jour local (`floor((time + offset × 60 000) / DAY_MS)`).
  - `dailyStep(state, events)` : si `dayKey` a changé → si le jour précédent avait ses 3 missions faites, `streak` déjà compté ; sinon `streak = 0` ; tirage de 3 missions **différentes** parmi les possibles (hasard de la partie), `base` = compteurs actuels, événement `quotidiennes`. Ne tire rien tant que les premiers pas ne sont pas finis ou passés. Mesure et marque réussies les quotidiennes comme les autres ; chacune se récupère par `recuperer` avec son `id` ; au changement de jour, celles réussies mais pas récupérées sont versées d'office ; quand les 3 sont **réussies** (récupérées ou non) : `streak++`, `lastFullDay = dayKey` ; si `streak % 7 === 0` → `coupons++`.
  - `buyAnimal` : s'il y a un bon, prix × (1 − 0,25) arrondi, `coupons--` ; le volet marchand affichera le prix réduit (tâche 5).
- `Summary` gagne `quotidiennesRenouvelees: boolean`, `serie: number`.

- [ ] **Étape 1 : écrire les tests qui échouent** — `dayKey` à 23 h 50 et 0 h 10 locales (offset +60) → jours consécutifs ; un pas qui franchit minuit → 3 nouvelles missions, une seule fois ; jamais deux fois la même ; sans animal vendable → « Vendre un animal » jamais tirée (sur 50 graines) ; avant la fin des premiers pas → aucune quotidienne ; 3 réussies → `streak` 1 ; une réussie non récupérée puis minuit → sa récompense versée une fois ; jour suivant non terminé puis minuit → `streak` 0 ; 7 jours complets (simulés) → `coupons` 1 ; acheter un cochon à 150 avec un bon → −113 pièces, `coupons` 0 ; même graine → même tirage ; 30 jours d'absence → 30 renouvellements au plus, `streak` 0, < 2 s.
- [ ] **Étape 2 : `npm test`** → ÉCHEC.
- [ ] **Étape 3 : implémenter.**
- [ ] **Étape 4 : `npm test`** → réussi.
- [ ] **Étape 5 : commit** — `Missions quotidiennes : tirage à minuit, série, bon de réduction`

### Task 4 : Ajuster les petits textes et fonctions d'affichage des missions — *Haiku*

**Fichiers :**
- Modifier : `src/ui/format.ts`
- Test : `tests/ui/format.test.ts`

**Interfaces :**
- Produit : `formatReward(r: Reward): string` → `'150 pièces + 30 fourrages'`, `'20 fourrages'`, `'1 000 pièces'` (espace fine des milliers comme ailleurs) ; `formatProgress(value, target): string` → `'12/20'` (valeur arrondie vers le bas, jamais au-delà de la cible) ; `formatAbsence(ms): string` → `'3 h 20'`, `'2 jours et 5 h'`, `'45 min'`.

- [ ] **Étape 1 : écrire les tests qui échouent.**
- [ ] **Étape 2 : `npm test`** → ÉCHEC.
- [ ] **Étape 3 : implémenter.**
- [ ] **Étape 4 : `npm test`** → réussi.
- [ ] **Étape 5 : commit** — `Textes des missions : récompenses, avancée, durée d'absence`

### Task 5 : Interface des missions — *Sonnet*

**Fichiers :**
- Créer : `src/ui/missionPanel.ts`, `src/ui/missionBanner.ts`, `src/ui/highlight.ts`, `src/ui/autonomyPanel.ts`
- Modifier : `src/ui/bottomBar.ts` (zone mission, bouton Détails → `vu ficheEnclos`), `src/ui/topBar.ts` (case Autonomie cliquable), `src/ui/merchantPanel.ts` (prix avec bon), `src/ui/villagePanel.ts` (raison de mission), `src/scene/decor.ts` (le « ! » s'affiche seulement si `missions.unread`), `src/game/runGame.ts` (dispatch silencieux, messages de réussite, pulse des récompenses), `src/main.ts`, `src/style.css`, `src/ui/debugPanel.ts`

**Interfaces :**
- Zone mission de la barre du bas : icône cible + titre de la mission courante + avancée (`12/20`) + « ☀ 1/3 » pour les quotidiennes ; quand une mission est réussie, la zone passe en vert avec un bouton **Récupérer** (récompense affichée) ; clic sur le reste de la zone → volet Missions.
- Volet Missions (`missionPanel.ts`) : en haut, la mission courante avec le nom et le texte de l'habitant (« Margaux, la maire : … »), l'avancée, la récompense et **Récupérer** quand elle est réussie ; pendant les premiers pas, « Étape 3 sur 9 » et le bouton **Passer les premiers pas** (deux clics, comme la vente) ; en dessous, les 3 quotidiennes (avancée, récompense, **Récupérer** quand réussie, coche verte une fois récupérée) et « Série : 3 jours · bon de réduction au 7ᵉ » ; bons disponibles. Ouvrir le volet envoie `lireMission`.
- Bannière (`missionBanner.ts`) : à chaque nouvelle mission d'histoire ou premier pas, « Nouvelle mission — titre » apparaît au-dessus de la barre du bas 4 s puis glisse vers la zone mission ; à la réussite, « Mission réussie ! Récupère ta récompense » ; au clic sur Récupérer, « +100 » s'envole des ressources concernées.
- Mise en évidence (`highlight.ts`) : `setHighlight(id: HighlightId | null)` ; les boutons concernés portent `data-guide="…"` ; un anneau doré qui pulse doucement autour de l'élément visible. Pour la ferme, l'emplacement libre et la prairie (sur la carte), le texte de Margaux dit où cliquer et le « ! » doré se place au-dessus de la cible au lieu de la mairie (`decor.setMarker(x, z)`).
- Volet Autonomie (`autonomyPanel.ts`, clic sur la case) : stock fourrage/viande, consommation par jour, autonomie, rappel « orange sous 1 jour, rouge sous 6 h ; sans nourriture : affamé à 12 h, malade à 24 h » ; envoie `vu autonomie`.
- Marchand : avec un bon, le prix barré et le prix réduit, « Bon de réduction −25 % ».
- Volet du village : la raison « Il faut d'abord terminer la mission : 20 visiteurs par heure ».
- `?debug` : « Finir la mission » (remplit la mission courante), « Jour suivant » (avance jusqu'au prochain minuit).

- [ ] **Étape 1 : implémenter.**
- [ ] **Étape 2 : `npm test`, `npm run build`** → réussis.
- [ ] **Étape 3 : vérifier à la main (chef)** — nouvelle partie : la bannière et le « ! » apparaissent, le bouton Détails pulse ; enchaîner les 9 premiers pas en suivant seulement les indications ; « Passer les premiers pas » sur une autre partie ; quotidiennes visibles après ; mode mobile : ligne ≤ 48 px.
- [ ] **Étape 4 : commit** — `Interface des missions : barre, volet, bannière, mise en évidence`

### Task 6 : La Gazette de Clairbois (résumé d'absence) — *Sonnet*

**Fichiers :**
- Créer : `src/ui/gazette.ts`
- Modifier : `src/game/session.ts` (durée d'absence), `src/game/runGame.ts`, `src/ui/bottomBar.ts` (icône Gazette activée), `src/style.css`
- Test : `tests/game/session.test.ts`

**Interfaces :**
- `Session` gagne `absentMs: number`.
- Fenêtre « La Gazette de Clairbois » (allure de petit journal, titre, date du jour) : « Tu étais absent 5 h 20 » ; pièces gagnées, visiteurs ; naissances ; nourriture mangée et autonomie restante ; malades ; morts (noms en texte) ; missions réussies pendant l'absence (« à récupérer ») ; « 3 nouvelles missions du jour » et la série ; un titre à la une choisi selon le plus marquant (une mort > des naissances > les recettes). Bouton **Retour au parc**.
- S'ouvre au chargement si `absentMs ≥ 1 h` ; l'icône Gazette la rouvre (dernière édition gardée en mémoire de la page ; « Rien de neuf depuis ton arrivée » s'il n'y en a pas).

- [ ] **Étape 1 : écrire le test qui échoue** — `startSession` 5 h après la dernière sauvegarde → `absentMs` = 5 h ; nouvelle partie → 0.
- [ ] **Étape 2 : `npm test`** → ÉCHEC.
- [ ] **Étape 3 : implémenter.**
- [ ] **Étape 4 : `npm test`, `npm run build`** → réussis.
- [ ] **Étape 5 : vérifier à la main (chef)** — avancer de 6 h avec `?debug` puis recharger → la Gazette s'ouvre avec les bons chiffres ; l'icône la rouvre ; téléphone : lisible sans défilement horizontal.
- [ ] **Étape 6 : commit** — `La Gazette de Clairbois : résumé d'absence`

### Task 7 : Vérification d'ensemble, relecture et publication — *chef + relecture Opus*

- [ ] **Étape 1 :** `npm test`, `npm run build` → réussis.
- [ ] **Étape 2 :** à la main, sans `?debug` : nouvelle partie, les 9 premiers pas jusqu'au bout ; première mission d'histoire ; quotidiennes ; recharger → tout est conservé ; coller une sauvegarde v2 (café + cochons) dans `localStorage` → les premiers pas déjà faits se valident ; `?debug` : passage au Village refusé tant que la mission du palier n'est pas faite ; Gazette après une absence simulée ; mode mobile.
- [ ] **Étape 3 :** relecture indépendante de la branche (agent Opus) → corrections (Sonnet, Opus si subtil), un commit.
- [ ] **Étape 4 :** fusion dans `main` **après accord de Romain** ; vérifier https://romsantic.github.io/parc-de-clairbois/ ; mettre `progress.md` à jour (étape 5 faite, réglages retenus, ce qui reste pour l'étape 6).
