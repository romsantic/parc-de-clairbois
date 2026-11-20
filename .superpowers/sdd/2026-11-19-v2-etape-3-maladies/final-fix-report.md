# Corrections de la relecture finale, V2-3

Résultat : 978 tests verts (962 avant, +16), `npm run build` vert.

## C1 Walker (src/scene/visitorsView.ts, start ~L57, update ~L116)
- `start()` : route de moins de 2 points => phase 'off', invisible, return.
- `update()` : en phase 'out' avec `seg >= route.length - 1`, return apres setScale (fondu seul, aucun mouvement).
- Tests : tests/scene/walker.test.ts (routes de 2 et 3 points sur 2000 images sans erreur, finit 'off' ; routes de 0 et 1 point).
- RED : 3 tests en echec, "Cannot read properties of undefined (reading 'x')". GREEN : 3/3.
- Atteignable avant la branche ? Oui : le code date de 5815498 ("Des promeneurs sur les chemins") et est identique sur main. Tout Walker qui atteint le bout de sa route, visiteur compris, plante a l'image suivante (fade encore > 0, target undefined). Raison probable de ne pas l'avoir vu : les routes de visiteurs sont longues (plusieurs dizaines de secondes de marche) et les promeneurs ne s'affichent qu'une fois les modeles charges ; aucun test ne faisait marcher un vrai Walker jusqu'au bout. C'est une hypothese, non verifiee dans le navigateur. La boucle courte des veterinaires (staffRoute) l'a rendu systematique.

## I2 Vétérinaire proposé (src/sim/staff.ts, src/sim/actions.ts)
- Nouvelle `ensureVetCandidate(state)` : centre present, aucun veto employe, aucun veto candidat => un veto niveau 1 (nom tire avec `random`) remplace le dernier candidat (ou s'ajoute si liste non pleine).
- Appelee en fin de `renewCandidates`, dans `buildBuilding` apres la pose du centre, et dans `fire` (apres licenciement).
- Tests : tests/sim/vetCandidates.test.ts (200 graines x 3 renouvellements, premier renouvellement garde soigneur/entretien, pas de veto sans centre, pas de changement si employe ou deja propose, liste pleine, construction du centre, licenciement du dernier veto).
- Note : les tests I2 ont ete ecrits apres l'implementation (pas de RED observe) ; deux tests ont ete corriges parce que le tirage ponderé peut donner plusieurs veterinaires naturellement.

## I3 (src/game/session.ts healthMessage)
- Parametre villageLevel ; si >= 2, phrase ajoutee. Tests : session.test.ts (Village contient, Hameau non). Attendu existant « v5 sans malade » mis a jour (bigPark est au niveau Village).

## I4 (src/ui/buildingBar.ts, src/ui/healthModel.ts)
- `centreStatus(state)` pure : « aucun vétérinaire » / « 1 vétérinaire · file : 2 ». Utilisee pour le centre dans la barre. Ferme et personnel ont deja leur branche ; cafe/boutique/auberge gardent le revenu. Tests : healthModel.test.ts (3). Le rendu DOM de la barre n'est pas teste.

## I5 (src/scene/world.ts)
- MAP.halfZ 24 -> 28. Aucun test n'assertait 24 (cameraRig.test utilise MAP). Test ajoute : clampFocus(10, -26) inchange.

## M6 (src/sim/vet.ts, annulation de soin)
- `state.coins += careCost(a)` avant l'effacement. Test : vet.test.ts (980 -> 1000 -> 980).

## M7 (src/ui/buildingInfo.ts) : `} else {` remis sur sa ligne.

## M8 (src/ui/gazetteModel.ts)
- Sans centre : phrase actuelle ; centre sans veto : « Personne ne peut soigner N animal(aux) : il faut embaucher un vétérinaire. » Tests mis a jour/ajoutes.

## Concerns
- Plusieurs fichiers src/ etaient en CRLF dans le dossier de travail (repo en LF) ; normalises en LF.
