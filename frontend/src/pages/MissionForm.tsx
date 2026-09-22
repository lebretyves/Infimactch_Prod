import { SearchPlace, validCoordinates } from "@/components/SearchPlace";
import { missionMaxDate, validateMissionHorizon } from "@/lib/missionDateRange";
import { missionReturnTo } from "@/lib/missionNavigation";
import { serviceOptionsFor } from "@/data/clinicalSkills";
import { ClinicalSkillsPicker } from "@/components/ClinicalSkillsPicker";
import { useRef, useState, type FormEvent } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router";
import { useRemote } from "@/lib/useRemote";
import { api } from "@/services/api";
import {
  organizations,
  type OrganizationContext,
} from "@/services/organizations";
import { staffingNeed, type StaffingNeed } from "@/services/needs";
import { localDate, inclusiveEndDate, localTime, missionDateRange, missionShiftDefaultTimes, type SchedulePrecision } from "@/lib/missionDateRange";
import u from "@/components/NurseUI.module.css";
import { labelCode } from "@/data/professional";
import { Button, ButtonLink } from "@/ui/Button";
import { TextField, TextArea, SelectField } from "@/ui/Field";
import page from "./Candidater.module.css";
import s from "./inscription/Etape.module.css";
type Draft = {
  agencyId: string;
  establishmentId: string;
  title: string;
  description: string;
  qualification: string;
  service: string;
  population: string;
  block: string;
  specialty?: string;
  requiredSkills: string[];
  desiredSkills: string[];
  minExperienceMonths: number;
  timezone: string;
  start: string;
  end: string;
  startTime: string;
  endTime: string;
  shift: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  hourlySalary: number | null;
};
type Stored = {
  id: string;
  agency_id: string | null;
  staffing_request_id?: string | null;
  establishment_id: string;
  title: string;
  description: string;
  qualification: string;
  service: string;
  population: string;
  block: string;
  specialty: string | null;
  required_skills: string[];
  desired_skills: string[];
  min_experience_months: number;
  timezone?: string;
  schedule_precision?: SchedulePrecision;
  start_at: string;
  end_at: string;
  shift: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  hourly_salary: number;
};
type Reference = { ideServices: string[]; blockSpecialties: string[] };
function Form({
  context,
  reference,
  mission,
  need,
  requestedEstablishmentId,
}: {
  context: OrganizationContext;
  reference: Reference;
  mission?: Stored;
  need?: StaffingNeed;
  requestedEstablishmentId?: string;
}) {
  const navigate = useNavigate();
  const [navigationParams] = useSearchParams();
  const returnTo = missionReturnTo(navigationParams.get("returnTo"));
  const agencies = context.organizations.filter(
    (o) =>
      o.kind === "AGENCY" &&
      (!need ||
        context.links.some(
          (link) =>
            link.agency_id === o.id && link.id === need.establishment_id,
        )),
  );
  const directEstablishments = context.organizations.filter(o => o.kind === "ESTABLISHMENT" && (!need || o.id === need.establishment_id));
  const requestedDirect = directEstablishments.find(o => o.id === requestedEstablishmentId);
  const requestedLink = context.links.find(o => o.id === requestedEstablishmentId && agencies.some(a => a.id === o.agency_id));
  const first = requestedDirect ? "" : requestedLink?.agency_id || agencies[0]?.id || "";
  const initialEstablishment = need ? [...directEstablishments,...context.links].find(o=>o.id===need.establishment_id) : requestedDirect || requestedLink || (!first ? directEstablishments[0] : undefined);
  const initialAddress = need?.details?.address || need?.establishment_address || initialEstablishment?.address || "";
  const initialPosition = initialAddress.trim() === initialEstablishment?.address.trim() ? validCoordinates(initialEstablishment?.latitude, initialEstablishment?.longitude) : null;
  const [v, setV] = useState<Draft>(
    mission
      ? {
          agencyId: mission.agency_id || "",
          establishmentId: mission.establishment_id,
          title: mission.title,
          description: mission.description,
          qualification: mission.qualification,
          service: mission.service,
          population: mission.population,
          block: mission.block,
          specialty: mission.specialty || undefined,
          requiredSkills: mission.required_skills,
          desiredSkills: mission.desired_skills,
          minExperienceMonths: Number(mission.min_experience_months),
          timezone: mission.timezone || "Europe/Paris",
          start: localDate(mission.start_at, mission.timezone),
          end: inclusiveEndDate(mission.end_at, mission.timezone),
          startTime: mission.schedule_precision === "DATE"
            ? (missionShiftDefaultTimes(mission.shift)?.startTime || "")
            : localTime(mission.start_at, mission.timezone || "Europe/Paris"),
          endTime: mission.schedule_precision === "DATE"
            ? (missionShiftDefaultTimes(mission.shift)?.endTime || "")
            : localTime(mission.end_at, mission.timezone || "Europe/Paris"),
          shift: mission.shift,
          address: mission.address,
          latitude: mission.latitude,
          longitude: mission.longitude,
          hourlySalary: Number(mission.hourly_salary),
        }
      : {
          agencyId: first,
          establishmentId: initialEstablishment?.id || "",
          title: need?.title || "",
          description: need?.description || "",
          qualification: need?.details?.qualification || "IDE",
          service: need?.details?.service || "",
          population: need?.details?.population || "ADULT",
          block: need?.details?.block || "NONE",
          specialty: need?.details?.specialty,
          requiredSkills: need?.details?.requiredSkills || [],
          desiredSkills: [],
          minExperienceMonths: need?.details?.minExperienceMonths || 0,
          timezone: need?.details?.timezone || "Europe/Paris",
          start: need?.details ? localDate(need.details.start, need.details.timezone) : "",
          end: need?.details ? inclusiveEndDate(need.details.end, need.details.timezone) : "",
          startTime: need?.details
            ? (need.details.schedulePrecision === "DATE"
              ? (missionShiftDefaultTimes(need.details.shift)?.startTime || localTime(need.details.start, need.details.timezone || "Europe/Paris"))
              : localTime(need.details.start, need.details.timezone || "Europe/Paris"))
            : "",
          endTime: need?.details
            ? (need.details.schedulePrecision === "DATE"
              ? (missionShiftDefaultTimes(need.details.shift)?.endTime || localTime(need.details.end, need.details.timezone || "Europe/Paris"))
              : localTime(need.details.end, need.details.timezone || "Europe/Paris"))
            : "",
          shift: need?.details?.shift || "",
          address: initialAddress,
          latitude: initialPosition?.latitude ?? null,
          longitude: initialPosition?.longitude ?? null,
          hourlySalary: null,
        },
  );
  // Keep a string while editing so clearing zero does not immediately restore it.
  const [experienceYears, setExperienceYears] = useState(() =>
    String(Number((v.minExperienceMonths / 12).toFixed(4))),
  );
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const key = useRef({ body: "", id: crypto.randomUUID() });
  const locked = useRef(false);
  const linked = v.agencyId ? context.links.filter(
    (o) => o.agency_id === v.agencyId && (!need || o.id === need.establishment_id),
  ) : directEstablishments;
  const set = (values: Partial<Draft>) => setV((v) => ({ ...v, ...values }));
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (locked.current) return;
    locked.current = true;
    setBusy(true);
    setError("");
    try {
      if (!v.shift) throw new Error("Choisissez un créneau : matin, après-midi ou nuit.");
      if (!v.startTime || !v.endTime)
        throw new Error("Renseignez l’heure de début et l’heure de fin du créneau.");
      const years = Number(experienceYears);
      if (!experienceYears.trim() || !Number.isFinite(years) || years < 0 || years > 50)
        throw new Error("Renseignez une expérience entre 0 et 50 ans.");
      const minExperienceMonths = Math.round(years * 12);
      if (v.hourlySalary === null || v.hourlySalary <= 0)
        throw new Error("Complétez la rémunération brute par heure.");
      if (!linked.some((link) => link.id === v.establishmentId))
        throw new Error(
          "Choisissez votre établissement ou un établissement rattaché à votre agence.",
        );
      validateMissionHorizon(v.start,v.end,v.timezone);
      const { start, end, schedulePrecision } = missionDateRange(v.start, v.end, v.timezone,
        mission ? { start: mission.start_at, end: mission.end_at, timezone: mission.timezone, schedulePrecision: mission.schedule_precision } : undefined,
        v.shift,
        { startTime: v.startTime, endTime: v.endTime });
      if (schedulePrecision !== "EXACT")
        throw new Error("Renseignez un créneau et des horaires précis pour publier la mission.");
      if (!mission && v.start < localDate(new Date().toISOString(), v.timezone))
        throw new Error("La mission doit commencer aujourd’hui ou à une date ultérieure.");
      const { startTime: _startTime, endTime: _endTime, ...missionFields } = v;
      const body = {
        ...missionFields,
        minExperienceMonths,
        schedulePrecision,
        agencyId: v.agencyId || undefined,
        staffingRequestId: need?.id || mission?.staffing_request_id || undefined,
        start,
        end,
        specialty: v.block === "SPECIALIZED" ? v.specialty : undefined,
      };
      const content = JSON.stringify(body);
      if (key.current.body !== content)
        key.current = { body: content, id: crypto.randomUUID() };
      const result = await api<{ id: string }>(
        mission ? "/missions/" + mission.id : "/missions/open",
        { method: mission ? "PUT" : "POST", body, key: key.current.id },
      );
      navigate("/gestion/missions/" + (mission?.id || result.id) + "?" + new URLSearchParams({ returnTo }));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      locked.current = false;
      setBusy(false);
    }
  }
  if (!agencies.length && !directEstablishments.length)
    return (
      <section className={u.card}>
        <p>
          {need
            ? "Aucune de vos agences actives n’est rattachée à l’établissement de cette annonce. La publication est indisponible."
            : "Votre compte doit être rattaché à une entreprise pour créer une mission."}
        </p>
        <ButtonLink to="/missions" variant="outline">
          Retour aux missions
        </ButtonLink>
      </section>
    );
  return (
    <form className={s.champs} onSubmit={submit}>
      {need && (
        <section
          className={u.card}
          aria-label="Annonce à compléter"
        >
          <h2>Reprendre l’annonce : {need.title}</h2>
          {need.details ? (
            <p>
              Demande initiale de {need.details.headcount} professionnel
              {need.details.headcount > 1 ? "s" : ""}. Cette mission concerne une
              vacation pour un professionnel.
            </p>
          ) : (
            <p>
              Critères à compléter : cette ancienne saisie fournit seulement
              l’intitulé, la description et l’établissement.
            </p>
          )}
          <p>
            Vérifiez les informations préremplies et complétez le salaire et
            l’adresse du lieu de travail. La validation publie directement la mission et la rend visible aux intérimaires.
          </p>
          <ButtonLink to="/missions" variant="ghost">
            Retour aux missions
          </ButtonLink>
        </section>
      )}
      {error && (
        <p role="alert" className={u.feedback}>
          {error}
        </p>
      )}
      <fieldset
        disabled={busy}
        className={s.champs}
        style={{ border: 0, padding: 0, minWidth: 0 }}
      >
        <div className={s.paire}>
          <SelectField
            label="Publication"
            required={!directEstablishments.length}
            disabled={!!mission}
            value={v.agencyId}
            onChange={(e) => {
              const agencyId = e.target.value;
              const establishment = agencyId
                ? context.links.find(link => link.agency_id === agencyId && link.id === need?.establishment_id)
                : directEstablishments[0];
              set({
                agencyId,
                establishmentId: establishment?.id || "",
                address: establishment?.address || "",
                latitude: establishment?.latitude ?? null,
                longitude: establishment?.longitude ?? null,
              });
            }}
          >
            {!!directEstablishments.length && <option value="">Directement par mon établissement</option>}
            {agencies.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </SelectField>
          <SelectField
            label="Établissement"
            required
            disabled={!!mission || !!need}
            value={v.establishmentId}
            onChange={(e) =>
              set({
                establishmentId: e.target.value,
                address:
                  linked.find((l) => l.id === e.target.value)?.address || "",
                latitude: linked.find(l=>l.id===e.target.value)?.latitude ?? null,
                longitude: linked.find(l=>l.id===e.target.value)?.longitude ?? null,
              })
            }
          >
            <option value="">Choisir un établissement</option>
            {linked.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </SelectField>
        </div>
        {!linked.length && (
          <p>
            Aucun établissement n’est rattaché à cette agence. Le rattachement
            doit être autorisé avant la création.
          </p>
        )}
        <TextField
          label="Intitulé de la mission"
          required
          minLength={3}
          maxLength={150}
          value={v.title}
          onChange={(e) => set({ title: e.target.value })}
        />
        <TextArea
          label="Description"
          required
          minLength={10}
          maxLength={8000}
          value={v.description}
          onChange={(e) => set({ description: e.target.value })}
        />
        <div className={s.paire}>
          <SelectField
            label="Qualification requise"
            value={v.qualification}
            onChange={(e) =>
              set({
                qualification: e.target.value,
                service: serviceOptionsFor([e.target.value]).some(option => option.value === v.service) ? v.service : "",
                block: "NONE",
                specialty: undefined,
              })
            }
          >
            {["IDE", "IADE", "IBODE"].map((q) => (
              <option key={q}>{q}</option>
            ))}
          </SelectField>
          <SelectField
            label="Service"
            required
            value={v.service}
            onChange={(e) => set({ service: e.target.value })}
          >
            <option value="">Choisir un service</option>
            {serviceOptionsFor([v.qualification]).map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
            {v.service && !serviceOptionsFor([v.qualification]).some(option => option.value === v.service) && (
              <option value={v.service}>{labelCode(v.service)}</option>
            )}
          </SelectField>
        </div>
        <div className={s.paire}>
          <SelectField
            label="Population"
            value={v.population}
            onChange={(e) => set({ population: e.target.value })}
          >
            <option value="ADULT">Adultes</option>
            <option value="PEDIATRIC">Pédiatrie</option>
            <option value="MIXED">Adultes et pédiatrie</option>
          </SelectField>
          <SelectField
            label="Type de bloc"
            value={v.block}
            onChange={(e) =>
              set({ block: e.target.value, specialty: undefined })
            }
          >
            <option value="NONE">Hors bloc</option>
            <option value="GENERAL">Polyvalent</option>
            <option value="SPECIALIZED">Spécialisé</option>
          </SelectField>
        </div>
        {v.block === "SPECIALIZED" && (
          <SelectField
            label="Spécialité du bloc"
            required
            value={v.specialty || ""}
            onChange={(e) => set({ specialty: e.target.value })}
          >
            <option value="">Choisir</option>
            {reference.blockSpecialties.map((q) => (
              <option key={q} value={q}>
                {labelCode(q)}
              </option>
            ))}
          </SelectField>
        )}
        {(["requiredSkills", "desiredSkills"] as const).map(kind => <ClinicalSkillsPicker key={kind}
          label={kind === "requiredSkills" ? "Compétences indispensables" : "Compétences souhaitées"}
          qualifications={[v.qualification]} service={v.service} value={v[kind]}
          onChange={skills => set({ [kind]: skills })} />)}
        <TextField
          label="Expérience minimale dans le service (années)"
          type="number"
          required
          min={0}
          max={50}
          step="any"
          value={experienceYears}
          onChange={(e) => setExperienceYears(e.target.value)}
          hint="0 = aucune expérience minimale. Exemple : 1,5 an = 18 mois. Les fractions d’année sont arrondies au mois le plus proche."
        />
        <SelectField label="Fuseau horaire de la mission" value={v.timezone} onChange={(e) => set({ timezone: e.target.value })}>
          {Array.from(new Set(["Europe/Paris", "America/Guadeloupe", "America/Martinique", "America/Cayenne", "Indian/Reunion", "Indian/Mayotte", v.timezone])).map(zone => <option key={zone} value={zone}>{zone}</option>)}
        </SelectField>
        <p>
          Dates inclusives. Indiquez les heures précises du créneau (ex. 07:30–15:30). Un créneau type peut préremplir ces heures.
        </p>
        <div className={s.paire}>
          <TextField
            label="Date de début"
            type="date"
            required
            max={missionMaxDate(v.timezone)}
            value={v.start}
            onChange={(e) => set({ start: e.target.value })}
          />
          <TextField
            label="Date de fin incluse"
            type="date"
            required
            min={v.start || undefined}
            max={missionMaxDate(v.timezone)}
            value={v.end}
            onChange={(e) => set({ end: e.target.value })}
          />
        </div>
        <div className={s.paire}>
          <TextField
            label="Heure de début"
            type="time"
            required
            value={v.startTime}
            onChange={(e) => set({ startTime: e.target.value })}
          />
          <TextField
            label="Heure de fin"
            type="time"
            required
            value={v.endTime}
            onChange={(e) => set({ endTime: e.target.value })}
            hint={v.endTime && v.startTime && v.endTime <= v.startTime ? (v.endTime === v.startTime ? "L’heure de fin doit être différente de l’heure de début." : "Si l’heure de fin est avant le début, la fin est le lendemain (ex. nuit).") : undefined}
          />
        </div>
        <SelectField
          label="Type de créneau"
          required
          value={v.shift}
          onChange={(e) => {
            const shift = e.target.value;
            const defaults = missionShiftDefaultTimes(shift);
            set({
              shift,
              ...(defaults ? { startTime: defaults.startTime, endTime: defaults.endTime } : {}),
            });
          }}
          hint="Sert au matching. Choisir un type préremplit les heures ; vous pouvez ensuite les ajuster."
        >
          <option value="" disabled>Choisissez un créneau</option>
          <option value="MORNING">Matin (préremplit 06 h–14 h)</option>
          <option value="AFTERNOON">Après-midi (préremplit 14 h–22 h)</option>
          {v.shift === "UNKNOWN" && <option value="UNKNOWN">Non connu (déjà enregistré)</option>}
          {v.shift === "DAY" && <option value="DAY">Jour (préremplit 06 h–22 h)</option>}
          <option value="NIGHT">Nuit (préremplit 22 h–06 h)</option>
          {v.shift === "MIXED" && <option value="MIXED">Alternance jour et nuit (déjà enregistrée)</option>}
        </SelectField>
        <SearchPlace
          label="Adresse du lieu de mission"
          required
          maxLength={500}
          value={v.address}
          selected={!!validCoordinates(v.latitude, v.longitude)}
          home={null}
          onChange={(address, location) => set({
            address,
            latitude: location?.latitude ?? null,
            longitude: location?.longitude ?? null,
          })}
        />
        <p>Choisissez une adresse proposée pour préciser le lieu. Vous pouvez aussi publier avec l’adresse saisie, même si elle n’est pas reconnue.</p>
        {!validCoordinates(v.latitude, v.longitude) && <p>La distance ne pourra pas être calculée tant que la position du lieu n’est pas connue.</p>}
        <TextField
          label="Rémunération brute par heure (€)"
          type="number"
          required
          min={0.01}
          max={10000}
          step={0.01}
          value={v.hourlySalary ?? ""}
          onChange={(e) =>
            set({
              hourlySalary:
                e.target.value === "" ? null : Number(e.target.value),
            })
          }
        />
        <Button type="submit" disabled={!linked.length} loading={busy}>
          {mission
            ? "Enregistrer les modifications"
            : "Créer et publier la mission"}
        </Button>
      </fieldset>
      <ButtonLink
        to={
          mission
            ? "/gestion/missions/" + mission.id + "?" + new URLSearchParams({ returnTo })
            : returnTo
        }
        variant="ghost"
      >
        Annuler les modifications
      </ButtonLink>
    </form>
  );
}
export default function MissionForm() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const needId = !id ? params.get("besoin") : null;
  const requestedEstablishmentId = !id && !needId ? params.get("establishmentId") || undefined : undefined;
  const pageKey = (id || "new") + ":" + (needId || "") + ":" + (requestedEstablishmentId || "");
  const r = useRemote(async (signal) => {
    const [context, reference, mission, need] = await Promise.all([
      organizations(signal),
      api<Reference>("/reference-data", { signal }),
      id
        ? api<Stored>("/missions/" + id, { signal })
        : Promise.resolve(undefined),
      needId ? staffingNeed(needId, signal) : Promise.resolve(undefined),
    ]);
    return { context, reference, mission, need };
  }, pageKey);
  return (
    <div className={page.page}>
      <h1>
        {id
          ? "Modifier la mission"
          : needId
            ? "Compléter et publier une mission"
            : "Créer une mission"}
      </h1>
      {!id && <p>Renseignez les conditions de la mission, puis validez « Créer et publier la mission » pour rendre l’annonce visible aux intérimaires.</p>}
      {r.loading ? (
        <p role="status">Chargement…</p>
      ) : r.error ? (
        <div role="alert" className={u.feedback}>
          {r.error}
          <Button onClick={r.reload}>Réessayer</Button>
          {needId && (
            <ButtonLink to="/missions" variant="ghost">
              Retour aux missions
            </ButtonLink>
          )}
        </div>
      ) : (
        r.data && <Form key={pageKey} {...r.data} requestedEstablishmentId={requestedEstablishmentId} />
      )}
    </div>
  );
}
