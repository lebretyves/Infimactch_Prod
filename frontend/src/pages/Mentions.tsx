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
          InfiMatch est un projet étudiant réalisé dans le cadre du MBA / MSc2 Epitech. Il propose un
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
            Contact du projet et demandes concernant vos données :{" "}
            <a href="mailto:yleb.user@outlook.fr">yleb.user@outlook.fr</a>.
            Adresse du campus de rattachement pédagogique : Epitech Paris,
            24 rue Pasteur, 94270 Le Kremlin-Bicêtre. Cette adresse de campus
            ne désigne pas Epitech comme exploitant ou responsable des données
            d’InfiMatch.
          </p>
          <p>
            L’identité juridique du responsable de publication et du responsable
            de traitement reste à formaliser par le porteur du projet avant
            une exploitation au-delà du cadre pédagogique.
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
            Le RIB est facultatif à l’inscription. Si vous choisissez de le
            renseigner dans votre dossier, vérifiez les données proposées par
            la lecture automatique avant de les enregistrer. Le contrôle du
            format de l’IBAN ne prouve ni l’existence du compte ni sa propriété.
            Ne déposez aucune donnée de patient. Pour les démonstrations,
            utilisez des documents entièrement fictifs.
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
            Les données sont utilisées pour gérer votre compte, rechercher des
            missions, présenter les candidatures aux organisations concernées,
            suivre les affectations et protéger le service. Le matching est une
            aide indicative : la décision d’affectation appartient aux personnes
            concernées. Le CV propose des informations à vérifier ; il ne valide
            pas vos diplômes. Les confirmations et annulations peuvent être
            envoyées par email avec un PDF privé.
          </p>
          <p>
            Si vous contactez le support depuis l’aide, votre demande et les
            réponses sont conservées dans un dossier accessible à votre compte
            et aux administrateurs habilités. Ne transmettez aucun mot de passe,
            document bancaire ou renseignement de patient dans ces messages.
            Les demandes de votre compte sont supprimées lors de sa clôture
            effective ; vos réponses éventuelles dans d’autres dossiers sont
            anonymisées. La durée maximale hors clôture reste à formaliser.
          </p>
          <p>
            Vos dossiers et coordonnées bancaires sont accessibles selon les
            droits du compte et des organisations concernées. Les journaux
            d’envoi distinguent l’acceptation par le prestataire et, lorsqu’un
            retour est disponible, la livraison au serveur destinataire. Ils ne
            prouvent pas la lecture du message.
          </p>
          <p>
            Pour demander l’accès, la rectification, l’effacement, la limitation
            ou la portabilité de vos données, ou exercer votre droit d’opposition
            selon le traitement, écrivez à{" "}
            <a href="mailto:yleb.user@outlook.fr">yleb.user@outlook.fr</a>.
            Vous pouvez également modifier votre profil et demander la clôture
            depuis votre compte. Une affectation active ou la responsabilité
            d’une organisation peut nécessiter un traitement préalable. Ne
            transmettez pas de mot de passe par email. Vous pouvez adresser une
            réclamation à la <a href="https://www.cnil.fr/fr/plaintes">CNIL</a>.
          </p>
          <p>
            Les bases juridiques de chaque traitement et la durée de conservation
            de l’historique métier restent à formaliser. Les fonctions demandées
            par l’utilisateur, la sécurité du service et le consentement aux
            services facultatifs seront distingués dans cette décision. Aucune
            conformité juridique globale n’est revendiquée.
          </p>
        </section>
        <section aria-labelledby="titre-conservation">
          <h2 id="titre-conservation">Conservation et suppression</h2>
          <p>Les seuils techniques actuellement prévus sont les suivants :
            notifications 90 jours ; journaux d’audit 365 jours ; explications
            de matching et événements techniques terminés 30 jours ; anciens
            RIB remplacés 30 jours ; documents temporaires non finalisés
            24 heures. Les suppressions dépendent du passage de la maintenance
            et de l’absence de lien à conserver avec une opération en cours.</p>
          <p>Les compteurs de protection contre les abus utilisent une empreinte
            pseudonymisée de l’adresse réseau ou de la session, avec une fenêtre
            de 1 à 15 minutes selon le parcours. Les compteurs expirés sont
            nettoyés par la maintenance. Les sauvegardes locales de production
            sont chiffrées ; leur politique maximale retenue est de 30 jours.</p>
          <p>La suppression automatique générale des missions, affectations et
            documents métier historiques n’est pas activée sans décision sur
            leur conservation. La clôture du compte n’efface donc pas
            nécessairement toutes les traces liées aux missions. Pour connaître
            le traitement de votre dossier, utilisez le contact indiqué ci-dessus.</p>
        </section>
        <section aria-labelledby="titre-prestataires">
          <h2 id="titre-prestataires">Services techniques utilisés</h2>
          <ul className={s.liste}>
            <li>Vercel : hébergement de l’interface et de l’API.</li>
            <li>Supabase : base PostgreSQL et stockage chiffré des documents de l’application.</li>
            <li>MongoDB Atlas : traces techniques complémentaires du matching et de l’effacement.</li>
            <li>n8n Cloud : déclenchement des automatisations.</li>
            <li>SMTP2GO : acheminement des emails transactionnels.</li>
            <li>Google, uniquement si vous l’autorisez : connexion facultative.</li>
            <li>Discord, si vous configurez cette liaison : notifications facultatives.</li>
            <li>Agence du Numérique en Santé : contrôle RPPS demandé dans le dossier.</li>
          </ul>
          <p>France Travail et JobsPipe fournissent les annonces externes, dont
            la source est indiquée sur chaque offre. La candidature à une offre
            externe se poursuit sur le site source, avec ses propres conditions.</p>
          <p>Les régions d’hébergement, les accords avec les prestataires et les
            garanties applicables aux éventuels transferts internationaux doivent
            être documentés dans le dossier du projet. Cette liste ne constitue
            pas une garantie de résidence exclusivement française des données.</p>
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
