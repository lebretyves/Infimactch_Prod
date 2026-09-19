import { readSearchArea, saveSearchArea, validRadius, type SearchArea } from "@/lib/searchArea";
import { MatchingRules } from "@/components/MatchingRules";
import { jobSearch, changeJobText } from "@/lib/jobSearch";
import { SearchPlace, validCoordinates } from "@/components/SearchPlace";
import { OfferOriginChoices, readOfferOrigin } from "@/components/OfferOrigin";
import EntrepriseMissions from "./EntrepriseMissions";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router";
import { useAuth } from "@/context/AuthContext";
import { useRemote } from "@/lib/useRemote";
import {
  list,
  favorites,
  allFacilities,
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
  "includeIde",
  "service",
  "population",
  "block",
  "specialty",
  "shift",
  "establishment",
  "radius",
  "place",
  "lat",
  "lon",
  "start",
  "end",
  "published",
  "available",
] as const;
type Draft = Record<(typeof filterKeys)[number], string>;
const fromParams = (p: URLSearchParams) =>
  Object.fromEntries(
    filterKeys.map((k) => [k, (p.get(k) || "").slice(0, 150)]),
  ) as Draft;
export default function Missions() {
  const { user } = useAuth();
  return user?.role === "interimaire" ? (
    <NurseMissions key={user.id} />
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
  const legacyRecommended = params.get("vue") === "recommandees";
  const sort = (
    ["recent", "relevance", "distance", "start"].includes(
      params.get("sort") || "",
    )
      ? params.get("sort")
      : legacyRecommended
        ? "relevance"
        : "relevance"
  ) as NonNullable<SearchFilters["sort"]>;
  const origin = readOfferOrigin(
    params.get("origine") || (legacyRecommended ? "partenaires" : null),
  );
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
  const [zoneInitialized, setZoneInitialized] = useState(() =>
    ["place", "lat", "lon", "radius", "zone"].some(key => params.has(key)));
  const hadZoneInUrl = useRef(zoneInitialized);
  useEffect(() => {
    const explicit = ["place", "lat", "lon", "radius", "zone"].some(key => params.has(key));
    if (explicit) hadZoneInUrl.current = true;
    else if (hadZoneInUrl.current && zoneInitialized) {
      hadZoneInUrl.current = false;
      setZoneInitialized(false);
    }
  }, [params, zoneInitialized]);
  const initialZone = useRemote<SearchArea | null>(async signal => {
    if (zoneInitialized || !p.data || !user) return null;
    const previous = readSearchArea(user.id);
    if (previous) return previous;
    const city = p.data.details?.city?.trim() || user.ville?.trim();
    if (!city) return {place:"",lat:"",lon:"",radius:""};
    const query = [city, p.data.details?.postalCode].filter(Boolean).join(" ");
    const response = await api<{items:{label:string;latitude:number;longitude:number}[]}>(
      "/listings/locations/communes?q=" + encodeURIComponent(query.slice(0,150)), {signal});
    const normalize = (v:string) => v.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]/g,"");
    const matches = response.items.filter(item => normalize(item.label.replace(/\s*\([^)]*\)\s*$/, "")) === normalize(city));
    const place = matches.length === 1 ? matches[0] : response.items.length === 1 ? response.items[0] : null;
    if (!place || !validCoordinates(place.latitude, place.longitude))
      return {place:city.slice(0,150),lat:"",lon:"",radius:"25"};
    const radius = String(p.data.radius_km || 25);
    return {place:place.label.slice(0,150),lat:String(place.latitude),lon:String(place.longitude),radius:validRadius(radius)?radius:"25"};
  }, JSON.stringify([user?.id, p.data?.details?.city, p.data?.details?.postalCode, !!p.data, zoneInitialized]));
  useEffect(() => {
    if (zoneInitialized || !initialZone.data) return;
    const next = new URLSearchParams(params);
    for (const [key,value] of Object.entries(initialZone.data)) if(value)next.set(key,value);
    next.set("zone","1");
    setParams(next,{replace:true});
    setZoneInitialized(true);
  }, [zoneInitialized, initialZone.data, params, setParams]);
  useEffect(() => {
    if (!zoneInitialized || !user) return;
    const area = {place:params.get("place") || "",lat:params.get("lat") || "",lon:params.get("lon") || "",radius:params.get("radius") || ""};
    if (validRadius(area.radius) && (validCoordinates(area.lat,area.lon) || (params.has("zone") && Object.values(area).every(value => !value))))
      saveSearchArea(user.id,area);
  }, [params, zoneInitialized, user?.id]);
  const homeCoordinates = validCoordinates(p.data?.latitude, p.data?.longitude);
  const home = homeCoordinates
    ? {
        ...homeCoordinates,
        label: p.data?.details?.mobilityCity || "Ma zone de mobilité",
      }
    : null;
  const qualifications = p.data?.qualifications || [];
  if (!values.qualification && qualifications.includes(jobSearch(values.q).qualification))
    values.qualification = jobSearch(values.q).qualification;
  const selectedQualification = qualifications.includes(values.qualification)
    ? values.qualification
    : "";
  if (!["IADE", "IBODE"].includes(selectedQualification) || !qualifications.includes("IDE")) values.includeIde = "";
  const publicOffers = !!p.data && !qualifications.length;
  const selected = selectedQualification
    ? [selectedQualification, ...(["IADE", "IBODE"].includes(selectedQualification) && values.includeIde === "1" && qualifications.includes("IDE") ? ["IDE"] : [])]
    : qualifications;
  const filtered = filterKeys.some((k) => !!values[k]);
  const requestKey = JSON.stringify([
    user?.id,
    p.data,
    zoneInitialized,
    // The default area can update only this URL marker after state initialization.
    // Include it so a search skipped before the navigation is retried afterwards.
    params.get("zone"),
    sort,
    origin,
    values,
    offset,
  ]);
  const result = useRemote<(ListingPage & { requestKey: string }) | null>(
    async (signal) => {
      if (!p.data || !zoneInitialized || !["place", "lat", "lon", "radius", "zone"].some(key => params.has(key))) return null;
      const filters: SearchFilters = { sort };
      if ([1, 7, 30].includes(Number(values.published)))
        filters.publishedWithinDays = Number(values.published) as 1 | 7 | 30;
      if (values.available === "1") filters.availableOnly = true;
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
      const requestedCenter = validCoordinates(values.lat, values.lon);
      if (requestedCenter) {
        filters.latitude = requestedCenter.latitude;
        filters.longitude = requestedCenter.longitude;
      }
      if (values.radius || sort === "distance") {
        const center =
          values.place || values.lat || values.lon
            ? validCoordinates(values.lat, values.lon)
            : homeCoordinates;
        if (
          !center ||
          (values.radius &&
            !validRadius(values.radius))
        )
          throw new Error(
            "Choisissez un lieu valide pour rechercher par distance.",
          );
        if (values.radius) filters.radiusKm = Number(values.radius);
        filters.latitude = center.latitude;
        filters.longitude = center.longitude;
      }
      const response = await list(
        selected,
        offset,
        signal,
        jobSearch(values.q).qualification === selectedQualification ? jobSearch(values.q).keywords : values.q,
        filters,
        origin,
      );
      if (!Number.isSafeInteger(response.total) || response.total < 0)
        throw new Error("Nombre de résultats indisponible.");
      return { ...response, requestKey };
    },
    requestKey,
  );
  const data = result.data?.requestKey === requestKey ? result.data : null;
  const error = p.error || initialZone.error || result.error;
  const loading = p.loading || result.loading || (!data && !error);
  const total = data?.total ?? 0,
    lastPage = Math.max(1, Math.min(501, Math.ceil(total / PAGE_SIZE)));
  const outOfRange = !!data && currentPage > lastPage;
  const items = data?.items || [];
  const paramsKey = params.toString();
  useEffect(
    () => {
      const restored = fromParams(new URLSearchParams(paramsKey));
      if (!restored.qualification && qualifications.includes(jobSearch(restored.q).qualification))
        restored.qualification = jobSearch(restored.q).qualification;
      setDraft(restored);
    },
    [paramsKey, qualifications.join(",")],
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
    next.set("zone","1");
    if(user)saveSearchArea(user.id, {place:next.get("place") || "",lat:next.get("lat") || "",lon:next.get("lon") || "",radius:next.get("radius") || ""});
    setZoneInitialized(true);
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
    if (draft.radius || sort === "distance") {
      const center =
        draft.place || draft.lat || draft.lon
          ? validCoordinates(draft.lat, draft.lon)
          : homeCoordinates;
      if (
        !center ||
        (draft.radius &&
          !validRadius(draft.radius))
      ) {
        setFormError(
          "Choisissez explicitement un lieu parmi les propositions ou votre zone de mobilité avant de rechercher par distance.",
        );
        return;
      }
    }
    if (draft.place.trim() && !validCoordinates(draft.lat, draft.lon)) {
      setFormError("Choisissez un lieu proposé pour préciser votre recherche.");
      return;
    }
    update({ ...draft, q: draft.q.trim(), sort, vue: "", page: 1 });
  }
  const reset = () => {
    setFormError("");
    update({
      ...Object.fromEntries(filterKeys.map((k) => [k, ""])),
      ...(sort === "distance" && !homeCoordinates ? { sort: "recent" } : {}),
      page: 1,
    });
  };
  const busy = loading || outOfRange;
  const set = (k: keyof Draft, v: string) =>
    setDraft((d) => ({ ...d, [k]: v }));
  const draftQualifications = draft.qualification
    ? [draft.qualification, ...(["IADE", "IBODE"].includes(draft.qualification) && draft.includeIde === "1" && qualifications.includes("IDE") ? ["IDE"] : [])]
    : qualifications;
  const specialist = draftQualifications.some(
    (q) => q === "IADE" || q === "IBODE",
  );
  return (
    <div className={`${u.page} ${s.page}`}>
      <header className={`${u.header} ${s.header}`}>
        <div>
          <p className={u.eyebrow}>Recherche de missions</p>
          <h1>Des missions qui vous correspondent</h1>
          <p className={u.subtitle}>
            Votre métier, vos disponibilités et votre prochaine mission.
          </p>
        </div>
        <ButtonLink to="/profil" variant="outline" className={s.profileLink}>
          <Icon name="user" size={17} />
          Mon profil {qualifications.join(" · ")}
        </ButtonLink>
      </header>
    <MatchingRules />
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
      <form
        className={`${u.card} ${s.searchPanel}`}
        onSubmit={search}
        role="search"
        aria-label="Rechercher une offre"
      >
        <div className={s.topFilters}>
          <TextField
            label="Quel poste ?"
            type="search"
            placeholder="Intitulé, service, mot-clé…"
            maxLength={150}
            value={draft.q}
            onChange={(e) => setDraft((d) => changeJobText(d, e.target.value, qualifications))}
          />
          <SearchPlace
            value={draft.place}
            selected={!!validCoordinates(draft.lat, draft.lon)}
            home={home}
            onChange={(place, location) => {
              setFormError("");
              setDraft((d) => ({
                ...d,
                place,
                radius: location && !d.radius ? "25" : d.radius,
                lat: location ? String(location.latitude) : "",
                lon: location ? String(location.longitude) : "",
              }));
            }}
          />
          <SelectField
            label="Rayon"
            value={draft.radius}
            onChange={(e) => set("radius", e.target.value)}
          >
            <option value="">Toute la France</option>
            {[...new Set([5, 10, 25, 50, 100, 200, ...(draft.radius && validRadius(draft.radius) ? [Number(draft.radius)] : [])])].sort((a,b)=>a-b).map((v) => (
              <option key={v} value={v}>
                {v} km
              </option>
            ))}
          </SelectField>
          <Button type="submit" disabled={busy}>
            <Icon name="search" size={18} />
            Rechercher
          </Button>
        </div>
        <div className={s.refinements}>
          <details className={s.filterGroup}>
            <summary>
              Métier <span>{draft.qualification || "Mes qualifications"}</span>
              {[draft.qualification,draft.service,draft.population,draft.block,draft.specialty].filter(Boolean).length > 0 && <b className={s.filterCount} aria-label="critères métier sélectionnés">{[draft.qualification,draft.service,draft.population,draft.block,draft.specialty].filter(Boolean).length}</b>}
            </summary>
            <div className={s.filterContent}>
              <SelectField
                label="Qualification"
                value={draft.qualification}
                onChange={(e) => {
                  const changed = {
                    q: jobSearch(values.q).qualification ? jobSearch(values.q).keywords : values.q,
                    qualification: e.target.value,
                    includeIde: "",
                    service: "",
                    population: "",
                    block: "",
                    specialty: "",
                  };
                  setDraft(d => ({ ...d, ...changed }));
                  setFormError("");
                  update({ ...changed, page: 1 });
                }}
              >
                <option value="">Toutes mes qualifications</option>
                {qualifications.map((q) => (
                  <option key={q}>{q}</option>
                ))}
              </SelectField>
              {["IADE", "IBODE"].includes(draft.qualification) && qualifications.includes("IDE") && (
                <label className={s.check}>
                  <input type="checkbox" checked={draft.includeIde === "1"}
                    onChange={event => {
                      const includeIde = event.target.checked ? "1" : "";
                      setDraft(d => ({ ...d, includeIde }));
                      update({ qualification: draft.qualification, includeIde, page: 1 });
                    }} />
                  Inclure aussi les missions IDE
                </label>
              )}
              {["IADE", "IBODE"].includes(draft.qualification) && (
                <p className={s.groupHint}>{draft.includeIde === "1" && qualifications.includes("IDE")
                  ? `Missions ${draft.qualification} et IDE. Le métier est appliqué immédiatement.`
                  : `Uniquement les missions ${draft.qualification}. Le métier est appliqué immédiatement.`}</p>
              )}
              {draftQualifications.includes("IDE") && (
                <SelectField
                  label="Service"
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
                    label="Population"
                    value={draft.population}
                    onChange={(e) => set("population", e.target.value)}
                  >
                    <option value="">Toutes les populations</option>
                    <option value="ADULT">Adultes</option>
                    <option value="PEDIATRIC">Pédiatrie</option>
                    <option value="MIXED">Adultes et pédiatrie</option>
                  </SelectField>
                  <SelectField
                    label="Bloc"
                    value={draft.block}
                    onChange={(e) =>
                      setDraft((d) => ({
                        ...d,
                        block: e.target.value,
                        specialty: "",
                      }))
                    }
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
              {publicOffers && (
                <p className={s.help}>
                  Ajoutez votre qualification dans{" "}
                  <Link to="/profil">votre profil</Link> pour affiner par
                  métier.
                </p>
              )}
              {reference.error && (
                <p className={s.help}>
                  Listes indisponibles.{" "}
                  <button type="button" onClick={reference.reload}>
                    Réessayer
                  </button>
                </p>
              )}
            </div>
          </details>
          <details className={s.filterGroup}>
            <summary>
              Dates et horaires{" "}
              {[draft.available,draft.start,draft.end,draft.shift].filter(Boolean).length > 0 && <b className={s.filterCount} aria-label="critères de disponibilité sélectionnés">{[draft.available,draft.start,draft.end,draft.shift].filter(Boolean).length}</b>}
              <span>
                {draft.available
                  ? "Mon calendrier"
                  : draft.start
                    ? "Période choisie"
                    : "Calendrier, période"}
              </span>
            </summary>
            <div className={s.filterContent}>
              <label className={s.check}>
                <input
                  type="checkbox"
                  checked={draft.available === "1"}
                  onChange={(e) =>
                    set("available", e.target.checked ? "1" : "")
                  }
                />
                Compatibles avec mes disponibilités
              </label>
              <p className={s.groupHint}>
                {p.data?.available?.length ? (
                  "Seules les missions aux dates connues et couvertes par votre calendrier sont retenues."
                ) : (
                  <>
                    Aucune disponibilité renseignée.{" "}
                    <Link to="/calendrier">Compléter mon calendrier</Link> pour
                    utiliser ce filtre.
                  </>
                )}
              </p>
              <TextField
                label="Du"
                type="date"
                value={draft.start}
                onChange={(e) => set("start", e.target.value)}
              />
              <TextField
                label="Au inclus"
                type="date"
                min={draft.start || undefined}
                value={draft.end}
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
            </div>
          </details>
          <details className={s.filterGroup}>
            <summary>
              Autres critères <span>Publication, établissement</span>
              {[draft.published,draft.establishment].filter(Boolean).length > 0 && <b className={s.filterCount} aria-label="autres critères sélectionnés">{[draft.published,draft.establishment].filter(Boolean).length}</b>}
            </summary>
            <div className={s.filterContent}>
              <SelectField
                label="Date de publication"
                value={draft.published}
                onChange={(e) => set("published", e.target.value)}
              >
                <option value="">Toutes les dates</option>
                <option value="1">Dernières 24 heures</option>
                <option value="7">7 derniers jours</option>
                <option value="30">30 derniers jours</option>
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
              {facilities.error && (
                <p className={s.help}>
                  Liste indisponible.{" "}
                  <button type="button" onClick={facilities.reload}>
                    Réessayer
                  </button>
                </p>
              )}
            </div>
          </details>
        </div>
        <details className={s.searchHelp}>
          <summary>Comment fonctionne la localisation ?</summary>
          <p>Choisissez une ville, un code postal ou une adresse dans les suggestions. La distance est mesurée à vol d’oiseau ; les offres sans coordonnées connues sont exclues lorsqu’un rayon est choisi. La recherche ne modifie pas votre zone de mobilité.</p>
        </details>
        {formError && (
          <p className={u.error} role="alert">
            {formError}
          </p>
        )}
        {filtered && (
          <div className={s.activeFilters} aria-label="Filtres appliqués">
            {filterKeys
              .filter((k) => values[k] && !["lat", "lon", "end"].includes(k))
              .map((k) => {
                const labels: Partial<Record<keyof Draft, string>> = {
                  q: values.q,
                  qualification: values.qualification,
                  includeIde: "Missions IDE incluses",
                  service: labelCode(values.service),
                  population: labelCode(values.population),
                  block: labelCode(values.block),
                  specialty: labelCode(values.specialty),
                  shift: labelCode(values.shift),
                  establishment:
                    facilities.data?.find((f) => f.id === values.establishment)
                      ?.name || "Établissement",
                  radius: values.radius + " km",
                  place: values.place,
                  start: `Du ${values.start} au ${values.end}`,
                  available: "Mes disponibilités",
                  published:
                    values.published === "1"
                      ? "Dernières 24 h"
                      : `${values.published} derniers jours`,
                };
                return (
                  <button
                    type="button"
                    key={k}
                    onClick={() =>
                      update({
                        [k]: "",
                        ...(k === "place"
                          ? {
                              lat: "",
                              lon: "",
                              radius: "",
                              ...(sort === "distance" && !homeCoordinates
                                ? { sort: "recent" }
                                : {}),
                            }
                          : {}),
                        ...(k === "q" && jobSearch(values.q).qualification === values.qualification ? { qualification: "", service: "", population: "", block: "", specialty: "" } : {}),
                        ...(k === "start" ? { end: "" } : {}),
                        ...(k === "block" ? { specialty: "" } : {}),
                        ...(k === "qualification"
                          ? {
                              q: jobSearch(values.q).qualification ? jobSearch(values.q).keywords : values.q,
                              service: "",
                              population: "",
                              block: "",
                              specialty: "",
                            }
                          : {}),
                        page: 1,
                      })
                    }
                    aria-label={`Retirer le filtre ${labels[k]}`}
                  >
                    {labels[k]} <span aria-hidden="true">×</span>
                  </button>
                );
              })}
            <button type="button" className={s.reset} onClick={reset}>
              Réinitialiser
            </button>
          </div>
        )}
      </form>
      <div className={s.catalogueControls}>
        <OfferOriginChoices
          value={origin}
          onChange={(origine) => update({ origine, vue: "", page: 1 })}
        />
        <SelectField
          label="Trier par"
          value={sort}
          onChange={(e) => {
            setFormError("");
            update({ sort: e.target.value, vue: "", page: 1 });
          }}
        >
          <option value="recent">Les plus récentes</option>
          <option value="relevance">Taux de matching décroissant</option>
          <option
            value="distance"
            disabled={
              !validCoordinates(values.lat, values.lon) && !homeCoordinates
            }
          >
            Les plus proches
          </option>
          <option value="start">Début de mission</option>
        </SelectField>
      </div>
      {sort === "relevance" && (
        <p className={s.help}>
          Missions internes classées du taux de matching le plus élevé au plus faible,
          y compris les taux indicatifs des profils incomplets. Les offres externes,
          sans pourcentage vérifiable, apparaissent ensuite.
        </p>
      )}
      {(values.available === "1" || values.published) && (
        <p className={s.help}>
          {values.available === "1" &&
            "Les offres sans dates précises ne peuvent pas être vérifiées avec votre calendrier. "}
          {values.published &&
            "Les offres sans date de publication connue sont exclues de cette période."}
        </p>
      )}
      {busy ? (
        <div className={u.empty} role="status">
          Chargement des offres…
        </div>
      ) : error ? (
        <section className={u.empty} role="alert">
          <h2>Le chargement des offres a échoué</h2>
          <p>{error}</p>
          <Button onClick={() => (p.error ? p.reload() : initialZone.error ? initialZone.reload() : result.reload())}>
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
                {total === 1 ? "offre disponible" : "offres disponibles"}
              </h2>
              <p className={s.help}>
                {total > 0
                  ? `${number(offset + 1)}–${number(offset + items.length)} sur ${number(total)} · Page ${number(currentPage)} sur ${number(lastPage)}`
                  : "Aucun résultat pour le moment."}
              </p>
            </div>
          </div>
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
              <h2>Aucune offre pour ces critères</h2>
              <p>
                {values.available === "1" && !p.data?.available?.length
                  ? "Renseignez vos disponibilités pour retrouver les missions compatibles."
                  : "Élargissez vos critères ou consultez les offres plus tard."}
              </p>
              <div className={s.emptyActions}>
                {filtered ? (
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
