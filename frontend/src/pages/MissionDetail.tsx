import { ParsedOfferDetails } from "@/components/ParsedOfferDetails";
import { extractedSidebar } from "@/services/parsed-offer";
import { ExternalCorrespondence } from "@/components/ExternalCorrespondence";
import { useEffect, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router";
import { labelCode } from "@/data/professional";
import { useRemote } from "@/lib/useRemote";
import {
  detail,
  date,
  salary,
  safeUrl,
  statusLabels,
  favorites,
  favorite,
  facilityFavorite,
  sourceLabel,
  externalExpired,
} from "@/services/market";
import { api } from "@/services/api";
import { useAuth } from "@/context/AuthContext";
import { ButtonLink, Button } from "@/ui/Button";
import { Icon } from "@/ui/Icon";
import s from "./MarketPages.module.css";
export default function MissionDetail() {
  const { id = "" } = useParams(),
    { user } = useAuth();
  const [params] = useSearchParams();
  const r = useRemote((signal) => detail(id, signal), id);
  const parsedOffer = r.data?.parsedOffer;
  const parsedSummary = extractedSidebar(parsedOffer);
  const saved = useRemote(
    async (signal) => (user?.role === "interimaire" ? favorites(signal) : []),
    "detail-favorites:" + user?.id + id,
  );
  const [missionSaved, setMissionSaved] = useState(false),
    [facilitySaved, setFacilitySaved] = useState(false),
    [busy, setBusy] = useState(""),
    [error, setError] = useState("");
  useEffect(() => {
    setMissionSaved(
      !!saved.data?.some(
        (f) =>
          f.target_id === id.slice(2) &&
          f.kind === (id.startsWith("e_") ? "EXTERNAL" : "MISSION"),
      ),
    );
    setFacilitySaved(
      !!saved.data?.some(
        (f) =>
          f.kind === "ESTABLISHMENT" &&
          f.target_id === r.data?.establishment_id,
      ),
    );
  }, [saved.data, id, r.data?.establishment_id]);
  const explanationId = params.get("correspondance");
  const explanation = useRemote(
    async (signal) =>
      explanationId
        ? api<{
            stale: boolean;
            result: {
              eligible: boolean;
              score: number | null;
              distanceKm?: number;
            };
          }>("/matches/" + encodeURIComponent(explanationId) + "/explanation", {
            signal,
          })
        : null,
    "explanation:" + explanationId,
  );
  async function toggle(kind: "mission" | "facility") {
    if (!r.data || busy) return;
    setBusy(kind);
    setError("");
    try {
      if (kind === "mission") {
        await favorite(r.data, missionSaved);
        setMissionSaved(!missionSaved);
      } else if (r.data.establishment_id) {
        await facilityFavorite(r.data.establishment_id, facilitySaved);
        setFacilitySaved(!facilitySaved);
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy("");
    }
  }
  if (r.loading)
    return (
      <div className={s.empty} role="status">
        Chargement de la mission…
      </div>
    );
  if (r.error || !r.data)
    return (
      <div className={s.empty} role="alert">
        <h1>Mission indisponible</h1>
        <p>{r.error || "Cette mission est introuvable."}</p>
        <div className={s.actions}>
          <Button onClick={r.reload}>Réessayer</Button>
          <ButtonLink to="/missions" variant="outline">
            Retour aux missions
          </ButtonLink>
        </div>
      </div>
    );
  const m = r.data,
    external = id.startsWith("e_"),
    url = safeUrl(m.url),
    expired = externalExpired(m),
    nurse = user?.role === "interimaire";
  const favoriteDisabled = !!busy || saved.loading || !!saved.error;
  return (
    <div className={s.page}>
      <div>
        <ButtonLink to="/missions" variant="ghost">
          <Icon name="arrow-left" size={17} />
          Retour aux missions
        </ButtonLink>
      </div>
      <header className={s.header}>
        <div>
          <h1>{m.title}</h1>
          <p className={s.subtitle}>
            {m.establishment_name ||
              m.location_label ||
              m.address ||
              "Localisation à consulter"}
            {m.establishment_name && m.address ? " · " + m.address : ""}
          </p>
          <div className={s.actions} style={{ marginTop: 14 }}>
            <span className={s.badge}>
              {external
                ? "Offre externe · " + sourceLabel(m)
                : "Mission interne"}
            </span>
            <span className={s.badge} data-tone={expired ? "muted" : undefined}>
              {external
                ? expired
                  ? "Annonce expirée"
                  : "Annonce externe"
                : statusLabels[m.status || ""] || "Statut à confirmer"}
            </span>
          </div>
        </div>
      </header>
      {error && (
        <p className={s.error} role="alert">
          {error}
        </p>
      )}
      {saved.error && nurse && (
        <p className={s.notice}>
          Impossible de charger vos favoris.{" "}
          <Button variant="ghost" onClick={saved.reload}>
            Réessayer
          </Button>
        </p>
      )}
      <div className={s.columns}>
        <div className={s.stack}>
          {parsedOffer && <ParsedOfferDetails offer={parsedOffer} />}
          {external && nurse && !expired && user && <ExternalCorrespondence key={user.id+id} id={id} userId={user.id} />}
          <section className={s.card}>
            <h2>{parsedOffer ? "Texte original de l’annonce" : "La mission"}</h2>
            {parsedOffer ? <details><summary style={{ cursor: "pointer", padding: "12px 0" }}>Lire la description intégrale</summary>
            <p style={{ whiteSpace: "pre-wrap" }}>
              {m.description ||
                "Les conditions détaillées sont à consulter auprès de l’annonceur."}
            </p>
            </details> : <>
            <p style={{ whiteSpace: "pre-wrap" }}>
              {m.description ||
                "Les conditions détaillées sont à consulter auprès de l’annonceur."}
            </p>
            </>}
            <dl className={s.details}>
              <div>
                <dt>Qualification</dt>
                <dd>{m.qualification || "À confirmer"}</dd>
              </div>
              <div>
                <dt>Population</dt>
                <dd>
                  {{
                    ADULT: "Adultes",
                    PEDIATRIC: "Pédiatrie",
                    MIXED: "Adultes et pédiatrie",
                  }[m.population || ""] || "Non précisée"}
                </dd>
              </div>
              <div>
                <dt>Bloc</dt>
                <dd>
                  {{
                    NONE: "Hors bloc",
                    GENERAL: "Polyvalent",
                    SPECIALIZED: "Spécialisé",
                  }[m.block || ""] || "Non précisé"}
                  {m.specialty ? " · " + labelCode(m.specialty) : ""}
                </dd>
              </div>
              <div>
                <dt>Service</dt>
                <dd>{m.service ? labelCode(m.service) : "Non précisé"}</dd>
              </div>
            </dl>
            <h2>Compétences demandées</h2>
            <div className={s.actions}>
              {m.required_skills?.length ? (
                m.required_skills.map((v) => (
                  <span className={s.badge} key={v}>
                    {labelCode(v)}
                  </span>
                ))
              ) : (
                <p className={s.muted}>
                  Aucune compétence structurée disponible ; consulter le texte original.
                </p>
              )}
            </div>
            {!external && (
              <>
                <h2 style={{ marginTop: 24 }}>Expérience attendue</h2>
                <p className={s.muted}>
                  {m.min_experience_months
                    ? `${m.min_experience_months} mois d’expérience dans le service demandé.`
                    : "Aucune durée minimale indiquée."}
                </p>
              </>
            )}
          </section>
          {!external && (
            <section className={s.card}>
              <h2>L’établissement</h2>
              <div className={s.row}>
                <div>
                  <h3>{m.establishment_name || "Établissement non précisé"}</h3>
                  <p className={s.muted}>
                    {m.address || m.location_label || "Adresse non précisée"}
                  </p>
                </div>
                {m.establishment_id && (
                  <div className={s.stack}>
                    <ButtonLink
                      to={"/etablissements/" + m.establishment_id}
                      variant="outline"
                    >
                      Voir l’établissement
                    </ButtonLink>
                    {nurse && (
                      <Button
                        variant="ghost"
                        aria-pressed={facilitySaved}
                        disabled={favoriteDisabled}
                        onClick={() => toggle("facility")}
                      >
                        <Icon name="heart-outline" size={17} />
                        {facilitySaved
                          ? "Retirer l’établissement des favoris"
                          : "Ajouter l’établissement aux favoris"}
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </section>
          )}
        </div>
        <aside className={s.card}>
          <h2>Votre prochaine mission</h2>
          <p>
            <Icon name="calendar" size={18} /> {m.start_at || m.end_at ? `Du ${date(m.start_at, m.timezone)} au ${date(m.end_at, m.timezone)} (${m.timezone || "Europe/Paris"})` : "Dates de mission non précisées"}
          </p>
          {parsedOffer && <p className={s.muted} style={{ fontSize: 11 }}>Informations extraites du texte, à confirmer</p>}
          {parsedSummary.schedules.length ? parsedSummary.schedules.map(item => <p key={item.key+item.evidence.start}><strong>{item.label} :</strong> {item.display}</p>) : <p>
            {{ DAY: "Jour", NIGHT: "Nuit", MIXED: "Alternance jour et nuit" }[
              m.shift || ""
            ] || "Horaires non précisés"}
          </p>}
          <p className={s.money}>{parsedSummary.pay || salary(m)}</p>
          {explanationId &&
            (explanation.loading ? (
              <p role="status">Chargement de votre correspondance…</p>
            ) : explanation.error ? (
              <p className={s.notice}>
                Cette explication n’est pas disponible.{" "}
                <Link to="/missions?vue=recommandees">
                  Actualiser les recommandations
                </Link>
              </p>
            ) : (
              explanation.data && (
                <div className={s.notice}>
                  {explanation.data.stale ? (
                    <>
                      <strong>Correspondance à actualiser.</strong> Votre profil
                      ou la mission a changé.{" "}
                      <Link to="/missions?vue=recommandees">Recalculer</Link>
                    </>
                  ) : (
                    <>
                      <strong>
                        {explanation.data.result.eligible
                          ? "Mission compatible avec votre profil"
                          : "Correspondance non confirmée"}
                      </strong>
                      {explanation.data.result.score != null && (
                        <p>
                          Score calculé :{" "}
                          {Math.round(explanation.data.result.score)}/100.
                        </p>
                      )}
                      <p>
                        Qualifications, compétences, disponibilités et mobilité
                        prises en compte.
                      </p>
                    </>
                  )}
                </div>
              )
            ))}
          <div className={s.stack} style={{ marginTop: 22 }}>
            {external ? (
              expired ? (
                <p className={s.notice}>
                  Cette annonce n’est plus active.{" "}
                  <Link to="/missions">Rechercher une autre offre</Link>
                </p>
              ) : url ? (
                <a
                  className={s.fullLink}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Voir l’offre source et postuler ↗
                </a>
              ) : (
                <p className={s.notice}>
                  Le lien de l’annonceur est indisponible.
                </p>
              )
            ) : nurse && m.status === "OPEN" ? (
              <ButtonLink to={"/missions/" + id + "/candidater"} block>
                Envoyer ma candidature
              </ButtonLink>
            ) : (
              <p className={s.notice}>
                Cette mission n’accepte pas de candidature depuis votre compte.
              </p>
            )}
            {nurse && (
              <Button
                variant="outline"
                disabled={favoriteDisabled}
                aria-pressed={missionSaved}
                onClick={() => toggle("mission")}
              >
                <Icon name="heart-outline" size={18} />
                {missionSaved
                  ? "Retirer la mission des favoris"
                  : "Enregistrer la mission"}
              </Button>
            )}
          </div>
          <p className={s.muted} style={{ fontSize: 12, marginTop: 18 }}>
            {external
              ? "Les conditions et la candidature sont gérées par le site de l’annonceur."
              : "Votre admissibilité est vérifiée lors de l’envoi. L’agence confirme ensuite votre affectation."}
          </p>
          {!external && (
            <div
              style={{
                borderTop: "1px solid var(--line)",
                paddingTop: 18,
                marginTop: 20,
              }}
            >
              <p className={s.muted}>Agence référente</p>
              <strong>{m.agency_name || "Agence non précisée"}</strong>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
