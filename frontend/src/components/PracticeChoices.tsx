import { clinicalSkills, serviceOptionsFor } from "@/data/clinicalSkills";
import { QUALIFICATIONS, labelCode } from "@/data/professional";
import type { PracticeServices } from "@/services/profile";
import { Checkbox } from "@/ui/Choice";
import { ClinicalSkillsPicker } from "./ClinicalSkillsPicker";
import s from "./ClinicalSkillsPicker.module.css";

type Props = { qualifications: string[]; services: PracticeServices; skills: string[]; onChange: (services: PracticeServices, skills: string[]) => void };
export function PracticeChoices({ qualifications, services, skills, onChange }: Props) {
  const roles = [...new Set(qualifications)].filter((q): q is keyof PracticeServices => ['IDE', 'IADE', 'IBODE'].includes(q));
  const visibleCodes = new Set(clinicalSkills.filter(skill => skill.qualifications.some(q => roles.includes(q as keyof PracticeServices))).map(skill => skill.code));
  const retained = skills.filter(code => !visibleCodes.has(code) && !code.startsWith('POPULATION_') && !code.startsWith('BLOCK_'));
  return <div>
    <p>Un encadré par métier déclaré. Vous pouvez choisir plusieurs services si vous êtes polyvalent. Aucun service coché signifie « sans préférence » pour ce métier ; cela ne déclare aucune compétence.</p>
    {!roles.length && <p>Déclarez vos diplômes pour renseigner vos choix d’exercice.</p>}
    {roles.map(role => {
      const chosen = services[role] || [];
      const codes = new Set(clinicalSkills.filter(skill => skill.qualifications.includes(role)).map(skill => skill.code));
      return <fieldset className={s.picker} key={role} aria-label={`Choix d’exercice ${role}`}>
        <legend>{QUALIFICATIONS[role]}</legend>
        <details open>
          <summary>Services souhaités — facultatif · {chosen.length ? `${chosen.length} sélectionné(s)` : 'Sans préférence'}</summary>
          <p className={s.help}>Le matching utilise les services cochés pour {role} uniquement. Plusieurs choix sont possibles.</p>
          <div className={s.choices}>{serviceOptionsFor([role]).map(option => <Checkbox key={option.value} checked={chosen.includes(option.value)} onChange={event => onChange({ ...services, [role]: event.target.checked ? [...chosen, option.value] : chosen.filter(code => code !== option.value) }, skills)}>{option.label}</Checkbox>)}</div>
          {!!chosen.length && <button type="button" onClick={() => onChange({ ...services, [role]: [] }, skills)}>Aucune préférence de service pour {role}</button>}
        </details>
        <ClinicalSkillsPicker label={`Compétences de soins ${role}`} qualifications={[role]} services={chosen} personal value={skills.filter(code => codes.has(code))} onChange={selected => onChange(services, [...new Set([...skills.filter(code => !codes.has(code)), ...selected])])} />
      </fieldset>;
    })}
    {!!retained.length && <fieldset className={s.picker}><legend>Autres compétences déjà déclarées</legend>{retained.map(code => <Checkbox key={code} checked onChange={() => onChange(services, skills.filter(value => value !== code))}>{labelCode(code)}</Checkbox>)}</fieldset>}
  </div>;
}
