import { useEffect, useState, type ReactNode } from "react";
import { Link } from "react-router";
import { EcranPublic } from "@/layouts/EcranPublic";
import { Logo } from "@/ui/Logo";
import { usePageTitle } from "@/lib/usePageTitle";
import s from "./Mentions.module.css";

type BuildWeight = {
  measuredAt?: string;
  totalBytes?: number;
  jsBytes?: number;
  cssBytes?: number;
  imageBytes?: number;
  fontBytes?: number;
  note?: string;
};

function ko(bytes?: number) {
  if (bytes == null || Number.isNaN(bytes)) return "non mesuré";
  return `${(bytes / 1024).toFixed(1)}\u00a0ko`;
}

function dateFr(iso?: string) {
  if (!iso) return null;
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return null;
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "Europe/Paris",
  }).format(t);
}

export function QualityPage({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  usePageTitle(title, description);
  return (
    <EcranPublic
      entete={
        <>
          <Link to="/" aria-label="InfiMatch, accueil">
            <Logo size={38} withWordmark />
          </Link>
          <Link to="/">Retour à l’accueil</Link>
        </>
      }
    >
      <main id="contenu" tabIndex={-1} className={s.page}>
        <h1>{title}</h1>
        <p className={s.chapeau}>{description}</p>
        {children}
        <nav aria-label="Qualité et installation">
          <Link to="/installer">Installer l’application</Link>
          {" · "}
          <Link to="/accessibilite">Accessibilité</Link>
          {" · "}
          <Link to="/ecoconception">Écoconception</Link>
          {" · "}
          <Link to="/mentions-legales">Mentions légales</Link>
        </nav>
      </main>
    </EcranPublic>
  );
}

export function Accessibilite() {
  return (
    <QualityPage
      title="Accessibilité : état des travaux"
      description="Notre objectif est de rendre les parcours InfiMatch utilisables par le plus grand nombre. Cette page décrit des travaux en cours, pas une conformité RGAA atteinte."
    >
      <section>
        <h2>Évaluation en cours</h2>
        <p>
          État au 17 septembre 2026. Référence utilisée :{" "}
          <strong>RGAA 4.1.2</strong>. Aucun audit complet n’a établi notre
          niveau de conformité : <strong>aucun pourcentage</strong> n’est
          annoncé. Les contrôles automatiques, les aides d’affichage du panneau
          Accessibilité et les contrôles manuels ciblés ne remplacent pas un
          audit humain.
        </p>
      </section>

      <section>
        <h2>Ce qui est déjà en place</h2>
        <ul>
          <li>
            Langue du document (<code>lang=&quot;fr&quot;</code>), lien
            d’évitement, focus visible, et panneau « Accessibilité » (taille du
            texte, contraste, police lisible Lexend, espacement, liens
            soulignés, moins d’animations, lecture à voix haute via la synthèse
            vocale du navigateur) mémorisé sur cet appareil.
          </li>
          <li>
            Respect de <code>prefers-reduced-motion</code> pour limiter les
            animations.
          </li>
          <li>
            Structure de titres et libellés contrôlés sur les pages publiques
            (accueil, connexion, mentions, accessibilité, écoconception,
            installation) via scripts de contrôle automatisé.
          </li>
          <li>
            Alternatives textuelles exigées pour les images des parcours
            publics testés.
          </li>
        </ul>
      </section>

      <section>
        <h2>Ce qui n’est pas encore fait</h2>
        <ul>
          <li>
            Audit RGAA complet (échantillon connecté, mobile réel, lecteur
            d’écran, contrastes de tous les états).
          </li>
          <li>
            Qualification juridique (assujettissement Article 47 / EAA) et
            déclaration officielle de conformité.
          </li>
          <li>
            Contact de signalement pérenne nommé par le porteur du projet
            (identité éditeur encore à compléter dans les mentions).
          </li>
        </ul>
      </section>

      <section>
        <h2>Comment signaler un obstacle</h2>
        <p>
          Indiquez la page, l’action tentée, le navigateur et le moyen
          d’assistance utilisé, <strong>sans</strong> mot de passe ni document
          médical. En attendant un canal officiel, utilisez le contact du
          porteur du projet dès qu’il est publié dans les{" "}
          <Link to="/mentions-legales">mentions légales</Link>.
        </p>
      </section>

      <section>
        <h2>Référence</h2>
        <p>
          <a href="https://accessibilite.numerique.gouv.fr/methode/criteres-et-tests/">
            Critères et tests officiels du RGAA
          </a>
          .
        </p>
      </section>
    </QualityPage>
  );
}

export function Ecoconception() {
  const [weight, setWeight] = useState<BuildWeight | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    void fetch("/quality/build-weight.json", {
      signal: controller.signal,
      cache: "no-store",
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data && typeof data === "object") setWeight(data as BuildWeight);
      })
      .catch(() => {
        /* Mesure absente tant que le build n’a pas produit le fichier. */
      });
    return () => controller.abort();
  }, []);

  const measured = dateFr(weight?.measuredAt);

  return (
    <QualityPage
      title="Notre démarche d’écoconception"
      description="Réduire les ressources utilisées tout en conservant des parcours utiles et accessibles. Cadre RGESN 2024 — sans score ni allégation CO₂."
    >
      <section>
        <h2>Actions dans cette version</h2>
        <ul>
          <li>
            Chargement des écrans à la demande (code-splitting) pour ne pas
            transférer tous les formulaires dès l’accueil.
          </li>
          <li>Une seule famille de caractères hébergée sur le site.</li>
          <li>
            Images de sections secondaires en chargement différé (
            <code>loading=&quot;lazy&quot;</code>).
          </li>
          <li>
            Mode hors connexion limité à une page d’aide et aux icônes : pas de
            cache des documents, de la session ni des réponses API.
          </li>
        </ul>
      </section>

      <section>
        <h2>Mesure du build (ressource)</h2>
        {weight ? (
          <>
            <p>
              Dernière mesure{measured ? ` le ${measured}` : ""} (fichiers{" "}
              <code>dist/</code> après <code>npm run build</code>).
            </p>
            <ul>
              <li>JavaScript : {ko(weight.jsBytes)}</li>
              <li>CSS : {ko(weight.cssBytes)}</li>
              <li>Images : {ko(weight.imageBytes)}</li>
              <li>Polices : {ko(weight.fontBytes)}</li>
              <li>Total des fichiers du build : {ko(weight.totalBytes)}</li>
            </ul>
            <p>
              {weight.note ||
                "Ce n’est pas une mesure énergétique ni un score RGESN."}
            </p>
          </>
        ) : (
          <p>
            Aucune mesure locale n’est encore publiée dans{" "}
            <code>/quality/build-weight.json</code>. Après un build, lancez{" "}
            <code>npm run measure:build</code> dans le dossier frontend.
          </p>
        )}
      </section>

      <section>
        <h2>Mesurer sans surpromettre</h2>
        <p>
          Le <strong>RGESN 2024</strong> (78 critères) sert de cadre. Aucun
          score RGESN, label ou gain de CO₂ n’est revendiqué. Le cycle de vie
          du matériel, les engagements des hébergeurs, la gouvernance et la
          fréquence des imports serveur restent à documenter séparément.
        </p>
      </section>

      <section>
        <h2>Référence</h2>
        <p>
          <a href="https://www.arcep.fr/mes-demarches-et-services/entreprises/fiches-pratiques/referentiel-general-ecoconception-services-numeriques.html">
            Référentiel général d’écoconception des services numériques
          </a>
          .
        </p>
      </section>
    </QualityPage>
  );
}
