# Emails de mission et PDF d’annulation

La confirmation d’affectation, après génération du PDF, met en file un email individuel pour l’intérimaire et les membres actifs de l’entreprise/agence concernées. Une annulation d’affectation par l’intérimaire avertit ces mêmes participants avec un PDF d’annulation. Une annulation de mission par l’entreprise génère un PDF et un email par affectation concernée. Les candidats sans affectation conservent la notification InfiMatch existante ; aucun faux document d’affectation n’est produit pour eux.

L’intérimaire peut annuler depuis la fiche mission avant son début. L’opération libère son créneau, retire sa candidature acceptée et rouvre la mission. Une mission commencée nécessite de contacter l’entreprise. Le PDF reste accessible dans la fiche mission et le suivi, avec les mêmes contrôles d’accès que la confirmation.

## Extension du 24 septembre : préparée, non déployée

`ScheduledReminders1790208000000` étend la file existante : relances de missions non pourvues aux membres actifs des organisations ; rappels avant mission aux personnes affectées et aux membres concernés. La mise en service exige migration, backend et workflow cohérents. Le contrôle retenu reste toutes les **4 heures** ; le rappel H-2 n’est donc pas garanti. Les emails expirés, missions modifiées ou annulées et destinataires révoqués sont écartés avant l’envoi.

Voir [l’état courant](ETAT_COURANT.md) et [le workflow préparé](n8n/2026-09-24/README.md). Aucun ancien envoi n’est présenté comme une preuve de ces nouvelles fonctions.

## Configuration SMTP2GO

Resend a été abandonné à la demande de l’utilisateur. La clé créée pour cette intégration a été révoquée et retirée de Vercel. Aucun envoi réel via Resend n’a été effectué.

- `SMTP2GO_API_KEY` : clé privée d’envoi, backend uniquement, à conserver dans Vault et comme variable sensible Vercel.
- `SMTP2GO_FROM` : `InfiMatch <adresse-validée@example.org>`, adresse vérifiée dans Sending > Verified Senders > Single sender emails. Cette procédure permet de valider une adresse existante sans achat de domaine.
- `NOTIFICATION_APP_ORIGIN` : URL frontend publique pour les liens.
- Sans clé ou expéditeur, les PDF fonctionnent mais les emails restent en attente.

Le plan gratuit annoncé par SMTP2GO comprend 1 000 emails par mois et 200 par jour ; sans domaine validé, un plafond de 25 par heure peut s’appliquer. L’activation du compte et la validation de l’adresse expéditrice restent requises.

Le job n8n existant appelle `/internal/automation/jobs/dispatch`, qui traite également les PDF d’annulation et les emails. Migration additive `MissionMail1789722000000` : tables `mission_cancellation`, `mission_email`, extension du type de document. Aucun ancien email n’est créé rétroactivement. Les annulations antérieures n’ont pas automatiquement de nouveau PDF.

## Fiabilité

Chaque email de confirmation ou d’annulation est individuel, contient le PDF et une version texte/HTML. Les nouveaux rappels préparés le 24 septembre sont individuels, sans PDF joint ; ils dirigent vers le suivi de la mission. Les réservations SQL empêchent les traitements concurrents. Les limitations HTTP 429 sont réessayées ; une requête interrompue ou une réponse ambiguë passe en `UNCERTAIN` et ne sera pas renvoyée automatiquement, afin d’éviter les doublons. Une erreur permanente passe en `FAILED`. `SENT` signifie accepté par le fournisseur, pas preuve d’arrivée dans la boîte ; vérifier celle-ci dans SMTP2GO.

Les changements d’adresse, la désactivation du compte et la perte d’accès à l’organisation annulent les emails en attente. Une confirmation obsolète n’est pas envoyée. Le PDF d’annulation conserve les données au moment de l’événement même si la mission est rouverte ensuite. Le stockage des documents reste chiffré.

## Tests

`backend/test/integration/mission-mail.spec.ts` utilise PostgreSQL/PostGIS isolé et un transport simulé : confirmation, annulation des deux côtés, accès aux documents, libération du créneau, réouverture, doublons, pièces jointes, limitation fournisseur et réponses ambiguës. Ces tests n’envoient pas d’emails réels.

`node scripts/test-confirmation-pdf.cjs` vérifie le contenu, la pagination et la présentation des deux PDF.

Sources : https://developers.smtp2go.com/reference/send-standard-email ; https://support.smtp2go.com/hc/en-gb/articles/223087947-Free-Plan ; https://support.smtp2go.com/hc/en-gb/articles/12747932085145-Quick-Start-Guide
