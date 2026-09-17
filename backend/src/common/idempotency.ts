import { BadRequestException, ConflictException } from "@nestjs/common";
import { createHash } from "node:crypto";
import { SqlClient } from "../database/database";
function canonical(value: any): any {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === "object")
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((k) => [k, canonical(value[k])]),
    );
  return value;
}
/** Call only after current resource authorization, inside the business transaction. */
export async function commandReceipt(
  em: SqlClient,
  actor: string,
  operation: string,
  key: string | undefined,
  content: unknown,
) {
  if (typeof key !== "string" || !/^[\x21-\x7e]{1,100}$/.test(key))
    throw new BadRequestException(
      "Idempotency-Key required (1-100 printable characters)",
    );
  const hash = createHash("sha256")
    .update(JSON.stringify(canonical(content)))
    .digest("hex");
  await em.query("SELECT pg_advisory_xact_lock(hashtextextended($1,0))", [
    JSON.stringify([actor, operation, key]),
  ]);
  const [saved] = await em.query(
    "SELECT content_hash,response FROM idempotency WHERE actor_id=$1 AND operation=$2 AND key=$3",
    [actor, operation, key],
  );
  if (saved && saved.content_hash !== hash)
    throw new ConflictException(
      "Idempotency key reused with different content",
    );
  return {
    replay: !!saved,
    response: saved?.response,
    async save<T>(response: T): Promise<T> {
      await em.query(
        "INSERT INTO idempotency(actor_id,operation,key,content_hash,response) VALUES($1,$2,$3,$4,$5)",
        [actor, operation, key, hash, JSON.stringify(response)],
      );
      return response;
    },
  };
}
