import { experienceServiceOptions } from "@/data/clinicalSkills";
import { PracticeChoices } from "@/components/PracticeChoices";
import { Button } from "@/ui/Button";
import { Checkbox } from "@/ui/Choice";
import { SelectField, TextField } from "@/ui/Field";
import { QUALIFICATIONS, labelCode } from "@/data/professional";
import { api } from "@/services/api";
import { useRemote } from "@/lib/useRemote";
import { Etape, etapeStyles as s } from "./Etape";
import { useInscription } from "./state";
export default function Qualification() {
  const { valeurs: v, modifier } = useInscription();
  const ref = useRemote(
    (signal) =>
      api<{ ideServices: string[]; blockSpecialties: string[] }>(
        "/reference-data",
        { signal },
      ),
    "reference-data",
  );
  const experienceServices = experienceServiceOptions(ref.data?.ideServices);
  function toggle(q: string) {
    modifier({
      qualifications: v.qualifications.includes(q)
        ? v.qualifications.filter((x) => x !== q)
        : [...v.qualifications, q],
    });
  }
  const ideManquant =
    v.qualifications.some((q) => q !== "IDE") &&
    !v.qualifications.includes("IDE");
  function exp(i: number, key: string, value: string) {
    modifier({
      experiences: v.experiences.map((e, n) =>
        n === i ? { ...e, [key]: value } : e,
      ),
    });
  }
  return (
    <Etape
      titre="Qualification"
      chapeau="Indiquez les diplômes que vous détenez et votre expérience professionnelle."
      suivant="/inscription/mobilite"
      onValider={() => {
        if (!v.qualifications.length)
          throw new Error("Sélectionnez au moins un diplôme.");
        if (ideManquant)
          throw new Error(
            "Cochez aussi « IDE — Infirmier diplômé d’État » : une spécialité IADE ou IBODE suppose ce diplôme.",
          );
        if (
          v.experiences.some(
            (e) =>
              (e.service || e.etablissement || e.start || e.end || e.annees) &&
              (!e.service || !e.start || !e.end || e.end < e.start),
          )
        )
          throw new Error(
            "Complétez les dates et le service des expériences ajoutées.",
          );
      }}
    >
      <fieldset className={s.bloc}>
        <legend>Diplômes détenus</legend>
        {Object.entries(QUALIFICATIONS).map(([q, label]) => (
          <Checkbox
            key={q}
            checked={v.qualifications.includes(q)}
            onChange={() => toggle(q)}
          >
            {label}
          </Checkbox>
        ))}
        <p>
          Cochez chaque diplôme obtenu, y compris IDE si vous êtes spécialisé.
        </p>
        {ideManquant && (
          <p role="status" className={s.rappel}>
            Une spécialité suppose le diplôme IDE : cochez « IDE — Infirmier
            diplômé d’État » pour pouvoir continuer.
          </p>
        )}
      </fieldset>
      <div className={s.paire}>
        <TextField
          label="Année d’obtention"
          required
          type="number"
          min={1900}
          max={new Date().getFullYear()}
          value={v.anneeDiplome}
          onChange={(e) => modifier({ anneeDiplome: e.target.value })}
        />
        <TextField
          label="Numéro RPPS"
          inputMode="numeric"
          pattern="[0-9]{11}"
          maxLength={11}
          optional
          hint="Vous pourrez lancer sa vérification depuis votre dossier."
          value={v.rpps}
          onChange={(e) => modifier({ rpps: e.target.value })}
        />
      </div>
      <PracticeChoices qualifications={v.qualifications} services={v.practiceServices || {}} skills={v.competences}
        onChange={(practiceServices, competences) => modifier({ practiceServices, competences })} />
      <fieldset className={s.bloc}>
        <legend>Populations prises en charge</legend>
        {[['POPULATION_ADULT', 'Adultes'], ['POPULATION_PEDIATRIC', 'Pédiatrie']].map(([code, label]) => <Checkbox key={code} checked={v.competences.includes(code)} onChange={event => modifier({ competences: event.target.checked ? [...v.competences, code] : v.competences.filter(item => item !== code) })}>{label}</Checkbox>)}
      </fieldset>
      {(v.qualifications.some(q => ['IADE', 'IBODE'].includes(q)) || v.competences.some(code => code.startsWith('BLOCK_'))) && <fieldset className={s.bloc}>
        <legend>Spécialités au bloc</legend>
        {[...new Set([...(v.qualifications.some(q => ['IADE', 'IBODE'].includes(q)) ? ref.data?.blockSpecialties || [] : []), ...v.competences.filter(code => code.startsWith('BLOCK_')).map(code => code.slice(6))])].map(block => <Checkbox key={block} checked={v.competences.includes('BLOCK_' + block)} onChange={event => modifier({ competences: event.target.checked ? [...v.competences, 'BLOCK_' + block] : v.competences.filter(code => code !== 'BLOCK_' + block) })}>{labelCode(block)}</Checkbox>)}
      </fieldset>}
      <fieldset className={s.bloc}>
        <legend>Expérience professionnelle</legend>
        {ref.error && (
          <p role="alert">
            Le référentiel des services est indisponible.{" "}
            <Button type="button" variant="ghost" onClick={ref.reload}>
              Réessayer
            </Button>
          </p>
        )}
        {v.experiences.map((e, i) => (
          <div key={i} className={s.champs}>
            <TextField
              label={`Établissement ${i + 1}`}
              maxLength={150}
              value={e.etablissement}
              onChange={(event) => exp(i, "etablissement", event.target.value)}
            />
            <SelectField
              label={`Service ${i + 1}`}
              value={e.service}
              onChange={(event) => exp(i, "service", event.target.value)}
            >
              <option value="">Sélectionner un service</option>
              {experienceServices.map(({ value: service, label }) => (
                <option key={service} value={service}>
                  {label}
                </option>
              ))}
              {e.service && !experienceServices.some(option => option.value === e.service) && (
                <option value={e.service}>{labelCode(e.service)}</option>
              )}
            </SelectField>
            <div className={s.paire}>
              <TextField
                label={`Début de l’expérience ${i + 1}`}
                type="date"
                value={e.start || ""}
                onChange={(event) => exp(i, "start", event.target.value)}
              />
              <TextField
                label={`Fin de l’expérience ${i + 1}`}
                type="date"
                min={e.start || undefined}
                max={new Date(Date.now() - 86400000).toISOString().slice(0, 10)}
                value={e.end || ""}
                onChange={(event) => exp(i, "end", event.target.value)}
              />
            </div>
            <Button
              type="button"
              variant="ghost"
              onClick={() =>
                modifier({
                  experiences: v.experiences.filter((_, n) => n !== i),
                })
              }
            >
              Retirer l’expérience {i + 1}
            </Button>
          </div>
        ))}
        <Button
          type="button"
          variant="outline"
          disabled={v.experiences.length >= 100}
          onClick={() =>
            modifier({
              experiences: [
                ...v.experiences,
                {
                  etablissement: "",
                  service: "",
                  annees: "",
                  start: "",
                  end: "",
                },
              ],
            })
          }
        >
          Ajouter une expérience
        </Button>
      </fieldset>
    </Etape>
  );
}
