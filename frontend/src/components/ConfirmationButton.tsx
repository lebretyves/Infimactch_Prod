import { useState } from "react";
import { api, downloadDocument } from "@/services/api";
import { Button } from "@/ui/Button";
export function ConfirmationButton({ assignmentId, cancelled=false }: { assignmentId: string; cancelled?:boolean }) {
  const [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  return (
    <div>
      <Button
        variant="outline"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setMessage("");
          try {
            const c = await api<{ status: string; document_id: string | null }>(
              "/assignments/" + assignmentId + (cancelled ? "/cancellation" : "/confirmation"),
            );
            if (c.status === "READY" && c.document_id)
              await downloadDocument(c.document_id);
            else
              setMessage(
                c.status === "UNAVAILABLE" ? "Aucun PDF d’annulation n’a été généré pour cette ancienne affectation." : c.status === "CANCELLED"
                  ? "Cette confirmation a été annulée."
                  : c.status === "SUPERSEDED"
                    ? "Cette confirmation a été remplacée."
                    : c.status === "FAILED"
                      ? "La génération a échoué. Réessayez plus tard."
                      : "Le document est en préparation. Réessayez dans un instant.",
              );
          } catch (e) {
            setMessage((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        {cancelled ? "Télécharger le PDF d’annulation" : "Télécharger le PDF de confirmation"}
      </Button>
      {message && <p role="status">{message}</p>}
    </div>
  );
}
