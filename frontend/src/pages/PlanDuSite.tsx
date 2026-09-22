import { Link } from 'react-router';
import { QualityPage } from './Qualite';

export default function PlanDuSite() {
  return <QualityPage title="Plan du site" description="Retrouvez les pages et les accès aux espaces InfiMatch, ainsi que les informations utiles pour vous accompagner.">
    <nav aria-label="Pages du site">
      <section>
        <h2>Découvrir InfiMatch</h2>
        <ul>
          <li><Link to="/">Accueil</Link></li>
          <li><Link to="/#notre-mission">Notre mission</Link></li>
          <li><Link to="/#pour-qui">Pour qui ?</Link></li>
          <li><Link to="/#comment-ca-marche">Comment ça marche</Link></li>
          <li><Link to="/#qui-sommes-nous">Qui sommes-nous</Link></li>
          <li><Link to="/#questions-frequentes">Questions fréquentes</Link></li>
        </ul>
      </section>
      <section>
        <h2>Accéder à votre espace</h2>
        <ul>
          <li><Link to="/connexion">Se connecter</Link></li>
          <li><Link to="/inscription">Créer mon compte</Link></li>
          <li><Link to="/mot-de-passe-oublie">Mot de passe oublié</Link></li>
          <li><Link to="/accueil">Mon espace — connexion requise</Link></li>
        </ul>
      </section>
      <section>
        <h2>Aide et informations</h2>
        <ul>
          <li><Link to="/aide">Centre d’aide</Link></li>
          <li data-install-prompt><Link to="/installer">Installer l’application</Link></li>
          <li><Link to="/accessibilite">Accessibilité</Link></li>
          <li><Link to="/ecoconception">Écoconception</Link></li>
          <li><Link to="/mentions-legales">Mentions légales</Link></li>
          <li><Link to="/mentions-legales#confidentialite">Confidentialité</Link></li>
          <li><Link to="/mentions-legales#conditions">Conditions d’utilisation</Link></li>
          <li><Link to="/mentions-legales#cookies">Cookies</Link></li>
        </ul>
      </section>
    </nav>
  </QualityPage>;
}
