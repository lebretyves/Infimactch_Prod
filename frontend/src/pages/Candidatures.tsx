import EntrepriseCandidatures from "./EntrepriseCandidatures";
import { useRef, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { useRemote } from "@/lib/useRemote";
import {
  allApplications,
  withdraw,
  date,
  statusLabels,
  type Application,
} from "@/services/market";
import { useAuth } from "@/context/AuthContext";
import { Button, ButtonLink } from "@/ui/Button";
import { ConfirmationButton } from "@/components/ConfirmationButton";
import { Icon } from "@/ui/Icon";
import s from "./MarketPages.module.css";
function group(a: Application) {
  return a.assignment_status === "ACTIVE"
    ? "confirmees"
    : ["SUBMITTED", "SELECTED"].includes(a.status) && !a.assignment_id
      ? "en-cours"
      : "historique";
}
export default function Candidatures() {
  const { user } = useAuth();
  return user?.role === "interimaire" ? <NurseCandidatures /> : <EntrepriseCandidatures />;
}
function NurseCandidatures() {
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const tab = ["confirmees", "historique"].includes(params.get("vue") || "")
    ? params.get("vue")!
    : "en-cours";
  const [busy, setBusy] = useState(""),
    [error, setError] = useState(""),
    [confirm, setConfirm] = useState("");
  const keys = useRef(new Map<string, string>());
  const r = useRemote(allApplications, "applications:" + user?.id);
  async function remove(id: string) {
    if (busy) return;
    if (!keys.current.has(id)) keys.current.set(id, crypto.randomUUID());
    setBusy(id);
    setError("");
    try {
      await withdraw(id, keys.current.get(id)!);
      setConfirm("");
      r.reload();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy("");
    }
  }
  if (user?.role !== "interimaire")
    return (
      <p>
        Le suivi des candidatures personnelles est réservé aux intérimaires.
      </p>
    );
  const items = (r.data || []).filter((a) => group(a) === tab);
  return (
    <div className={s.page}>
      <header className={s.header}>
        <div>
          <h1>Mes candidatures</h1>
          <p className={s.subtitle}>
            Suivez vos réponses et vos prochaines missions.
          </p>
        </div>
        <ButtonLink to="/missions" variant="outline">
          <Icon name="search" size={17} />
          Rechercher une mission
        </ButtonLink>
      </header>
      <div className={s.tabs} role="tablist" aria-label="État des candidatures">
        {[
          ["en-cours", "En cours"],
          ["confirmees", "Confirmées"],
          ["historique", "Historique"],
        ].map(([v, l]) => (
          <button
            key={v}
            role="tab"
            aria-selected={tab === v}
            onClick={() => {
              setConfirm("");
              setParams(v === "en-cours" ? {} : { vue: v });
            }}
          >
            {l}
            {r.data
              ? " (" + r.data.filter((a) => group(a) === v).length + ")"
              : ""}
          </button>
        ))}
      </div>
      {error && (
        <p className={s.error} role="alert">
          {error}
        </p>
      )}
      {r.loading ? (
        <div className={s.empty} role="status">
          Chargement des candidatures…
        </div>
      ) : r.error ? (
        <div className={s.empty} role="alert">
          <p>{r.error}</p>
          <Button onClick={r.reload}>Réessayer</Button>
        </div>
      ) : items.length ? (
        <section className={s.card} aria-label="Liste des candidatures">
          <ul className={s.list}>
            {items.map((a) => (
              <li key={a.id} className={s.listItem}>
                <div>
                  <h2>
                    <Link to={"/missions/m_" + a.mission_id}>{a.title}</Link>
                  </h2>
                  <p>
                    {a.created_at
                      ? "Envoyée le " + date(a.created_at)
                      : "Dernière mise à jour : " + date(a.updated_at)}
                  </p>
                  <span
                    className={s.badge}
                    data-tone={
                      a.status === "SELECTED"
                        ? "warning"
                        : ["WITHDRAWN", "REJECTED"].includes(a.status)
                          ? "muted"
                          : undefined
                    }
                  >
                    {a.assignment_status === "ACTIVE"
                      ? "Mission confirmée"
                      : statusLabels[a.status] || "État à vérifier"}
                  </span>
                  {a.status === "SELECTED" && !a.assignment_id && (
                    <p>
                      Votre candidature est retenue. L’agence doit encore
                      confirmer l’affectation.
                    </p>
                  )}
                  {a.requires_reconsent && (
                    <p className={s.notice}>
                      Les conditions ont changé.{" "}
                      <Link to={"/missions/m_" + a.mission_id + "/candidater"}>
                        Lire et confirmer les nouvelles conditions
                      </Link>
                    </p>
                  )}
                  {confirm === a.id && (
                    <div
                      className={s.confirm}
                      role="group"
                      aria-label="Confirmer le retrait"
                    >
                      <p>Retirer votre candidature à cette mission ?</p>
                      <div className={s.actions}>
                        <Button
                          variant="danger"
                          loading={busy === a.id}
                          onClick={() => remove(a.id)}
                        >
                          Confirmer le retrait
                        </Button>
                        <Button
                          variant="ghost"
                          disabled={!!busy}
                          onClick={() => setConfirm("")}
                        >
                          Conserver ma candidature
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
                <div className={s.stack}>
                  <ButtonLink to={"/candidatures/" + a.id}>
                    Voir le suivi
                  </ButtonLink>
                  {a.assignment_id && ["ACTIVE","COMPLETED","CANCELLED"].includes(a.assignment_status || "") && (
                    <ConfirmationButton assignmentId={a.assignment_id} cancelled={a.assignment_status === "CANCELLED"} />
                  )}{" "}
                  {["SUBMITTED", "SELECTED"].includes(a.status) &&
                    !a.assignment_id &&
                    confirm !== a.id && (
                      <Button
                        variant="ghost"
                        disabled={!!busy}
                        onClick={() => setConfirm(a.id)}
                      >
                        Retirer ma candidature
                      </Button>
                    )}
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : (
        <section className={s.empty}>
          <Icon name="file-text" size={32} />
          <h2>
            {tab === "en-cours"
              ? "Aucune candidature en cours"
              : tab === "confirmees"
                ? "Aucune mission confirmée"
                : "Aucune candidature archivée"}
          </h2>
          <p>
            Les candidatures envoyées depuis InfiMatch apparaîtront ici. Les
            réponses sur un site externe restent suivies sur ce site.
          </p>
          <ButtonLink to="/missions">Voir les missions</ButtonLink>
        </section>
      )}
    </div>
  );
}
