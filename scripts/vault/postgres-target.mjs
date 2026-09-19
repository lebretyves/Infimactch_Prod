/** Production maintenance accepts only the configured database provider. */
export function managedPostgresUrl(value) {
  const u = new URL(value);
  const direct = /^db\.[a-z]{20}\.supabase\.co$/.test(u.hostname);
  const pooler = /^aws-\d+-[a-z0-9-]+\.pooler\.supabase\.com$/.test(u.hostname);
  if (!['postgres:', 'postgresql:'].includes(u.protocol) || (!direct && !pooler) || !u.username || !u.password || !u.pathname.slice(1)) throw Error('Expected authenticated Supabase PostgreSQL target');
  return u;
}
export function restrictedApplicationUrl(value) {
  const u = managedPostgresUrl(value);
  return u.hostname.endsWith('.supabase.co')
    ? u.username === 'infimatch_app'
    : /^infimatch_app\.[a-z]{20}$/.test(u.username);
}
/** Explicit CA verification, shared by operator clients; never silently downgrade TLS. */
export function managedPostgresConnection(value, ca) {
  const u = managedPostgresUrl(value);
  if (typeof ca !== 'string' || !ca.trim()) throw Error('Supabase DATABASE_CA_CERT required');
  const mode = u.searchParams.get('sslmode');
  if (mode && !['require', 'verify-ca', 'verify-full'].includes(mode)) throw Error('Verified PostgreSQL TLS required');
  for (const key of ['ssl', 'sslcert', 'sslkey', 'sslrootcert', 'uselibpqcompat']) {
    if (u.searchParams.has(key)) throw Error('Conflicting PostgreSQL TLS configuration');
  }
  u.searchParams.delete('sslmode');
  return {connectionString:u.toString(),ssl:{ca,rejectUnauthorized:true}};
}
