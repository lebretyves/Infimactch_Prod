import { BackLink } from "@/ui/BackLink";
﻿import { useEffect, useState } from "react";
import { useParams } from "react-router";
import { useAuth } from "@/context/AuthContext";
import { useRemote } from "@/lib/useRemote";
import { api } from "@/services/api";
import { Button } from "@/ui/Button";
import { MissionCard } from "@/ui/MissionCard";
import { favorites, facilityFavorite, type Listing } from "@/services/market";
import s from "./MarketPages.module.css";
export default function Etablissement() {
  const { id = "" } = useParams(),
    { user } = useAuth();
  const [offset, setOffset] = useState(0),
    [busy, setBusy] = useState(false),
    [saved, setSaved] = useState(false),
    [message, setMessage] = useState("");
  useEffect(() => setOffset(0), [id]);
  const r = useRemote(
    (signal) =>
      api<{
        name: string;
        address: string;
        finess: string;
        missions: Listing[];
      }>("/facilities/" + id + "?limit=20&offset=" + offset, { signal }),
    id + ":" + offset,
  );
  const f = useRemote(
    async (signal) => (user?.role === "interimaire" ? favorites(signal) : []),
    "facility-favorites:" + id + user?.id,
  );
  useEffect(
    () =>
      setSaved(
        !!f.data?.some((v) => v.kind === "ESTABLISHMENT" && v.target_id === id),
      ),
    [f.data, id],
  );
  async function toggle() {
    if (busy) return;
    setBusy(true);
    setMessage("");
    try {
      await facilityFavorite(id, saved);
      setSaved(!saved);
      setMessage(
        saved
          ? "Établissement retiré des favoris."
          : "Établissement enregistré dans vos favoris.",
      );
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className={s.page}>
      <BackLink to="/missions">Retour aux missions</BackLink>
      {r.loading ? (
        <div className={s.empty} role="status">
          Chargement de l’établissement…
        </div>
      ) : r.error ? (
        <div className={s.empty} role="alert">
          <p>{r.error}</p>
          <Button onClick={r.reload}>Réessayer</Button>
        </div>
      ) : (
        r.data && (
          <>
            <header className={s.header}>
              <div>
                <p className={s.eyebrow}>Établissement de santé</p>
                <h1>{r.data.name}</h1>
                <p className={s.subtitle}>{r.data.address}</p>
              </div>
              {user?.role === "interimaire" && (
                <Button
                  variant="outline"
                  aria-pressed={saved}
                  disabled={busy || f.loading || !!f.error}
                  onClick={toggle}
                >
                  {saved ? "Retirer des favoris" : "Ajouter aux favoris"}
                </Button>
              )}
            </header>
            {message && (
              <p className={s.notice} role="status">
                {message}
              </p>
            )}
            {f.error && (
              <p className={s.notice}>
                Vos favoris sont indisponibles.{" "}
                <Button variant="ghost" onClick={f.reload}>
                  Réessayer
                </Button>
              </p>
            )}
            <section className={s.card}>
              <h2>Informations de l’établissement</h2>
              <p className={s.muted}>
                FINESS : {r.data.finess || "Non renseigné"}
              </p>
            </section>
            <section className={s.stack}>
              <h2>Missions ouvertes</h2>
              <div className={s.grid}>
                {r.data.missions.map((m) => (
                  <MissionCard
                    key={m.id}
                    mission={{
                      ...m,
                      id: m.id.startsWith("m_") ? m.id : "m_" + m.id,
                    }}
                    initialFavorite={f.data?.some(
                      (v) =>
                        v.kind === "MISSION" &&
                        v.target_id === m.id.replace(/^m_/, ""),
                    )}
                    favoriteAvailable={!f.loading && !f.error}
                  />
                ))}
              </div>
              {!r.data.missions.length && (
                <div className={s.empty}>
                  <p>Aucune mission ouverte sur cette page.</p>
                </div>
              )}
              {(offset > 0 || r.data.missions.length === 20) && (
                <div className={s.pagination}>
                  <Button
                    variant="outline"
                    disabled={!offset}
                    onClick={() => setOffset((v) => Math.max(0, v - 20))}
                  >
                    Précédent
                  </Button>
                  <span>Page {offset / 20 + 1}</span>
                  <Button
                    variant="outline"
                    disabled={r.data.missions.length < 20}
                    onClick={() => setOffset((v) => v + 20)}
                  >
                    Suivant
                  </Button>
                </div>
              )}
            </section>
          </>
        )
      )}
    </div>
  );
}
