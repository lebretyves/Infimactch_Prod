import { OfferOriginChoices, readOfferOrigin } from '@/components/OfferOrigin';
﻿import EntrepriseMissions from "./EntrepriseMissions";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router";
import { useAuth } from "@/context/AuthContext";
import { useRemote } from "@/lib/useRemote";
import {
  list,
  favorites,
  allFacilities,
  matches,
  detail,
  type ListingPage,
  type SearchFilters,
} from "@/services/market";
import { api } from "@/services/api";
import { labelCode } from "@/data/professional";
import { getProfile } from "@/services/profile";
import { MissionCard } from "@/ui/MissionCard";
import { Button, ButtonLink } from "@/ui/Button";
import { TextField, SelectField } from "@/ui/Field";
import { Icon } from "@/ui/Icon";
import s from "./Missions.module.css";
import u from "./MarketPages.module.css";
const PAGE_SIZE = 20;
const number = (v: number) => v.toLocaleString("fr-FR");
function pageNumbers(current: number, last: number): (number | string)[] {
  if (last <= 5) return Array.from({ length: last }, (_, i) => i + 1);
  const start = Math.max(2, Math.min(current - 1, last - 3));
  const end = Math.min(last - 1, start + 2);
  return [
    1,
    ...(start > 2 ? ["before"] : []),
    ...Array.from({ length: end - start + 1 }, (_, i) => start + i),
    ...(end < last - 1 ? ["after"] : []),
    last,
  ];
}
const filterKeys = [
  "q",
  "qualification",
  "service",
  "population",
  "block",
  "specialty",
  "shift",
  "establishment",
  "radius",
  "start",
  "end",
] as const;
type Draft = Record<(typeof filterKeys)[number], string>;
const fromParams = (p: URLSearchParams) =>
  Object.fromEntries(
    filterKeys.map((k) => [k, (p.get(k) || "").slice(0, 150)]),
  ) as Draft;
export default function Missions() {
  const { user } = useAuth();
  return user?.role === "interimaire" ? (
    <NurseMissions />
  ) : (
    <EntrepriseMissions />
  );
}
function NurseMissions() {
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const currentPage = Math.max(
    1,
    Math.min(501, Math.floor(Number(params.get("page")) || 1)),
  );
  const offset = (currentPage - 1) * PAGE_SIZE;
  const view =
    params.get("vue") === "recommandees" && params.get("origine") !== "externes" ? "recommandees" : "catalogue";
  const origin = view === "recommandees" ? "partenaires" : readOfferOrigin(params.get("origine"));
  const values = fromParams(params);
  const [draft, setDraft] = useState<Draft>(values),
    [formError, setFormError] = useState("");
  const summary = useRef<HTMLDivElement>(null),
    focusResults = useRef(false);
  const p = useRemote(getProfile, "mission-profile:" + user?.id),
    saved = useRemote(favorites, "mission-favorites:" + user?.id),
    facilities = useRemote(allFacilities, "mission-facilities");
  const reference = useRemote(
    (signal) =>
      api<{ ideServices: string[]; blockSpecialties: string[] }>(
        "/reference-data",
        { signal },
      ),
    "search-reference",
  );
  const qualifications = p.data?.qualifications || [];
  const selectedQualification = qualifications.includes(values.qualification)
    ? values.qualification
    : "";
  const publicOffers = !!p.data && !qualifications.length;
  const selected = selectedQualification
    ? [selectedQualification]
    : qualifications;
  const filtered = filterKeys.some((k) => !!values[k]);
  const requestKey = JSON.stringify([user?.id, p.data, view, origin, values, offset]);
  const result = useRemote<(ListingPage & { requestKey: string }) | null>(
    async (signal) => {
      if (!p.data) return null;
      if (view === "recommandees") {
        const page = await matches(offset, signal);
        const items = await Promise.all(
          page.items.map(async (match) => ({
            ...(await detail("m_" + match.missionId, signal)),
            matching_score: match.score,
            match_explanation_id: match.explanationId,
          })),
        );
        return { ...page, items, requestKey };
      }
      const filters: SearchFilters = {};
      if (selected.includes("IDE") && values.service)
        filters.ideServices = [values.service];
      for (const q of ["IADE", "IBODE"])
        if (selected.includes(q)) {
          const prefix = q.toLowerCase() as "iade" | "ibode";
          if (values.population)
            filters[`${prefix}Population`] = [values.population];
          if (values.block) filters[`${prefix}Blocks`] = [values.block];
          if (values.specialty && values.block === "SPECIALIZED")
            filters[`${prefix}Specialties`] = [values.specialty];
        }
      if (values.shift) filters.shifts = [values.shift];
      if (values.establishment) filters.establishmentId = values.establishment;
      if (values.start && values.end) {
        filters.start = new Date(values.start + "T00:00:00").toISOString();
        const end = new Date(values.end + "T00:00:00");
        end.setDate(end.getDate() + 1);
        filters.end = end.toISOString();
      }
      if (
        values.radius &&
        p.data.latitude != null &&
        p.data.longitude != null
      ) {
        filters.radiusKm = Number(values.radius);
        filters.latitude = Number(p.data.latitude);
        filters.longitude = Number(p.data.longitude);
      }
      const response = await list(selected, offset, signal, values.q, filters, origin);
      if (!Number.isSafeInteger(response.total) || response.total < 0)
        throw new Error("Nombre de résultats indisponible.");
      return { ...response, requestKey };
    },
    requestKey,
  );
  const data = result.data?.requestKey === requestKey ? result.data : null;
  const error = p.error || result.error;
  const loading = p.loading || result.loading || (!data && !error);
  const total = data?.total ?? 0,
    lastPage = Math.max(1, Math.min(501, Math.ceil(total / PAGE_SIZE)));
  const outOfRange = !!data && currentPage > lastPage;
  const items = data?.items || [];
  const paramsKey = params.toString();
  useEffect(
    () => setDraft(fromParams(new URLSearchParams(paramsKey))),
    [paramsKey],
  );
  useEffect(() => {
    if (outOfRange) {
      const next = new URLSearchParams(params);
      if (lastPage === 1) next.delete("page");
      else next.set("page", String(lastPage));
      setParams(next, { replace: true });
    }
  }, [outOfRange, lastPage, params, setParams]);
  useEffect(() => {
    if (!loading && !error && !outOfRange && focusResults.current) {
      focusResults.current = false;
      summary.current?.focus({ preventScroll: true });
      summary.current?.scrollIntoView({ block: "start", behavior: "instant" });
    }
  }, [loading, error, outOfRange, total, currentPage]);
  function update(values: Record<string, string | number>) {
    const next = new URLSearchParams(params);
    for (const [key, value] of Object.entries(values)) {
      if (!value || (key === "page" && value === 1)) next.delete(key);
      else next.set(key, String(value));
    }
    focusResults.current = true;
    setParams(next);
  }
  function search(e: FormEvent) {
    e.preventDefault();
    setFormError("");
    if ((draft.start && !draft.end) || (!draft.start && draft.end)) {
      setFormError("Renseignez le début et la fin de la période.");
      return;
    }
    if (draft.start && draft.end < draft.start) {
      setFormError("La fin doit être après le début de la période.");
      return;
    }
    update({ ...draft, q: draft.q.trim(), page: 1 });
  }
  const reset = () => {
    setFormError("");
    update({ ...Object.fromEntries(filterKeys.map((k) => [k, ""])), page: 1 });
  };
  const busy = loading || outOfRange;
  const set = (k: keyof Draft, v: string) =>
    setDraft((d) => ({ ...d, [k]: v }));
  const draftQualifications = draft.qualification
    ? [draft.qualification]
    : qualifications;
  const specialist = draftQualifications.some(
    (q) => q === "IADE" || q === "IBODE",
  );
  return (
    <div className={u.page}>
      <header className={u.header}>
        <div>
          <p className={u.eyebrow}>Recherche de missions</p>
          <h1>Des missions qui vous correspondent</h1>
          <p className={u.subtitle}>
            Votre métier, vos disponibilités et votre prochaine mission.
          </p>
        </div>
        <ButtonLink to="/profil" variant="outline">
          <Icon name="user" size={17} />
          Mon profil {qualifications.join(" · ")}
        </ButtonLink>
      </header>
      <nav className={u.tabs} aria-label="Recherche et favoris">
        <Link to="/missions" aria-current="page">
          <Icon name="search" size={18} />
          Pour vous
        </Link>
        <Link to="/favoris">
          <Icon name="heart-outline" size={18} />
          Favoris
        </Link>
      </nav>
      {publicOffers && (
        <div className={u.notice}>
          <strong>Personnalisez votre recherche.</strong> Ajoutez votre
          qualification pour accéder aux filtres métier et aux recommandations.{" "}
          <Link to="/profil">Compléter mon profil</Link>
        </div>
      )}
      <OfferOriginChoices value={origin} onChange={origine => update({ origine, vue: "", page: 1 })} />
      <div
        className={s.mode}
        role="group"
        aria-label="Catalogue ou recommandations"
      >
        <button
          type="button"
          aria-pressed={view === "catalogue"}
          onClick={() => update({ vue: "", page: 1 })}
        >
          Toutes les offres
        </button>
        <button
          type="button"
          aria-pressed={view === "recommandees"}
          onClick={() => update({ vue: "recommandees", origine: "partenaires", page: 1 })}
        >
          Recommandées pour moi
        </button>
      </div>
      {view === "catalogue" ? (
        <form
          className={u.card}
          onSubmit={search}
          role="search"
          aria-label="Rechercher une offre"
        >
          <div className={s.topFilters}>
            <TextField
              label="Intitulé, ville ou service"
              type="search"
              placeholder="Ex. anesthésie, Paris…"
              maxLength={150}
              value={draft.q}
              onChange={(e) => set("q", e.target.value)}
            />
            {!!qualifications.length && (
              <SelectField
                label="Missions recherchées"
                value={draft.qualification}
                onChange={(e) => set("qualification", e.target.value)}
              >
                <option value="">Toutes mes qualifications</option>
                {qualifications.map((q) => (
                  <option key={q} value={q}>
                    {q}
                  </option>
                ))}
              </SelectField>
            )}
            {!publicOffers && (
              <SelectField
                label={
                  "Rayon" +
                  (p.data?.details?.city
                    ? " autour de " + p.data.details.city
                    : " autour de mon profil")
                }
                value={draft.radius}
                onChange={(e) => set("radius", e.target.value)}
                disabled={p.data?.latitude == null || p.data?.longitude == null}
              >
                <option value="">Toutes les distances</option>
                {[10, 25, 50, 100, 200].map((v) => (
                  <option key={v} value={v}>
                    {v} km
                  </option>
                ))}
              </SelectField>
            )}
          </div>
          {!publicOffers && (
            <>
              <div className={s.advanced}>
                {draftQualifications.includes("IDE") && (
                  <SelectField
                    label="Service IDE"
                    value={draft.service}
                    onChange={(e) => set("service", e.target.value)}
                  >
                    <option value="">Tous les services</option>
                    {(reference.data?.ideServices || []).map((v) => (
                      <option key={v} value={v}>
                        {labelCode(v)}
                      </option>
                    ))}
                  </SelectField>
                )}
                {specialist && (
                  <>
                    <SelectField
                      label="Population IADE / IBODE"
                      value={draft.population}
                      onChange={(e) => set("population", e.target.value)}
                    >
                      <option value="">Toutes les populations</option>
                      <option value="ADULT">Adultes</option>
                      <option value="PEDIATRIC">Pédiatrie</option>
                      <option value="MIXED">Adultes et pédiatrie</option>
                    </SelectField>
                    <SelectField
                      label="Bloc IADE / IBODE"
                      value={draft.block}
                      onChange={(e) => set("block", e.target.value)}
                    >
                      <option value="">Tous les blocs</option>
                      <option value="GENERAL">Polyvalent</option>
                      <option value="SPECIALIZED">Spécialisé</option>
                    </SelectField>
                    {draft.block === "SPECIALIZED" && (
                      <SelectField
                        label="Spécialité du bloc"
                        value={draft.specialty}
                        onChange={(e) => set("specialty", e.target.value)}
                      >
                        <option value="">Toutes les spécialités</option>
                        {(reference.data?.blockSpecialties || []).map((v) => (
                          <option key={v} value={v}>
                            {labelCode(v)}
                          </option>
                        ))}
                      </SelectField>
                    )}
                  </>
                )}
              </div>
              <div className={s.bottomFilters}>
                <TextField
                  label="Du"
                  type="date"
                  value={draft.start}
                  onChange={(e) => set("start", e.target.value)}
                />
                <TextField
                  label="Au inclus"
                  type="date"
                  value={draft.end}
                  min={draft.start || undefined}
                  onChange={(e) => set("end", e.target.value)}
                />
                <SelectField
                  label="Horaires"
                  value={draft.shift}
                  onChange={(e) => set("shift", e.target.value)}
                >
                  <option value="">Tous les horaires</option>
                  <option value="DAY">Jour</option>
                  <option value="NIGHT">Nuit</option>
                  <option value="MIXED">Alternance jour et nuit</option>
                </SelectField>
                <SelectField
                  label="Établissement"
                  value={draft.establishment}
                  onChange={(e) => set("establishment", e.target.value)}
                >
                  <option value="">Tous les établissements</option>
                  {facilities.data?.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name}
                    </option>
                  ))}
                </SelectField>
              </div>
              {(p.data?.latitude == null || p.data?.longitude == null) && (
                <p className={s.help}>
                  Pour rechercher dans un rayon,{" "}
                  <Link to="/calendrier">
                    renseignez votre zone de mobilité
                  </Link>
                  .
                </p>
              )}
              {facilities.error && (
                <p className={s.help}>
                  La liste des établissements est indisponible.{" "}
                  <button type="button" onClick={facilities.reload}>
                    Réessayer
                  </button>
                </p>
              )}
            </>
          )}
          {reference.error && !publicOffers && (
            <p className={s.help} role="status">
              Les listes de services et de spécialités sont indisponibles.
              <button type="button" onClick={reference.reload}>
                Réessayer
              </button>
            </p>
          )}
          {formError && (
            <p className={u.error} role="alert">
              {formError}
            </p>
          )}
          <div className={s.formActions}>
            <p className={s.help}>Les filtres portent sur tout le catalogue.</p>
            <Button variant="ghost" type="button" onClick={reset}>
              Réinitialiser
            </Button>
            <Button type="submit" disabled={busy}>
              <Icon name="search" size={18} />
              Rechercher
            </Button>
          </div>
        </form>
      ) : (
        <div className={u.notice}>
          Les recommandations concernent les missions internes compatibles avec
          votre profil, vos disponibilités et votre mobilité.{" "}
          <Link to="/profil">Mettre à jour mon profil</Link>
        </div>
      )}
      {busy ? (
        <div className={u.empty} role="status">
          Chargement des offres…
        </div>
      ) : error ? (
        <section className={u.empty} role="alert">
          <h2>Le chargement des offres a échoué</h2>
          <p>Réessayez dans un instant.</p>
          <Button onClick={() => (p.error ? p.reload() : result.reload())}>
            Réessayer
          </Button>
        </section>
      ) : (
        <>
          {saved.error && (
            <p className={u.notice}>
              Vos favoris ne sont pas disponibles.{" "}
              <button onClick={saved.reload}>Réessayer</button>
            </p>
          )}
          <div className={u.row} ref={summary} tabIndex={-1}>
            <div role="status" aria-live="polite">
              <h2 className={s.resultTitle}>
                {number(total)}{" "}
                {view === "recommandees"
                  ? "mission" +
                    (total === 1 ? "" : "s") +
                    " recommandée" +
                    (total === 1 ? "" : "s")
                  : total === 1
                    ? "offre disponible"
                    : "offres disponibles"}
              </h2>
              <p className={s.help}>
                {total > 0
                  ? `${number(offset + 1)}–${number(offset + items.length)} sur ${number(total)} · Page ${number(currentPage)} sur ${number(lastPage)}`
                  : "Aucun résultat pour le moment."}
              </p>
            </div>
            <p className={s.help}>
              {view === "recommandees"
                ? "Par correspondance avec votre profil"
                : origin === "toutes" ? "Partenaires en premier, puis offres externes" : "Les plus récentes d’abord"}
            </p>
          </div>
          {view === "catalogue" && (
            <p className={s.help}>
              {publicOffers
                ? "Offres consultables sans filtre de qualification. Votre éligibilité reste à vérifier avant une candidature partenaire."
                : "Les annonces dont les critères ne sont pas renseignés sont exclues lorsqu’un filtre avancé est utilisé."}{" "}
              Les offres externes se candidatent sur le site source.
            </p>
          )}
          <div className={u.grid}>
            {items.map((m) => (
              <MissionCard
                key={m.id}
                mission={m}
                initialFavorite={saved.data?.some(
                  (f) =>
                    f.target_id === m.id.slice(2) &&
                    f.kind === (m.id.startsWith("e_") ? "EXTERNAL" : "MISSION"),
                )}
                favoriteAvailable={!saved.loading && !saved.error}
              />
            ))}
          </div>
          {!total && (
            <section className={u.empty}>
              <Icon name="search" size={32} />
              <h2>
                {view === "recommandees"
                  ? "Aucune recommandation pour le moment"
                  : "Aucune offre pour ces critères"}
              </h2>
              <p>
                {view === "recommandees"
                  ? "Complétez votre dossier, vos compétences et vos disponibilités pour trouver des missions compatibles."
                  : "Élargissez vos critères ou consultez les offres plus tard."}
              </p>
              <div className={s.emptyActions}>
                {view === "recommandees" ? (
                  <>
                    <ButtonLink to="/profil">Compléter mon profil</ButtonLink>
                    <Button
                      variant="outline"
                      onClick={() => update({ vue: "", page: 1 })}
                    >
                      Toutes les offres
                    </Button>
                  </>
                ) : filtered ? (
                  <Button variant="outline" onClick={reset}>
                    Effacer les filtres
                  </Button>
                ) : (
                  <ButtonLink to="/calendrier" variant="outline">
                    Mes disponibilités
                  </ButtonLink>
                )}
              </div>
            </section>
          )}
          {total > 0 && (
            <nav className={s.pagination} aria-label="Pagination des offres">
              <Button
                variant="outline"
                disabled={currentPage === 1}
                onClick={() => update({ page: currentPage - 1 })}
              >
                Précédent
              </Button>
              <div className={s.numbers}>
                {pageNumbers(currentPage, lastPage).map((v) =>
                  typeof v === "number" ? (
                    <button
                      key={v}
                      type="button"
                      aria-label={"Page " + v}
                      aria-current={v === currentPage ? "page" : undefined}
                      onClick={() => update({ page: v })}
                    >
                      {number(v)}
                    </button>
                  ) : (
                    <span key={v}>…</span>
                  ),
                )}
              </div>
              <Button
                variant="outline"
                disabled={currentPage === lastPage}
                onClick={() => update({ page: currentPage + 1 })}
              >
                Suivant
              </Button>
            </nav>
          )}
        </>
      )}
    </div>
  );
}
