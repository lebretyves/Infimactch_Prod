import { useId, useState } from 'react';
import { Button } from '@/ui/Button';

export function InlineConfirmation({ children, explanation, confirmLabel, disabled, onConfirm }: {
  children: React.ReactNode; explanation: string; confirmLabel: string;
  disabled?: boolean; onConfirm: () => Promise<boolean>;
}) {
  const [open, setOpen] = useState(false);
  const id = useId();
  return <div>
    <Button variant="outline" disabled={disabled} aria-expanded={open} aria-controls={id} onClick={() => setOpen(!open)}>{children}</Button>
    {open && <section id={id} aria-label="Validation de votre choix">
      <p>{explanation}</p>
      <Button disabled={disabled} onClick={async () => { if (await onConfirm()) setOpen(false); }}>{disabled ? 'Enregistrement…' : confirmLabel}</Button>
      <Button variant="ghost" disabled={disabled} onClick={() => setOpen(false)}>Revenir sans modifier</Button>
    </section>}
  </div>;
}
