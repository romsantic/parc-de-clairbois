# Le Parc de Clairbois — Document de conception V1

*Date : 12 novembre 2026 · Statut : en relecture*

## 1. Intention

**Pour qui, pourquoi.** Un jeu personnel pour retrouver le plaisir des jeux de gestion de zoo dans le navigateur (dans l'esprit de MonZoo, en jeu original). On revient régulièrement faire grandir son parc, pendant des semaines.

**Critère de réussite de la V1.** Le joueur a envie de revenir chaque jour : vérifier ses animaux, découvrir les naissances, réinvestir, avancer dans les missions.

**Hors périmètre V1.** Comptes, serveur, multijoueur, synchronisation entre appareils (la sauvegarde est propre à chaque navigateur).

## 2. Concept

Le joueur reprend un terrain en friche à l'orée de **Clairbois**, un village endormi. Il démarre avec un peu d'argent, une zone de prairie, un premier enclos et un couple de moutons.

**Boucle principale**
1. Des animaux bien soignés attirent des visiteurs, qui paient un billet.
2. L'argent sert à acheter de la nourriture, construire des enclos, acheter des espèces.
3. Plus d'espèces et des animaux plus heureux donnent plus d'attrait, donc plus de visiteurs.
4. Les touristes dépensent aussi au village (café, boutique, auberge) : revenus et habitants supplémentaires.
5. Un village plus grand débloque de nouvelles zones, de nouveaux biomes et des espèces plus rares.

**Temps.** Le jeu tourne en temps réel, que le joueur soit là ou non. Au retour, le temps écoulé est rejoué et un résumé s'affiche.

**Objectifs.** Pas de fin. Fil conducteur : missions, liste de collection des espèces, niveaux du village.

## 3. Le zoo

### Enclos : zones et redimensionnement
- Le côté zoo de la carte est découpé en **zones de biome** : **prairie** (départ), **forêt** (niveau 2), **montagne** (niveau 3). Une zone verrouillée reste dans la brume.
- Dans une zone débloquée, le joueur **pose un enclos rectangulaire** puis **tire sur ses coins** pour choisir sa taille et ses proportions. Un enclos accueille une seule espèce, du biome de sa zone.
- Contraintes de pose : l'enclos reste entièrement dans sa zone, ne chevauche ni un autre enclos ni un chemin ; côté minimal 6 m. Pendant le réglage, la clôture fantôme est verte si la pose est possible, rouge sinon, avec la raison.
- **Prix** = clôture (par mètre de périmètre) + aménagement (par m²), affiché en direct pendant le réglage.
- **Capacité** = surface ÷ espace nécessaire par animal de l'espèce : mouton 20 m², cochon 15, âne 30, alpaga 25, renard 12, cerf 40, cheval sauvage 50, lama 25, taureau 50, loup 30.
- Un enclos existant peut être **agrandi ou rétréci** plus tard (on paie la différence ; pas de remboursement). Rétrécir est refusé si la nouvelle capacité est inférieure au nombre d'animaux présents.
- Un enclos plein bloque les naissances ; un enclos surpeuplé fait baisser le bonheur.

### Espèces V1

Liste arrêtée le 12/11/2026 d'après les modèles 3D CC0 disponibles (voir §8). Le parc commence comme une petite ferme-parc ; les animaux deviennent plus sauvages avec les niveaux. Les espèces exotiques (ours, grands félins…) arriveront avec les expéditions (V3).

| Biome | Espèce | Prix adulte | Gestation | Portée | Attrait | Régime | Rations/jour | Modèle |
|---|---|---|---|---|---|---|---|---|
| Prairie | Mouton *(départ)* | 120 | 2 h | 1–2 | 1 | fourrage | 1 | pack ferme Quaternius |
| Prairie | Cochon | 150 | 3 h | 2–4 | 1 | les deux | 2 | pack ferme Quaternius |
| Prairie | Âne | 400 | 8 h | 1 | 2 | fourrage | 3 | Donkey |
| Prairie | Alpaga | 600 | 10 h | 1 | 2 | fourrage | 3 | Alpaca |
| Forêt | Renard roux | 700 | 6 h | 2–4 | 2 | viande | 1 | Fox |
| Forêt | Cerf | 1 200 | 12 h | 1 | 3 | fourrage | 3 | Deer (femelle) / Stag (mâle) |
| Forêt | Cheval sauvage | 1 500 | 14 h | 1 | 3 | fourrage | 4 | Horse / Horse_White |
| Montagne | Lama | 900 | 10 h | 1 | 2 | fourrage | 3 | pack ferme Quaternius |
| Montagne | Taureau des montagnes | 2 000 | 18 h | 1 | 3 | fourrage | 5 | Bull (mâle) / Cow (femelle) |
| Montagne | Loup gris | 2 500 | 16 h | 2–4 | 4 | viande | 3 | Wolf |

Durées en heures réelles. Tous les chiffres sont des réglages initiaux, centralisés dans un fichier de données pour être ajustés facilement.

### Animaux
- Chaque animal est un individu : nom (généré, modifiable), sexe, âge (bébé → jeune → adulte), jauges propres.
- Un bébé devient jeune à 1× la durée de gestation, adulte à 2×. Un bébé ne peut pas être vendu.
- **Reproduction** : un mâle et une femelle adultes dans le même enclos, de la place, bonheur de la femelle > 60 %. Chaque heure, la femelle a une chance de devenir gestante. La gestation est visible sur sa fiche.
- **Vente** au marchand : jeune 40 % du prix adulte, adulte 60 %.
- Espèces sociales (mouton, cochon, loup, alpaga, lama) : un animal seul de son espèce est malheureux.

### Attrait et visiteurs
- Attrait total = somme, par espèce présente, de son attrait de base + un petit bonus par animal supplémentaire (rendement décroissant).
- Visiteurs par heure = attrait × bonheur moyen × multiplicateur de prix du billet × bonus de bâtiments (auberge +20 %).
- Une nouvelle espèce rapporte nettement plus qu'un animal de plus d'une espèce déjà présente.

## 4. Soin et absence

### Jauges
| Jauge | Niveau | Évolution |
|---|---|---|
| Satiété | animal | Baisse en continu, remonte quand il mange au garde-manger |
| Propreté | enclos | 100 % → 0 % en ~24 h ; « Nettoyer » la remet à 100 % pour un petit coût |
| Santé | animal | Baisse en cas de faim prolongée ou de saleté |
| Bonheur | animal | Calculé : satiété, propreté, espace, santé, compagnie |

### Garde-manger
- Deux nourritures : **fourrage** et **viande**. Le cochon accepte les deux.
- Chaque heure, chaque animal prend sa part de rations tant qu'il reste du stock.
- Capacité limitée, agrandissable (le niveau 3 du village débloque la grande taille). Les rations s'achètent à la ferme.
- L'**autonomie** (temps avant épuisement du premier type de nourriture) est affichée en permanence. Orange sous 1 jour, rouge sous 6 h.

### Conséquences de la négligence
| Temps sans nourriture | Conséquence |
|---|---|
| 0 h | Stock vide, la satiété baisse |
| 12 h | **Affamé** : bonheur minimal, pas de reproduction, moins de visiteurs |
| 24 h | **Malade** : il faut payer un soin (cher) puis le nourrir |
| 48 h de maladie sans soin | **Mort**, annoncée dans le résumé |

Un enclos sale depuis plus de 24 h donne une chance de maladie par jour à chacun de ses animaux. Un parc bien préparé tient 2 à 3 jours sans le joueur.

### Rattrapage d'absence
- Au chargement, le temps écoulé depuis la dernière sauvegarde est rejoué par pas de 10 minutes, avec exactement les mêmes règles que le jeu en direct.
- Les visiteurs continuent de venir selon le bonheur courant.
- Résumé d'absence : argent gagné, naissances, nourriture consommée, malades, morts, missions quotidiennes renouvelées.

### Prévu pour plus tard (V2)
Avec le personnel arrivera un vrai système de maladies et un **centre vétérinaire** à rechercher, construire et améliorer. En V1, la maladie reste un état unique avec un bouton « Soigner » payant. Le modèle de données de la santé doit permettre d'ajouter des maladies sans réécriture.

## 5. Le village

### Bâtiments V1
Construits sur les emplacements du village (distincts de ceux du zoo). Trois niveaux d'amélioration chacun.

| Bâtiment | Disponible | Effet |
|---|---|---|
| Ferme | départ | Vente des rations ; en l'améliorant, rations moins chères et petite production gratuite de fourrage |
| Café | départ | Une part des visiteurs y consomme : revenu par visite |
| Boutique de souvenirs | niveau 2 | Revenu par visiteur, croissant avec le nombre d'espèces différentes |
| Auberge | niveau 2 | Revenu de nuit et +20 % de visiteurs |

### Niveaux du village
Passage de niveau : population atteinte **et** mission d'histoire du palier terminée. La population augmente avec les bâtiments construits et les visiteurs.

| Niveau | Condition | Débloque |
|---|---|---|
| 1. Hameau | départ | zone **prairie**, 2 emplacements village, ferme, café |
| 2. Village | 40 habitants + mission | zone **forêt**, +2 emplacements village, boutique, auberge, catalogue marchand élargi |
| 3. Bourg | 150 habitants + mission | zone **montagne**, +2 emplacements village, grand garde-manger, dernières espèces |

Fin de V1 : 3 zones de zoo (enclos libres à l'intérieur), 6 emplacements de village (fixes).

### Les chemins grandissent avec le village
L'allure des chemins change à chaque montée de niveau, pour que la croissance du village se voie sur la carte :

| Niveau | Chemins |
|---|---|
| 1. Hameau | Terre battue, bords herbeux, cailloux |
| 2. Village | Gravier clair avec bordures de pierres |
| 3. Bourg | Pavés, avec quelques lanternes le long des chemins principaux |
| 4–5 (V2) | Routes pavées larges, trottoirs, lampadaires qui s'allument la nuit |

Le changement est automatique au passage de niveau, sur tous les chemins existants. En V2, les routes construites par le joueur suivent la même règle.

### Prix du billet
- Réglable avec un curseur. Le jeu calcule un **prix juste** selon le niveau du village et l'attrait du zoo.
- Effet sur l'affluence : moitié prix +30 % ; prix juste 100 % ; 1,5× −40 % ; 2× −75 % et baisse lente de la réputation.
- Le meilleur revenu immédiat est un peu au-dessus du prix juste ; un prix bas remplit les bâtiments du village et fait croître la population plus vite.
- Réglage de l'étape 6 (choix de Romain 17/11) : prix juste = 2 + 1 par niveau au-dessus du premier + 0,05 par point d'attrait ; café, boutique et auberge rapportent par client moitié moins qu'avant.
- Nouveaux venus (réglage de l'étape 6, choix de Romain 17/11) : 1 habitant pour 30 clients servis jusqu'à 2 400 clients (80 habitants), puis 1 pour 350 clients.
- Estimation en direct pendant le réglage (« ≈ 42 visiteurs/h · 380 pièces/h »).

## 6. Marchand et missions

### Marchand d'animaux
- Catalogue selon le niveau du village (prairie → forêt → montagne).
- Stock limité, renouvelé toutes les 6 h réelles ; il peut ne proposer que des mâles ou que des femelles d'une espèce.
- Vend des adultes et des jeunes (moins chers). Rachète les animaux du joueur.
- Achat possible seulement avec un enclos du bon biome qui a de la place ; sinon le bouton explique ce qui manque.

### Premiers pas (tutoriel)
Guidés par **Margaux**, la maire de Clairbois. Une mission à la fois, le bouton concerné est mis en évidence, petite récompense à chaque étape. Bouton « Passer le tutoriel » (donne les récompenses de base).

1. Ouvrir la fiche de l'enclos des moutons — lire les jauges
2. Acheter 20 rations de fourrage à la ferme — garde-manger et autonomie
3. Nettoyer l'enclos — propreté
4. Régler le prix du billet — prix juste
5. Construire le café — bâtiments du village
6. Poser un deuxième enclos dans la prairie et régler sa taille — zones, redimensionnement, capacité
7. Acheter un couple de cochons — marchand, stock, sexes
8. Attendre la première gestation — conditions de reproduction
9. Vérifier l'autonomie — absence et conséquences

### Missions d'histoire
Une seule à la fois, présentée par un habitant, avec récompense : pièces, rations ou déblocage. Environ 4 par palier ; la dernière du palier permet le passage de niveau.

| Palier | Missions |
|---|---|
| Hameau | Construire le café · Première naissance · Posséder 3 espèces (débloque le redimensionnement des enclos existants) · 20 visiteurs/h |
| Village | Construire l'auberge · 2 espèces de forêt · 2 jours d'autonomie · 40 habitants |
| Bourg | Faire naître un loup ou un taureau · Posséder les 10 espèces · 150 habitants → fin de la V1 |

### Missions quotidiennes
- 3 par jour réel, renouvelées à minuit (heure locale).
- Petits objectifs (nettoyer 3 enclos, vendre un animal, 100 visiteurs, une naissance…). Récompense : pièces et rations.
- Série de jours consécutifs ; au 7ᵉ jour, réduction chez le marchand. Sauter un jour remet la série à zéro, sans autre pénalité.

### Prévu pour plus tard (V3)
Missions extraordinaires (animaux rares) liées aux expéditions. Le système de missions V1 doit accepter un nouveau type de mission sans réécriture.

## 7. Écran et contrôles

- **Carte 3D plein écran** montrant tout le domaine : zoo d'un côté de la rivière, village de l'autre, route jusqu'à l'entrée. Zones non débloquées dans la brume (« Bois sombre », « Falaises »…), révélées aux montées de niveau.
- **Zoo** : zones de biome où l'on pose et redimensionne ses enclos (poignées aux coins, clôture fantôme verte ou rouge, prix en direct). **Village** : emplacements fixes pour les bâtiments. Clic sur un enclos ou un bâtiment pour le sélectionner.
- **Caméra** : rotation libre (glisser), inclinaison bornée, zoom (molette / pincement), boutons de quart de tour. Sur téléphone : glisser pour déplacer, pincer pour zoomer.
- **Barre de ressources** en haut, fine, en icônes : argent, fourrage, viande, autonomie (couleur selon l'urgence), visiteurs/h, prix du billet (ouvre le curseur), niveau du village et population, heure.
- **Barre de commande** en bas, façon jeu de stratégie, **compacte sur une seule ligne** (validée sur maquette le 13/11/2026), **repliable** :
  - gauche : la sélection résumée en une ligne (nom, n/capacité, mini-barre de propreté, malades) ;
  - milieu : actions contextuelles en **petites icônes** (prix dans un coin, nom au survol) : nettoyer, soigner, rations, redimensionner, vendre, renommer ; améliorer pour un bâtiment ; construire un enclos dans une zone, ou un bâtiment sur un emplacement libre ;
  - droite : la mission en cours sur une ligne (avec l'avancée des missions du jour), puis les icônes Marchand, Gazette, Replier.
  - **Elle s'agrandit à la demande** : un clic sur la mission, sur la sélection (liste détaillée des animaux), sur le marchand ou la Gazette déplie un volet plus haut au-dessus de la ligne, avec le détail. Un nouveau clic, Échap ou un clic sur la carte le referme. La ligne compacte reste visible en dessous.
- **Retour visuel de chaque action** : le bouton passe en vert (réussi) ou en rouge (refusé) un court instant ; la ressource concernée s'allume dans la barre du haut avec « +20 » ou « −40 » qui s'envole ; un court message s'affiche en bas de la carte (« +20 viande dans le garde-manger », « Pas assez de pièces (il en faut 60). »). Une mission accomplie passe en vert dans la barre.
- **Missions** : marqueur « ! » au-dessus de la mairie quand Margaux a une mission ; bannière « Nouvelle mission » qui apparaît puis se range dans la barre du bas.
- **Fenêtres** (marchand, missions, Gazette/résumé, fiche détaillée d'un animal) en HTML par-dessus la carte.
- Interface en français.

## 8. Rendu visuel

- **3D low-poly** avec Three.js.
- Modèles issus de **packs gratuits sous licence CC0** : Quaternius (animaux animés, nature), Kenney (nature, clôtures, chemins), KayKit (village). Poly Pizza en complément. La licence de chaque pack est vérifiée au téléchargement et listée dans un fichier `CREDITS.md`.
- Rendu soigné : ombres douces, ciel en dégradé, eau animée, éclairage qui suit l'heure réelle (jour/nuit).
- Les animaux se déplacent dans leurs enclos avec leurs animations ; quelques visiteurs marchent sur les chemins.
- **Test visuel en première étape** : une scène avec un enclos, 3 animaux animés, quelques maisons et l'éclairage final, validée par le joueur avant de construire le reste.

## 9. Architecture technique

- **Vite + TypeScript**, dépôt GitHub du joueur, publication automatique sur **GitHub Pages** à chaque push (dépôt public ; sinon Netlify ou Cloudflare Pages).
- Trois couches séparées :
  1. **Données** (`data/`) : espèces, bâtiments, niveaux, missions, réglages. Aucune logique.
  2. **Simulation** (`sim/`) : fonctions pures `état + durée → nouvel état + événements`. Aucun accès au DOM, à Three.js ni à l'horloge système. C'est la même fonction qui fait avancer le jeu en direct et rattrape l'absence.
  3. **Présentation** : `scene/` (Three.js, caméra, modèles) et `ui/` (barres, fenêtres, HTML). Lit l'état, envoie des actions.
- **Actions du joueur** : objets typés (`acheterAnimal`, `nettoyerEnclos`…) validés par la simulation, qui renvoie un refus explicite si l'action est impossible.
- **Hasard** : générateur pseudo-aléatoire à graine stockée dans la sauvegarde, pour que le rattrapage et les tests soient reproductibles.
- **Sauvegarde** : `localStorage`, toutes les 30 s et à la fermeture de l'onglet. Le format porte un numéro de version ; chaque version suivante fournit une migration pour que les sauvegardes survivent aux mises à jour. En cas de lecture impossible, le jeu propose une nouvelle partie sans écraser l'ancienne sauvegarde.
- **Rattrapage** : pas de 10 minutes ; plafond technique de 30 jours rejoués (au-delà, les jours suivants sont traités comme le 30ᵉ).

## 10. Tests

- **Simulation testée automatiquement** (Vitest) : faim, paliers de négligence, maladie, mort, gestation, naissances, croissance, attrait, visiteurs, prix du billet, missions, niveaux du village.
- Scénarios d'absence obligatoires, par exemple : 3 jours d'absence avec 2 jours de stock → animaux malades mais vivants ; 5 jours sans stock → morts annoncées dans le résumé.
- Tests de migration de sauvegarde à chaque changement de format.
- Rendu 3D et interface vérifiés à la main dans le navigateur.

## 11. Feuille de route après la V1

| Version | Contenu |
|---|---|
| V2 — Le village s'éveille | Personnel (soigneurs, vétérinaire, entretien), maladies et centre vétérinaire, ferme et production de nourriture, décoration et confort visiteurs, **construction de routes et chemins contre de l'argent** (les visiteurs les empruntent ; le composant de chemin existe depuis l'étape 1), niveaux 4–5, ~20 espèces, marchand itinérant, trophées |
| V3 — Les grandes découvertes | Expéditions en temps réel, missions extraordinaires et animaux rares, musée et collections |
| V4 — La science | Laboratoire et arbre de recherches, variantes rares à la naissance, conservation (relâcher des animaux) |
| V5 — Le fil des saisons | Saisons réelles, événements (fête du village), Gazette complète avec avis et nouvelles |

Chaque version est jouable, publiée, et conserve la sauvegarde du joueur.
