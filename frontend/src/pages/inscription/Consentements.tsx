import { ApiError } from '@/services/api';
import {registrationProfile} from './registrationProfile';
import { useState } from 'react';
import { Link } from 'react-router';
import { Checkbox } from '@/ui/Choice';
import { PasswordField, TextField } from '@/ui/Field';
import { ButtonLink } from '@/ui/Button';
import { AccountCreatedError } from '@/services/auth';
import { Etape } from './Etape';
import { useInscription, effacerBrouillon } from './state';
import { useAuth } from '@/context/AuthContext';
import s from './Consentements.module.css';
export default function Consentements() {
  const { valeurs, modifier } = useInscription();
  const { register } = useAuth();
  const [resaisie] = useState(!valeurs.google && !valeurs.motDePasse),
    [emailManquant] = useState(!valeurs.email);
  const [googleExpire, setGoogleExpire] = useState(false);
  const [compteCree, setCompteCree] = useState(false);
  const complet = valeurs.cgu && valeurs.confidentialite && valeurs.traitement;
  async function handleValider() {
    if (!valeurs.google && (!valeurs.email || !valeurs.motDePasse))
      throw new Error(
        'Renseignez votre email et votre mot de passe ci-dessous pour terminer.',
      );
    try {
      await register({
        google: valeurs.google,
        role: 'interimaire',
        profile: registrationProfile(valeurs),
        rppsNumber: valeurs.rpps || undefined,
        email: valeurs.email,
        motDePasse: valeurs.motDePasse,
        prenom: valeurs.prenom,
        nom: valeurs.nom,
        ville: valeurs.ville,
        cgu: valeurs.cgu,
      });
      effacerBrouillon();
    } catch (e) {
      if (e instanceof ApiError && e.code === 'GOOGLE_REGISTRATION_EXPIRED') setGoogleExpire(true);
      if (e instanceof AccountCreatedError) {
        effacerBrouillon();
        setCompteCree(true);
      }
      throw e;
    }
  }
  if (compteCree)
    return (
      <section>
        <h1>Compte créé</h1>
        <p role="alert">
          Votre compte a été enregistré, mais votre session n’a pas pu être
          chargée. {valeurs.google ? 'Reconnectez-vous avec Google ;' : 'Connectez-vous avec votre email et votre mot de passe ;'}
          inutile de recréer le compte.
        </p>
        <ButtonLink to="/connexion">Me connecter</ButtonLink>
      </section>
    );
  return (
    <Etape
      titre="Consentements"
      chapeau="Création de votre compte InfiMatch."
      suivant="/inscription/confirmation"
      libelleSuivant="Créer mon compte"
      bloqueSuivant={!complet || googleExpire}
      onValider={handleValider}
    >
      <p>
        Votre compte et les informations saisies dans les étapes précédentes seront enregistrés ensemble.
      </p>
      {valeurs.google && <p>Votre compte sera associé à votre adresse Google : <strong>{valeurs.email}</strong>. Aucun mot de passe InfiMatch n’est nécessaire.</p>}
      {googleExpire && <p role="alert"><Link to="/inscription?google=1">Reprendre la vérification Google</Link>. Vos informations et vos consentements restent dans le brouillon.</p>}
      {!valeurs.google && emailManquant && (
        <TextField
          label="Email de connexion"
          name="email"
          type="email"
          required
          value={valeurs.email}
          onChange={(e) => modifier({ email: e.target.value })}
        />
      )}
      {resaisie && (
        <PasswordField
          label="Mot de passe de votre compte"
          name="password"
          required
          minLength={12}
          maxLength={128}
          autoComplete="new-password"
          hint="Votre brouillon est conservé. Après un rechargement, ressaisissez uniquement votre mot de passe (12 à 128 caractères)."
          value={valeurs.motDePasse}
          onChange={(e) => modifier({ motDePasse: e.target.value })}
        />
      )}
      <div className={s.liste}>
        <Checkbox
          required
          checked={valeurs.cgu}
          onChange={(e) => modifier({ cgu: e.target.checked })}
        >
          J’accepte les{' '}
          <Link
            to="/mentions-legales"
            state={{ retourInscription: '/inscription/consentements' }}
          >
            conditions générales d’utilisation
          </Link>
          .
        </Checkbox>
        <Checkbox
          required
          checked={valeurs.confidentialite}
          onChange={(e) => modifier({ confidentialite: e.target.checked })}
        >
          J’ai lu la politique de confidentialité.
        </Checkbox>
        <Checkbox
          required
          checked={valeurs.traitement}
          onChange={(e) => modifier({ traitement: e.target.checked })}
        >
          J’autorise le traitement de mes données pour la mise en relation.
        </Checkbox>
      </div>
    </Etape>
  );
}
