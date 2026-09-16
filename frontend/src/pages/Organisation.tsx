import { useState, type FormEvent } from "react";
import { useRemote } from "@/lib/useRemote";
import { api } from "@/services/api";
import { organizations, type Organization } from "@/services/organizations";
import { Button, ButtonLink } from "@/ui/Button";
import { TextField, TextArea, SelectField } from "@/ui/Field";
import page from "./Candidater.module.css";
import s from "./inscription/Etape.module.css";
function Edit({ initial }: { initial: Organization }) {
  const [o, setO] = useState(initial),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [message, setMessage] = useState("");
  async function save(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await api("/organizations/" + o.id, {
        method: "PUT",
        body: {
          name: o.name,
          address: o.address,
          referent: o.referent,
          ...(o.finess ? { finess: o.finess } : {}),
          ...(o.siret ? { siret: o.siret } : {}),
        },
      });
      const fresh = await organizations();
      setO(fresh.organizations.find((v) => v.id === o.id)!);
      setMessage("Organisation enregistrée.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <form onSubmit={save} className={s.champs}>
      <fieldset
        className={s.champs}
        disabled={busy}
        style={{ border: 0, minWidth: 0, padding: 0 }}
      >
        <TextField
          label="Nom de l’organisation"
          required
          minLength={2}
          maxLength={150}
          value={o.name}
          onChange={(e) => setO({ ...o, name: e.target.value })}
        />
        <TextArea
          label="Adresse complète"
          required
          minLength={5}
          maxLength={500}
          value={o.address}
          onChange={(e) => setO({ ...o, address: e.target.value })}
        />
        <TextField
          label="Référent et coordonnées de contact"
          required
          minLength={2}
          maxLength={150}
          value={o.referent}
          onChange={(e) => setO({ ...o, referent: e.target.value })}
        />
        {o.kind === "ESTABLISHMENT" && (
          <TextField
            label="FINESS"
            required
            pattern="(?:[0-9]{9}|2[AB][0-9]{7})"
            maxLength={9}
            value={o.finess || ""}
            onChange={(e) =>
              setO({
                ...o,
                finess: e.target.value.toUpperCase().replace(/\s/g, ""),
              })
            }
          />
        )}
        <TextField
          label="SIRET"
          pattern="[0-9]{14}"
          maxLength={14}
          optional
          value={o.siret || ""}
          onChange={(e) => setO({ ...o, siret: e.target.value })}
        />
        <Button type="submit" loading={busy}>
          Enregistrer l’organisation
        </Button>
      </fieldset>
      {error && <p role="alert">{error}</p>}
      {message && <p role="status">{message}</p>}
    </form>
  );
}
export default function Organisation() {
  const r = useRemote(organizations, "organizations");
  const [id, setId] = useState("");
  const current =
    r.data?.organizations.find((o) => o.id === id) || r.data?.organizations[0];
  return (
    <div className={page.page}>
      <h1>Mon organisation</h1>
      {r.loading ? (
        <p role="status">Chargement…</p>
      ) : r.error ? (
        <div role="alert">
          {r.error}
          <Button onClick={r.reload}>Réessayer</Button>
        </div>
      ) : current ? (
        <>
          {r.data!.organizations.length > 1 && (
            <SelectField
              label="Organisation"
              value={current.id}
              onChange={(e) => setId(e.target.value)}
            >
              {r.data!.organizations.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </SelectField>
          )}
          <Edit key={current.id} initial={current} />
          {current.kind === "AGENCY" && (
            <section className={s.bloc}>
              <h2>Établissements rattachés</h2>
              {r
                .data!.links.filter((l) => l.agency_id === current.id)
                .map((l) => (
                  <p key={l.id}>
                    {l.name} — {l.address}
                  </p>
                ))}
              {!r.data!.links.some((l) => l.agency_id === current.id) && (
                <p>
                  Aucun établissement n’est encore rattaché à cette agence. Un
                  rattachement autorisé est nécessaire avant de créer une
                  mission.
                </p>
              )}
            </section>
          )}
        </>
      ) : (
        <p>Aucune organisation n’est associée à ce compte.</p>
      )}
      <ButtonLink to="/missions" variant="ghost">
        Mes missions
      </ButtonLink>
    </div>
  );
}
