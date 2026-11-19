# Le Parc de Clairbois — Document de conception V2 « Le village s'éveille »

*Date : 19 novembre 2026 · Statut : relu (contrôle constructeur fait), à valider par Romain · Complète la conception V1 (`2026-11-12-parc-de-clairbois-v1-design.md`), qui reste valable pour tout ce qui n'est pas changé ici.*

## 1. Intention

**Pourquoi une V2.** La V1 est un prologue : on en fait le tour en deux à trois semaines. Romain veut un jeu qui dure des mois en se connectant un peu chaque jour, avec les mécaniques de la partie zoo de MonZoo (nourrir, nettoyer, soigner, personnel payé, naissances, collection) — en jeu original, et **nettement moins lent** que MonZoo. La feuille de route V2 → V5 forme ce jeu complet ; on la construit dans l'ordre, puis on réfléchira plus loin.

**Ce que la V2 change.** Le joueur passe des corvées à la **gestion** : un personnel obligatoire et payé, de vraies maladies soignées au centre vétérinaire, une ferme qui produit, des chemins qu'il construit et des visiteurs à contenter. Trois nouveaux niveaux du village ouvrent trois nouvelles zones et une dizaine d'espèces d'Europe.

**Critère de réussite.** Les niveaux 1 à 3 gardent à peu près le rythme de la V1 (≈ 18 jours) ; les niveaux 4 à 6 prennent ensuite **environ un mois** en jouant un peu chaque jour (un nouveau niveau toutes les 1 à 2 semaines). Une nouvelle partie dure donc ≈ 7 semaines jusqu'au niveau 6, avec chaque jour quelque chose à vérifier, à décider et à attendre.

**Absence.** Un parc bien tenu (personnel suffisant, stock, caisse) tient **3 jours** sans le joueur sans mort ni dette.

**Ce qui reste au joueur.** Le bouton « Nettoyer » reste ; l'agent d'entretien le fait à sa place. Le repas reste automatique depuis le garde-manger. Une fois le personnel en place, la visite quotidienne devient surtout des **décisions** : embaucher, affecter, construire, acheter, régler le billet, faire les missions, suivre les malades.

**Non-objectifs (V2).** Animaux exotiques et expéditions (V3), laboratoire et variantes rares (V4), saisons et météo (V5), comptes et serveur.

**Anti-objectifs.** Casser la partie en cours de Romain (elle doit continuer, sans perte brutale) ; un jeu qui punit si durement qu'on perd tout en un week-end d'absence ; la lenteur de MonZoo (attentes de plusieurs jours pour tout).

**Contraintes.** Comme la V1 : TypeScript + Three.js, modèles 3D **CC0** uniquement (Quaternius en priorité), sauvegarde locale versionnée avec migration, temps réel rejoué par pas de 10 min (`advanceTo`), règles pures testées, chiffres dans `src/data/`, téléphone et ordinateur.

## 2. Approches considérées

| Approche | Avantage | Inconvénient |
|---|---|---|
| **A. Concevoir toute la V2 d'abord, puis la construire par étapes** *(choisie par Romain)* | Les morceaux dépendent les uns des autres (vétérinaire = personnel, maladies = centre, déco = chemins, niveaux = déblocages) : on les décide ensemble une fois | Un document plus long avant de commencer |
| B. Concevoir chaque étape au moment de la faire | On démarre plus vite | Risque de défaire une étape quand la suivante la contredit |

## 3. Les chemins que l'on construit (étape 1)

- **Rôle** : un enclos doit **toucher un chemin** relié à l'entrée pour être visité. Un enclos non relié ne compte pas dans l'attrait (ses animaux vivent normalement). Le volet de l'enclos le signale (« Pas de chemin : les visiteurs ne le voient pas »).
- **Tracé** : par **segments droits**. On part d'un point d'un chemin existant, on choisit le point d'arrivée ; le segment fantôme est vert ou rouge avec la raison (traverse un enclos, la rivière hors pont, sort de la carte, zone sous la brume), le prix s'affiche en direct (prix par mètre, réglage dans `src/data/`).
- **Allure** : un seul type de chemin, dont l'allure **suit le niveau du village** (terre, gravier, pavés, puis routes larges avec trottoirs et lampadaires aux niveaux 5–6).
- **Tout est modifiable**, y compris les chemins déjà sur la carte, avec deux garde-fous : le **chemin de l'entrée** ne peut pas être détruit ; détruire un chemin n'est pas remboursé et prévient si des enclos perdent leur liaison.
- **Promeneurs** : ils marchent sur le réseau réel (le composant de chemin existe depuis l'étape 1 de la V1).
- **Partie existante** : à l'arrivée de la V2, chaque enclos non relié reçoit gratuitement le plus court chemin vers le réseau.

## 4. Le personnel (étape 2)

**Le personnel est obligatoire.** Cinq métiers :

| Métier | Rôle |
|---|---|
| **Soigneur** | S'occupe d'un **nombre d'animaux** (≈ 12 au départ, plus avec l'expérience), quel que soit le nombre d'enclos ; un grand enclos peut demander deux soigneurs. Repère les maladies dès le premier stade (dépistage, §5). |
| **Agent d'entretien** | Nettoie les enclos qui lui sont confiés ; ramasse les déchets des chemins (§7). |
| **Vétérinaire** | Travaille au centre vétérinaire ; sans lui, on ne soigne pas (§5). |
| **Fermier** | Porte la production des parcelles au garde-manger (§6). |
| **Animateur** | Visites guidées : plus de visiteurs et de satisfaction (§7). |

- **Sans soigneur**, un enclos (ou la part de ses animaux non couverte) **se dégrade vite** : il se salit 2× plus vite, ses animaux sont moins heureux et n'ont plus de naissances. On peut encore nettoyer à la main.
- **Affectation** : soigneurs et agents d'entretien sont affectés à des enclos dans la fiche de l'employé ou de l'enclos ; une proposition automatique (« répartir ») évite la corvée.
- **Embauche** : parmi des **candidats** renouvelés régulièrement (comme le marchand), chacun avec un nom, un métier, un niveau et un salaire. Le nombre d'employés est limité par la **maison du personnel** (§8).
- **Expérience** : chaque employé monte de niveau avec le temps travaillé ; il devient plus efficace (plus d'animaux, plus d'enclos, plus vite) et son salaire augmente un peu.
- **Paie chaque jour** à minuit. Si la caisse ne suffit pas : l'employé **travaille mal** (efficacité réduite) et la caisse passe sous zéro, **dette limitée à une journée de salaires** ; tant qu'elle n'est pas remboursée, on ne peut ni acheter d'animaux ni construire. Personne ne démissionne.
- **Départ** : Margaux présente un **premier soigneur offert** (nouvelle partie, et partie existante à l'arrivée de la V2).
- **Licencier** : possible, sans indemnité.
- **Le soigneur** ne nourrit pas (le repas est automatique) : il dépiste, garde ses animaux heureux et permet les naissances.
- **Visible sur la carte, de façon décorative** : des employés (modèles de personnages CC0) se promènent près de leurs enclos ou bâtiments, comme les promeneurs ; les règles ne dépendent pas de leurs trajets.

## 5. Maladies et centre vétérinaire (étape 3)

**Quatre maladies**, chacune avec sa cause, qui **s'aggravent par stades** (léger → grave → mortel) :

| Maladie | Cause | Particularité |
|---|---|---|
| Parasites | Enclos sale | Rend l'animal triste |
| Indigestion | Faim prolongée | — |
| Blessure | Enclos surpeuplé ; bagarre chez les prédateurs | — |
| Grippe | Hasard, plus fréquente sans vaccin | **Contagieuse** dans l'enclos |

- **On ne soigne qu'au centre vétérinaire**, avec un vétérinaire. Le bouton « Soigner » de la V1 disparaît.
- **Le vétérinaire soigne seul** les malades repérés, même pendant l'absence, et le soin est débité de la caisse. S'il y a plus de malades qu'il ne peut en traiter, une **file d'attente** se forme (visible au centre) : au joueur d'embaucher un autre vétérinaire ou d'améliorer le centre. Les durées des stades sont réglées pour qu'un parc bien équipé ne perde aucun animal en 3 jours d'absence.
- **Centre vétérinaire** : bâtiment du village, constructible **dès le Hameau** et peu cher. Niveau 1 : parasites et indigestion. Les niveaux suivants ajoutent les blessures, la grippe, la **vaccination** (protège de la grippe un temps), la **quarantaine** (quelques places : un malade isolé ne contamine plus son enclos) et des soins plus rapides. Partie existante : le centre est construit et un vétérinaire offert à l'arrivée de la V2.
- **Dépistage** : un animal suivi par un soigneur est repéré au stade léger, quand le soin coûte moins cher. Sans soigneur, la maladie n'est vue qu'au stade grave.
- **La mort reste possible** : une maladie au stade mortel non soignée tue l'animal (annoncé dans la Gazette), comme en V1.
- Le modèle de santé V1 (`Health`) devient une maladie avec type et stade ; les anciens « malade » deviennent une indigestion ou des parasites selon leur cause.

## 6. La ferme qui produit (étape 4)

- **Parcelles sur la carte**, à côté de la ferme, achetées une à une ; on voit les cultures.
- **Production continue** : chaque parcelle produit un peu de fourrage par heure dans son propre petit stock ; pleine, elle s'arrête.
- Le **fermier** porte régulièrement ce stock au garde-manger ; le joueur peut aussi le ramasser d'un clic.
- La viande reste achetée (pas d'élevage pour l'abattoir).
- *Choix du chef :* le **potager** (fruits et légumes, nouvelle nourriture) arrive à l'**étape 6**, avec les espèces qui en mangent, pour ne pas rester sans usage.
- La **grange / silo** agrandit le stock de nourriture produite (§8).

## 7. Confort et satisfaction des visiteurs (étape 5)

- Nouvelle jauge **satisfaction des visiteurs**, nourrie par le confort, la propreté des chemins et la décoration ; elle fait monter ou baisser la **réputation**, donc le nombre de visiteurs.
- **Objets à poser librement sur la carte** ; bancs, poubelles, toilettes et kiosques doivent **toucher un chemin** pour servir :
  - **bancs** : les visiteurs se reposent et dépensent plus au village ;
  - **poubelles** : limitent les déchets ;
  - **fleurs, arbres, fontaines** : décoration, satisfaction ;
  - **toilettes** : un besoin des visiteurs ;
  - **kiosque à boissons** : rapporte un peu.
- **Déchets** : ils apparaissent sur les chemins fréquentés qui manquent de poubelles ; l'agent d'entretien les ramasse (ou le joueur d'un clic). Des chemins sales font baisser la satisfaction.
- **Animateur** : visites guidées, bonus de visiteurs et de satisfaction.

## 8. Niveaux 4 à 6, zones, espèces, bâtiments (étape 6)

**Trois nouveaux niveaux, une zone chacun**, sur une **carte agrandie** (nouvelles terres au bord de la carte actuelle, sous la brume) :

| Niveau | Zone | Espèces envisagées (selon modèles CC0 trouvés) |
|---|---|---|
| 4 | **Étang** et ses rives | castor, loutre, canards, cigogne… |
| 5 | **Forêt profonde** | ours brun, lynx, bison d'Europe, élan… |
| 6 | **Haute montagne** | bouquetin, chamois, aigle, marmotte… |

- Environ **20 espèces** au total, **toutes d'Europe** (les exotiques restent pour les expéditions de la V3). La liste définitive se fait avec Romain d'après les modèles CC0 disponibles ; les packs déjà téléchargés n'ont plus que zèbre, vache et chiens, donc de nouveaux téléchargements par Romain seront nécessaires.
- Chaque passage de niveau : population + mission d'histoire, par un bouton (comme en V1). Missions d'histoire et seuils d'habitants des niveaux 4–6 à écrire.
- *Choix du chef :* une espèce voulue sans modèle animé CC0 peut garder un modèle fixe qui se balance (comme mouton, cochon et lama en V1).
- **Nouveaux bâtiments du village** : centre vétérinaire (Hameau), maison du personnel, grange / silo, restaurant (gros revenu par visiteur, débloqué tard), **musée des trophées** (montre les trophées, un peu d'attrait ; il deviendra le musée des collections de la V3). *Choix du chef :* chaque étape ajoute l'emplacement de village dont son bâtiment a besoin (maison du personnel à l'étape 2, centre vétérinaire à l'étape 3, grange à l'étape 4…), sans attendre la carte agrandie, car les 6 emplacements actuels sont déjà pris ou réservés.
- **Potager** (voir §6) et fruits et légumes comme troisième nourriture.
- **Marchand itinérant** : il passe environ **une fois par semaine pour 24 h**, annoncé dans la Gazette, avec des espèces hors catalogue, des animaux déjà expérimentés ou des objets de décoration rares.

## 9. Trophées et finition (étape 7)

- **Médailles bronze / argent / or** pour des exploits (exemples : 100 naissances, 10 espèces, 30 jours sans mort, 1 000 visiteurs en un jour). Chacune donne une **récompense** ; le musée les montre.
- **Équilibrage** pour viser **environ un mois** de partie V2, avec le joueur automatique de la V1 étendu (salaires, maladies, production, satisfaction).
- Missions quotidiennes nouvelles (embaucher, soigner, ramasser, récolter…), Gazette enrichie (paie, maladies, passage du marchand itinérant).

## 10. Ordre de construction

Une session et un plan par étape, comme pour la V1 :

1. Chemins à construire
2. Personnel (avec la maison du personnel)
3. Maladies et centre vétérinaire
4. Ferme qui produit (parcelles, fermier, grange)
5. Confort, décoration, déchets, satisfaction, animateur
6. Niveaux 4–6, carte agrandie, espèces, potager, restaurant, marchand itinérant
7. Trophées, musée, équilibrage, finition

Chaque étape est publiée et garde la partie de Romain (migration de sauvegarde quand il le faut).

## 11. Laissé au constructeur

Tous les chiffres (prix, salaires, durées des stades, taux de maladie, production, seuils), réglés dans `src/data/` puis ajustés à l'étape 7 ; le détail de l'interface de chaque volet ; la forme exacte de la carte agrandie ; le découpage de chaque étape en sous-tâches.

## 12. Décisions détaillées par étape (questions-votes avec Romain, 19/11/2026)

**Étape 2 — personnel**
- Gestion dans un **volet Personnel** ouvert par une **nouvelle icône de la barre du haut** (employés, candidats, affectations, licenciement).
- **Affectation automatique, modifiable** : le jeu répartit soigneurs et agents d'entretien à chaque embauche, nouvel enclos ou naissance ; le joueur peut changer un employé d'enclos à la main.
- **Partie existante : un seul soigneur offert, tout de suite**, comme une nouvelle partie (pas de délai de grâce) — Romain embauche lui-même la suite.
- **Nombre d'employés limité par la maison du personnel** : 3 sans maison, puis plus à chaque niveau (ordre d'idée 6 / 10 / 15).

**Étape 3 — maladies et centre vétérinaire**
- Le centre a **5 niveaux** (un déblocage par niveau ; proposition du chef : 1 parasites + indigestion, 2 blessures, 3 grippe + quarantaine, 4 vaccination, 5 soins plus rapides et une place de vétérinaire de plus).
- **Vaccination déclenchée par le joueur, par enclos** (« Vacciner l'enclos », payant, protection de quelques jours puis à refaire).
- **Quarantaine au clic du joueur** depuis la fiche de l'animal (pas automatique).
- **Icône au-dessus de l'animal malade** sur la carte, couleur selon le stade.

**Étape 4 — ferme**
- **Parcelles sur 6 à 8 emplacements fixes** autour de la ferme, achetées une à une, de plus en plus chères.
- Ferme complète et améliorée ≈ **la moitié du fourrage** consommé.
- **Chaque parcelle s'améliore** (3 niveaux : production et stock).
- La production gratuite de fourrage de la V1 (amélioration de la ferme) est **remplacée** : l'amélioration de la ferme garde les rations moins chères et débloque des parcelles.

**Étape 5 — confort**
- Satisfaction affichée par une **icône dans la barre du haut** (visage + %), détail au clic (confort, propreté, déco, ce qui manque).
- Chaque objet agit **autour de lui** (sert une portion de chemin, ordre d'idée un banc tous les 20 m).
- **Déchets visibles sur la carte**, ramassés d'un clic ou par l'agent d'entretien.
- Objets **déplaçables gratuitement**, **revendables à moitié prix**.

**Étapes 6 et 7**
- **Nouveaux personnages** dans les missions : Margaux reste la maire ; s'ajoutent par exemple la vétérinaire, le fermier, le garde de l'étang, chacun avec sa petite histoire.
- **Environ 40 trophées**, chacun bronze / argent / or (≈ 120 médailles).
- Récompenses : **pièces** pour bronze et argent, **objet de décoration unique** pour l'or.
- Modèles 3D des nouvelles espèces et objets de décoration **cherchés dès maintenant** (liste à télécharger par Romain).

**Interface d'ensemble** : avant de créer les branches des étapes, Romain veut voir une **image du parc V2** montrant toutes les icônes, barres et volets.
