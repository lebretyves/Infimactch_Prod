import { MissionFilters } from "./missions/MissionFilters";
import { MissionResults } from "./missions/MissionResults";
import { PAGE_SIZE, currentPageFromParams, lastPageForTotal, filterKeys, fromParams, type Draft } from "./missions/searchModel";
import { readSearchArea, saveSearchArea, profileSearchArea, validRadius, type SearchArea } from "@/lib/searchArea";
import { MatchingRules } from "@/components/MatchingRules";
import { jobSearch } from "@/lib/jobSearch";
import { validCoordinates } from "@/components/SearchPlace";
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
import { getProfile, updateSearchArea, type SavedSearchArea } from "@/services/profile";
import { ButtonLink } from "@/ui/Button";
import { SelectField } from "@/ui/Field";
import { Icon } from "@/ui/Icon";
import s from "./Missions.module.css";
import u from "./MarketPages.module.css";
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
  const currentPage = currentPageFromParams(params);
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
  const [savedArea, setSavedArea] = useState<SavedSearchArea | null>(null);
  const [areaBusy, setAreaBusy] = useState(false), [areaError, setAreaError] = useState(""), [areaMessage, setAreaMessage] = useState("");
  const accountArea = savedArea || p.data;
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
    const permanent = profileSearchArea(p.data);
    if (permanent) return permanent;
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
  }, JSON.stringify([user?.id, p.data?.details?.city, p.data?.details?.postalCode, p.data?.latitude, p.data?.longitude, p.data?.radius_km, p.data?.details?.mobilityCity, !!p.data, zoneInitialized]));
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
  const homeCoordinates = validCoordinates(accountArea?.latitude, accountArea?.longitude);
  const home = homeCoordinates
    ? {
        ...homeCoordinates,
        label: accountArea?.details?.mobilityCity || "Ma zone enregistrée",
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
  const showExternes = data?.externalCatalogueVisible !== false;
  const error = p.error || initialZone.error || result.error;
  const loading = p.loading || result.loading || (!data && !error);
  const total = data?.total ?? 0,
    lastPage = lastPageForTotal(total);
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
    if (!data || showExternes || origin !== "externes") return;
    const next = new URLSearchParams(params);
    next.set("origine", "toutes");
    next.delete("vue");
    next.delete("page");
    setParams(next, { replace: true });
  }, [data, showExternes, origin, params, setParams]);
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
  async function saveAlertArea() {
    if (areaBusy) return;
    setAreaError(""); setAreaMessage("");
    const center = validCoordinates(draft.lat, draft.lon);
    if (!center || !draft.place.trim() || !draft.radius.trim() || !validRadius(draft.radius)) {
      setAreaError("Choisissez un lieu dans les suggestions et un rayon pour vos alertes.");
      return;
    }
    setAreaBusy(true);
    try {
      const area = await updateSearchArea({...center, city:draft.place.trim(), radiusKm:Number(draft.radius)});
      setSavedArea(area);
      p.reload();
      setAreaMessage("Zone de recherche et d’alertes enregistrée sur votre compte.");
    } catch(e) { setAreaError((e as Error).message); }
    finally { setAreaBusy(false); }
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
          "Choisissez explicitement un lieu parmi les propositions ou votre zone de recherche avant de rechercher par distance.",
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
      <MissionFilters
        draft={draft} setDraft={setDraft} values={values}
        qualifications={qualifications} profile={p.data} accountArea={accountArea}
        home={home} homeCoordinates={homeCoordinates}
        reference={reference} facilities={facilities}
        busy={busy} publicOffers={publicOffers} filtered={filtered} sort={sort}
        formError={formError} setFormError={setFormError}
        search={search} update={update} reset={reset}
        areaBusy={areaBusy} areaError={areaError} areaMessage={areaMessage}
        saveAlertArea={saveAlertArea}
      />
      <div className={s.catalogueControls}>
        <OfferOriginChoices
          value={origin}
          showExternes={showExternes}
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
      <MissionResults
        busy={busy} error={error}
        retry={() => (p.error ? p.reload() : initialZone.error ? initialZone.reload() : result.reload())}
        saved={saved} summary={summary} total={total} offset={offset} items={items}
        currentPage={currentPage} lastPage={lastPage}
        available={values.available} hasAvailability={!!p.data?.available?.length}
        filtered={filtered} reset={reset} update={update}
      />
    </div>
  );
}
