# Emails de mission et PDF d’annulation

La confirmation d’affectation, après génération du PDF, met en file un email individuel pour l’intérimaire et les membres actifs de l’entreprise/agence concernées. Une annulation d’affectation par l’intérimaire avertit ces mêmes participants avec un PDF d’annulation. Une annulation de mission par l’entreprise génère un PDF et un email par affectation concernée. Les candidats sans affectation conservent la notification InfiMatch existante ; aucun faux document d’affectation n’est produit pour eux.

L’intérimaire peut annuler depuis la fiche mission avant son début. L’opération libère son créneau, retire sa candidature acceptée et rouvre la mission. Une mission commencée nécessite de contacter l’entreprise. Le PDF reste accessible dans la fiche mission et le suivi, avec les mêmes contrôles d’accès que la confirmation.

## Configuration Resend

- `RESEND_API_KEY` : clé privée avec droit d’envoi, backend uniquement (jamais `VITE_*`).
- `RESEND_FROM` : expéditeur vérifié, par exemple `InfiMatch <missions_interimatch@interimatch.fr>` UNIQUEMENT après acquisition et validation du domaine. Aucune propriété de ce domaine n’est présumée.
- `RESEND_TEST_RECIPIENT` : pendant les essais sans domaine, adresse du compte Resend. Seules les lignes destinées à cette adresse sont traitées ; aucun email d’un autre utilisateur n’est redirigé. Supprimer cette restriction après validation du domaine et changement de `RESEND_FROM`.
- `NOTIFICATION_APP_ORIGIN` : URL frontend publique utilisée pour les liens.
- Sans clé ou expéditeur, les PDF fonctionnent et les emails restent en attente. Aucun envoi simulé n’est présenté comme un envoi réel.
- Pour un compte Resend neuf sans domaine, `InfiMatch <onboarding@resend.dev>` sert uniquement aux tests destinés à l’adresse du compte Resend. Il ne permet pas d’envoyer à tous les utilisateurs. Aucun destinataire réel n’est redirigé vers une boîte de test.

Les réglages se font sur le backend Vercel puis nécessitent un redéploiement. Le job n8n existant appelle `/internal/automation/jobs/dispatch`, qui traite aussi les documents d’annulation et les emails ; il n’est pas nécessaire de créer une campagne marketing dans Resend.

## Fiabilité et exploitation

Migration additive `MissionMail1789722000000` : tables `mission_cancellation`, `mission_email`, extension du type de document. Aucun ancien email n’est créé rétroactivement. Les annulations antérieures n’ont pas automatiquement un nouveau PDF.

Les traitements réservent leurs lignes SQL et reprennent après expiration du bail. L’email contient le PDF en pièce jointe et une version texte/HTML. Une clé Resend stable identifie chaque envoi. La requête reste identique lors des relances. Aucune relance automatique au-delà de 23 heures après la première tentative, avant expiration de la protection Resend de 24 heures : statut `UNCERTAIN`, contrôle manuel requis. Les erreurs permanentes deviennent `FAILED`. `SENT` signifie accepté par l’API Resend, pas preuve de réception dans la boîte du destinataire ; cette preuve se vérifie dans Resend.

Les changements d’adresse, la désactivation du compte ou la perte d’accès à l’organisation annulent les emails en attente. Une confirmation devenue caduque n’est pas envoyée. L’annulation conserve les données de mission au moment de l’événement même si la mission est rouverte ensuite. Les fichiers sont chiffrés par le stockage existant, les clés ne sont ni journalisées ni envoyées au frontend.

## Vérification

`backend/test/integration/mission-mail.spec.ts` : PostgreSQL/PostGIS isolé, confirmation et annulations des deux côtés, autorisation des documents, libération de créneau, réouverture, idempotence, pièces jointes, relances, expéditeur absent, changement de destinataire et annulation d’une confirmation obsolète. Transport Resend simulé : ces tests n’envoient pas d’emails réels.

`node scripts/test-confirmation-pdf.cjs` : présentation, pagination et texte des PDF de confirmation/annulation.

Sources : https://resend.com/docs/knowledge-base/403-error-resend-dev-domain ; https://resend.com/docs/dashboard/emails/idempotency-keys
