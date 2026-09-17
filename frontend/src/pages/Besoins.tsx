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
import {
  parisDateTimeInput,
  parisDateTimeToISO,
  parisDateTimeLabel,
  nextDate,
} from "@/lib/parisDateTime";
import { QUALIFICATIONS, SKILLS, labelCode } from "@/data/professional";
import { Button, ButtonLink } from "@/ui/Button";
import { TextField, SelectField, TextArea } from "@/ui/Field";
import { Checkbox } from "@/ui/Choice";
import { Icon } from "@/ui/Icon";
import u from "@/components/NurseUI.module.css";
import s from "./Besoins.module.css";
type Reference = { ideServices: string[]; blockSpecialties: string[] };
const shiftLabels = {
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
          shift: "DAY",
          headcount: 1,
          population: "ADULT",
          block: "NONE",
          requiredSkills: [],
          minExperienceMonths: 0,
          address:
            initial?.establishment_address || establishments[0]?.address || "",
        },
  );
  const [startDate, setStartDate] = useState(
      original ? parisDateTimeInput(original.start).slice(0, 10) : "",
    ),
    [startTime, setStartTime] = useState(
      original ? parisDateTimeInput(original.start).slice(11) : "06:00",
    ),
    [endDate, setEndDate] = useState(
      original ? parisDateTimeInput(original.end).slice(0, 10) : "",
    ),
    [endTime, setEndTime] = useState(
      original ? parisDateTimeInput(original.end).slice(11) : "14:00",
    );
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const locked = useRef(false),
    key = useRef({ body: "", id: crypto.randomUUID() });
  function change(values: Partial<typeof details>) {
    setDetails((v) => ({ ...v, ...values }));
    setError("");
  }
  function preset(which: "morning" | "afternoon" | "night") {
    if (!startDate) return;
    setStartTime(
      which === "morning" ? "06:00" : which === "afternoon" ? "14:00" : "22:00",
    );
    setEndTime(
      which === "morning" ? "14:00" : which === "afternoon" ? "22:00" : "06:00",
    );
    setEndDate(which === "night" ? nextDate(startDate) : startDate);
    change({ shift: which === "night" ? "NIGHT" : "DAY" });
  }
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (locked.current) return;
    locked.current = true;
    setBusy(true);
    setError("");
    try {
      const start = parisDateTimeToISO(
          startDate + "T" + startTime,
          original?.start,
        ),
        end = parisDateTimeToISO(endDate + "T" + endTime, original?.end);
      if (Date.parse(start) <= Date.now())
        throw new Error("La période demandée doit commencer dans le futur.");
      if (Date.parse(end) <= Date.parse(start))
        throw new Error("La fin du besoin doit être après son début.");
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
            <p className={s.help}>
              Heure de Paris (Europe/Paris). Définissez une plage exacte, sans
              répétition quotidienne automatique.
            </p>
            <div className={u.grid}>
              <TextField
                label="Date de début du besoin"
                type="date"
                required
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  if (!endDate) setEndDate(e.target.value);
                }}
              />
              <TextField
                label="Heure de début du besoin"
                type="time"
                step={60}
                required
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />
            </div>
            <div className={s.presets} aria-label="Horaires prédéfinis">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!startDate}
                onClick={() => preset("morning")}
              >
                Matin 06–14
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!startDate}
                onClick={() => preset("afternoon")}
              >
                Après-midi 14–22
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!startDate}
                onClick={() => preset("night")}
              >
                Nuit 22–06
              </Button>
            </div>
            <p className={s.help}>
              Les présélections s’appliquent à la date de début ; la nuit se
              termine le lendemain. Les heures restent modifiables.
            </p>
            <div className={u.grid}>
              <TextField
                label="Date de fin du besoin"
                type="date"
                min={startDate || undefined}
                required
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
              <TextField
                label="Heure de fin du besoin"
                type="time"
                step={60}
                required
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
              />
            </div>
            <div className={u.grid}>
              <SelectField
                label="Horaires demandés"
                value={details.shift}
                onChange={(e) =>
                  change({ shift: e.target.value as NeedDetails["shift"] })
                }
              >
                {Object.entries(shiftLabels).map(([value, label]) => (
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
              label="Expérience minimale dans le service (mois)"
              type="number"
              required
              min={0}
              max={600}
              step={1}
              value={details.minExperienceMonths}
              onChange={(e) =>
                change({ minExperienceMonths: Number(e.target.value) })
              }
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
              {parisDateTimeLabel(d.start)} → {parisDateTimeLabel(d.end)} ·
              Paris
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
                <dd>{d.minExperienceMonths} mois dans le service</dd>
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
