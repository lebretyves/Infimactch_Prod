import { useEffect, useRef, useState, type MouseEvent } from 'react';
import { Link } from 'react-router';
import { PhotoMaquette } from '@/components/PhotoMaquette';
import { EcranPublic } from '@/layouts/EcranPublic';
import { ButtonLink } from '@/ui/Button';
import { Icon } from '@/ui/Icon';
import { Logo } from '@/ui/Logo';
import { usePageTitle } from '@/lib/usePageTitle';
import s from './AccueilPublic.module.css';
import media from '@/assets/public-media.json';

const LIENS = [
  { id: 'notre-mission', libelle: 'Notre mission' },
  { id: 'pour-qui', libelle: 'Pour qui ?' },
  { id: 'comment-ca-marche', libelle: 'Comment ça marche' },
  { id: 'qui-sommes-nous', libelle: 'Qui sommes-nous' },
];

const QUESTIONS = [
  {
    question: 'À qui s’adresse InfiMatch ?',
    reponse: 'InfiMatch s’adresse aux infirmiers diplômés d’État (IDE), aux infirmiers anesthésistes (IADE) et aux infirmiers de bloc opératoire (IBODE), ainsi qu’aux établissements de santé et aux agences d’intérim qui organisent leurs renforts.',
  },
  {
    question: 'Créer un compte suffit-il à faire vérifier mon profil ?',
    reponse: 'Non. La création du compte est la première étape. Vous complétez ensuite votre identité, votre métier, vos qualifications et vos disponibilités. Le numéro RPPS et les informations professionnelles font l’objet d’une vérification distincte : l’inscription seule ne vaut pas validation du profil.',
  },
  {
    question: 'Quelle différence entre une mission interne et une offre externe ?',
    reponse: 'Pour une mission publiée sur InfiMatch, vous pouvez candidater et suivre votre candidature dans votre espace. Une offre externe renvoie vers le site qui l’a publiée : la candidature et son suivi se font alors sur ce site, selon ses propres modalités.',
  },
  {
    question: 'Qui sélectionne les candidats et confirme les missions ?',
    reponse: 'Les établissements précisent leurs besoins et examinent les candidatures. Les agences organisent les missions et confirment les affectations dans leur parcours. InfiMatch aide à rapprocher profils et besoins ; la sélection et la confirmation restent des décisions humaines.',
  },
];

export default function AccueilPublic() {
  usePageTitle(
    'L’intérim infirmier, pensé pour le soin',
    'Découvrez InfiMatch : un projet de plateforme reliant infirmiers IDE, IADE, IBODE, établissements de santé et agences d’intérim.',
  );
  const [menuOuvert, setMenuOuvert] = useState(false);
  const boutonMenu = useRef<HTMLButtonElement>(null);
  const navigation = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOuvert) return;
    function fermer(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setMenuOuvert(false);
        boutonMenu.current?.focus();
      }
    }
    const media = window.matchMedia('(min-width: 1200px)');
    function redimensionner() { setMenuOuvert(false); }
    document.addEventListener('keydown', fermer);
    media.addEventListener('change', redimensionner);
    return () => {
      document.removeEventListener('keydown', fermer);
      media.removeEventListener('change', redimensionner);
    };
  }, [menuOuvert]);

  function suivreAncre(event: MouseEvent<HTMLAnchorElement>, id: string) {
    event.preventDefault();
    setMenuOuvert(false);
    window.history.replaceState(null, '', `#${id}`);
    // Wait for the disclosure to close before calculating the anchor position.
    requestAnimationFrame(() => {
      const cible = document.getElementById(id);
      cible?.focus({ preventScroll: true });
      cible?.scrollIntoView({ block: 'start' });
    });
  }

  const entete = (
    <>
      <div className={s.gauche}>
        <Link to="/" className={s.marque} aria-label="InfiMatch, accueil">
          <Logo size={38} withWordmark />
        </Link>
        <div className={s.mobileControls}>
        <span data-accessibility-slot />

        <button
          ref={boutonMenu}
          type="button"
          className={s.burger}
          aria-expanded={menuOuvert}
          aria-controls="menu-principal"
          aria-label={menuOuvert ? 'Fermer le menu principal' : 'Ouvrir le menu principal'}
          onClick={() => setMenuOuvert((ouvert) => !ouvert)}
        >
          <Icon name={menuOuvert ? 'close' : 'menu'} size={22} />
        </button>
        </div>
      </div>
      <div
        ref={navigation}
        id="menu-principal"
        className={[s.navigation, menuOuvert && s.ouvert].filter(Boolean).join(' ')}
        onBlur={(event) => {
          if (menuOuvert && !navigation.current?.contains(event.relatedTarget) && event.relatedTarget !== boutonMenu.current) {
            setMenuOuvert(false);
          }
        }}
      >
        <nav className={s.nav} aria-label="Navigation principale">
          {LIENS.map((lien) => (
            <a key={lien.id} href={`#${lien.id}`} className={s.lien} onClick={(event) => suivreAncre(event, lien.id)}>
              {lien.libelle}
            </a>
          ))}
          <Link to="/aide" className={s.lien} onClick={() => setMenuOuvert(false)}>Centre d’aide</Link>
        </nav>
        <div className={s.actions} onClick={() => setMenuOuvert(false)}>
          <ButtonLink to="/connexion" variant="ghost" size="sm" className={s.connexion}>Connexion</ButtonLink>
          <ButtonLink to="/inscription" size="sm" className={s.inscription}>Créer mon compte</ButtonLink>
        </div>
      </div>
    </>
  );

  return (
    <EcranPublic entete={entete} accessibilityInHeader>
      <main id="contenu" className={s.corps} tabIndex={-1}>
        <section className={`${s.conteneur} ${s.hero}`} aria-labelledby="titre-accueil">
          <div className={s.discours}>
            <p className={s.surtitre}>L’intérim des professionnels de santé</p>
            <h1 id="titre-accueil" className={s.titre}>L’intérim infirmier,<br /><span>pensé pour le soin.</span></h1>
            <p className={s.chapeau}>InfiMatch rapproche les infirmiers <strong>IDE, IADE et IBODE</strong>, les établissements et les agences d’intérim.</p>
            <div className={s.orientations}>
              <a href="#soignants" className={s.actionPrimaire} onClick={(event) => suivreAncre(event, 'soignants')}>Je suis soignant <span aria-hidden="true">↓</span></a>
              <a href="#recruteurs" className={s.actionSecondaire} onClick={(event) => suivreAncre(event, 'recruteurs')}>Je recrute <span aria-hidden="true">↓</span></a>
            </div>
            <div className={s.installation} data-install-prompt><ButtonLink to="/installer" variant="outline">Installer l’application</ButtonLink></div>
          </div>
          <div className={s.visuel}><PhotoMaquette variante="accueil" /></div>
        </section>

        <section id="notre-mission" className={`${s.conteneur} ${s.mission}`} tabIndex={-1} aria-labelledby="titre-mission">
          <div><p className={s.surtitre}>Notre mission</p><h2 id="titre-mission">La bonne rencontre,<br />au service du soin.</h2></div>
          <p>Rendre les besoins, les compétences et les disponibilités plus lisibles. Pour préparer chaque renfort, en gardant le choix humain au centre.</p>
        </section>

        <section id="pour-qui" className={`${s.conteneur} ${s.section}`} tabIndex={-1} aria-labelledby="titre-parcours">
          <div className={s.enteteSection}><p className={s.surtitre}>Pour qui ?</p><h2 id="titre-parcours">À chacun son parcours.</h2></div>
          <div className={s.parcours}>
            <PhotoMaquette variante="connexion" className={s.photoParcours} loading="lazy" />
            <div className={s.parcoursTexte}>
              <article id="soignants" className={s.role} tabIndex={-1}>
                <h3>Soignants</h3>
                <p>Présentez vos compétences et disponibilités. Choisissez les missions auxquelles postuler.</p>
                <Link to="/inscription?espace=candidat" className={s.lienParcours}>Créer mon profil soignant <span aria-hidden="true">→</span></Link>
              </article>
              <div id="recruteurs" tabIndex={-1}>
                <article className={s.role}>
                  <h3>Établissements</h3>
                  <p>Exprimez vos besoins de renfort et examinez les candidatures.</p>
                  <Link to="/inscription?espace=etablissement" className={s.lienParcours}>Ouvrir mon espace établissement <span aria-hidden="true">→</span></Link>
                </article>
                <article className={s.role}>
                  <h3>Agences d’intérim</h3>
                  <p>Créez vos missions, suivez les candidatures et confirmez les affectations.</p>
                  <Link to="/inscription?espace=agence" className={s.lienParcours}>Ouvrir mon espace agence <span aria-hidden="true">→</span></Link>
                </article>
              </div>
            </div>
          </div>
        </section>

        <section id="comment-ca-marche" className={s.fonctionnement} tabIndex={-1} aria-labelledby="titre-etapes">
          <div className={`${s.conteneur} ${s.etapesInterieur}`}>
            <div className={s.enteteSection}><p className={s.surtitre}>Comment ça marche</p><h2 id="titre-etapes">Trois étapes pour avancer.</h2></div>
            <ol className={s.etapes}>
              <li><span className={s.numero}>01</span><div><h3>Votre profil</h3><p>Renseignez votre métier, vos qualifications et vos disponibilités.</p></div></li>
              <li><span className={s.numero}>02</span><div><h3>Votre recherche</h3><p>Explorez les missions selon vos critères.</p></div></li>
              <li><span className={s.numero}>03</span><div><h3>Votre candidature</h3><p>Postulez et suivez la décision de l’organisation.</p></div></li>
            </ol>
          </div>
        </section>

        <section id="qui-sommes-nous" className={`${s.conteneur} ${s.apropos} ${s.section}`} tabIndex={-1} aria-labelledby="titre-apropos">
          <div className={s.aproposTexte}>
            <p className={s.surtitre}>Qui sommes-nous ?</p>
            <h2 id="titre-apropos">Un lien autour<br />du soin.</h2>
            <p>InfiMatch est un projet de plateforme dédié à l’intérim infirmier. Notre approche : des parcours clairs pour les soignants et les organisations, au service de décisions humaines.</p>
            <p className={s.transparence}>Un projet en développement, réalisé dans un cadre pédagogique.</p>
          </div>
          <img className={s.photoCoordination} src={media.coordination.src} srcSet={media.coordination.srcSet} sizes={media.coordination.sizes} width={media.coordination.width} height={media.coordination.height} loading="lazy" decoding="async" alt="Illustration : une soignante et une coordinatrice préparent un planning ensemble." />
        </section>

        <section id="questions-frequentes" className={s.faq} tabIndex={-1} aria-labelledby="titre-faq">
          <div className={`${s.conteneur} ${s.faqInterieur}`}>
            <div><p className={s.surtitre}>Questions fréquentes</p><h2 id="titre-faq">Quelques repères.</h2></div>
            <div className={s.questions}>
              {QUESTIONS.map(({ question, reponse }) => (
                <details key={question}><summary>{question}<span className={s.plus} aria-hidden="true" /></summary><p>{reponse}</p></details>
              ))}
            </div>
          </div>
        </section>
      </main>
      <footer className={s.footer}>
        <div className={`${s.conteneur} ${s.footerInterieur}`}>
          <div className={s.footerMarque}><Link to="/" aria-label="InfiMatch, accueil"><Logo size={38} withWordmark tone="light" /></Link><p>L’intérim infirmier,<br />pensé pour le soin.</p></div>
          <nav aria-label="Découvrir InfiMatch"><h2>Découvrir InfiMatch</h2><a href="#notre-mission">Notre mission</a><a href="#qui-sommes-nous">Qui sommes-nous</a><a href="#questions-frequentes">Questions fréquentes</a></nav>
          <nav aria-label="Votre parcours"><h2>Votre parcours</h2><a href="#soignants">Soignants</a><a href="#recruteurs">Établissements et agences</a><a href="#comment-ca-marche">Comment ça marche</a></nav>
          <nav aria-label="Informations légales"><h2>Informations</h2><Link to="/plan-du-site">Plan du site</Link><Link to="/accessibilite">Accessibilité</Link><Link to="/ecoconception">Écoconception</Link><Link to="/mentions-legales">Mentions légales</Link><Link to="/mentions-legales#confidentialite">Confidentialité</Link><Link to="/mentions-legales#conditions">Conditions d’utilisation</Link></nav>
        </div>
        <div className={`${s.conteneur} ${s.footerBas}`}><p>InfiMatch · Projet de plateforme d’intérim infirmier</p></div>
      </footer>
    </EcranPublic>
  );
}
