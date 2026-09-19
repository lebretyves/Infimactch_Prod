export function managedPostgresUrl(value) {
  const u = new URL(value);
  const neon = u.hostname.endsWith('.neon.tech');
  const supabase = /^db\.[a-z]{20}\.supabase\.co$/.test(u.hostname) || /^aws-\d+-[a-z0-9-]+\.pooler\.supabase\.com$/.test(u.hostname);
  if (!['postgres:', 'postgresql:'].includes(u.protocol) || (!neon && !supabase) || !u.password) throw Error('Unexpected managed PostgreSQL target');
  return u;
}
export function restrictedApplicationUrl(value) {
  const u = managedPostgresUrl(value);
  return u.username === 'infimatch_app' || (/^aws-\d+-[a-z0-9-]+\.pooler\.supabase\.com$/.test(u.hostname) && /^infimatch_app\.[a-z]{20}$/.test(u.username));
}
