import { useId, useState } from 'react';
import { Button } from '@/ui/Button';
import s from './InlineConfirmation.module.css';

export function InlineConfirmation({ children, explanation, confirmLabel, disabled, onConfirm }: {
  children: React.ReactNode; explanation: string; confirmLabel: string;
  disabled?: boolean; onConfirm: () => Promise<boolean>;
}) {
  const [open, setOpen] = useState(false);
  const id = useId();
  return <div className={s.root}>
    <Button variant="outline" disabled={disabled} aria-expanded={open} aria-controls={id} onClick={() => setOpen(!open)}>{children}</Button>
    {open && <section className={s.panel} id={id} aria-label="Validation de votre choix">
      <p>{explanation}</p>
      <div className={s.actions}><Button disabled={disabled} onClick={async () => { if (await onConfirm()) setOpen(false); }}>{disabled ? 'Enregistrement…' : confirmLabel}</Button>
      <Button variant="ghost" disabled={disabled} onClick={() => setOpen(false)}>Revenir sans modifier</Button></div>
    </section>}
  </div>;
}
