import { required } from "../config";

/** Shared by TypeORM and the session store; URL SSL options must not override the CA. */
export function postgresConnection(
  connectionString = required("DATABASE_URL"),
  ca = process.env.DATABASE_CA_CERT,
): { connectionString: string; ssl?: { ca: string; rejectUnauthorized: true } } {
  if (!ca?.trim()) return { connectionString };
  const url = new URL(connectionString);
  if (!["postgres:", "postgresql:"].includes(url.protocol)) throw new Error("Invalid PostgreSQL protocol");
  const mode = url.searchParams.get("sslmode");
  if (mode && !["require", "verify-ca", "verify-full"].includes(mode)) {
    throw new Error("DATABASE_CA_CERT requires verified TLS");
  }
  for (const key of ["ssl", "sslcert", "sslkey", "sslrootcert", "uselibpqcompat"]) {
    if (url.searchParams.has(key)) throw new Error("Conflicting PostgreSQL TLS configuration");
  }
  url.searchParams.delete("sslmode");
  return { connectionString: url.toString(), ssl: { ca, rejectUnauthorized: true } };
}
