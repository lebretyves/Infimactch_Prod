import type { Dispatch, FormEvent, SetStateAction } from "react";
import { Link } from "react-router";
import {
  SearchPlace,
  validCoordinates,
  type SearchLocation,
} from "@/components/SearchPlace";
import { profileSearchArea, validRadius } from "@/lib/searchArea";
import { changeJobText, jobSearch } from "@/lib/jobSearch";
import { labelCode } from "@/data/professional";
import type { allFacilities, SearchFilters } from "@/services/market";
import type { getProfile, SavedSearchArea } from "@/services/profile";
import { Button } from "@/ui/Button";
import { TextField, SelectField } from "@/ui/Field";
import { Icon } from "@/ui/Icon";
import { filterKeys, type Draft } from "./searchModel";
import s from "../Missions.module.css";
import u from "../MarketPages.module.css";

type Options<T> = { data: T | null; error: string; reload: () => void };
type Props = {
  draft: Draft;
  setDraft: Dispatch<SetStateAction<Draft>>;
  values: Draft;
  qualifications: string[];
  profile: Awaited<ReturnType<typeof getProfile>> | null;
  accountArea: SavedSearchArea | null;
  home: SearchLocation | null;
  homeCoordinates: ReturnType<typeof validCoordinates>;
  reference: Options<{ ideServices: string[]; blockSpecialties: string[] }>;
  facilities: Options<Awaited<ReturnType<typeof allFacilities>>>;
  busy: boolean;
  publicOffers: boolean;
  filtered: boolean;
  sort: NonNullable<SearchFilters["sort"]>;
  formError: string;
  setFormError: (message: string) => void;
  search: (event: FormEvent) => void;
  update: (values: Record<string, string | number>) => void;
  reset: () => void;
  areaBusy: boolean;
  areaError: string;
  areaMessage: string;
  saveAlertArea: () => Promise<void>;
};

export function MissionFilters({
  draft,
  setDraft,
  values,
  qualifications,
  profile,
  accountArea,
  home,
  homeCoordinates,
  reference,
  facilities,
  busy,
  publicOffers,
  filtered,
  sort,
  formError,
  setFormError,
  search,
  update,
  reset,
  areaBusy,
  areaError,
  areaMessage,
  saveAlertArea,
}: Props) {
  const set = (k: keyof Draft, v: string) =>
    setDraft((d) => ({ ...d, [k]: v }));
  const draftQualifications = draft.qualification
    ? [
        draft.qualification,
        ...(["IADE", "IBODE"].includes(draft.qualification) &&
        draft.includeIde === "1" &&
        qualifications.includes("IDE")
          ? ["IDE"]
          : []),
      ]
    : qualifications;
  const specialist = draftQualifications.some(
    (q) => q === "IADE" || q === "IBODE",
  );
  return (
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
          onChange={(e) =>
            setDraft((d) => changeJobText(d, e.target.value, qualifications))
          }
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
          {[
            ...new Set([
              5,
              10,
              25,
              50,
              100,
              200,
              ...(draft.radius && validRadius(draft.radius)
                ? [Number(draft.radius)]
                : []),
            ]),
          ]
            .sort((a, b) => a - b)
            .map((v) => (
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
      <div className={s.searchHelp}>
        <p>
          <strong>Ma zone de recherche et d’alertes :</strong>{" "}
          {accountArea && profileSearchArea(accountArea)
            ? `${accountArea.details?.mobilityCity || "Ma zone enregistrée"} · ${accountArea.radius_km} km`
            : "Aucune zone enregistrée."}
        </p>
        <p className={s.help}>
          Une recherche ponctuelle ne change pas vos alertes. Enregistrez le
          lieu et le rayon ci-dessus pour les utiliser sur votre compte. Vos
          préférences de notifications restent inchangées.
        </p>
        <Button
          type="button"
          variant="outline"
          loading={areaBusy}
          disabled={!profile || areaBusy}
          onClick={() => void saveAlertArea()}
        >
          Utiliser cette zone pour mes alertes
        </Button>
        {areaError && (
          <p className={u.error} role="alert">
            {areaError}
          </p>
        )}
        {areaMessage && <p role="status">{areaMessage}</p>}
      </div>
      <div className={s.refinements}>
        <details className={s.filterGroup}>
          <summary>
            Métier <span>{draft.qualification || "Mes qualifications"}</span>
            {[
              draft.qualification,
              draft.service,
              draft.population,
              draft.block,
              draft.specialty,
            ].filter(Boolean).length > 0 && (
              <b
                className={s.filterCount}
                aria-label="critères métier sélectionnés"
              >
                {
                  [
                    draft.qualification,
                    draft.service,
                    draft.population,
                    draft.block,
                    draft.specialty,
                  ].filter(Boolean).length
                }
              </b>
            )}
          </summary>
          <div className={s.filterContent}>
            <SelectField
              label="Qualification"
              value={draft.qualification}
              onChange={(e) => {
                const changed = {
                  q: jobSearch(values.q).qualification
                    ? jobSearch(values.q).keywords
                    : values.q,
                  qualification: e.target.value,
                  includeIde: "",
                  service: "",
                  population: "",
                  block: "",
                  specialty: "",
                };
                setDraft((d) => ({ ...d, ...changed }));
                setFormError("");
                update({ ...changed, page: 1 });
              }}
            >
              <option value="">Toutes mes qualifications</option>
              {qualifications.map((q) => (
                <option key={q}>{q}</option>
              ))}
            </SelectField>
            {["IADE", "IBODE"].includes(draft.qualification) &&
              qualifications.includes("IDE") && (
                <label className={s.check}>
                  <input
                    type="checkbox"
                    checked={draft.includeIde === "1"}
                    onChange={(event) => {
                      const includeIde = event.target.checked ? "1" : "";
                      setDraft((d) => ({ ...d, includeIde }));
                      update({
                        qualification: draft.qualification,
                        includeIde,
                        page: 1,
                      });
                    }}
                  />
                  Inclure aussi les missions IDE
                </label>
              )}
            {["IADE", "IBODE"].includes(draft.qualification) && (
              <p className={s.groupHint}>
                {draft.includeIde === "1" && qualifications.includes("IDE")
                  ? `Missions ${draft.qualification} et IDE. Le métier est appliqué immédiatement.`
                  : `Uniquement les missions ${draft.qualification}. Le métier est appliqué immédiatement.`}
              </p>
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
                <Link to="/profil">votre profil</Link> pour affiner par métier.
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
            {[draft.available, draft.start, draft.end, draft.shift].filter(
              Boolean,
            ).length > 0 && (
              <b
                className={s.filterCount}
                aria-label="critères de disponibilité sélectionnés"
              >
                {
                  [draft.available, draft.start, draft.end, draft.shift].filter(
                    Boolean,
                  ).length
                }
              </b>
            )}
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
                onChange={(e) => set("available", e.target.checked ? "1" : "")}
              />
              Compatibles avec mes disponibilités
            </label>
            <p className={s.groupHint}>
              {profile?.available?.length ? (
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
              <option value="MORNING">Matin</option>
              <option value="AFTERNOON">Après-midi</option>
              <option value="DAY">Jour</option>
              <option value="NIGHT">Nuit</option>
              <option value="MIXED">Alternance jour et nuit</option>
            </SelectField>
          </div>
        </details>
        <details className={s.filterGroup}>
          <summary>
            Autres critères <span>Publication, établissement</span>
            {[draft.published, draft.establishment].filter(Boolean).length >
              0 && (
              <b
                className={s.filterCount}
                aria-label="autres critères sélectionnés"
              >
                {[draft.published, draft.establishment].filter(Boolean).length}
              </b>
            )}
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
        <p>
          Choisissez une ville, un code postal ou une adresse dans les
          suggestions. La distance est mesurée à vol d’oiseau ; les offres sans
          coordonnées connues sont exclues lorsqu’un rayon est choisi. Cette
          ville et ce rayon filtrent uniquement votre recherche. Le taux de
          matching et les alertes de missions compatibles utilisent la zone de
          recherche et d’alertes enregistrée sur votre compte : une recherche
          dans une autre ville ne les modifie pas. Pour changer la zone des
          alertes, utilisez « Utiliser cette zone pour mes alertes » ou
          modifiez-la depuis votre profil.
        </p>
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
                      ...(k === "q" &&
                      jobSearch(values.q).qualification === values.qualification
                        ? {
                            qualification: "",
                            service: "",
                            population: "",
                            block: "",
                            specialty: "",
                          }
                        : {}),
                      ...(k === "start" ? { end: "" } : {}),
                      ...(k === "block" ? { specialty: "" } : {}),
                      ...(k === "qualification"
                        ? {
                            q: jobSearch(values.q).qualification
                              ? jobSearch(values.q).keywords
                              : values.q,
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
  );
}
