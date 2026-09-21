import { BuildMetrics } from "@/components/BuildMetrics";
import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { EcranPublic } from '@/layouts/EcranPublic';
import { Logo } from '@/ui/Logo';
import { usePageTitle } from '@/lib/usePageTitle';
import s from './Mentions.module.css';
import eco from './Ecoconception.module.css';
export function QualityPage({ title, description, children }: {title: string; description: string; children: ReactNode}) {
  usePageTitle(title, description);
  return <EcranPublic entete={<><Link to="/" aria-label="InfiMatch, accueil"><Logo size={38} withWordmark /></Link><Link to="/">Retour à l’accueil</Link></>}>
    <main id="contenu" tabIndex={-1} className={s.page}><h1>{title}</h1><p className={s.chapeau}>{description}</p>{children}
    <nav aria-label="Qualité et installation"><Link to="/installer">Installer l’application</Link> · <Link to="/accessibilite">Accessibilité</Link> · <Link to="/ecoconception">Écoconception</Link> · <Link to="/mentions-legales">Mentions légales</Link></nav></main>
  </EcranPublic>;
}
export function Accessibilite() {
  return <QualityPage title="Accessibilité : état des travaux" description="Notre objectif est de rendre les parcours InfiMatch utilisables par le plus grand nombre.">
    <section><h2>Évaluation en cours</h2><p>Nous utilisons le RGAA 4.1.2 comme référence. Aucun audit complet n’a établi notre niveau de conformité : aucun pourcentage de conformité n’est annoncé.</p></section>
    <section><h2>Périmètre et méthode</h2><p>Les contrôles ciblent l’accueil, l’installation et les pages d’information : structure des titres, noms des commandes, alternatives des images, navigation clavier, focus et adaptation à plusieurs largeurs. Des vérifications automatiques du navigateur complètent la lecture du code.</p><p>Les parcours connectés, les contrastes de tous les états, les lecteurs d’écran et les appareils mobiles réels nécessitent des vérifications complémentaires. Ces contrôles ciblés ne constituent pas un audit RGAA.</p></section>
    <section><h2>Aides disponibles</h2><p>Le bouton Accessibilité, visible en haut à droite dès l’arrivée sur le site et depuis la fenêtre cookies, permet d’agrandir l’affichage, de renforcer le contraste, de choisir Lexend, d’espacer le texte, de souligner les liens et de réduire les animations. Les préférences restent sur cet appareil. La lecture vocale facultative nécessite une voix française déclarée locale par le navigateur ; elle ne démarre jamais automatiquement.</p><p>Un lien « Aller au contenu principal » est disponible au clavier. Le focus reste visible et les animations respectent la préférence de réduction des mouvements. L’application fonctionne sans installation.</p><p>Si un parcours vous bloque, conservez le nom de la page, l’action et le navigateur utilisés, sans mot de passe ni document médical. Écrivez à <a href="mailto:yleb.user@outlook.fr">yleb.user@outlook.fr</a> pour signaler le problème.</p></section>
    <section><h2>Référence</h2><p><a href="https://accessibilite.numerique.gouv.fr/methode/criteres-et-tests/">Critères et tests officiels du RGAA</a>. Les obligations juridiques applicables au porteur du projet restent à qualifier ; cette page décrit les travaux effectués.</p></section>
  </QualityPage>;
}
export function Ecoconception() {
  usePageTitle('Écoconception', 'Les petits choix concrets d’InfiMatch pour limiter les ressources utilisées.');
  return <EcranPublic entete={<><Link to="/" aria-label="InfiMatch, accueil"><Logo size={38} withWordmark /></Link><Link to="/">Retour à l’accueil</Link></>}>
    <main id="contenu" tabIndex={-1} className={eco.page}>
      <div className={eco.content}>
        <header className={eco.intro}>
          <p className={eco.eyebrow}>
            <svg className={eco.leaf} viewBox="0 0 40 40" fill="none" aria-hidden="true" focusable="false">
              <path d="M11 25C7 13 17 7 32 7c1 14-5 23-16 20" fill="currentColor" fillOpacity=".12" />
              <path d="M11 25C7 13 17 7 32 7c1 14-5 23-16 20M8 33 25 16M15 26l-1-8M19 22l7-1" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Écoconception
          </p>
          <h1>On prend soin<br />des ressources aussi.</h1>
          <p>Un site utile, c’est aussi un site qui évite le superflu. Voici les petits choix que nous avons faits pour InfiMatch.</p>
        </header>

        <section aria-labelledby="eco-choices">
          <h2 id="eco-choices" className={eco.sectionLabel}>Trois choix au quotidien</h2>
          <ol className={eco.rows}>
            <li>
              <span className={eco.number} aria-hidden="true">01</span>
              <h3>Charger ce qui<br className={eco.desktopBreak} /> vous sert</h3>
              <p>Les écrans se chargent quand vous les ouvrez. Les outils de lecture de documents attendent, eux aussi, que vous en ayez besoin.</p>
            </li>
            <li>
              <span className={eco.number} aria-hidden="true">02</span>
              <h3>Espacer les<br className={eco.desktopBreak} /> vérifications</h3>
              <p>Les nouvelles offres sont importées à heures fixes. Une vérification technique passe toutes les 4 heures, sans relancer ces imports.</p>
            </li>
            <li>
              <span className={eco.number} aria-hidden="true">03</span>
              <h3>Garder peu de choses<br className={eco.desktopBreak} /> hors connexion</h3>
              <p>Une courte page d’aide et quelques icônes : c’est ce que le mode hors connexion conserve. Vos documents personnels et les réponses du serveur n’y sont pas enregistrés.</p>
            </li>
          </ol>
        </section>

        <section className={eco.measurements} aria-labelledby="eco-measures">
          <h2 id="eco-measures">Et le poids du site ?</h2>
          <p>Nous suivons le poids des fichiers à chaque nouvelle version. Les chiffres et leur explication sont disponibles ici.</p>
          <BuildMetrics />
        </section>

        <section className={eco.ending} aria-labelledby="eco-progress">
          <h2 id="eco-progress">On avance, pas à pas.</h2>
          <p>InfiMatch est un projet étudiant qui continue de s’améliorer. Nous ne mesurons pas encore sa consommation d’énergie réelle et ne revendiquons aucune certification environnementale.</p>
          <a href="https://www.arcep.fr/mes-demarches-et-services/entreprises/fiches-pratiques/referentiel-general-ecoconception-services-numeriques.html">Notre repère : le référentiel public d’écoconception (RGESN)<span aria-hidden="true"> ↗</span></a>
        </section>

        <nav className={eco.navigation} aria-label="Qualité et installation">
          <Link to="/installer">Installer l’application</Link>
          <Link to="/accessibilite">Accessibilité</Link>
          <Link to="/ecoconception" aria-current="page">Écoconception</Link>
          <Link to="/mentions-legales">Mentions légales</Link>
        </nav>
      </div>
    </main>
  </EcranPublic>;
}
