import type { BankFields } from "@/lib/bankFields";
import { Link, useLocation } from "react-router";
import { BankDocument } from "@/components/BankDocument";
import { BankReminder } from "@/components/BankReminder";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRemote } from "@/lib/useRemote";
import { api, downloadDocument } from "@/services/api";
import { getProfile } from "@/services/profile";
import { Button, ButtonLink } from "@/ui/Button";
import { TextField } from "@/ui/Field";
import { Checkbox } from "@/ui/Choice";
import { Icon } from "@/ui/Icon";
import u from "@/components/NurseUI.module.css";
import s from "./Dossier.module.css";
const uploadLimitMiB = window.location.hostname.endsWith(".vercel.app") ? 3 : 5;

type Document = {
  id: string;
  kind: string;
  mime: string;
  size_bytes: number;
  created_at: string;
};
const rppsLabels: Record<string, string> = {
  NOT_CHECKED: "À renseigner ou à vérifier",
  FOUND: "Numéro retrouvé dans le répertoire",
  NOT_FOUND: "Numéro non retrouvé : vérifiez la saisie",
  PENDING: "Vérification en attente",
};
function formatSize(bytes: number) {
  return bytes >= 1024 * 1024
    ? `${(bytes / 1024 / 1024).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} Mo`
    : `${Math.ceil(bytes / 1024)} Ko`;
}
function documentLabel(kind: string) {
  return kind === "CV" ? "CV" : kind === "CONFIRMATION" ? "Confirmation de mission" : "Justificatif de démonstration";
}
export default function Dossier() {
  const { user } = useAuth();
  const { hash } = useLocation();
  const [offset, setOffset] = useState(0),
    [number, setNumber] = useState<string | null>(null),
    [fictional, setFictional] = useState(false),
    [file, setFile] = useState<File | null>(null),
    [busy, setBusy] = useState(""),
    [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [dragging, setDragging] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const operationKeys = useRef(new Map<string, string>());
  function operationKey(operation: string, content: string) {
    const fingerprint = JSON.stringify([user?.id, operation, content]);
    let key = operationKeys.current.get(fingerprint);
    if (!key) { key = crypto.randomUUID(); operationKeys.current.set(fingerprint, key); }
    return key;
  }
  const r = useRemote(
    async (signal) => {
      const [profile, documents, bank] = await Promise.all([
        getProfile(signal),
        api<Document[]>("/me/documents?limit=20&offset=" + offset, { signal }),
        api<{ details: BankFields|null; iban: string | null; required: boolean; document: {id:string;mime:string;size_bytes:number;created_at:string}|null }>("/me/bank-details", { signal }),
      ]);
      return { profile, documents, bank };
    },
    user?.id + ":" + offset,
  );
  const rppsFound = r.data?.profile.rpps_status === "FOUND";
  useEffect(() => {
    if(hash !== "#rib" || r.loading || r.error) return;
    const target=window.document.getElementById("rib");
    target?.focus({preventScroll:true});
    target?.scrollIntoView({block:"start"});
  }, [hash, r.loading, r.error]);
  async function act(key: string, fn: () => Promise<unknown>, success: string) {
    if (busy) return;
    setBusy(key);
    setError("");
    setMessage("");
    try {
      await fn();
      setMessage(success);
      r.reload();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy("");
    }
  }
  function choose(next: File | null) {
    setError("");
    if (next && next.size > uploadLimitMiB * 1024 * 1024) {
      setError(`Le document doit peser au maximum ${uploadLimitMiB} Mo.`);
      setFile(null);
      return;
    }
    if (
      next &&
      !["application/pdf", "image/png", "image/jpeg"].includes(next.type)
    ) {
      setError("Choisissez un PDF, PNG ou JPEG.");
      setFile(null);
      return;
    }
    setFile(next);
    setFictional(false);
  }
  async function upload(e: FormEvent) {
    e.preventDefault();
    if (!file || !fictional) return;
    await act(
      "upload",
      async () => {
        const contentBase64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result).split(",")[1]);
          reader.onerror = () =>
            reject(new Error("Lecture du fichier impossible."));
          reader.readAsDataURL(file);
        });
        await api("/me/documents", {
          method: "POST",
          key: operationKey("document", JSON.stringify([file.type, contentBase64])),
          body: { mime: file.type, contentBase64, fictional: true },
        });
        operationKeys.current.delete(JSON.stringify([user?.id, "document", JSON.stringify([file.type, contentBase64])]));
        setFile(null);
        setFictional(false);
        if (input.current) input.current.value = "";
      },
      "Document enregistré.",
    );
  }
  if (user?.role !== "interimaire")
    return (
      <div className={u.page}>
        <h1>Mon dossier</h1>
        <p>Ce dossier personnel est réservé aux professionnels de santé.</p>
        <ButtonLink to="/accueil">Mon espace</ButtonLink>
      </div>
    );
  return (
    <div className={`${u.page} ${s.dossierPage}`}>
      <header>
        <p className={u.eyebrow}>Mon dossier</p>
        <h1>Mon dossier professionnel</h1>
        <p className={u.subtitle}>
          Vérifiez votre statut professionnel et gérez vos pièces administratives.
        </p>
      </header>
      <nav className={s.sectionNav} aria-label="Rubriques de mon dossier">
        <a href="#verification">Vérification RPPS</a><a href="#rib">RIB facultatif</a><a href="#justificatifs">Justificatifs</a><a href="#documents">Mes documents</a>
      </nav>
      <p className={s.contextNote}>Pour vos diplômes déclarés, compétences et expériences, rendez-vous dans <Link to="/profil">Mon profil</Link>.</p>
      <BankReminder key={r.data?.bank.document?.id||r.data?.bank.iban||"empty"} />
      {error && (
        <p role="alert" className={u.feedback}>
          {error}
        </p>
      )}
      {message && (
        <p role="status" className={u.feedback}>
          {message}
        </p>
      )}
      {r.loading ? (
        <p role="status">Chargement du dossier…</p>
      ) : r.error ? (
        <div role="alert" className={u.feedback}>
          {r.error}
          <Button onClick={r.reload}>Réessayer</Button>
        </div>
      ) : (
        <div className={s.documentLayout}>
          <div className={s.documentStack}>
            <form id="verification" tabIndex={-1}
              className={u.card}
              onSubmit={(e) => {
                e.preventDefault();
                if (rppsFound) return;
                void act(
                  "rpps",
                  async () => {
                    await api("/profile/rpps", {
                      method: "PUT",
                      key: operationKey("rpps", number || ""),
                      body: {
                        number: number ?? r.data?.profile.rpps_number ?? "",
                      },
                    });
                    setNumber(null);
                  },
                  "La demande de vérification a été enregistrée.",
                );
              }}
            >
              <div className={s.cardTop}>
                <h2 className={u.cardHeading}>
                  <Icon name="stethoscope" />
                  Vérification professionnelle
                </h2>
                <span className={rppsFound ? u.badge : s.pending}>
                  {rppsLabels[r.data?.profile.rpps_status || "NOT_CHECKED"] ||
                    "Vérification en attente"}
                </span>
              </div>
              <fieldset className={s.fields} disabled={!!busy}>
                {rppsFound ? (
                  <dl className={s.verifiedNumber}>
                    <dt>Numéro RPPS</dt>
                    <dd>{r.data?.profile.rpps_number}</dd>
                  </dl>
                ) : (
                  <TextField
                    label="Numéro RPPS"
                    hint="11 chiffres, indiqués sur votre carte CPS ou e-CPS."
                    required
                    pattern="[0-9]{11}"
                    maxLength={11}
                    inputMode="numeric"
                    autoComplete="off"
                    value={number ?? r.data?.profile.rpps_number ?? ""}
                    onChange={(e) => setNumber(e.target.value)}
                  />
                )}
                {!rppsFound && <Button type="submit" loading={busy === "rpps"}>
                  Vérifier mon numéro
                </Button>}
                {r.data?.profile.rpps_status === "PENDING" && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() =>
                      void act(
                        "retry",
                        () => api("/profile/rpps/retry", { method: "POST" }),
                        "Nouvelle demande enregistrée.",
                      )
                    }
                  >
                    Réessayer la vérification
                  </Button>
                )}
              </fieldset>
              <div className={s.qualifications}>
                <h3>Qualifications déclarées</h3>
                <div className={u.row}>
                  <div className={u.actions}>
                    {r.data?.profile.qualifications.map((q) => (
                      <span className={u.badge} key={q}>
                        {q}
                      </span>
                    ))}
                    {!r.data?.profile.qualifications.length && (
                      <p className={u.muted}>Aucun diplôme renseigné.</p>
                    )}
                  </div>
                  <ButtonLink to="/profil" variant="ghost" size="sm">
                    Modifier mon profil →
                  </ButtonLink>
                </div>
              </div>
            </form>
            <BankDocument document={r.data?.bank.document||null} details={r.data?.bank.details||null} onSaved={r.reload} />
          </div>
          <div className={s.documentStack}>
            <section id="justificatifs" tabIndex={-1} className={u.card}>
              <h2 className={u.cardHeading}>
                <Icon name="file-text" />
                Justificatifs de démonstration
              </h2>
              <p className={s.help}>
                Déposez uniquement un document contenant des données fictives.
              </p>
              <form onSubmit={upload}>
                <fieldset disabled={!!busy} className={s.fields}>
                  {file ? (
                    <div className={s.selectedFile}>
                      <Icon name="file-text" size={24} />
                      <div className={s.fileMeta}>
                        <strong>{file.name}</strong>
                        <span>{formatSize(file.size)}</span>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        aria-label={`Retirer le fichier ${file.name}`}
                        onClick={() => { setFile(null); setFictional(false); }}
                      >
                        Retirer
                      </Button>
                    </div>
                  ) : (
                    <>
                      <div
                        className={`${s.dropzone} ${dragging ? s.dragging : ""}`}
                        onDragEnter={(e) => { e.preventDefault(); setDragging(true); }}
                        onDragOver={(e) => e.preventDefault()}
                        onDragLeave={(e) => {
                          if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setDragging(false);
                        }}
                        onDrop={(e) => {
                          e.preventDefault();
                          setDragging(false);
                          if (!busy) choose(e.dataTransfer.files[0] || null);
                        }}
                      >
                        <Icon name="folder" size={42} />
                        <label className={s.fileLabel}>
                          Choisir un fichier
                          <input
                            ref={input}
                            type="file"
                            aria-label="Choisir un document fictif"
                            accept="application/pdf,image/png,image/jpeg"
                            onChange={(e) => choose(e.target.files?.[0] || null)}
                          />
                        </label>
                        <p>{dragging ? "Relâchez pour ajouter le fichier" : "ou glissez-déposez votre fichier ici"}</p>
                        <small>PDF, PNG ou JPEG · {uploadLimitMiB} Mo maximum</small>
                      </div>
                      <div className={s.cameraOnly}>
                        <label className={`${s.fileLabel} ${s.secondary}`}>
                          Prendre une photo du justificatif
                          <input type="file" accept="image/jpeg,image/png" capture="environment" onChange={e=>choose(e.target.files?.[0]||null)}/>
                        </label>
                        <p className={s.help}>Aucune lecture automatique du contenu.</p>
                      </div>
                    </>
                  )}
                  <Checkbox
                    required
                    checked={fictional}
                    onChange={(e) => setFictional(e.target.checked)}
                  >
                    Ce document contient uniquement des données fictives.
                  </Checkbox>
                  <Button
                    type="submit"
                    disabled={!file || !fictional}
                    loading={busy === "upload"}
                    aria-describedby={!file || !fictional ? "upload-hint" : undefined}
                  >
                    Enregistrer le document
                  </Button>
                  {(!file || !fictional) && (
                    <p id="upload-hint" className={s.help}>
                      {!file
                        ? "Choisissez d’abord un fichier."
                        : "Cochez la case pour confirmer que le document est fictif."}
                    </p>
                  )}
                </fieldset>
              </form>
            </section>
            <section id="documents" tabIndex={-1} className={u.card}>
              <h2 className={u.cardHeading}>
                <Icon name="folder" />
                Mes documents
              </h2>
              <div className={s.documents}>
                {r.data?.documents.length ? (
                  <ul className={s.documentList}>
                    {r.data.documents.map((d) => {
                      const label = documentLabel(d.kind);
                      const date = new Date(d.created_at).toLocaleDateString("fr-FR");
                      return (
                        <li className={s.documentItem} key={d.id}>
                          <Icon name="file-text" size={20} />
                          <div className={s.fileMeta}>
                            <strong>{label}</strong>
                            <span>{date} · {formatSize(d.size_bytes)}</span>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={!!busy}
                            aria-label={`Télécharger : ${label} du ${date}`}
                            onClick={() =>
                              void act(
                                "download",
                                () => downloadDocument(d.id),
                                "Téléchargement lancé.",
                              )
                            }
                          >
                            Télécharger
                          </Button>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <p className={u.muted}>
                    {offset
                      ? "Aucun document sur cette page."
                      : "Aucun document pour l’instant. Vos justificatifs et confirmations de mission apparaîtront ici."}
                  </p>
                )}
                {(offset > 0 || (r.data?.documents.length || 0) >= 20) && (
                  <nav className={u.row} aria-label="Pages de documents">
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={!offset || !!busy}
                      onClick={() => setOffset((v) => Math.max(0, v - 20))}
                    >
                      Précédent
                    </Button>
                    <span className={s.help}>
                      Page {Math.floor(offset / 20) + 1}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={(r.data?.documents.length || 0) < 20 || !!busy}
                      onClick={() => setOffset((v) => v + 20)}
                    >
                      Suivant
                    </Button>
                  </nav>
                )}
              </div>
              <p className={s.help}>
                Vos documents sont accessibles aux personnes autorisées.
              </p>
            </section>
          </div>
        </div>
      )}
    </div>
  );
}
