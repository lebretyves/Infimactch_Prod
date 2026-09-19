import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { useParams } from 'react-router';
import { useAuth } from '@/context/AuthContext';
import { api, ApiError } from '@/services/api';
import { date } from '@/services/market';
import { labelCode } from '@/data/professional';
import { useRemote } from '@/lib/useRemote';
import { usePageTitle } from '@/lib/usePageTitle';
import { contractChanged, contractErrors, contractFields, contractPayload, type ContractNotes, type ContractPreparation as Preparation } from '@/lib/contractPreparation';
import { Button, ButtonLink } from '@/ui/Button';
import { TextArea, TextField } from '@/ui/Field';
import { Icon } from '@/ui/Icon';
import s from './ContractPreparation.module.css';

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return <div className={s.fact}><dt>{label}</dt><dd>{children || 'Non renseigné'}</dd></div>;
}
function Draft({ initial, reload }: { initial: Preparation; reload: () => void }) {
  const [model, setModel] = useState(initial);
  const [notes, setNotes] = useState<ContractNotes>({ ...initial.preparation.notes });
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [conflict, setConflict] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof ContractNotes, string>>>({});
  const form = useRef<HTMLFormElement>(null), errorBox = useRef<HTMLDivElement>(null);
  const dirty = contractChanged(notes, model.preparation.notes);
  const editable = model.canEdit && model.assignment.status === 'ACTIVE';
  const fullName = [model.worker.firstName, model.worker.lastName].filter(Boolean).join(' ') || model.worker.displayName;
  const salary = model.mission.hourlySalary === null || model.mission.hourlySalary === '' ? NaN : Number(model.mission.hourlySalary);
  useEffect(() => {
    if (!dirty || !editable) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty, editable]);
  async function save(event: FormEvent) {
    event.preventDefault();
    if (!editable || busy || conflict) return;
    const next = contractErrors(notes); setErrors(next); setError('');
    if (Object.keys(next).length) { requestAnimationFrame(() => form.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus()); return; }
    setBusy(true);
    try {
      const saved = await api<Preparation>('/assignments/' + model.assignment.id + '/contract-preparation', { method: 'PUT', body: contractPayload(model.preparation.version, notes) });
      setModel(saved); setNotes({ ...saved.preparation.notes });
    } catch (failure) {
      const stale = failure instanceof ApiError && failure.status === 409;
      setConflict(stale);
      setError(stale ? 'La préparation ou l’affectation a changé. Votre saisie est conservée ici. Rechargez la version enregistrée avant de poursuivre.' : failure instanceof Error ? failure.message : 'Enregistrement impossible. Votre saisie est conservée.');
      requestAnimationFrame(() => errorBox.current?.focus());
    } finally { setBusy(false); }
  }
  function change(key: keyof ContractNotes, value: string) { setNotes(previous => ({ ...previous, [key]: value })); setErrors(previous => ({ ...previous, [key]: undefined })); }
  return <>
    <div className={s.notice}><Icon name="file-text" size={22} /><p>{model.notice || 'Ce brouillon prépare les informations du contrat. Il ne constitue ni un contrat de travail ni une signature.'}</p></div>
    <div className={s.columns}>
      <aside className={s.recap} aria-labelledby="contract-recap">
        <p className={s.eyebrow}>Affectation {model.assignment.status === 'CANCELLED' ? 'annulée' : model.assignment.status === 'COMPLETED' ? 'terminée' : 'confirmée'}</p>
        <h2 id="contract-recap">Les repères de la mission</h2>
        <p className={s.missionTitle}>{model.mission.title}</p>
        <dl>
          <Fact label="Professionnel">{fullName}</Fact>
          <Fact label="Poste et service">{[model.mission.qualification, model.mission.service && labelCode(model.mission.service)].filter(Boolean).join(' · ')}</Fact>
          <Fact label="Début">{date(model.mission.startAt, model.mission.timeZone)}</Fact>
          <Fact label="Fin">{date(model.mission.endAt, model.mission.timeZone)}</Fact>
          <Fact label="Lieu d’exercice">{model.mission.address || model.establishment.address}</Fact>
          <Fact label="Taux horaire de la mission">{Number.isFinite(salary) ? new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(salary) + ' brut / heure' : 'Non renseigné'}</Fact>
        </dl>
        <section className={s.organization}><h3>Employeur</h3><p><strong>{model.employer.name}</strong></p><p>{model.employer.address || 'Adresse non renseignée'}</p><dl><Fact label="SIRET">{model.employer.siret}</Fact><Fact label="Contact indiqué">{model.employer.contact}</Fact></dl></section>
        <section className={s.organization}><h3>Établissement d’accueil</h3><p><strong>{model.establishment.name}</strong></p><dl><Fact label="FINESS">{model.establishment.finess}</Fact></dl></section>
        <p className={s.reference}>Référence d’affectation<br />{model.assignment.id}</p>
      </aside>
      <div className={s.draft}>
        <section className={s.missing} aria-labelledby="contract-missing">
          <h2 id="contract-missing">{model.missingInformation.length ? 'Informations à compléter' : 'Les informations disponibles sont réunies'}</h2>
          {model.missingInformation.length ? <><p>Vous pouvez enregistrer un brouillon et compléter ces points ensuite.</p><ul>{model.missingInformation.map((item, index) => <li key={index}>{item}</li>)}</ul></> : <p>Relisez ces éléments avec l’employeur avant d’établir le contrat.</p>}
        </section>
        <form ref={form} className={s.form} onSubmit={save} noValidate>
          <header className={s.formHeader}><div><p className={s.eyebrow}>Préparation</p><h2>Le brouillon du contrat</h2></div><span className={s.version}>{model.preparation.version ? 'Version ' + model.preparation.version : 'Non enregistré'}</span></header>
          {!editable && <p className={s.readOnly}>{model.assignment.status === 'CANCELLED' ? 'Cette affectation est annulée. Sa préparation reste consultable, sans modification.' : model.assignment.status === 'COMPLETED' ? 'Cette mission est terminée. Sa préparation reste consultable, sans modification.' : 'Consultation uniquement. L’employeur peut compléter et enregistrer cette préparation.'}</p>}
          <p className={s.help}>{editable ? 'Tous les champs sont facultatifs pour enregistrer ce brouillon. Les informations de la mission restent celles de l’affectation.' : 'Les informations ci-dessous correspondent à la dernière version enregistrée.'}</p>
          {contractFields.map(field => <div key={field.key}>
            {field.key === 'contactName' ? <TextField label={field.label} value={notes[field.key]} onChange={e => change(field.key,e.target.value)} maxLength={field.limit} error={errors[field.key]} hint={field.hint} readOnly={!editable} disabled={busy} optional /> : <TextArea label={field.label} value={notes[field.key]} onChange={e => change(field.key,e.target.value)} rows={field.key === 'additionalNotes' ? 4 : 3} maxLength={field.limit} error={errors[field.key]} hint={field.hint} readOnly={!editable} disabled={busy} optional />}
          </div>)}
          {error && <div ref={errorBox} className={s.error} tabIndex={-1} role="alert"><p>{error}</p>{conflict && <><p>Recharger remplacera votre saisie actuelle par les informations enregistrées.</p><Button type="button" variant="outline" onClick={reload}>Recharger la version enregistrée</Button></>}</div>}
          <footer className={s.saveBar}>
            <p role="status" aria-live="polite">{busy ? 'Enregistrement en cours…' : dirty ? 'Modifications non enregistrées' : model.preparation.updatedAt ? 'Brouillon enregistré le ' + date(model.preparation.updatedAt) : 'Aucun brouillon enregistré'}</p>
            {editable && <Button type="submit" loading={busy} disabled={conflict || (!dirty && model.preparation.version > 0)}>Enregistrer le brouillon</Button>}
          </footer>
          <p className={s.help}>Enregistrer ne signe pas le contrat et n’envoie aucun email.</p>
        </form>
      </div>
    </div>
  </>;
}
export default function ContractPreparation() {
  const { id = '' } = useParams(); const { user } = useAuth();
  usePageTitle('Préparation du contrat');
  const result = useRemote(signal => api<Preparation>('/assignments/' + id + '/contract-preparation', { signal }), 'contract:' + id);
  return <div className={s.page}>
    <header className={s.header}><ButtonLink variant="ghost" to={result.data ? (user?.role === 'interimaire' ? '/missions/m_' : '/gestion/missions/') + result.data.mission.id : '/missions'}><Icon name="arrow-left" size={18} /> Retour à la mission</ButtonLink><p className={s.eyebrow}>Mission · Documents</p><h1>Préparation du contrat</h1><p>Les informations de l’affectation, réunies pour préparer la suite.</p></header>
    {result.loading ? <div className={s.state} role="status">Chargement de la préparation…</div> : result.error ? <div className={s.state} role="alert"><h2>Préparation indisponible</h2><p>{result.error}</p><Button onClick={result.reload}>Réessayer</Button></div> : result.data && <Draft key={id + ':' + result.data.preparation.version} initial={result.data} reload={result.reload} />}
  </div>;
}
