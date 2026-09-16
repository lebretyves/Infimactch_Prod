# Raccordement au backend local

Frontend : http://127.0.0.1:5173
Backend : http://127.0.0.1:3100
Proxy Vite : `/api` vers le backend. `APP_ORIGIN` du backend doit correspondre exactement à l'origine du navigateur.

```powershell
npm run dev
npm run build
npm test
$env:E2E_CREDENTIALS_FILE='chemin-vers-les-identifiants-fictifs.json'
npm run test:integration
```

## Code

- `src/services/api.ts` : cookies de session, CSRF, erreurs et idempotence.
- `src/services/auth.ts` : connexion/inscription classiques.
- `src/services/market.ts` : missions, favoris et candidatures.
- `src/services/profile.ts` : lecture/écriture du profil backend.
- `src/pages/Profil.tsx` : profil et disponibilités.
- `src/components/GoogleConnexion.tsx` : bouton Google officiel ; validation uniquement dans le backend.

Google reste masqué tant que le backend ne fournit pas de Client ID. Le compte doit être créé dans InfiMatch avant sa première association Google, qui nécessite le mot de passe local.

Documentation complète : `E:/Interimatch/InfiMatch/docs/FRONTEND_AUTH_GOOGLE.md`.
Preuves : `docs/proofs/integration-api.json`, `docs/proofs/profile-google.json`.

Les champs complets de l'ancien parcours d'inscription, les documents/RIB, le mot de passe oublié et la gestion avancée des organisations ne sont pas intégralement raccordés. Les données de session ne sont pas simulées.

Correction et tests du parcours candidat : [inscription](CORRECTION_INSCRIPTION.md).
