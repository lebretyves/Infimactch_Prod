# RIB : capture et analyse automatiques


## 2026-09-17 — Capture et analyse automatiques du RIB

Demande : reconnaître les coordonnées dans la caméra, prendre automatiquement la photo et remplir les cases correspondantes. La caméra effectue désormais des lectures OCR locales successives ; deux lectures consécutives du même IBAN avec clé valide déclenchent une seule photo. Le texte de cette image remplit IBAN, BIC, titulaire et banque lorsqu'ils sont reconnus. Les codes banque, guichet, compte et clé RIB restent dérivés de l'IBAN français valide. Une nouvelle image ou un PDF importé déclenche également l'analyse sans clic supplémentaire. Le bouton manuel reste disponible en secours.

Les traitements sont annulés à la fermeture ou au changement de caméra/document. Après 60 secondes sans détection, la prise de photo manuelle reste proposée. Aucun champ manquant n'est inventé, aucune sauvegarde n'est automatique : vérification et confirmation restent nécessaires. L'analyse et les images de prévisualisation restent locales.

Validation : build frontend et TypeScript réussis ; test navigateur avec moteur Tesseract réel sur image, PDF texte et flux caméra synthétique. Vérification du remplissage des quatre champs, absence de capture pour une clé IBAN invalide, arrêt des pistes caméra, absence d'enregistrement implicite, relecture après échec et affichage mobile/bureau. Caméra physique non testée dans cet environnement. Livraison sur Main et Backend conformément à l'autorisation persistante de l'utilisateur.
