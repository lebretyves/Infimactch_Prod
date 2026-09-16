import { Link, useLocation } from "react-router";
import { EcranPublic } from "@/layouts/EcranPublic";
import { Icon } from "@/ui/Icon";
import { Logo } from "@/ui/Logo";
import { Button } from "@/ui/Button";
import { usePageTitle } from "@/lib/usePageTitle";
import { useCookieConsent } from "@/context/CookieConsentContext";
import s from "./Mentions.module.css";
export default function Mentions() {
  const { state } = useLocation();
  const { openPreferences } = useCookieConsent();
  const retourInscription =
    state?.retourInscription === "/inscription/consentements"
      ? "/inscription/consentements"
      : null;
  usePageTitle(
    "Mentions légales et données personnelles",
    "Fonctionnement du projet InfiMatch, données de compte et préférences cookies.",
  );
  return (
    <EcranPublic
      entete={
        <>
          <Link to="/" className={s.marque} aria-label="InfiMatch, accueil">
            <Logo size={38} withWordmark />
          </Link>
          <Link to="/" className={s.retour}>
            <Icon name="arrow-left" size={20} />
            Retour à l’accueil
          </Link>
        </>
      }
    >
      <main className={s.page} id="contenu">
        <h1>Mentions légales et données personnelles</h1>
        {retourInscription && (
          <Link to={retourInscription}>Revenir à mon inscription</Link>
        )}
        <p className={s.chapeau}>
          InfiMatch est un projet pédagogique en développement. Il propose un
          espace de recherche de missions, de candidature et de suivi pour les
          professionnels de santé et les organisations.
        </p>
        <section aria-labelledby="titre-mentions">
          <h2 id="titre-mentions">À propos du projet</h2>
          <p>
            Les annonces externes proviennent des sources indiquées sur chaque
            offre. Les pages de démonstration du catalogue utilisent des
            exemples fictifs, distincts des données de votre compte.
          </p>
          <p>
            Les coordonnées de l’éditeur, du responsable de traitement et de
            l’hébergeur de production restent à compléter avant une ouverture
            publique du service.
          </p>
        </section>
        <section aria-labelledby="titre-conditions" id="conditions">
          <h2 id="titre-conditions">Conditions d’utilisation</h2>
          <p>
            Renseignez vos informations professionnelles avec exactitude.
            L’enregistrement d’un profil ou d’une référence professionnelle ne
            constitue pas une validation des diplômes, de l’expérience ou du
            numéro RPPS. Le résultat de la vérification RPPS apparaît séparément
            dans votre dossier.
          </p>
          <p>
            Les candidatures internes sont suivies dans votre espace. Pour les
            offres externes, la candidature se poursuit sur le site source. Une
            confirmation de mission disponible dans InfiMatch ne remplace pas un
            contrat de travail signé.
          </p>
          <p>
            Les dépôts de documents et de coordonnées bancaires sont
            actuellement limités à la démonstration. Utilisez exclusivement des
            fichiers fictifs et le format d’IBAN fictif indiqué dans le
            formulaire.
          </p>
        </section>
        <section aria-labelledby="titre-confidentialite" id="confidentialite">
          <h2 id="titre-confidentialite">Données personnelles</h2>
          <p>
            Les données de compte servent à vous connecter. Le profil, les
            disponibilités, les favoris et les candidatures permettent de
            fournir les fonctions demandées dans votre espace. Les mots de passe
            locaux sont conservés sous forme de hash ; ils ne sont pas
            affichables en clair.
          </p>
          <p>
            Si vous choisissez Google, InfiMatch vérifie l’identité fournie par
            Google pour vous connecter ou préparer votre inscription. Le profil
            professionnel et l’acceptation des conditions restent des étapes
            distinctes. L’autorisation du service Google peut être retirée
            depuis les préférences cookies.
          </p>
          <p>
            Les durées de conservation des comptes et des dossiers, ainsi que le
            canal de traitement des demandes d’accès, de rectification et
            d’effacement, doivent être définis pour la mise en production. Cette
            page ne présente pas de suppression automatique qui ne serait pas
            implémentée.
          </p>
        </section>
        <section aria-labelledby="titre-cookies" id="cookies">
          <h2 id="titre-cookies">Cookies et stockage dans votre navigateur</h2>
          <p>
            Les éléments nécessaires au fonctionnement restent actifs. Le
            service facultatif de connexion Google est désactivé jusqu’à votre
            accord explicite. Aucun outil de publicité ou de mesure d’audience
            n’est intégré à cette version.
          </p>
          <ul className={s.liste}>
            <li>
              <strong>Session InfiMatch</strong> — Le cookie{" "}
              <code>infimatch.sid</code> maintient votre session pendant huit
              heures. Il est inaccessible au JavaScript de la page (HttpOnly) et
              utilise la protection SameSite=Lax. Refuser Google ne supprime pas
              cette session.
            </li>
            <li>
              <strong>Brouillon d’inscription</strong> — Les informations de
              progression sont conservées dans le stockage de session de
              l’onglet afin de reprendre les étapes du formulaire. Ce stockage
              est distinct des cookies de Google.
            </li>
            <li>
              <strong>Préférences cookies</strong> — Votre choix, sa version et
              sa date sont mémorisés dans le stockage local de ce navigateur
              pendant six mois. À l’expiration, votre accord est redemandé. Si
              le navigateur bloque ce stockage, le choix s’applique à la visite
              en cours.
            </li>
            <li>
              <strong>Connexion Google, facultative</strong> — Google Identity
              Services est chargé uniquement après votre accord, sur les pages
              qui proposent cette connexion. Ce service fourni par Google peut
              accéder à ses propres cookies. Consultez la{" "}
              <a
                href="https://policies.google.com/privacy"
                target="_blank"
                rel="noreferrer"
              >
                politique de confidentialité de Google
              </a>
              .
            </li>
          </ul>
          <p>
            Vous pouvez refuser ou autoriser Google avec la même simplicité,
            puis modifier votre choix à tout moment avec le bouton « Cookies ».
            Le retrait désactive le bouton Google et empêche InfiMatch de lancer
            de nouveaux chargements de ce service. Il ne supprime pas les
            cookies déjà déposés par Google ; leur gestion dépend du navigateur
            et des paramètres Google.
          </p>
          <Button type="button" variant="outline" onClick={openPreferences}>
            Modifier mes préférences cookies
          </Button>
          <p>
            Pour comprendre les règles applicables, consultez les{" "}
            <a
              href="https://www.cnil.fr/fr/cookies-et-autres-traceurs/regles/cookies/comment-mettre-mon-site-web-en-conformite"
              target="_blank"
              rel="noreferrer"
            >
              informations de la CNIL sur les cookies et traceurs
            </a>
            .
          </p>
        </section>
      </main>
    </EcranPublic>
  );
}
