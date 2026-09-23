# Preuves et réserves

## Actualisation après audit

Référence applicative `0389f4e398d0dbc0c3af9392bb707e83ede97398` : **661/661 unités backend**, **95,12 % de couverture des lignes**, **188/188 intégrations**, **81/81 unités frontend** et **18/18 contrôles Vault**. [Preuves complètes](../../proofs/audit-final-20260923/README.md) et [réserves restantes](../../quality/SUIVI_AUDIT_FINAL_2026-09-23.md).

## Campagne historique du support de pitch
État au 23 septembre 2026, référence applicative e81282d. Les campagnes ci-dessous sont distinctes.

| Contrôle | Résultat | Preuve |
| --- | --- | --- |
| Unitaires backend récents | 660/660 ; lignes 95,11 % ; branches 89,98 % ; fonctions 82,41 % | [Résumé](../../proofs/discord-notifications-20260923/unit-summary.json), [journal](../../proofs/discord-notifications-20260923/unit-tests.txt) |
| Intégrations notifications | 11/11 sur services isolés | [Journal](../../proofs/discord-notifications-20260923/targeted-integration.txt) |
| Régressions SQL | Campagne réussie | [Preuve](../../proofs/discord-notifications-20260923/regressions.txt) |
| Vault et sécurité | 18/18 ; maintenance locale terminée | [Journal](../../proofs/remediation-20260923/vault-final-tests.log) |
| Frontend, campagne antérieure | 81/81, non relancée pour Discord | [Bilan daté](../../quality/CORRECTIONS_AUDIT_2026-09-23.md) |
| Intégrations globales antérieures | 187/187 résultats consolidés par fichier | [Méthode](../../proofs/remediation-20260923/summary.json) |

95,11 % désigne les lignes du backend dans la campagne unitaire, pas un taux de réussite global ni une couverture frontend. Ces tests ne garantissent pas l'absence de bugs.

## Réserves
Supabase/PostGIS : demande support envoyée, correction fournisseur attendue. DNS Windows : résolution MongoDB locale problématique via la box, réglages inchangés. Les exports n8n attestent leur lecture datée, pas une nouvelle livraison Cloud. Accessibilité et sécurité : contrôles ciblés, sans certification globale. Les entretiens marché, partenaires et temps humains ne sont pas inventés.

## Démonstration
Comptes fictifs uniquement. Préparer le scénario local avant la soutenance ; ne pas envoyer des notifications à des personnes réelles pour le pitch. Si un service externe est indisponible, montrer les preuves datées en nommant la limite.
