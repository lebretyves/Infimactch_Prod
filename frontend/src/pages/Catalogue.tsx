import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router';
import { Button } from '@/ui/Button';
import { Icon } from '@/ui/Icon';
import { Logo } from '@/ui/Logo';
import { usePageTitle } from '@/lib/usePageTitle';
import s from './Catalogue.module.css';

type Group = 'public' | 'candidat' | 'etablissement' | 'agence' | 'systeme';
type Entry = { id: string; title: string; group: Group; route: string; description: string; features: string[]; desktop: string; mobile: string; livePath?: string; note?: string };
type Manifest = { generatedAt: string; entries: Entry[] };
const groups: { value: Group | 'tous'; label: string }[] = [
  { value: 'tous', label: 'Tous les espaces' }, { value: 'public', label: 'Public' },
  { value: 'candidat', label: 'Candidat' }, { value: 'etablissement', label: 'Établissement' },
  { value: 'agence', label: 'Agence' }, { value: 'systeme', label: 'Système' },
];
const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const groupLabel = (group: Group) => groups.find(item => item.value === group)?.label || group;
const localPath = (path?: string) => !!path && path.startsWith('/') && !path.startsWith('//') && !path.includes('\\');

export default function Catalogue() {
  usePageTitle('Catalogue du frontend', 'Toutes les pages InfiMatch, à parcourir en version bureau et mobile.');
  const [manifest, setManifest] = useState<Manifest | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [group, setGroup] = useState<Group | 'tous'>('tous');
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [device, setDevice] = useState<'desktop' | 'mobile'>('desktop');
  const [imageError, setImageError] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const imageScroll = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement | null>(null);
  const closeButton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError('');
    fetch('/catalogue/manifest.json', { signal: controller.signal, cache: 'no-cache' })
      .then(async response => {
        if (!response.ok) throw new Error('Le catalogue ne peut pas être chargé pour le moment.');
        const value: Manifest = await response.json();
        if (!value || !Array.isArray(value.entries) || !value.entries.every(entry => typeof entry.id === 'string' && typeof entry.title === 'string' && typeof entry.description === 'string' && typeof entry.route === 'string' && Array.isArray(entry.features) && localPath(entry.desktop) && localPath(entry.mobile))) throw new Error('Le catalogue reçu est incomplet.');
        setManifest(value);
      })
      .catch(reason => { if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : 'Le catalogue est indisponible.'); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [attempt]);

  const entries = manifest?.entries || [];
  const filtered = useMemo(() => entries.filter(entry => (group === 'tous' || entry.group === group) && normalize([entry.title, entry.route, entry.description, ...entry.features].join(' ')).includes(normalize(query.trim()))), [entries, group, query]);
  const selectedIndex = filtered.findIndex(entry => entry.id === selectedId);
  const selected = filtered[selectedIndex];

  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    if (selectedId && !element.open) { element.showModal(); closeButton.current?.focus(); }
    if (!selectedId && element.open) element.close();
  }, [selectedId]);

  useEffect(() => {
    setImageError(false);
    imageScroll.current?.scrollTo({ top: 0, left: 0 });
  }, [selectedId, device]);

  useEffect(() => {
    if (!selectedId) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previous; };
  }, [selectedId]);

  function close() {
    setSelectedId(null);
    trigger.current?.focus();
  }
  function open(entry: Entry, button: HTMLButtonElement) {
    trigger.current = button; setDevice('desktop'); setSelectedId(entry.id);
  }
  const date = manifest?.generatedAt ? new Date(manifest.generatedAt) : null;

  return (
    <div className={s.page}>
      <a className="skipLink" href="#catalogue-contenu">Aller aux pages du catalogue</a>
      <header className={s.header}>
        <Link to="/" aria-label="InfiMatch, accueil" className={s.brand}><Logo size={32} withWordmark /></Link>
        <span className={s.headerLabel}>Le tour de l’application</span>
        <Link to="/accueil" className={s.backLink}>Mon espace <span aria-hidden="true">↗</span></Link>
      </header>
      <main id="catalogue-contenu" className={s.main}>
        <section className={s.intro} aria-labelledby="catalogue-titre">
          <div>
            <p className={s.eyebrow}>InfiMatch / Les écrans</p>
            <h1 id="catalogue-titre">Catalogue du<br className={s.titleBreak} /> frontend<span className={s.dot}>.</span></h1>
            <p className={s.lead}>Parcourez les pages, leurs fonctions et leurs différentes versions. Un aperçu de chaque espace, au même endroit.</p>
          </div>
          <div className={s.summary}>
            <strong>{loading ? '—' : entries.length.toString().padStart(2, '0')}</strong>
            <span>vues à explorer</span>
            <p><span className={s.statusDot} aria-hidden="true" /> Aperçus avec données fictives</p>
          </div>
        </section>

        <section className={s.explorer} aria-label="Explorer les pages">
          <div className={s.toolbar}>
            <div className={s.filters} role="group" aria-label="Filtrer par espace">
              {groups.map(item => <button type="button" key={item.value} aria-pressed={group === item.value} className={group === item.value ? s.filterActive : s.filter} onClick={() => setGroup(item.value)}>{item.label}<span>{item.value === 'tous' ? entries.length : entries.filter(entry => entry.group === item.value).length}</span></button>)}
            </div>
            <label className={s.search}>
              <Icon name="search" size={19} />
              <span className="srOnly">Rechercher une page ou une fonction</span>
              <input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Une page, une fonction…" />
            </label>
          </div>
          <div className={s.results} aria-live="polite"><span>{loading ? 'Chargement du catalogue…' : `${filtered.length} ${filtered.length > 1 ? 'vues' : 'vue'}${group !== 'tous' || query ? ` sur ${entries.length}` : ''}`}</span><span>Versions bureau & mobile</span></div>

          {loading ? <div className={s.loading} role="status"><div className={s.loader} /><p>Préparation des aperçus…</p></div> : error ? <div className={s.empty} role="alert"><h2>Les aperçus sont indisponibles</h2><p>{error}</p><Button onClick={() => setAttempt(value => value + 1)}>Réessayer</Button></div> : !filtered.length ? <div className={s.empty}><Icon name="search" size={32} /><h2>Aucune page trouvée</h2><p>Essayez un autre mot ou explorez tous les espaces.</p><Button variant="secondary" onClick={() => { setGroup('tous'); setQuery(''); }}>Afficher toutes les pages</Button></div> :
            <ol className={s.grid}>
              {filtered.map(entry => <li key={entry.id} className={s.card}>
                <button type="button" className={s.preview} onClick={event => open(entry, event.currentTarget)} aria-label={`Consulter ${entry.title} — ${groupLabel(entry.group)}`}>
                  <img src={entry.desktop} alt={`Aperçu de la page ${entry.title}`} loading="lazy" decoding="async" />
                  <span className={s.previewAction}><Icon name="eye" size={18} /> Consulter la page</span>
                </button>
                <div className={s.cardInfo}>
                  <div className={s.cardMeta}><span className={s.number}>{(entries.indexOf(entry) + 1).toString().padStart(2, '0')}</span><span className={s.badge} data-group={entry.group}>{groupLabel(entry.group)}</span></div>
                  <h2>{entry.title}</h2><p>{entry.description}</p>
                  <div className={s.cardBottom}><code>{entry.route}</code><button type="button" onClick={event => open(entry, event.currentTarget)} aria-label={`Voir ${entry.title}`}><span aria-hidden="true">↗</span></button></div>
                </div>
              </li>)}
            </ol>}
        </section>
        <footer className={s.footer}><span>InfiMatch · Catalogue des pages</span>{date && !Number.isNaN(date.getTime()) && <span>Aperçus du {date.toLocaleDateString('fr-FR')}</span>}</footer>
      </main>

      <dialog ref={dialog} className={s.dialog} aria-labelledby="apercu-titre" aria-describedby="apercu-description" onCancel={event => { event.preventDefault(); close(); }} onClose={() => { if (selectedId) close(); }} onClick={event => { if (event.target === event.currentTarget) close(); }}>
        {selected && <div className={s.viewer}>
          <header className={s.viewerHeader}>
            <div className={s.viewerTitle}><span className={s.eyebrow}>{groupLabel(selected.group)} · {selectedIndex + 1} / {filtered.length}</span><h2 id="apercu-titre">{selected.title}</h2></div>
            <button ref={closeButton} type="button" className={s.close} aria-label="Fermer l’aperçu" onClick={close}><Icon name="close" size={23} /></button>
          </header>
          <div className={s.viewerToolbar}>
            <div className={s.devices} role="group" aria-label="Format de l’aperçu"><button type="button" aria-pressed={device === 'desktop'} onClick={() => setDevice('desktop')}>Bureau</button><button type="button" aria-pressed={device === 'mobile'} onClick={() => setDevice('mobile')}>Mobile</button></div>
            <div className={s.pagination}><button type="button" aria-label="Page précédente" disabled={selectedIndex <= 0} onClick={() => setSelectedId(filtered[selectedIndex - 1].id)}>← <span>Précédente</span></button><button type="button" aria-label="Page suivante" disabled={selectedIndex === filtered.length - 1} onClick={() => setSelectedId(filtered[selectedIndex + 1].id)}><span>Suivante</span> →</button></div>
          </div>
          <div className={s.viewerBody}>
            <div ref={imageScroll} className={s.imageScroll} tabIndex={0} role="region" aria-label="Capture complète, défilement vertical">
              {imageError ? <div className={s.empty} role="alert"><h3>Capture indisponible</h3><p>L’aperçu de cette page n’a pas pu être chargé.</p><Button variant="secondary" onClick={() => setImageError(false)}>Réessayer</Button></div> : <img key={`${selected.id}-${device}`} className={device === 'mobile' ? s.mobileCapture : s.desktopCapture} src={selected[device]} alt={`Capture complète de ${selected.title}, version ${device === 'mobile' ? 'mobile' : 'bureau'}`} onError={() => setImageError(true)} />}
            </div>
            <aside className={s.details}>
              <p className={s.eyebrow}>À découvrir</p><p id="apercu-description">{selected.description}</p>
              <code className={s.route}>{selected.route}</code>
              {selected.features.length > 0 && <><h3>Fonctions de la page</h3><ul>{selected.features.map((feature, index) => <li key={`${index}-${feature}`}>{feature}</li>)}</ul></>}
              {selected.note && <p className={s.note}>{selected.note}</p>}
              {localPath(selected.livePath) && <div className={s.live}><a href={import.meta.env.VITE_ROUTER === 'hash' ? `/#${selected.livePath}` : selected.livePath} target="_blank" rel="noopener noreferrer">Ouvrir la page <span aria-hidden="true">↗</span><span className="srOnly"> (nouvel onglet)</span></a><p>La connexion et le rôle correspondant peuvent être requis.</p></div>}
              <p className={s.caption}>Aperçu consultable sans connexion. Les données présentées sont fictives.</p>
            </aside>
          </div>
        </div>}
      </dialog>
    </div>
  );
}
