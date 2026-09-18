import { useRef, useState, type FormEvent } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router";
import { useRemote } from "@/lib/useRemote";
import { api } from "@/services/api";
import {
  organizations,
  type OrganizationContext,
} from "@/services/organizations";
import { staffingNeed, type StaffingNeed } from "@/services/needs";
import { parisDateTimeInput, zonedDateTimeInput, zonedDateTimeToISO } from "@/lib/parisDateTime";
import u from "@/components/NurseUI.module.css";
import { SKILLS, labelCode } from "@/data/professional";
import { Button, ButtonLink } from "@/ui/Button";
import { TextField, TextArea, SelectField } from "@/ui/Field";
import { Checkbox } from "@/ui/Choice";
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
  start_at: string;
  end_at: string;
  shift: string;
  address: string;
  latitude: number;
  longitude: number;
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
          start: zonedDateTimeInput(mission.start_at, mission.timezone),
          end: zonedDateTimeInput(mission.end_at, mission.timezone),
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
          timezone: "Europe/Paris",
          start: need?.details ? parisDateTimeInput(need.details.start) : "",
          end: need?.details ? parisDateTimeInput(need.details.end) : "",
          shift: need?.details?.shift || "DAY",
          address: need?.details?.address || need?.establishment_address || initialEstablishment?.address || "",
          latitude: initialEstablishment?.latitude ?? null,
          longitude: initialEstablishment?.longitude ?? null,
          hourlySalary: null,
        },
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
      if (v.latitude === null || v.longitude === null)
        throw new Error("Renseignez la position du lieu de mission.");
      if (v.hourlySalary === null || v.hourlySalary <= 0)
        throw new Error("Complétez la rémunération brute par heure.");
      if (!linked.some((link) => link.id === v.establishmentId))
        throw new Error(
          "Choisissez votre établissement ou un établissement rattaché à votre agence.",
        );
      const start = zonedDateTimeToISO(
        v.start,
        mission?.start_at || need?.details?.start,
        v.timezone,
      );
      const end = zonedDateTimeToISO(
        v.end,
        mission?.end_at || need?.details?.end,
        v.timezone,
      );
      if (Date.parse(end) <= Date.parse(start))
        throw new Error("La fin doit être après le début.");
      if (!mission && Date.parse(start) <= Date.now())
        throw new Error(
          "La mission doit commencer dans le futur. Ajustez la période du besoin.",
        );
      const body = {
        ...v,
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
      navigate("/gestion/missions/" + (mission?.id || result.id));
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
            ? "Aucune de vos agences actives n’est rattachée à l’établissement de ce besoin. La préparation de la mission est indisponible."
            : "Votre compte doit être rattaché à une entreprise pour créer une mission."}
        </p>
        <ButtonLink to="/besoins" variant="outline">
          Retour aux besoins
        </ButtonLink>
      </section>
    );
  return (
    <form className={s.champs} onSubmit={submit}>
      {need && (
        <section
          className={u.card}
          aria-label="Besoin à l’origine de la mission"
        >
          <h2>À partir du besoin : {need.title}</h2>
          {need.details ? (
            <p>
              Besoin de {need.details.headcount} professionnel
              {need.details.headcount > 1 ? "s" : ""}. Cette mission concerne une
              vacation pour un professionnel.
            </p>
          ) : (
            <p>
              Critères à compléter : ce besoin ancien fournit seulement
              l’intitulé, la description et l’établissement.
            </p>
          )}
          <p>
            Vérifiez les informations préremplies et complétez le salaire et la
            position du lieu de travail. La validation publie directement la mission et la rend visible aux intérimaires.
          </p>
          <ButtonLink to="/besoins" variant="ghost">
            Retour aux besoins
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
            onChange={(e) =>
              set({
                agencyId: e.target.value,
                establishmentId: need?.establishment_id || (!e.target.value ? directEstablishments[0]?.id : "") || "",
              })
            }
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
            {reference.ideServices.map((q) => (
              <option key={q} value={q}>
                {labelCode(q)}
              </option>
            ))}
            {v.service && !reference.ideServices.includes(v.service) && (
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
        {(["requiredSkills", "desiredSkills"] as const).map((kind) => (
          <fieldset key={kind} className={s.bloc}>
            <legend>
              {kind === "requiredSkills"
                ? "Compétences obligatoires"
                : "Compétences souhaitées"}
            </legend>
            {Object.entries({
              ...SKILLS,
              ...Object.fromEntries(
                v[kind]
                  .filter((code) => !SKILLS[code])
                  .map((code) => [code, labelCode(code)]),
              ),
            }).map(([code, label]) => (
              <Checkbox
                key={code}
                checked={v[kind].includes(code)}
                onChange={(e) =>
                  set({
                    [kind]: e.target.checked
                      ? [...v[kind], code]
                      : v[kind].filter((q) => q !== code),
                  })
                }
              >
                {label}
              </Checkbox>
            ))}
          </fieldset>
        ))}
        <TextField
          label="Expérience minimale dans le service (mois)"
          type="number"
          required
          min={0}
          max={600}
          value={v.minExperienceMonths}
          onChange={(e) => set({ minExperienceMonths: Number(e.target.value) })}
        />
        <SelectField label="Fuseau horaire de la mission" value={v.timezone} onChange={(e) => set({ timezone: e.target.value })}>
          {Array.from(new Set(["Europe/Paris", "America/Guadeloupe", "America/Martinique", "America/Cayenne", "Indian/Reunion", "Indian/Mayotte", v.timezone])).map(zone => <option key={zone} value={zone}>{zone}</option>)}
        </SelectField>
        <p>
          La période est une plage exacte dans le fuseau sélectionné, sans
          répétition quotidienne automatique.
        </p>
        <div className={s.paire}>
          <TextField
            label="Début de mission"
            type="datetime-local"
            step={60}
            required
            value={v.start}
            onChange={(e) => set({ start: e.target.value })}
          />
          <TextField
            label="Fin de mission"
            type="datetime-local"
            step={60}
            required
            min={v.start || undefined}
            value={v.end}
            onChange={(e) => set({ end: e.target.value })}
          />
        </div>
        <SelectField
          label="Horaires de la mission"
          value={v.shift}
          onChange={(e) => set({ shift: e.target.value })}
        >
          <option value="DAY">Jour</option>
          <option value="NIGHT">Nuit</option>
          <option value="MIXED">Alternance jour et nuit</option>
        </SelectField>
        <TextField
          label="Adresse du lieu de mission"
          required
          minLength={5}
          maxLength={500}
          value={v.address}
          onChange={(e) => set({ address: e.target.value })}
        />
        <p>La position doit correspondre au lieu de travail.</p>
        <div className={s.paire}>
          <TextField
            label="Latitude du lieu"
            type="number"
            required
            min={-90}
            max={90}
            step="any"
            value={v.latitude ?? ""}
            onChange={(e) =>
              set({
                latitude: e.target.value === "" ? null : Number(e.target.value),
              })
            }
          />
          <TextField
            label="Longitude du lieu"
            type="number"
            required
            min={-180}
            max={180}
            step="any"
            value={v.longitude ?? ""}
            onChange={(e) =>
              set({
                longitude:
                  e.target.value === "" ? null : Number(e.target.value),
              })
            }
          />
        </div>
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
            ? "/gestion/missions/" + mission.id
            : need
              ? "/besoins"
              : "/missions"
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
            ? "Préparer une mission"
            : "Créer une mission"}
      </h1>
      {r.loading ? (
        <p role="status">Chargement…</p>
      ) : r.error ? (
        <div role="alert" className={u.feedback}>
          {r.error}
          <Button onClick={r.reload}>Réessayer</Button>
          {needId && (
            <ButtonLink to="/besoins" variant="ghost">
              Retour aux besoins
            </ButtonLink>
          )}
        </div>
      ) : (
        r.data && <Form key={pageKey} {...r.data} requestedEstablishmentId={requestedEstablishmentId} />
      )}
    </div>
  );
}
