import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router";
import { useAuth } from "@/context/AuthContext";
import { useRemote } from "@/lib/useRemote";
import { detail, apply, date, salary } from "@/services/market";
import { labelCode } from "@/data/professional";
import { Button, ButtonLink } from "@/ui/Button";
import s from "./Candidater.module.css";
import { Icon } from "@/ui/Icon";
export default function Candidater() {
  const { id = "" } = useParams();
  const { user } = useAuth();
  const r = useRemote((signal) => detail(id, signal), id);
  const key = useRef(crypto.randomUUID());
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [consent, setConsent] = useState(false);
  useEffect(() => {
    key.current = crypto.randomUUID();
    setConsent(false);
    setSent(false);
    setError("");
  }, [id, r.data?.version]);
  async function send() {
    if (!r.data || busy || !consent) return;
    setBusy(true);
    setError("");
    try {
      await apply(r.data, key.current);
      setSent(true);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  if (r.loading) return <p role="status">Chargement...</p>;
  if (r.error || !r.data)
    return (
      <div className={s.page} role="alert">
        <h1>Mission indisponible</h1>
        <p>{r.error || "Mission introuvable."}</p>
        <Button onClick={r.reload}>Réessayer</Button>
        <ButtonLink to="/missions">Retour aux missions</ButtonLink>
      </div>
    );
  if (sent)
    return (
      <div className={s.success}>
        <Icon name="file-text" size={36} />
        <h1>Candidature enregistrée</h1>
        <p>
          Votre candidature a bien été enregistrée. Vous pouvez suivre son
          évolution dans votre espace.
        </p>
        <ButtonLink to="/candidatures">Suivre ma candidature</ButtonLink>
      </div>
    );
  const m = r.data;
  if (
    id.startsWith("e_") ||
    user?.role !== "interimaire" ||
    m.status !== "OPEN"
  )
    return (
      <div className={s.page}>
        <p>La candidature directe n’est pas disponible.</p>
        <ButtonLink to={"/missions/" + id}>Voir l’annonce</ButtonLink>
      </div>
    );
  return (
    <div className={s.page}>
      <h1 className={s.titre}>Postuler à cette mission</h1>
      <section className={s.rappel}>
        <h2>{m.title}</h2>
        <p>
          {date(m.start_at)} → {date(m.end_at)}
        </p>
        <p>{salary(m)}</p>
        <p>{m.address}</p>
      </section>
      <section className={s.bloc}>
        <h2>Conditions de la mission</h2>
        <p style={{ whiteSpace: "pre-wrap" }}>{m.description}</p>
        <p>
          Qualification : {m.qualification} · Service :{" "}
          {m.service ? labelCode(m.service) : "Non précisé"}
        </p>
        <p>
          Compétences requises :{" "}
          {(m.required_skills || []).map(labelCode).join(", ") ||
            "Aucune compétence supplémentaire indiquée"}
        </p>
        <p>Expérience minimale : {m.min_experience_months ?? 0} mois</p>
      </section>
      <section className={s.bloc}>
        <h2>Profil utilisé</h2>
        <p>
          {user.prenom} {user.nom}
        </p>
        <p>{user.qualification || "Qualification à renseigner"}</p>
        <p>
          Votre profil et vos disponibilités seront vérifiés avant l’envoi.
          L’agence confirme ensuite l’affectation.
        </p>
        <ButtonLink to="/profil" variant="ghost">
          Vérifier mon profil
        </ButtonLink>
        <ButtonLink to="/dossier" variant="ghost">
          Mon dossier professionnel
        </ButtonLink>
      </section>
      <label>
        <input
          type="checkbox"
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
        />{" "}
        J’ai consulté les conditions actuelles de la mission et confirme ma
        candidature.
      </label>
      {error && <p role="alert">{error}</p>}
      <div className={s.actions}>
        <ButtonLink to={"/missions/" + id} variant="ghost">
          Retour
        </ButtonLink>
        <Button disabled={!consent || busy} loading={busy} onClick={send}>
          Confirmer ma candidature
        </Button>
      </div>
    </div>
  );
}
