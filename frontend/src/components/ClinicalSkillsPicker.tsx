import { useState } from "react";
import { clinicalSkillGroups, skillsForContext, serviceOptionsFor } from "@/data/clinicalSkills";
import { QUALIFICATIONS, labelCode } from "@/data/professional";
import { Checkbox } from "@/ui/Choice";
import { SelectField, TextField } from "@/ui/Field";
import s from "./ClinicalSkillsPicker.module.css";
const isClinical = (code: string) => !code.startsWith("POPULATION_") && !code.startsWith("BLOCK_");
const normalized = (text: string) => text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("fr-FR");
type Props = { label: string; qualifications: string[]; service?: string; value: string[]; onChange: (value: string[]) => void; chooseContext?: boolean; services?: string[]; personal?: boolean };
export function ClinicalSkillsPicker({ label, qualifications, service, value, onChange, chooseContext = false, services: selectedServices, personal = chooseContext }: Props) {
  const [chosenQualification, setQualification] = useState("");
  const [chosenService, setService] = useState("");
  const [query, setQuery] = useState("");
  const declared = [...new Set(qualifications)].filter(code => ["IDE", "IADE", "IBODE"].includes(code));
  const qualification = declared.length === 1 ? declared[0] : declared.includes(chosenQualification) ? chosenQualification : "";
  const contextQualifications = chooseContext ? (qualification ? [qualification] : []) : declared;
  const services = serviceOptionsFor(contextQualifications);
  const contextService = chooseContext ? (services.some(option => option.value === chosenService) ? chosenService : "") : service;
  const suggestions = (selectedServices?.length ? skillsForContext(contextQualifications).filter(skill => !skill.services.length || selectedServices.some(service => skill.services.includes(service))) : skillsForContext(contextQualifications, contextService)).filter(skill => isClinical(skill.code));
  const suggestedCodes = new Set(suggestions.map(skill => skill.code));
  const selected = chooseContext ? value.filter(isClinical) : value;
  const outside = selected.filter(code => !suggestedCodes.has(code));
  const filtered = suggestions.filter(skill => normalized(`${skill.label} ${clinicalSkillGroups[skill.group] || skill.group}`).includes(normalized(query.trim())));
  function priority(skill: (typeof suggestions)[number]) {
    if (contextService && skill.services.includes(contextService)) return skill.services.length;
    if (skill.qualifications.length === 1) return 100;
    return 200;
  }
  const groups = [...new Set(filtered.map(skill => skill.group))].sort((a, b) =>
    Math.min(...filtered.filter(skill => skill.group === a).map(priority)) -
    Math.min(...filtered.filter(skill => skill.group === b).map(priority)),
  );
  function toggle(code: string, checked: boolean) { onChange(checked ? [...new Set([...value, code])] : value.filter(item => item !== code)); }
  return <fieldset className={s.picker}>
    <legend>{label} <span className={s.count}>{selected.length} sélectionnée(s)</span></legend>
    <p className={s.help}>{personal ? "Suggestions selon le métier et le service. Cochez uniquement les compétences que vous maîtrisez réellement. Le diplôme ne coche aucune compétence automatiquement ; votre déclaration ne vaut pas certification." : "Suggestions selon le métier et le service. Sélectionnez les compétences attendues pour cette mission. Le diplôme et les compétences déclarées du candidat sont vérifiés séparément."}</p>
    {chooseContext && <div className={s.context}>
      <SelectField label="Métier d’exercice pour les suggestions" value={qualification} onChange={event => { setQualification(event.target.value); setService(""); }}>
        {declared.length !== 1 && <option value="">Choisir parmi mes diplômes</option>}
        {declared.map(code => <option key={code} value={code}>{QUALIFICATIONS[code] || code}</option>)}
      </SelectField>
      <SelectField label="Service pour les suggestions" optional disabled={!qualification} value={contextService || ""} onChange={event => setService(event.target.value)}>
        <option value="">Tous les services du métier</option>{services.map(option => <option value={option.value} key={option.value}>{option.label}</option>)}
      </SelectField>
    </div>}
    {contextQualifications.length === 0 ? <p className={s.help}>{declared.length ? "Choisissez un métier pour afficher ses suggestions." : "Déclarez un diplôme pour afficher les suggestions correspondantes."}</p> : <>
      <TextField label="Rechercher dans les suggestions" type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Ex. pansement, anesthésie…" />
      <p className={s.results} aria-live="polite">{filtered.length} compétence(s) proposée(s){contextService ? ` · ${services.find(option => option.value === contextService)?.label || labelCode(contextService)}` : ""}</p>
      <div className={s.groups}>{groups.map((group, index) => {
        const items = filtered.filter(skill => skill.group === group).sort((a, b) => priority(a) - priority(b));
        return <details key={`${qualification}:${contextService || "all"}:${group}`} className={s.group} open={query.trim() ? true : index === 0 ? true : undefined}>
          <summary>{clinicalSkillGroups[group] || labelCode(group)} <span>{items.filter(skill => value.includes(skill.code)).length}/{items.length}</span></summary>
          <div className={s.choices}>{items.map(skill => <Checkbox key={skill.code} checked={value.includes(skill.code)} onChange={event => toggle(skill.code, event.target.checked)}>{skill.label}</Checkbox>)}</div>
        </details>;
      })}</div>
      {!filtered.length && <p className={s.help}>{query.trim() ? "Aucune compétence ne correspond à cette recherche." : "Aucune suggestion pour ce contexte. Vos sélections restent conservées ci-dessous."}</p>}
    </>}
    {!!outside.length && <fieldset className={s.previous}><legend>Déjà sélectionnées</legend><p className={s.help}>Ces compétences sont conservées même si elles ne figurent pas dans les suggestions actuelles. Décochez-les pour les retirer.</p><div className={s.choices}>{outside.map(code => <Checkbox key={code} checked onChange={event => toggle(code, event.target.checked)}>{labelCode(code)}</Checkbox>)}</div></fieldset>}
  </fieldset>;
}
