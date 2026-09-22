import { Button } from '@/ui/Button';
import u from './NurseUI.module.css';
export type OfferOrigin = 'toutes' | 'partenaires' | 'externes';
export const readOfferOrigin = (value: string | null): OfferOrigin => value === 'partenaires' || value === 'externes' ? value : 'toutes';
export function OfferOriginChoices({ value, onChange, partnersFirst = false, showExternes = true }: { value: OfferOrigin; onChange: (value: OfferOrigin) => void; partnersFirst?: boolean; showExternes?: boolean }) {
  const choices = (partnersFirst
    ? ([['partenaires', 'Partenaires'], ['externes', 'Externes'], ['toutes', 'Toutes']] as const)
    : ([['toutes', 'Toutes'], ['partenaires', 'Partenaires'], ['externes', 'Externes']] as const)
  ).filter(([key]) => showExternes || key !== 'externes');
  return <div className={u.actions} role="group" aria-label="Origine des offres">{choices.map(([key, label]) => <Button key={key} type="button" size="sm" variant={value === key ? 'primary' : 'outline'} aria-pressed={value === key} onClick={() => onChange(key)}>{label}</Button>)}</div>;
}
