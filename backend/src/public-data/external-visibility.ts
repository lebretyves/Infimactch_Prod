import { Database } from "../database/database";
import { PROVIDERS, type Provider } from "./refresh.service";

/** Providers whose catalogue may appear in the nurse UI. Import pause (`enabled`) is unrelated. */
export async function visibleExternalProviders(db: Database): Promise<Provider[]> {
  const rows = await db.query(
    "SELECT provider FROM source_control WHERE visible AND provider = ANY($1::text[]) ORDER BY provider",
    [[...PROVIDERS]],
  );
  return rows.map((row: { provider: Provider }) => row.provider);
}

