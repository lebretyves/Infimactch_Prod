import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRemote } from "@/lib/useRemote";
import { enterpriseMissions, date, statusLabels } from "@/services/market";
import { Button, ButtonLink } from "@/ui/Button";
import page from "./Candidater.module.css";
import s from "./inscription/Etape.module.css";
export default function EntrepriseMissions() {
  const { user } = useAuth();
  const [offset, setOffset] = useState(0);
  const r = useRemote(
    (signal) => enterpriseMissions(offset, signal),
    user?.id + ":" + offset,
  );
  return (
    <div className={page.page}>
      <h1>Missions de mon organisation</h1>
      {user?.role === "entreprise" && (
        <ButtonLink to="/gestion/missions/nouvelle">
          Créer une mission
        </ButtonLink>
      )}
      <ButtonLink to="/besoins" variant="outline">
        Besoins de personnel
      </ButtonLink>
      <ButtonLink to="/organisation" variant="outline">
        Mon organisation
      </ButtonLink>
      {r.loading ? (
        <p role="status">Chargement…</p>
      ) : r.error ? (
        <div role="alert">
          {r.error}
          <Button onClick={r.reload}>Réessayer</Button>
        </div>
      ) : (
        <div className={s.champs}>
          {r.data?.map((m) => (
            <article key={m.id} className={s.bloc}>
              <h2>{m.title}</h2>
              <p>
                {statusLabels[m.status || ""] || "État à vérifier"} ·{" "}
                {m.qualification}
              </p>
              <p>
                {date(m.start_at)} → {date(m.end_at)}
              </p>
              <ButtonLink to={"/gestion/missions/" + m.id}>
                Consulter la mission et les candidatures
              </ButtonLink>
            </article>
          ))}
          {!r.data?.length && <p>Aucune mission sur cette page.</p>}
          <div>
            <Button
              disabled={!offset}
              onClick={() => setOffset((v) => Math.max(0, v - 20))}
            >
              Précédent
            </Button>
            <Button
              disabled={(r.data?.length || 0) < 20}
              onClick={() => setOffset((v) => v + 20)}
            >
              Suivant
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
