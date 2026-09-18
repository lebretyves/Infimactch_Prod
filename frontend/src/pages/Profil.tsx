import { experienceServiceOptions } from "@/data/clinicalSkills";
import { PracticeChoices } from "@/components/PracticeChoices";
import {CvImport} from '@/components/CvImport';
import {PersonalCorrectionRequest} from '@/components/PersonalCorrectionRequest';
import { ProSanteConnect } from "@/components/ProSanteConnect";
import { useRef, useState, type FormEvent } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRemote } from "@/lib/useRemote";
import { api } from "@/services/api";
import {
  getProfile,
  saveProfile,
  type ProfessionalProfile,
  type ProfileDetails,
  type Experience,
} from "@/services/profile";
import { dateInput } from "@/services/nurse";
import { wholeDayPeriod } from "@/lib/datePeriods";
import {
  QUALIFICATIONS,
  labelCode,
  shiftOptions,
} from "@/data/professional";
import { Button, ButtonLink } from "@/ui/Button";
import { TextField, SelectField } from "@/ui/Field";
import { Checkbox, Radio } from "@/ui/Choice";
import { Icon } from "@/ui/Icon";
import Calendrier from "./Calendrier";
import u from "@/components/NurseUI.module.css";
import s from "./Profil.module.css";
function Editor({ initial }: { initial: ProfessionalProfile }) {
  const { user, refreshIdentity } = useAuth();
  const baseline = useRef(initial.details);
  const [experienceEdit, setExperienceEdit] = useState<{ index: number; draft: Experience } | null>(null);
  const [experienceError, setExperienceError] = useState("");
  const [p, setP] = useState(initial),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [message, setMessage] = useState("");
  const ref = useRemote(
    (signal) =>
      api<{ ideServices: string[]; blockSpecialties: string[] }>(
        "/reference-data",
        { signal },
      ),
    "reference-data",
  );
  const experienceServices = experienceServiceOptions(ref.data?.ideServices);
  const bank = useRemote(
    (signal) => api<{ iban: string | null; document: {id:string}|null }>("/me/bank-details", { signal }),
    "bank",
  );
  function change(v: Partial<ProfessionalProfile>) {
    setP((p) => ({ ...p, ...v }));
    setMessage("");
    setError("");
  }
  function detail(key: keyof ProfileDetails, value: string | number) {
    const details = { ...p.details };
    if (value === "") delete details[key];
    else Object.assign(details, { [key]: value });
    change({
      details,
      ...(key === "firstName" ? { display_name: String(value) } : {}),
    });
  }
  function toggleSkill(code: string, checked: boolean) {
    change({
      skills: checked
        ? [...new Set([...p.skills, code])]
        : p.skills.filter((v) => v !== code),
    });
  }
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    if (experienceEdit) {
      setExperienceError("Enregistrez ou annulez cette expérience avant de sauvegarder le profil.");
      return;
    }
    setBusy(true);
    setError("");
    setMessage("");
    try {
      if (p.display_name.trim().length < 2)
        throw new Error("Renseignez votre prénom avant d’enregistrer.");
      if (
        p.experience.some(
          (e) =>
            !e.service ||
            !e.start ||
            !e.end ||
            Date.parse(e.end) <= Date.parse(e.start),
        )
      )
        throw new Error(
          "Complétez chaque expérience avec un service et des dates cohérentes.",
        );
      const latest = await getProfile();
      const details = { ...latest.details };
      for (const key of new Set([
        ...Object.keys(baseline.current || {}),
        ...Object.keys(p.details || {}),
      ]) as Set<keyof ProfileDetails>) {
        if (p.details?.[key] !== baseline.current?.[key]) {
          const value = p.details?.[key];
          if (value === undefined) delete details[key];
          else Object.assign(details, { [key]: value });
        }
      }
      await saveProfile({
        ...p,
        available: latest.available,
        unavailable: latest.unavailable,
        details,
      });
      const saved = await getProfile();
      setP(saved);
      baseline.current = saved.details;
      setMessage("Modifications enregistrées.");
      try {
        await refreshIdentity();
      } catch {
        setMessage(
          "Modifications enregistrées. Rechargez la page pour actualiser le nom dans l’en-tête.",
        );
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const d = p.details || {};
  const specialized = p.qualifications.some((q) =>
    ["IADE", "IBODE"].includes(q),
  );
  const population = p.skills.includes("POPULATION_ADULT")
    ? p.skills.includes("POPULATION_PEDIATRIC")
      ? "MIXED"
      : "ADULT"
    : p.skills.includes("POPULATION_PEDIATRIC")
      ? "PEDIATRIC"
      : "";
  return (
    <form className={`${u.page} ${s.profilePage}`} onSubmit={submit} onInvalidCapture={event=>{(event.target as HTMLElement).closest("details")?.setAttribute("open","");}}>
      <header className={u.header}>
        <div>
          <p className={u.eyebrow}>Mon parcours</p>
          <h1>Mon profil professionnel</h1>
          <p className={u.subtitle}>
            Vos qualifications et votre expérience guident les missions
            proposées.
          </p>
        </div>
        <Button type="submit" loading={busy}>
          Enregistrer les modifications
        </Button>
      </header>
      <nav className={s.sectionNav} aria-label="Rubriques de mon profil">
        <a href="#qualifications">Diplômes</a><a href="#experiences">Expériences et CV</a><a href="#competences">Compétences</a><a href="#preferences">Préférences</a><a href="#informations-personnelles">Informations personnelles</a>
      </nav>
      <p className={s.contextNote}>Ce profil sert à proposer des missions adaptées à votre parcours. <a href="/dossier">Mon dossier</a> rassemble les vérifications, justificatifs et coordonnées bancaires.</p>
      {error && (
        <p className={u.feedback} role="alert">
          {error}
        </p>
      )}
      {message && (
        <p className={u.feedback} role="status">
          {message}
        </p>
      )}
      <fieldset disabled={busy} className={s.formBody}>
        <div className={s.sections}>
            <section id="qualifications" tabIndex={-1} className={`${u.card} ${s.qualifications}`}>
              <h2 className={u.cardHeading}>
                <Icon name="graduation" />
                Qualifications et expérience
              </h2>
              <p className={s.label}>Diplômes déclarés</p>
              <div className={s.choices}>
                {Object.entries(QUALIFICATIONS).map(([q, label]) => (
                  <Checkbox
                    key={q}
                    checked={p.qualifications.includes(q)}
                    onChange={(e) =>
                      change({
                        qualifications: e.target.checked
                          ? [...p.qualifications, q]
                          : p.qualifications.filter((v) => v !== q),
                      })
                    }
                  >
                    {label}
                  </Checkbox>
                ))}
              </div>
              <p className={s.help}>
                Pour une spécialité, confirmez aussi votre diplôme IDE.
              </p>
              <div className={u.grid}>
                {p.qualifications.map((q) => {
                  const key = (
                    {
                      IDE: "ideDiplomaYear",
                      IADE: "iadeDiplomaYear",
                      IBODE: "ibodeDiplomaYear",
                    } as const
                  )[q as "IDE" | "IADE" | "IBODE"];
                  return key ? (
                    <TextField
                      key={q}
                      data-filled={Boolean(d[key] ?? (p.qualifications.length === 1 ? d.diplomaYear : undefined))}
                      label={"Année du diplôme " + q}
                      type="number"
                      min={1900}
                      max={new Date().getFullYear()}
                      value={
                        d[key] ??
                        (p.qualifications.length === 1 ? d.diplomaYear : "") ??
                        ""
                      }
                      onChange={(e) =>
                        detail(
                          key,
                          e.target.value ? Number(e.target.value) : "",
                        )
                      }
                    />
                  ) : null;
                })}
              </div>
              <h3 id="experiences" tabIndex={-1}>Expérience par service</h3>
              <fieldset className={s.cvImport}>
              <details open className={s.cvDisclosure} onToggle={event=>{const panel=event.currentTarget;if(!panel.open&&panel.querySelector('[role="alert"],[role="status"]'))panel.open=true;}}>
                <summary>Importer un CV <span>Préremplir mes expériences</span></summary>
              <CvImport addBlocked={Boolean(experienceEdit)} services={experienceServices.map(option => option.value)} existing={p.experience} onAdd={values=>change({experience:[...p.experience,...values]})}/>
              </details>
              </fieldset>
              {!p.experience.length && (
                <p className={u.muted}>
                  Ajoutez les services dans lesquels vous avez exercé.
                </p>
              )}
              {ref.error && (
                <p role="alert">
                  Les services sont indisponibles.{" "}
                  <Button type="button" variant="ghost" onClick={ref.reload}>
                    Réessayer
                  </Button>
                </p>
              )}
              {[...p.experience, ...(experienceEdit?.index === p.experience.length ? [experienceEdit.draft] : [])].map((savedExp, i) => {
                const editing = experienceEdit?.index === i;
                const exp = editing ? experienceEdit.draft : savedExp;
                function update(v: Partial<typeof exp>) {
                  setExperienceEdit({ index: i, draft: { ...exp, ...v } });
                  setExperienceError("");
                }
                const end = new Date(exp.end);
                if (
                  end.getHours() === 0 &&
                  end.getMinutes() === 0 &&
                  end.getSeconds() === 0
                )
                  end.setDate(end.getDate() - 1);
                if (!editing) return (
                  <article key={i} className={s.experienceCard} aria-label={"Expérience " + (i + 1)}>
                    <div className={s.experienceSummary}>
                      <strong>{labelCode(exp.service) || "Service à compléter"}</strong>
                      <span>{exp.establishment || "Établissement non renseigné"}</span>
                      <span className={s.experienceDates}>
                        {dateInput(exp.start) ? new Date(exp.start).toLocaleDateString("fr-FR") : "Début à compléter"}
                        {" — "}
                        {dateInput(end) ? end.toLocaleDateString("fr-FR") : "Fin à compléter"}
                      </span>
                    </div>
                    <div className={s.experienceActions}>
                      <Button type="button" variant="outline" size="sm" disabled={Boolean(experienceEdit)}
                        aria-label={"Modifier l’expérience " + (i + 1)}
                        onClick={() => { setExperienceEdit({index:i,draft:{...exp}}); setExperienceError(""); }}>Modifier</Button>
                      <Button type="button" variant="ghost" size="sm" disabled={Boolean(experienceEdit)}
                        aria-label={"Supprimer l’expérience " + (i + 1)}
                        onClick={() => change({experience:p.experience.filter((_,n)=>n!==i)})}>Supprimer</Button>
                    </div>
                  </article>
                );
                return (
                  <div key={i} className={s.experience}>
                    <div className={u.row}>
                      <strong>Expérience {i + 1}</strong>

                    </div>
                    <TextField
                      label={"Établissement " + (i + 1)}
                      maxLength={150}
                      data-filled={Boolean(exp.establishment?.trim())}
                      value={exp.establishment || ""}
                      onChange={(e) =>
                        update({ establishment: e.target.value || undefined })
                      }
                    />
                    <SelectField
                      label={"Service " + (i + 1)}
                      required
                      data-filled={Boolean(exp.service)}
                      value={exp.service}
                      onChange={(e) => update({ service: e.target.value })}
                    >
                      <option value="">Sélectionner un service</option>
                      {experienceServices.map(({ value: code, label }) => (
                        <option key={code} value={code}>
                          {label}
                        </option>
                      ))}
                      {exp.service &&
                        !experienceServices.some(option => option.value === exp.service) && (
                          <option value={exp.service}>
                            {labelCode(exp.service)}
                          </option>
                        )}
                    </SelectField>
                    <div className={u.grid}>
                      <TextField
                        label={"Début de l’expérience " + (i + 1)}
                        type="date"
                        required
                        data-filled={Boolean(dateInput(exp.start))}
                        value={dateInput(exp.start)}
                        onChange={(e) =>
                          update({
                            start: e.target.value
                              ? new Date(
                                  e.target.value + "T00:00:00",
                                ).toISOString()
                              : "",
                          })
                        }
                      />
                      <TextField
                        label={"Fin de l’expérience " + (i + 1)}
                        type="date"
                        required
                        min={dateInput(exp.start) || undefined}
                        max={dateInput(new Date(Date.now() - 86400000))}
                        data-filled={Boolean(dateInput(end))}
                        value={dateInput(end)}
                        onChange={(e) =>
                          update({
                            end:
                              wholeDayPeriod(e.target.value, e.target.value)
                                ?.end || "",
                          })
                        }
                      />
                    </div>
                    {experienceError && <p className={s.experienceError} role="alert">{experienceError}</p>}
                    <div className={s.experienceActions}>
                      <Button type="button" size="sm" onClick={() => {
                        if (!exp.service || !Number.isFinite(Date.parse(exp.start)) || !Number.isFinite(Date.parse(exp.end)) || Date.parse(exp.end) <= Date.parse(exp.start) || dateInput(end) > dateInput(new Date(Date.now() - 86400000))) {
                          setExperienceError("Choisissez un service et des dates cohérentes dans le passé."); return;
                        }
                        change({experience: i === p.experience.length ? [...p.experience, exp] : p.experience.map((e,n)=>n===i?exp:e)});
                        setExperienceEdit(null); setExperienceError("");
                      }}>Enregistrer l’expérience</Button>
                      <Button type="button" variant="ghost" size="sm" onClick={() => { setExperienceEdit(null); setExperienceError(""); }}>Annuler</Button>
                    </div>
                    <p className={s.help}>Enregistrez ensuite les modifications du profil pour les conserver.</p>
                  </div>
                );
              })}
              <Button
                type="button"
                variant="outline"
                disabled={p.experience.length >= 100 || Boolean(experienceEdit)}
                onClick={() => {
                  setExperienceEdit({index:p.experience.length,draft:{service:"",start:"",end:""}});
                  setExperienceError("");
                }}
              >
                + Ajouter une expérience
              </Button>
            </section>
            <section id="competences" tabIndex={-1} className={`${u.card} ${s.skillSection}`}>
              <h2 className={u.cardHeading}>
                <Icon name="settings" />
                Pratique et choix d’exercice par métier
              </h2>
              <SelectField
                label="Population prise en charge"
                value={population}
                onChange={(e) =>
                  change({
                    skills: [
                      ...p.skills.filter((k) => !k.startsWith("POPULATION_")),
                      ...(e.target.value === "ADULT"
                        ? ["POPULATION_ADULT"]
                        : e.target.value === "PEDIATRIC"
                          ? ["POPULATION_PEDIATRIC"]
                          : e.target.value === "MIXED"
                            ? ["POPULATION_ADULT", "POPULATION_PEDIATRIC"]
                            : []),
                    ],
                  })
                }
              >
                <option value="">Non renseignée</option>
                <option value="ADULT">Adulte</option>
                <option value="PEDIATRIC">Pédiatrique</option>
                <option value="MIXED">Adulte et pédiatrique</option>
              </SelectField>
              {(specialized || p.skills.some(code => code.startsWith("BLOCK_"))) && (
                <>
                  <h3>Spécialités maîtrisées</h3>
                  <div className={s.choices}>
                    {[...new Set([...(specialized ? ref.data?.blockSpecialties || [] : []), ...p.skills.filter(code => code.startsWith("BLOCK_")).map(code => code.slice(6))])].map((code) => (
                      <Checkbox
                        key={code}
                        checked={p.skills.includes("BLOCK_" + code)}
                        onChange={(e) =>
                          toggleSkill("BLOCK_" + code, e.target.checked)
                        }
                      >
                        {labelCode(code)}
                      </Checkbox>
                    ))}
                  </div>
                  <p className={s.help}>
                    Ces spécialités permettent de vérifier la compatibilité avec
                    les missions en bloc spécialisé.
                  </p>
                </>
              )}
              <PracticeChoices qualifications={p.qualifications} services={p.details?.practiceServices || {}} skills={p.skills}
                onChange={(practiceServices, skills) => change({ skills, details: { ...p.details, practiceServices } })} />
            </section>
            <section id="preferences" tabIndex={-1} className={u.card}>
              <h2 className={u.cardHeading}>
                <Icon name="briefcase" />
                Mes préférences de mission
              </h2>
              <div className={u.actions}>
                {p.qualifications.map((q) => (
                  <span key={q} className={u.badge}>
                    Missions {q}
                  </span>
                ))}
              </div>
              <p className={s.help}>
                {p.qualifications.length
                  ? "Selon vos diplômes déclarés, les compétences et l’expérience demandées."
                  : "Renseignez vos diplômes pour adapter la recherche."}
              </p>
              <h3>Horaires acceptés</h3>
              <div className={s.choices}>
                {shiftOptions.map((o) => (
                  <Radio
                    key={o.value}
                    name="horaires-acceptes"
                    value={o.value}
                    checked={
                      p.accepted_shifts.length === o.shifts.length &&
                      o.shifts.every((v) => p.accepted_shifts.includes(v))
                    }
                    onChange={() =>
                      change({
                        accepted_shifts: o.shifts,
                        preferred_shifts: p.preferred_shifts.filter((v) =>
                          o.shifts.includes(v),
                        ),
                      })
                    }
                  >
                    {o.label}
                  </Radio>
                ))}
              </div>
              <Checkbox
                checked={p.visible}
                onChange={(e) => change({ visible: e.target.checked })}
              >
                Rendre mon profil visible aux agences
              </Checkbox>
            </section>
            <section id="informations-personnelles" tabIndex={-1} className={u.card}>
              <h2 className={u.cardHeading}>
                <Icon name="user" />
                Informations personnelles
              </h2>
              <p>Ces informations sont verrouillées après votre inscription. Pour les corriger, envoyez une demande à un administrateur.</p>
              <div className={u.grid}>
                <div id="prenom">
                  <TextField
                    label="Prénom"
                    required
                    minLength={2}
                    maxLength={100}
                    autoComplete="given-name"
                    value={d.firstName ?? p.display_name}
                    readOnly
                  />
                </div>
                <TextField
                  label="Nom"
                  maxLength={100}
                  autoComplete="family-name"
                  value={d.lastName || ""}
                  readOnly
                />
                <TextField
                  label="E-mail"
                  type="email"
                  value={user?.email || ""}
                  readOnly
                />
                <TextField
                  label="Ville"
                  maxLength={150}
                  value={d.city || ""}
                  readOnly
                />
                <TextField
                  label="Téléphone"
                  type="tel"
                  maxLength={40}
                  value={d.phone || ""}
                  readOnly
                />
                <TextField
                  label="Date de naissance"
                  type="date"
                  max={dateInput(new Date())}
                  value={d.birthDate || ""}
                  readOnly
                />
              </div>
              <details className={s.details}>
                <summary>Adresse postale</summary>
                <div className={s.fields}>
                  <TextField
                    label="Adresse"
                    maxLength={500}
                    value={d.address || ""}
                    readOnly
                  />
                  <TextField
                    label="Code postal"
                    pattern="[0-9]{5}"
                    maxLength={5}
                    value={d.postalCode || ""}
                    readOnly
                  />
                </div>
              </details>
              <PersonalCorrectionRequest />
              <ProSanteConnect purpose="link" />
            </section>
          <div className={s.related}>
            <section id="mobilite" tabIndex={-1} className={u.card}>
              <h2 className={u.cardHeading}>
                <Icon name="calendar" />
                Disponibilités et mobilité
              </h2>
              <p className={s.help}>
                {p.available.length} période(s) disponible(s) enregistrée(s)
                {p.radius_km ? " · rayon de " + p.radius_km + " km" : ""}.
              </p>
              <ButtonLink to="/calendrier" variant="outline">
                Gérer mes disponibilités et ma mobilité
              </ButtonLink>
            </section>
            <section id="coordonnees-bancaires" tabIndex={-1} className={u.card}>
              <h2 className={u.cardHeading}>
                <Icon name="file-text" />
                Coordonnées bancaires
              </h2>
              <div className={u.row}>
                <p className={s.help}>
                  {bank.loading
                    ? "Chargement…"
                    : bank.error
                      ? "Coordonnées indisponibles"
                      : bank.data?.iban || (bank.data?.document ? "RIB enregistré" : "Aucun RIB")}
                </p>
                <ButtonLink to="/dossier#rib" variant="ghost">
                  Modifier
                </ButtonLink>
              </div>
            </section>
          </div>
        </div>
        <div className={s.bottom}>
          <p>Enregistrez vos modifications avant de quitter cette page.</p>
          <Button type="submit" loading={busy}>
            Enregistrer les modifications
          </Button>
        </div>
      </fieldset>
    </form>
  );
}
export default function Profil({ calendar = false }: { calendar?: boolean }) {
  const { user } = useAuth();
  if (calendar) return <Calendrier />;
  return user?.role === "interimaire" ? (
    <ProfileLoader />
  ) : (
    <div className={u.page}>
      <h1>Mon profil professionnel</h1>
      <section className={u.card}>
        <h2>{user?.nomEtablissement || "Mon organisation"}</h2>
        <ButtonLink to="/organisation">Modifier mon organisation</ButtonLink>
      </section>
    </div>
  );
}
function ProfileLoader() {
  const r = useRemote(getProfile, "profile");
  return r.loading ? (
    <p role="status">Chargement du profil…</p>
  ) : r.error || !r.data ? (
    <div role="alert" className={u.feedback}>
      {r.error}
      <Button onClick={r.reload}>Réessayer</Button>
    </div>
  ) : (
    <Editor initial={r.data} />
  );
}
