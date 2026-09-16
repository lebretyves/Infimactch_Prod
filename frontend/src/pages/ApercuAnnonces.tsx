import { useEffect, useState } from "react";
import { Link } from "react-router";
import { Logo } from "@/ui/Logo";
import { usePageTitle } from "@/lib/usePageTitle";
import s from "./ApercuAnnonces.module.css";

type Status = "explicit" | "desired" | "uncertain" | "conflict";
type Item = { label: string; value: string; status: Status; evidence: string };
type Offer = { id: string; title: string; source: string; location: string; sourceUrl: string; summary: string; alerts: string[]; missing: string[]; groups: { title: string; items: Item[] }[] };
const statuses: Record<Status, string> = { explicit: "Indiqué dans l’annonce", desired: "Souhaité", uncertain: "À confirmer", conflict: "Contradiction" };
const local = ["localhost", "127.0.0.1", "[::1]", "::1"].includes(window.location.hostname);

export default function ApercuAnnonces() {
  usePageTitle("Aperçu des annonces classées", "Aperçu local de test : informations extraites des annonces et passages justificatifs.");
  const [offers, setOffers] = useState<Offer[] | null>(null);
  const [error, setError] = useState(false);
  const [selected, setSelected] = useState("");
  useEffect(() => {
    if (!local) return;
    let active = true;
    import("@/data/parserPreview.json").then(({ default: data }) => {
      if (active) { setOffers(data as Offer[]); setSelected(data[0]?.id ?? ""); }
    }).catch(() => { if (active) setError(true); });
    return () => { active = false; };
  }, []);
  const offer = offers?.find((entry) => entry.id === selected);
  const evidence = offer ? [...new Set(offer.groups.flatMap(group => group.items.map(item => item.evidence)).filter(Boolean))] : [];
  return <div className={s.page}>
    <header className={s.header}><Link to="/" aria-label="InfiMatch, accueil"><Logo size={34} withWordmark /></Link><Link className={s.back} to="/">Retour au site <span aria-hidden="true">↗</span></Link></header>
    <main className={s.main}>
      <div className={s.intro}><p className={s.eyebrow}>Laboratoire · lecture des annonces</p><h1>Les bonnes informations,<br /><span>à la bonne place.</span></h1><p>Une fiche plus facile à lire, avec le passage d’origine derrière chaque information.</p></div>
      <p className={s.banner}><strong>Aperçu de test</strong><span>Informations extraites à confirmer. Ces exemples ne modifient pas les offres ni le matching.</span></p>
      {!local ? <div className={s.state}><h2>Aperçu indisponible</h2><p>Cette page de test est accessible uniquement sur le site local.</p></div> : error ? <div className={s.state} role="alert"><h2>Impossible de charger les exemples</h2><p>Rechargez la page pour réessayer.</p><button onClick={() => window.location.reload()}>Recharger</button></div> : !offers ? <p className={s.state} role="status">Chargement des exemples…</p> : !offers.length ? <p className={s.state}>Aucune annonce de test disponible.</p> : <div className={s.layout}>
        <aside className={s.sidebar} aria-label="Choisir une annonce"><p className={s.eyebrow}>{offers.length} annonces à explorer</p><h2>Choisir un exemple</h2><div className={s.choices}>{offers.map((entry, index) => <button key={entry.id} className={s.choice} aria-pressed={entry.id === selected} onClick={() => setSelected(entry.id)}><span className={s.choiceMeta}>{String(index + 1).padStart(2, "0")} <span>{entry.source}</span></span><strong>{entry.title}</strong><span className={s.place}>{entry.location || "Lieu non précisé"}</span></button>)}</div><p className={s.asideNote}>Le texte fait foi.<br />Une information absente reste inconnue, jamais devinée.</p></aside>
        {offer && <article className={s.offer} key={offer.id} aria-label={offer.title}>
          <header className={s.offerHead}><p className={s.source}>{offer.source} <span>·</span> {offer.location || "Lieu non précisé"}</p><h2>{offer.title}</h2><p className={s.summary}>{offer.summary}</p>{/^https?:\/\//.test(offer.sourceUrl) && <a className={s.original} href={offer.sourceUrl} target="_blank" rel="noreferrer">Consulter l’annonce source <span aria-hidden="true">↗</span></a>}</header>
          {(offer.alerts.length > 0 || offer.missing.length > 0) && <section className={s.alerts} aria-labelledby="confirmation-title"><h3 id="confirmation-title">À confirmer avant de se positionner</h3>{offer.alerts.length > 0 && <ul>{offer.alerts.map((alert, i) => <li key={i}>{alert}</li>)}</ul>}{offer.missing.length > 0 && <p><strong>Non renseigné ou non extrait :</strong> {offer.missing.join(" · ")}</p>}</section>}
          {offer.groups.map((group, index) => <section className={s.group} key={group.title}><div className={s.groupTitle}><span aria-hidden="true">{String(index + 1).padStart(2, "0")}</span><h3>{group.title}</h3></div><dl className={s.fields}>{group.items.length ? group.items.map((item, i) => <div className={s.field} key={`${item.label}-${i}`}><dt>{item.label}</dt><dd><div className={s.valueLine}><strong>{item.value}</strong><span className={s.status} data-status={item.status}>{statuses[item.status]}</span></div>{item.evidence && <details className={s.evidence}><summary>Voir le passage source</summary><blockquote>{item.evidence}</blockquote></details>}</dd></div>) : <p>Aucune information extraite pour cette rubrique.</p>}</dl></section>)}
          <details className={s.reference}><summary>Texte de référence <span>{evidence.length} passages</span></summary><p>Extraits utilisés pour cette fiche. Ils ne constituent pas le texte intégral de l’annonce.</p>{evidence.map((text, i) => <blockquote key={i}>{text}</blockquote>)}</details>
          <footer className={s.footnote}>Les dates absentes restent inconnues. Une préférence n’est pas une obligation. L’affectation reste une décision humaine.</footer>
        </article>}
      </div>}
    </main>
  </div>;
}
