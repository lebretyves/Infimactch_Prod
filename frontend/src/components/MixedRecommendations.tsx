import { OfferOriginChoices, readOfferOrigin } from "./OfferOrigin";
import { Link, useSearchParams } from "react-router";
import { useRemote } from "@/lib/useRemote";
import {
  getRecommendations,
} from "@/services/recommendations";
import { date, salary, sourceLabel, type Listing } from "@/services/market";
import { labelCode } from "@/data/professional";
import { Button, ButtonLink } from "@/ui/Button";
import { Icon } from "@/ui/Icon";
import { missionCrushs } from "@/lib/missionCrushs";
import s from "./MixedRecommendations.module.css";
function contractLabel(value: string) {
  const labels: Record<string, string> = {
    MIS: "Intérim",
    INTERIM: "Intérim",
    INTERIM_CONTEXT_CONFIRMED: "Intérim",
    CDD: "CDD",
    CDI: "CDI",
  };
  return (
    labels[value] ||
    (/^[A-Z_]+$/.test(value) ? "Contrat à vérifier dans la source" : value)
  );
}
export function MixedRecommendations({
  userId,
  isSaved,
  onFavorite,
  busy,
}: {
  userId: string;
  isSaved: (item: Listing) => boolean;
  onFavorite: (item: Listing) => void;
  busy: boolean;
}) {
  const [params, setParams] = useSearchParams();
  const origin = readOfferOrigin(params.get("origine"));
  const result = useRemote(
    (signal) => getRecommendations(signal, origin),
    userId + ":" + origin,
  );
  const data = result.data;
  const selected = data ? missionCrushs(data, origin) : [];
  function cards() {
    return (
      <ul className={s.cards}>
        {selected.map(({ item, external }, index) => (
          <li className={s.item} key={item.id}>
            <div className={s.cardTop}><span className={s.rank} aria-label={`Suggestion ${index + 1}`}>{String(index + 1).padStart(2, "0")}</span><span className={s.source}>
              {external ? sourceLabel(item) : "Partenaire InfiMatch"}
            </span></div>
            <h3>{item.title}</h3>
            <p>
              {item.qualification || "Qualification non précisée"}
              {item.service ? ` · ${labelCode(item.service)}` : ""} ·{" "}
              {item.location_label || item.address || "Lieu non précisé"}
            </p>
            <div className={s.metadata}>
              <span>
                {external
                  ? item.provenance?.salaryRaw ||
                    "Rémunération non renseignée — voir la source"
                  : salary(item)}
              </span>
              {external && item.provenance?.contract && (
                <span>{contractLabel(item.provenance.contract)}</span>
              )}
              {!external && (
                <span>
                  {item.start_at
                    ? `${date(item.start_at, item.timezone)}${item.end_at ? ` — ${date(item.end_at, item.timezone)}` : ""}`
                    : "Dates de mission non précisées"}
                </span>
              )}
              {item.shift && (
                <span>
                  {item.shift === "MORNING" ? "Matin" : item.shift === "AFTERNOON" ? "Après-midi" : item.shift === "DAY"
                    ? "Jour"
                    : item.shift === "NIGHT"
                      ? "Nuit"
                      : "Horaires à vérifier"}
                </span>
              )}
            </div>
            <p className={s.publication}>
              {item.publicationDate
                ? `Publiée le ${date(item.publicationDate)}`
                : "Date de publication non renseignée"}
            </p>
            {external && (item.sourceUpdatedAt || item.importedAt) && (
              <details className={s.sourceDetails}>
                <summary>Actualisation de l’annonce</summary>
                {item.sourceUpdatedAt && (
                  <p>
                    Mise à jour par la source le {date(item.sourceUpdatedAt)}
                  </p>
                )}
                {item.importedAt && <p>Importée le {date(item.importedAt)}</p>}
              </details>
            )}
            {external &&
              !!item.profileCorrespondence?.knownMismatches?.length && (
                <p className={s.notice}>
                  Critères en écart : vérifier le détail avant de candidater.
                </p>
              )}
            <div className={s.match}>
              {!external && data?.internal.personalization === "COMPATIBLE" && typeof item.matching_score === "number" && Number.isFinite(item.matching_score) && item.matching_score >= 0 && item.matching_score <= 100 ? (
                <><span>Matching</span><strong>{Math.round(item.matching_score)}<small> %</small></strong></>
              ) : <span>Matching non calculable<small className={s.matchNote}>{external ? "Correspondance partielle" : "Correspondance non confirmée"}</small></span>}
            </div>
            <div className={s.actions}>
              <ButtonLink
                to={
                  "/missions/" +
                  item.id +
                  (!external && item.match_explanation_id
                    ? "?correspondance=" +
                      encodeURIComponent(item.match_explanation_id)
                    : "")
                }
                size="sm"
              >
                {external
                  ? "Voir l’offre"
                  : "Voir la mission"}
              </ButtonLink>
              <Button
                variant="icon"
                className={s.favorite}
                type="button"
                aria-label={
                  isSaved(item)
                    ? "Retirer " + item.title + " des favoris"
                    : "Ajouter " + item.title + " aux favoris"
                }
                aria-pressed={isSaved(item)}
                disabled={busy}
                onClick={() => onFavorite(item)}
              >
                <Icon name="heart-outline" size={21} />
              </Button>
            </div>
          </li>
        ))}
      </ul>
    );
  }
  return (
    <section className={s.recommendations} aria-labelledby="recommendations-heading">
      <header className={s.header}>
        <div className={s.heading}>
          <span className={s.emblem} aria-hidden="true"><Icon name="heart-outline" size={26} /></span>
          <div><p className={s.eyebrow}>LE BON MATCH, CÔTÉ MISSION</p><h2 id="recommendations-heading">Vos matchs</h2></div>
        </div>
        <Link className={s.allOffers} to={`/missions?origine=${origin}`}>Toutes les offres <span aria-hidden="true">→</span></Link>
      </header>
      <p className={s.intro}>Jusqu’à 3 missions à découvrir. Un coup de cœur ? Gardez-le dans vos favoris.</p>
      <div className={s.toolbar}>
        <OfferOriginChoices value={origin} onChange={(origine) => {
          const next = new URLSearchParams(params);
          next.set("origine", origine);
          setParams(next);
        }} />
        <p>{origin === "toutes" ? "Partenaires en priorité, puis offres externes." : origin === "partenaires" ? "Votre sélection partenaire InfiMatch." : "Des offres externes à explorer."}</p>
      </div>
      {result.loading ? (
        <p role="status" className={s.state}>Recherche de vos prochaines missions…</p>
      ) : result.error ? (
        <div role="alert" className={s.notice}><p>Les suggestions ne sont pas disponibles pour le moment. Vos autres informations restent accessibles.</p><Button variant="outline" onClick={result.reload}>Réessayer les suggestions</Button></div>
      ) : data && (
        <>
          {origin !== "externes" && data.internal.personalization === "GENERAL_PROFILE_INCOMPLETE" && (
            <p className={s.notice}>Ces missions partenaires sont consultables. Votre profil ou votre vérification professionnelle est incomplet : leur compatibilité n’est pas confirmée. <Link to="/profil">Compléter mon profil</Link>.</p>
          )}
          {origin !== "partenaires" && data.external.personalization === "GENERAL_PROFILE_INCOMPLETE" && (
            <p className={s.notice}>Votre profil est incomplet : ces offres externes générales ne sont pas des recommandations personnalisées. <Link to="/profil">Compléter mon profil</Link>.</p>
          )}
          {origin !== "externes" && data.internal.status === "UNAVAILABLE" && (
            <div className={s.notice} role="status"><p>La recherche de missions compatibles est temporairement indisponible.</p><Button variant="outline" onClick={result.reload}>Réessayer les missions compatibles</Button></div>
          )}
          {origin !== "partenaires" && data.external.status === "UNAVAILABLE" && (
            <div className={s.notice} role="status"><p>Les suggestions externes sont temporairement indisponibles.</p><Button variant="outline" onClick={result.reload}>Réessayer les offres externes</Button></div>
          )}
          {origin !== "partenaires" && data.external.sources.some(source => !["SUCCESS", "SUCCEEDED", "READY"].includes(source.status)) && (
            <p className={s.notice} role="status">La dernière actualisation d’au moins une source est indisponible ou incomplète. Les offres déjà enregistrées peuvent être présentées ; vérifiez leur disponibilité sur le site source.</p>
          )}
          {selected.length > 0 ? cards() : <div className={s.state}><h3>Votre prochain match se prépare</h3><p>Aucune offre disponible dans cette sélection pour le moment.</p></div>}
          {origin !== "externes" && data.internal.status === "READY" && !data.internal.items.length && (
            <p className={s.emptyNote}>Aucune mission partenaire disponible dans cette sélection. <Link to="/profil">Vérifiez votre profil</Link>, votre dossier RPPS et vos <Link to="/calendrier">disponibilités</Link>.</p>
          )}
          {origin !== "partenaires" && data.external.status === "READY" && !data.external.items.length && (
            <p className={s.emptyNote}>Aucune offre externe disponible pour le moment.</p>
          )}
          <details className={s.explanation}>
            <summary>Comment sont choisis vos matchs ?</summary>
            {origin !== "externes" && <p>Les missions partenaires sont classées selon la correspondance avec votre profil lorsque celui-ci permet de la confirmer.</p>}
            {origin !== "partenaires" && <p>Les offres externes complètent la sélection : leur correspondance est partielle. Horaires, prérequis et disponibilité sont à vérifier auprès de l’annonceur. La candidature se fait sur le site source.</p>}
            <p>Le cœur ajoute uniquement l’offre à vos favoris : il n’envoie pas de candidature.</p>
          </details>
        </>
      )}
    </section>
  );
}
