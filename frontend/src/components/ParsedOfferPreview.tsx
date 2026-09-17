import {previewContextOnly} from '@/lib/parsedOfferSource';
﻿import { useEffect, useState } from "react";
import s from "./ParsedOfferPreview.module.css";

type Status = "explicit" | "desired" | "uncertain" | "conflict";
export type ParsedOffer = {
  id: string; descriptionHash: string; alerts: string[]; missing: string[];
  groups: { title: string; items: { label: string; value: string; status: Status; evidence: string }[] }[];
};
const statuses: Record<Status, string> = { explicit: "Indiqué dans l’annonce", desired: "Souhaité", uncertain: "À confirmer", conflict: "Contradiction" };

export function useParsedOfferPreview(id: string, description: string | null | undefined) {
  const [verified, setVerified] = useState<{ id: string; description: string; offer: ParsedOffer } | null>(null);
  useEffect(() => {
    if (!id.startsWith("e_") || !description || !["localhost", "127.0.0.1", "[::1]", "::1"].includes(window.location.hostname)) return;
    let active = true;
    async function verify() {
      const { default: data } = await import("@/data/parserPreview.json");
      const offer = (data as unknown as ParsedOffer[]).find(entry => entry.id === id.slice(2));
      if (!offer?.descriptionHash) return;
      const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(description!));
      const hash = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, "0")).join("");
      if (active && hash === offer.descriptionHash) setVerified({ id, description: description!, offer });
    }
    void verify().catch(() => { /* The standard mission remains available if the preview cannot be verified. */ });
    return () => { active = false; };
  }, [id, description]);
  return verified?.id === id && verified.description === description ? verified.offer : null;
}

export function parsedSidebar(offer: ParsedOffer | null) {
  const items = offer?.groups.flatMap(group => group.items) ?? [];
  const schedules = items.filter(item => item.status === "explicit" && ["Organisation", "Postes", "Durée des postes", "Horaires", "Jours annoncés"].includes(item.label));
  const pay = items.find(item => ["Salaire", "Montant annoncé"].includes(item.label));
  return { schedules, pay };
}

export function ParsedOfferPreview({ offer }: { offer: ParsedOffer }) {
  const seen=new Set<string>();
  const groups=offer.groups.map(group=>({...group,items:group.items.filter(item=>{const key=item.evidence?.trim().replace(/\s+/g,' ').toLocaleLowerCase('fr-FR');if(!key||previewContextOnly(item)||seen.has(key))return false;seen.add(key);return true;})})).filter(group=>group.items.length);
  return <section className={s.panel} aria-label="Informations extraites de l’annonce">
    <header className={s.heading}><p>Aperçu de test — extraits relus</p><h2>L’essentiel de l’annonce</h2><span>Les informations du texte, classées pour préparer votre candidature.</span></header>
    {(offer.alerts.length > 0 || offer.missing.length > 0) && <div className={s.alert}><h3>À confirmer</h3>{offer.alerts.length > 0 && <ul>{offer.alerts.map((text, i) => <li key={i}>{text}</li>)}</ul>}{offer.missing.length > 0 && <p><strong>Non renseigné ou non extrait :</strong> {offer.missing.join(" · ")}</p>}</div>}
    {groups.map(group => <section className={s.group} key={group.title}><h3>{group.title}</h3><dl>{group.items.map((item, i) => <div className={s.field} key={`${item.label}-${i}`}><dt>{item.label}</dt><dd><strong style={{whiteSpace:"pre-wrap",overflowWrap:"anywhere"}}>{item.evidence}</strong><span className={s.status} data-status={item.status}>{statuses[item.status]}</span></dd></div>)}</dl></section>)}
    <p className={s.note}>Une préférence n’est pas une obligation. Les informations absentes restent inconnues ; l’affectation reste humaine.</p>
  </section>;
}
