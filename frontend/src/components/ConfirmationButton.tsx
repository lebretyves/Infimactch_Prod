import { useState } from "react";
import { api, downloadDocument } from "@/services/api";
import { Button } from "@/ui/Button";
export function ConfirmationButton({ assignmentId }: { assignmentId: string }) {
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
              "/assignments/" + assignmentId + "/confirmation",
            );
            if (c.status === "READY" && c.document_id)
              await downloadDocument(c.document_id);
            else
              setMessage(
                c.status === "CANCELLED"
                  ? "Cette confirmation a été annulée."
                  : c.status === "SUPERSEDED"
                    ? "Cette confirmation a été remplacée."
                    : c.status === "FAILED"
                      ? "La génération a échoué. Réessayez plus tard."
                      : "La confirmation est en préparation. Réessayez dans un instant.",
              );
          } catch (e) {
            setMessage((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        Télécharger le PDF de confirmation
      </Button>
      {message && <p role="status">{message}</p>}
    </div>
  );
}
