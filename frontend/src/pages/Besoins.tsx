import { useRef, useState, type FormEvent } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRemote } from "@/lib/useRemote";
import { api } from "@/services/api";
import {statusLabels} from "@/services/market";
import {
  organizations,
  type OrganizationContext,
} from "@/services/organizations";
import {
  staffingNeeds,
  staffingNeed,
  saveStaffingNeed,
  type StaffingNeed,
  type NeedDetails,
} from "@/services/needs";
import { parisDateTimeLabel } from "@/lib/parisDateTime";
import { localDate, inclusiveEndDate, missionDateRange, missionDateRangeLabel } from "@/lib/missionDateRange";
import { QUALIFICATIONS, SKILLS, labelCode } from "@/data/professional";
import { Button, ButtonLink } from "@/ui/Button";
import { TextField, SelectField, TextArea } from "@/ui/Field";
import { Checkbox } from "@/ui/Choice";
import { Icon } from "@/ui/Icon";
import u from "@/components/NurseUI.module.css";
import s from "./Besoins.module.css";
type Reference = { ideServices: string[]; blockSpecialties: string[] };
const shiftLabels = {
  UNKNOWN: "Non connu",
  DAY: "Jour",
  NIGHT: "Nuit",
  MIXED: "Alternance jour et nuit",
};
const populationLabels = {
  ADULT: "Adultes",
  PEDIATRIC: "Pédiatrie",
  MIXED: "Adultes et pédiatrie",
};
const blockLabels = {
  NONE: "Hors bloc",
  GENERAL: "Bloc polyvalent",
  SPECIALIZED: "Bloc spécialisé",
};
function NeedForm({
  context,
  reference,
  initial,
  onSaved,
  onCancel,
}: {
  context: OrganizationContext;
  reference: Reference;
  initial: StaffingNeed | null;
  onSaved: (edited: boolean) => void;
  onCancel: () => void;
}) {
  const establishments = context.organizations.filter(
    (o) => o.kind === "ESTABLISHMENT",
  );
  const original = initial?.details;
  const [org, setOrg] = useState(
      initial?.establishment_id || establishments[0]?.id || "",
    ),
    [title, setTitle] = useState(initial?.title || ""),
    [description, setDescription] = useState(initial?.description || "");
  const [details, setDetails] = useState<Omit<NeedDetails, "start" | "end">>(
    original
      ? { ...original }
      : {
          qualification: "IDE",
          service: "",
          shift: "UNKNOWN",
          schedulePrecision: "DATE",
          timezone: "Europe/Paris",
          headcount: 1,
          population: "ADULT",
          block: "NONE",
          requiredSkills: [],
          minExperienceMonths: 0,
          address:
            initial?.establishment_address || establishments[0]?.address || "",
        },
  );
  const [timezone, setTimezone] = useState(original?.timezone || "Europe/Paris");
  const [startDate, setStartDate] = useState(original ? localDate(original.start, original.timezone) : "");
  const [endDate, setEndDate] = useState(original ? inclusiveEndDate(original.end, original.timezone) : "");
  // Keep a string while editing so clearing zero does not immediately restore it.
  const [experienceYears, setExperienceYears] = useState(() =>
    String(Number((details.minExperienceMonths / 12).toFixed(4))),
  );
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const locked = useRef(false),
    key = useRef({ body: "", id: crypto.randomUUID() });
  function change(values: Partial<typeof details>) {
    setDetails((v) => ({ ...v, ...values }));
    setError("");
  }
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (locked.current) return;
    locked.current = true;
    setBusy(true);
    setError("");
    try {
      const years = Number(experienceYears);
      if (!experienceYears.trim() || !Number.isFinite(years) || years < 0 || years > 50)
        throw new Error("Renseignez une expérience entre 0 et 50 ans.");
      const minExperienceMonths = Math.round(years * 12);
      const { start, end, schedulePrecision } = missionDateRange(startDate, endDate, timezone, original || undefined);
      if (!original && startDate < localDate(new Date().toISOString(), timezone))
        throw new Error("La période doit commencer aujourd’hui ou à une date ultérieure.");
      if (!establishments.some((o) => o.id === org))
        throw new Error(
          "Choisissez un établissement auquel vous êtes rattaché.",
        );
      const body = {
        establishmentId: org,
        title: title.trim(),
        description: description.trim(),
        details: {
          ...details,
          minExperienceMonths,
          schedulePrecision,
          timezone,
          start,
          end,
          address: details.address.trim(),
          specialty:
            details.block === "SPECIALIZED" ? details.specialty : undefined,
        },
      };
      const serialized = JSON.stringify(body);
      if (key.current.body !== serialized)
        key.current = { body: serialized, id: crypto.randomUUID() };
      await saveStaffingNeed(body, key.current.id, initial?.id);
      onSaved(!!initial);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      locked.current = false;
      setBusy(false);
    }
  }
  if (!establishments.length)
    return (
      <section className={u.card}>
        <p>Aucun établissement actif ne permet de déclarer un besoin.</p>
        <ButtonLink to="/organisation" variant="outline">
          Consulter mon organisation
        </ButtonLink>
      </section>
    );
  return (
    <form onSubmit={submit} className={s.form} id="formulaire-besoin">
      <div className={u.row}>
        <div>
          <h2>{initial ? "Modifier le besoin" : "Déclarer un besoin"}</h2>
          <p className={s.help}>
            Les agences rattachées pourront consulter ces critères pour préparer
            une mission.
          </p>
        </div>
        {initial && (
          <Button
            type="button"
            variant="ghost"
            disabled={busy}
            onClick={onCancel}
          >
            Annuler la modification
          </Button>
        )}
      </div>
      {initial && !original && (
        <p className={s.notice}>
          Ce besoin ancien ne contient pas encore de critères structurés.
          Complétez sa période et le profil recherché.
        </p>
      )}
      {error && (
        <p role="alert" className={u.feedback}>
          {error}
        </p>
      )}
      <fieldset disabled={busy} className={s.formBody}>
        <div className={s.formGrid}>
          <section className={u.card}>
            <h3 className={u.cardHeading}>
              <Icon name="building" />
              Identification du besoin
            </h3>
            <SelectField
              label="Établissement demandeur"
              required
              disabled={!!initial}
              value={org}
              onChange={(e) => {
                setOrg(e.target.value);
                change({
                  address:
                    establishments.find((o) => o.id === e.target.value)
                      ?.address || "",
                });
              }}
            >
              {establishments.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </SelectField>
            <TextField
              label="Intitulé du besoin"
              required
              minLength={3}
              maxLength={150}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <TextArea
              label="Description du besoin"
              required
              minLength={10}
              maxLength={8000}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
            <TextField
              label="Adresse du lieu de travail"
              required
              minLength={5}
              maxLength={500}
              value={details.address}
              onChange={(e) => change({ address: e.target.value })}
            />
          </section>
          <section className={u.card}>
            <h3 className={u.cardHeading}>
              <Icon name="calendar" />
              Période et effectif
            </h3>
            <p className={s.help}>Dates inclusives. Horaires précis à confirmer.
              {original && original.schedulePrecision !== "DATE" && " Les horaires enregistrés sont conservés si les dates et le fuseau restent inchangés."}
            </p>
            <SelectField label="Fuseau horaire du besoin" value={timezone} onChange={e => setTimezone(e.target.value)}>
              {Array.from(new Set(["Europe/Paris", "America/Guadeloupe", "America/Martinique", "America/Cayenne", "Indian/Reunion", "Indian/Mayotte", timezone])).map(zone => <option key={zone} value={zone}>{zone}</option>)}
            </SelectField>
            <div className={u.grid}>
              <TextField label="Date de début du besoin" type="date" required value={startDate} onChange={e => { setStartDate(e.target.value); if (!endDate) setEndDate(e.target.value); }} />
              <TextField label="Date de fin incluse" type="date" min={startDate || undefined} required value={endDate} onChange={e => setEndDate(e.target.value)} />
            </div>
            <div className={u.grid}>
              <SelectField
                label="Horaires demandés"
                value={details.shift}
                onChange={(e) =>
                  change({ shift: e.target.value as NeedDetails["shift"] })
                }
              >
                {Object.entries(shiftLabels).filter(([value]) => value !== "MIXED" || details.shift === "MIXED").map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </SelectField>
              <TextField
                label="Nombre de professionnels"
                type="number"
                required
                min={1}
                max={100}
                step={1}
                value={details.headcount}
                onChange={(e) => change({ headcount: Number(e.target.value) })}
              />
            </div>
          </section>
        </div>
        <section className={u.card}>
          <h3 className={u.cardHeading}>
            <Icon name="stethoscope" />
            Profil recherché
          </h3>
          <div className={s.criteria}>
            <SelectField
              label="Qualification recherchée"
              required
              value={details.qualification}
              onChange={(e) =>
                change({
                  qualification: e.target.value as NeedDetails["qualification"],
                  block: "NONE",
                  specialty: undefined,
                })
              }
            >
              {Object.entries(QUALIFICATIONS).map(([code, label]) => (
                <option key={code} value={code}>
                  {label}
                </option>
              ))}
            </SelectField>
            <SelectField
              label="Service du besoin"
              required
              value={details.service}
              onChange={(e) => change({ service: e.target.value })}
            >
              <option value="">Choisir un service</option>
              {reference.ideServices.map((code) => (
                <option key={code} value={code}>
                  {labelCode(code)}
                </option>
              ))}
            </SelectField>
            <SelectField
              label="Population prise en charge"
              value={details.population}
              onChange={(e) =>
                change({
                  population: e.target.value as NeedDetails["population"],
                })
              }
            >
              {Object.entries(populationLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </SelectField>
            <SelectField
              label="Type de bloc demandé"
              value={details.block}
              onChange={(e) =>
                change({
                  block: e.target.value as NeedDetails["block"],
                  specialty: undefined,
                })
              }
            >
              {Object.entries(blockLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </SelectField>
            {details.block === "SPECIALIZED" && (
              <SelectField
                label="Spécialité du bloc demandée"
                required
                value={details.specialty || ""}
                onChange={(e) => change({ specialty: e.target.value })}
              >
                <option value="">Choisir une spécialité</option>
                {reference.blockSpecialties.map((code) => (
                  <option key={code} value={code}>
                    {labelCode(code)}
                  </option>
                ))}
              </SelectField>
            )}
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
          </div>
          <details className={s.skills}>
            <summary>
              Compétences obligatoires ({details.requiredSkills.length})
            </summary>
            <div>
              {Object.entries({
                ...SKILLS,
                ...Object.fromEntries(
                  details.requiredSkills
                    .filter((code) => !SKILLS[code])
                    .map((code) => [code, labelCode(code)]),
                ),
              }).map(([code, label]) => (
                <Checkbox
                  key={code}
                  checked={details.requiredSkills.includes(code)}
                  onChange={(e) =>
                    change({
                      requiredSkills: e.target.checked
                        ? [...details.requiredSkills, code]
                        : details.requiredSkills.filter((v) => v !== code),
                    })
                  }
                >
                  {label}
                </Checkbox>
              ))}
            </div>
          </details>
        </section>
        <div className={s.formActions}>
          <p className={s.help}>
            L’enregistrement rend le besoin consultable. Il ne publie pas
            automatiquement une mission.
          </p>
          <Button type="submit" loading={busy}>
            {initial
              ? "Enregistrer les modifications du besoin"
              : "Enregistrer le besoin"}
          </Button>
        </div>
      </fieldset>
    </form>
  );
}
function NeedCard({
  need,
  editable,
  agency,
  onEdit,
  busy,
}: {
  need: StaffingNeed;
  editable: boolean;
  agency: boolean;
  onEdit: () => void;
  busy: boolean;
}) {
  const d = need.details;
  return (
    <article id={"besoin-"+need.id} className={u.card}>
      <div className={u.row}>
        <div>
          <p className={s.eyebrow}>
            {need.establishment_name || "Établissement demandeur"}
          </p>
          <h3>{need.title}</h3>
        </div>
        {d ? (
          <span className={u.badge}>
            {d.headcount} professionnel{d.headcount > 1 ? "s" : ""}
          </span>
        ) : (
          <span className={s.incomplete}>Critères à compléter</span>
        )}
      </div>
      {d && (
        <>
          <div className={s.summary}>
            <span>
              <Icon name="stethoscope" size={17} />
              {d.qualification} · {labelCode(d.service)}
            </span>
            <span>
              <Icon name="calendar" size={17} />
              {missionDateRangeLabel(d)}
            </span>
            <span>
              <Icon name="briefcase" size={17} />
              {shiftLabels[d.shift]}
            </span>
          </div>
        </>
      )}
      <details className={s.detail}>
        <summary>Voir le détail du besoin</summary>
        <div>
          <p className={s.description}>{need.description}</p>
          {d && (
            <dl className={s.detailList}>
              <div>
                <dt>Lieu de travail</dt>
                <dd>{d.address}</dd>
              </div>
              <div>
                <dt>Population / bloc</dt>
                <dd>
                  {populationLabels[d.population]} · {blockLabels[d.block]}
                  {d.specialty ? " · " + labelCode(d.specialty) : ""}
                </dd>
              </div>
              <div>
                <dt>Expérience minimale</dt>
                <dd>{Math.floor(d.minExperienceMonths / 12)} an(s){d.minExperienceMonths % 12 ? ` et ${d.minExperienceMonths % 12} mois` : ""} dans le service</dd>
              </div>
              <div>
                <dt>Compétences requises</dt>
                <dd>
                  {d.requiredSkills.length
                    ? d.requiredSkills.map(labelCode).join(", ")
                    : "Aucune compétence supplémentaire renseignée"}
                </dd>
              </div>
            </dl>
          )}
          <p className={s.help}>
            Enregistré le {parisDateTimeLabel(need.created_at)}
            {need.updated_at && need.updated_at !== need.created_at
              ? " · Mis à jour le " + parisDateTimeLabel(need.updated_at)
              : ""}
          </p>
        </div>
      </details>
      <section aria-label="Suivi du besoin">
        <h4>Suivi et visibilité</h4>
        {!need.missions?.length ? <p>À compléter : aucune offre publiée pour ce besoin. Préparez une mission pour renseigner la rémunération et le lieu, puis publiez-la.</p> : <ul>{need.missions.map(m=><li key={m.id}><ButtonLink variant="ghost" to={"/gestion/missions/"+m.id}>{m.title} — {statusLabels[m.status] || m.status}</ButtonLink><span> · {m.application_count} candidature(s)</span></li>)}</ul>}
      </section>
      <div className={u.actions}>
        {editable && (
          <Button variant="outline" size="sm" disabled={busy} onClick={onEdit}>
            Modifier le besoin
          </Button>
        )}
        {(agency || editable) && (
          <ButtonLink
            to={
              "/gestion/missions/nouvelle?besoin=" + encodeURIComponent(need.id)
            }
            size="sm"
          >
            {need.missions?.length ? "Préparer une autre mission" : "Compléter et préparer la publication"}
          </ButtonLink>
        )}
      </div>
    </article>
  );
}
export default function Besoins() {
  const { user } = useAuth();
  const [offset, setOffset] = useState(0),
    [editing, setEditing] = useState<StaffingNeed | null>(null),
    [editBusy, setEditBusy] = useState(""),
    [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [formVersion, setFormVersion] = useState(0);
  const loadLock = useRef(false);
  const r = useRemote(async (signal) => {
    const [context, items] = await Promise.all([
      organizations(signal),
      staffingNeeds(offset, signal),
    ]);
    return { context, items };
  }, String(offset));
  const reference = useRemote(
    (signal) => api<Reference>("/reference-data", { signal }),
    "needs-reference",
  );
  async function edit(id: string) {
    if (loadLock.current) return;
    loadLock.current = true;
    setEditBusy(id);
    setError("");
    setMessage("");
    try {
      setEditing(await staffingNeed(id));
      setFormVersion((v) => v + 1);
      setTimeout(
        () =>
          document
            .getElementById("formulaire-besoin")
            ?.scrollIntoView({ behavior: "smooth", block: "start" }),
        0,
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      loadLock.current = false;
      setEditBusy("");
    }
  }
  return (
    <div className={u.page}>
      <header className={u.header}>
        <div>
          <p className={u.eyebrow}>
            {user?.role === "etablissement"
              ? "Espace établissement"
              : "Espace agence"}
          </p>
          <h1>Besoins de personnel</h1>
          <p className={u.subtitle}>
            {user?.role === "etablissement"
              ? "Précisez la période, le service et le profil attendu pour votre prochain renfort."
              : "Consultez les besoins des établissements rattachés et préparez vos missions."}
          </p>
        </div>
        {user?.role === "entreprise" && (
          <ButtonLink to="/gestion/missions/nouvelle" variant="outline">
            Créer une mission libre
          </ButtonLink>
        )}
      </header>
      {error && (
        <p role="alert" className={u.feedback}>
          {error}
        </p>
      )}
      {message && (
        <p role="status" className={u.feedback}>
          {message}
        </p>
      )}
      {r.loading ? (
        <p role="status">Chargement des besoins…</p>
      ) : r.error || !r.data ? (
        <div role="alert" className={u.feedback}>
          {r.error}
          <Button onClick={r.reload}>Réessayer</Button>
        </div>
      ) : (
        <>
          {user?.role === "etablissement" &&
            (reference.loading ? (
              <p role="status">Chargement des services et spécialités…</p>
            ) : reference.error || !reference.data ? (
              <div role="alert" className={u.feedback}>
                Les services et spécialités n’ont pas pu être chargés.{" "}
                <Button onClick={reference.reload}>
                  Réessayer les critères
                </Button>
              </div>
            ) : (
              <NeedForm
                key={formVersion}
                context={r.data.context}
                reference={reference.data}
                initial={editing}
                onCancel={() => {
                  setEditing(null);
                  setFormVersion((v) => v + 1);
                  setMessage("");
                }}
                onSaved={(edited) => {
                  setEditing(null);
                  setFormVersion((v) => v + 1);
                  setOffset(0);
                  r.reload();
                  setMessage(
                    edited
                      ? "Besoin mis à jour. Les missions déjà créées conservent leurs conditions : modifiez-les séparément si nécessaire."
                      : "Besoin enregistré et visible dans votre tableau de bord. Complétez une mission ci-dessous puis publiez-la pour la proposer aux intérimaires.",
                  );
                }}
              />
            ))}
          <section className={u.stack} aria-labelledby="besoins-enregistres">
            <div className={u.row}>
              <h2 id="besoins-enregistres">Besoins enregistrés</h2>
              <span className={s.help}>Page {Math.floor(offset / 20) + 1}</span>
            </div>
            {r.data.items.map((need) => (
              <NeedCard
                key={need.id}
                need={need}
                editable={
                  user?.role === "etablissement" &&
                  r.data!.context.organizations.some(
                    (o) =>
                      o.kind === "ESTABLISHMENT" &&
                      o.id === need.establishment_id,
                  )
                }
                agency={user?.role === "entreprise"}
                busy={!!editBusy}
                onEdit={() => void edit(need.id)}
              />
            ))}
            {!r.data.items.length && (
              <div className={u.card}>
                <p className={u.muted}>Aucun besoin sur cette page.</p>
              </div>
            )}
            <nav className={u.row} aria-label="Pages des besoins">
              <Button
                variant="outline"
                disabled={!offset || !!editBusy}
                onClick={() => setOffset((v) => Math.max(0, v - 20))}
              >
                Précédent
              </Button>
              <Button
                variant="outline"
                disabled={r.data.items.length < 20 || !!editBusy}
                onClick={() => setOffset((v) => v + 20)}
              >
                Suivant
              </Button>
            </nav>
          </section>
        </>
      )}
      <ButtonLink to="/missions" variant="ghost">
        Retour aux missions
      </ButtonLink>
    </div>
  );
}
