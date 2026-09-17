import { Button } from "@/ui/Button";
import { Checkbox } from "@/ui/Choice";
import { SelectField, TextField } from "@/ui/Field";
import { QUALIFICATIONS, SKILLS, labelCode } from "@/data/professional";
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
  function toggle(q: string) {
    modifier({
      qualifications: v.qualifications.includes(q)
        ? v.qualifications.filter((x) => x !== q)
        : [...v.qualifications, q],
    });
  }
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
        if (
          v.qualifications.some((q) => q !== "IDE") &&
          !v.qualifications.includes("IDE")
        )
          throw new Error(
            "Confirmez explicitement votre diplôme IDE pour une spécialité.",
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
      <fieldset className={s.bloc}>
        <legend>Compétences</legend>
        {Object.entries({
          ...SKILLS,
          ...Object.fromEntries(
            (ref.data?.blockSpecialties || []).map((b) => [
              "BLOCK_" + b,
              "Bloc : " + labelCode(b),
            ]),
          ),
        }).map(([code, label]) => (
          <Checkbox
            key={code}
            checked={v.competences.includes(code)}
            onChange={() =>
              modifier({
                competences: v.competences.includes(code)
                  ? v.competences.filter((x) => x !== code)
                  : [...v.competences, code],
              })
            }
          >
            {label}
          </Checkbox>
        ))}
      </fieldset>
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
              {(ref.data?.ideServices || []).map((service) => (
                <option key={service} value={service}>
                  {labelCode(service)}
                </option>
              ))}
              {e.service && !ref.data?.ideServices.includes(e.service) && (
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
