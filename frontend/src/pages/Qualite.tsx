import { BuildMetrics } from "@/components/BuildMetrics";
import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { EcranPublic } from '@/layouts/EcranPublic';
import { Logo } from '@/ui/Logo';
import { usePageTitle } from '@/lib/usePageTitle';
import s from './Mentions.module.css';
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
    <section><h2>Aides disponibles</h2><p>Le bouton Accessibilité permet d’agrandir l’affichage, de renforcer le contraste, de choisir Lexend, d’espacer le texte, de souligner les liens et de réduire les animations. Les préférences restent sur cet appareil. La lecture vocale facultative nécessite une voix française déclarée locale par le navigateur ; elle ne démarre jamais automatiquement.</p><p>Un lien « Aller au contenu principal » est disponible au clavier. Le focus reste visible et les animations respectent la préférence de réduction des mouvements. L’application fonctionne sans installation.</p><p>Si un parcours vous bloque, conservez le nom de la page, l’action et le navigateur utilisés, sans mot de passe ni document médical. Écrivez à <a href="mailto:yleb.user@outlook.fr">yleb.user@outlook.fr</a> pour signaler le problème.</p></section>
    <section><h2>Référence</h2><p><a href="https://accessibilite.numerique.gouv.fr/methode/criteres-et-tests/">Critères et tests officiels du RGAA</a>. Les obligations juridiques applicables au porteur du projet restent à qualifier ; cette page décrit les travaux effectués.</p></section>
  </QualityPage>;
}
export function Ecoconception() {
  return <QualityPage title="Notre démarche d’écoconception" description="Réduire les ressources utilisées tout en conservant des parcours utiles et accessibles.">
    <section><h2>Actions dans cette version</h2><p>Les écrans sont chargés à la demande pour éviter de transférer tous les formulaires dès l’accueil. Les polices sont hébergées sur le site ; la police de lecture Lexend est chargée lorsqu’elle est choisie. Les images de sections secondaires utilisent le chargement différé.</p><p>Le mode hors connexion conserve uniquement une courte page d’aide et les icônes. Il ne duplique pas vos documents, votre session ni les réponses de l’API dans un cache persistant.</p></section>
    <BuildMetrics />
    <section><h2>Mesurer sans surpromettre</h2><p>Le RGESN 2024, qui comporte 78 critères, sert de cadre. Le poids des fichiers produits par le build est suivi avant et après modification. Il ne mesure ni la consommation énergétique réelle ni les Core Web Vitals des utilisateurs.</p><p>Aucun score RGESN, label ou gain de CO₂ n’est revendiqué. Le cycle de vie du matériel, les engagements des hébergeurs et la gouvernance restent à documenter. Les imports sont regroupés à 7 h et 15 h pour France Travail, et à 7 h pour JobsPipe, heure de Paris. La reprise technique est programmée toutes les 4 heures, soit six passages par jour. Elle ne relance pas ces imports. Les anciennes notifications fictives sont neutralisées et les relances de missions non pourvues sont plafonnées. Ces choix réduisent les appels inutiles sans constituer une mesure de gain carbone.</p></section>
    <section><h2>Référence</h2><p><a href="https://www.arcep.fr/mes-demarches-et-services/entreprises/fiches-pratiques/referentiel-general-ecoconception-services-numeriques.html">Référentiel général d’écoconception des services numériques</a>.</p></section>
  </QualityPage>;
}
