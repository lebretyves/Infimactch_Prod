-- A executer par Supabase Support avec le proprietaire supabase_admin.
-- La table ne contient que les definitions de systemes de coordonnees.
BEGIN;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
ON TABLE public.spatial_ref_sys FROM anon, authenticated, PUBLIC;
SELECT r.rolname, p.privilege,
       has_table_privilege(r.oid, 'public.spatial_ref_sys', p.privilege) AS allowed
FROM pg_roles r
CROSS JOIN unnest(ARRAY['SELECT','INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER']) p(privilege)
WHERE r.rolname IN ('anon','authenticated');
-- Attendu : SELECT conserve ; autres permissions false.
-- Ne valider que si ce resultat est confirme.
COMMIT;
