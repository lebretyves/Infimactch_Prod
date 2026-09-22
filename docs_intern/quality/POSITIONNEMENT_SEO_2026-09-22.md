# Positionnement SEO — nouvelle vérification du 22 septembre 2026

Site contrôlé : https://infimactch-prod-backend-l5bc.vercel.app/ . Contrôle en lecture seule ; aucun contenu, bouton, paramètre SEO ni déploiement modifié.

## Verdict

La base technique est bonne. La visibilité organique du projet n'est pas démontrée par les recherches publiques effectuées aujourd'hui. Un score Lighthouse SEO de 100 ne mesure pas le classement dans Google.

## Mesures actuelles

Deux passages Lighthouse 13.5.0 mobile, cache neuf : SEO 100/100 chacun, performances 97 et 98/100, accessibilité automatisée 100/100, bonnes pratiques 96/100. LCP 2,12–2,34 s ; CLS 0,0535 ; transfert 355–360 ko décimaux. Ce sont des mesures de laboratoire de l'accueil, pas des Core Web Vitals terrain ni une certification d'accessibilité. Le CLS était nul lors du bilan du 20 septembre ; une petite instabilité est désormais mesurée, sans forte régression des scores. Pas de nouvelle mesure ordinateur dans cette campagne.

Les cinq pages du sitemap répondent HTTP 200, possèdent chacune un titre distinct, une description, un canonical correct et index,follow. Robots.txt et sitemap sont accessibles et cohérents. Les huit pages privées du test HTTP restent noindex, sans canonical publique. Connexion et inscription/localisation ont aussi été contrôlées. Les anciens chemins catalogue et aperçu annonces redirigent en 308 vers l'accueil.

Le rendu mobile des cinq pages publiques présente un H1 par page, aucun débordement horizontal, aucune image chargée cassée, aucun attribut alt absent et aucune erreur JavaScript détectée. La pertinence des textes alternatifs n'a pas été revue exhaustivement. Titres et descriptions identiques entre HTML initial et rendu : l'écart signalé au bilan précédent n'est plus observé.

## Visibilité et positionnement

Les recherches via le moteur disponible sur « InfiMatch », « InfiMatch intérim soignants », l'adresse exacte, `site:infimactch-prod-backend-l5bc.vercel.app` et « mission intérim IADE InfiMatch » n'ont pas fait ressortir le projet Vercel. Cela ne prouve ni une absence totale d'indexation Google ni une position au-delà d'un rang déterminé. Ces résultats ne sont pas une mesure Google géolocalisée et exhaustive.

Un service homonyme ressort sur infimatch.fr et dans les boutiques d'applications, consacré au remplacement infirmier libéral. Il est distinct du projet contrôlé. Cette homonymie rend la découverte de la marque plus ambiguë ; aucune conclusion juridique n'est tirée.

Le sitemap ne contient que l'accueil, l'installation, l'accessibilité, l'écoconception et les mentions légales. Les annonces et missions sont dans l'espace privé. L'inventaire public contrôlé ne propose donc pas de pages de destination indexables consacrées aux missions IDE, IADE ou IBODE, aux agences ou aux zones géographiques. Cela limite les possibilités de répondre à ces intentions de recherche. Il ne faut pas rendre publics les espaces personnels pour y remédier.

La Search Console n'a pas été relue dans une session authentifiée pendant cette campagne. Son ancien état du 20 septembre ne constitue pas une preuve de son état actuel. Positions moyennes, impressions, clics et nombre de pages effectivement indexées restent non vérifiés.

## Priorités proposées

1. Lire dans Search Console l'indexation de l'accueil et les performances par requête/page/pays sur les périodes disponibles. C'est la prochaine preuve nécessaire pour chiffrer le positionnement réel.
2. Définir une identité et un domaine public stables et distinctifs. Le domaine Vercel n'est pas à lui seul une preuve de pénalité ; le choix d'un domaine facilite surtout l'identification et la continuité du site.
3. Préparer des pages publiques utiles pour les publics et métiers réellement servis, avec contenu original et liens internes. Éviter de fabriquer des pages locales sans service ou information spécifique. Aucune création éditoriale n'a été faite, conformément à la demande de vérification.
4. Développer les liens de partenaires réels et suivre leur effet dans Search Console. Ne pas inventer de note, de volume de recherche, de backlinks ou de classement.

## Sources et preuves

- Google, guide SEO : https://developers.google.com/search/docs/fundamentals/seo-starter-guide?hl=fr
- Google, rapport de performances : https://support.google.com/webmasters/answer/7576553?hl=fr
- Service homonyme observé : https://infimatch.fr/a-propos-de-nous/
- [Réponses HTTP et métadonnées](../proofs/seo-2026-09-22/live-seo.json).
- [Rendu mobile des cinq pages publiques](../proofs/seo-2026-09-22/rendered-pages.json).
- [Synthèse des deux mesures Lighthouse](../proofs/seo-2026-09-22/mobile-summary.json), [mesure 1](../proofs/seo-2026-09-22/mobile-1.json) et [mesure 2](../proofs/seo-2026-09-22/mobile-2.json).
- [Assertions HTTP : cinq pages publiques et huit privées](../proofs/seo-2026-09-22/http-checks.json).

Les rapports HTML Lighthouse et les scripts de collecte restent disponibles dans le dossier local `E:/Interimatch/audits/2026-09-22-seo-recheck`. Les preuves JSON ci-dessus sont jointes à la documentation pour rester consultables avec le dépôt.
