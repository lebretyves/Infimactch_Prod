import { useEffect, useId, useRef, useState } from 'react';
import { api } from '@/services/api';
import { TextField } from '@/ui/Field';
import { validCoordinates, type SearchLocation } from './SearchPlace';
import s from './MobilityLocation.module.css';

export function MobilityLocation({ value, selected, onChange }: {
  value: string;
  selected: boolean;
  onChange: (value: string, location: SearchLocation | null) => void;
}) {
  const id = useId();
  const [items, setItems] = useState<SearchLocation[]>([]);
  const [status, setStatus] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const request = useRef<AbortController | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    request.current = controller;
    setItems([]); setActive(-1); setStatus('');
    const query = value.trim();
    if (selected || query.length < 3 || (/^\d+$/.test(query) && query.length !== 5)) return () => controller.abort();
    const timer = setTimeout(async () => {
      setStatus('Recherche des communes…');
      try {
        const result = await api<{ items: SearchLocation[] }>('/listings/locations/communes?q=' + encodeURIComponent(query), { signal: controller.signal });
        if (controller.signal.aborted) return;
        const places = result.items.filter(item => typeof item.label === 'string' && !!validCoordinates(item.latitude, item.longitude));
        setItems(places);
        setStatus(places.length ? `${places.length} commune${places.length > 1 ? 's' : ''} proposée${places.length > 1 ? 's' : ''}. Choisissez votre commune.` : 'Aucune commune trouvée. Vérifiez la ville ou le code postal.');
      } catch {
        if (!controller.signal.aborted) setStatus('La recherche est indisponible. Réessayez en modifiant votre saisie.');
      }
    }, 350);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [value, selected]);
  function choose(place: SearchLocation) {
    request.current?.abort(); setOpen(false); setItems([]); setActive(-1);
    onChange(place.label, place);
  }
  const expanded = open && items.length > 0;
  return <div className={s.root}>
    <TextField label="Ville de référence" placeholder="Ex. Nantes ou 44000" maxLength={150}
      hint="Saisissez au moins 3 lettres ou un code postal complet, puis choisissez une commune. Son centre sert de point de départ au rayon."
      value={value} autoComplete="off" role="combobox" aria-autocomplete="list" aria-expanded={expanded}
      aria-controls={expanded ? id : undefined} aria-activedescendant={expanded && active >= 0 ? `${id}-${active}` : undefined}
      onFocus={() => setOpen(true)} onBlur={() => setOpen(false)}
      onChange={e => { request.current?.abort(); setItems([]); setActive(-1); setOpen(true); onChange(e.target.value, null); }}
      onKeyDown={e => {
        if (e.key === 'Escape') { setOpen(false); setActive(-1); return; }
        if ((e.key === 'ArrowDown' || e.key === 'ArrowUp') && items.length) {
          e.preventDefault(); setOpen(true);
          setActive(index => e.key === 'ArrowDown' ? (index + 1) % items.length : (index <= 0 ? items.length - 1 : index - 1));
        }
        if (e.key === 'Enter' && expanded) { e.preventDefault(); if (active >= 0) choose(items[active]); }
      }} />
    {expanded && <ul id={id} role="listbox" aria-label="Communes proposées" className={s.options}>
      {items.map((item, index) => <li id={`${id}-${index}`} role="option" aria-selected={active === index} key={`${item.label}-${index}`}
        className={active === index ? s.active : undefined} onMouseDown={e => e.preventDefault()}
        onClick={() => choose(item)}>{item.label}</li>)}
    </ul>}
    <p role="status" className={s.status}>{selected && value ? 'Commune sélectionnée. Enregistrez votre zone de recherche pour la conserver.' : status}</p>
  </div>;
}
