# Protection des branches principales

Configuration prête à appliquer : [main-protection.json](main-protection.json).
Elle exige une pull request, une approbation indépendante, les contrôles `backend` et `frontend` réussis sur une branche à jour, et la résolution des conversations. Les administrateurs sont inclus. Suppression et force-push sont interdits.

Le compte utilisé possède les droits administrateur sur Yves, mais seulement écriture/triage sur Epitech. Un administrateur Epitech doit appliquer :

~~~powershell
gh api --method PUT repos/EpitechMscProPromo2027/D-WEB-901-PAR-9-1-InteriMatch-1/branches/main/protection --input annexe/quality/main-protection.json
~~~

Vérifier ensuite la réponse de `gh api repos/EpitechMscProPromo2027/D-WEB-901-PAR-9-1-InteriMatch-1/branches/main/protection`. Sur un dépôt privé, le plan GitHub doit permettre cette protection. Si les Actions sont bloquées par le quota de l’organisation, faire rétablir leur exécution avant de considérer la procédure de livraison opérationnelle. Ne pas retirer les contrôles pour contourner un échec.

La présence de ce fichier ne prouve pas l’activation distante. Le statut doit être contrôlé dans GitHub ; les changements suivent désormais une branche et une pull request, avec revue indépendante.
