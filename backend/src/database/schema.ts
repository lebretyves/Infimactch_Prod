import { MigrationInterface, QueryRunner } from "typeorm";
export class InitialSchema1789380000000 implements MigrationInterface {
  async up(q: QueryRunner): Promise<void> {
    await q.query(`
 CREATE EXTENSION IF NOT EXISTS postgis;
 CREATE EXTENSION IF NOT EXISTS btree_gist;
 CREATE TABLE account(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), email text NOT NULL UNIQUE, password_hash text NOT NULL, family text NOT NULL CHECK(family IN('NURSE','ENTERPRISE')), terms_version text NOT NULL, terms_at timestamptz NOT NULL DEFAULT now(), created_at timestamptz NOT NULL DEFAULT now());
 CREATE TABLE organization(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), kind text NOT NULL CHECK(kind IN('AGENCY','ESTABLISHMENT')), name text NOT NULL, address text NOT NULL, referent text NOT NULL, finess text, siret text, CHECK(kind!='ESTABLISHMENT' OR length(finess)=9));
 CREATE TABLE membership(user_id uuid REFERENCES account(id), organization_id uuid REFERENCES organization(id), active boolean NOT NULL DEFAULT true, PRIMARY KEY(user_id,organization_id));
 CREATE TABLE agency_link(agency_id uuid REFERENCES organization(id), establishment_id uuid REFERENCES organization(id), PRIMARY KEY(agency_id,establishment_id));
 CREATE TABLE profile(user_id uuid PRIMARY KEY REFERENCES account(id), display_name text NOT NULL DEFAULT '', qualifications text[] NOT NULL DEFAULT '{}', skills text[] NOT NULL DEFAULT '{}', experience jsonb NOT NULL DEFAULT '[]', available jsonb NOT NULL DEFAULT '[]', unavailable jsonb NOT NULL DEFAULT '[]', latitude double precision CHECK(latitude BETWEEN -90 AND 90), longitude double precision CHECK(longitude BETWEEN -180 AND 180), radius_km double precision CHECK(radius_km>0 AND radius_km<=1000), accepted_shifts text[] NOT NULL DEFAULT '{}', preferred_shifts text[] NOT NULL DEFAULT '{}', visible boolean NOT NULL DEFAULT false, rpps_number text, rpps_version integer NOT NULL DEFAULT 0, rpps_status text NOT NULL DEFAULT 'NOT_CHECKED' CHECK(rpps_status IN('NOT_CHECKED','FOUND','NOT_FOUND','PENDING')), rpps_checked_at timestamptz, updated_at timestamptz NOT NULL DEFAULT now());
 CREATE TABLE mission(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), agency_id uuid NOT NULL REFERENCES organization(id), establishment_id uuid NOT NULL REFERENCES organization(id), title text NOT NULL, description text NOT NULL, qualification text NOT NULL CHECK(qualification IN('IDE','IADE','IBODE')), service text NOT NULL, population text NOT NULL CHECK(population IN('ADULT','PEDIATRIC','MIXED')), block text NOT NULL CHECK(block IN('NONE','GENERAL','SPECIALIZED')), specialty text, required_skills text[] NOT NULL DEFAULT '{}', desired_skills text[] NOT NULL DEFAULT '{}', min_experience_months numeric NOT NULL DEFAULT 0 CHECK(min_experience_months>=0), start_at timestamptz NOT NULL,end_at timestamptz NOT NULL, timezone text NOT NULL DEFAULT 'Europe/Paris', shift text NOT NULL CHECK(shift IN('DAY','NIGHT','MIXED')), address text NOT NULL, location geography(Point,4326) NOT NULL, hourly_salary numeric(10,2) NOT NULL CHECK(hourly_salary>0), status text NOT NULL DEFAULT 'DRAFT' CHECK(status IN('DRAFT','OPEN','FILLED','COMPLETED','CANCELLED')), version integer NOT NULL DEFAULT 1,created_at timestamptz NOT NULL DEFAULT now(), CHECK(start_at<end_at),CHECK(block!='SPECIALIZED' OR specialty IS NOT NULL));
 CREATE INDEX mission_location_idx ON mission USING gist(location);
 CREATE TABLE application(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),mission_id uuid NOT NULL REFERENCES mission(id),nurse_id uuid NOT NULL REFERENCES profile(user_id),status text NOT NULL DEFAULT 'SUBMITTED' CHECK(status IN('SUBMITTED','SELECTED','REJECTED','WITHDRAWN','ACCEPTED')),consent_version integer NOT NULL,updated_at timestamptz NOT NULL DEFAULT now(),UNIQUE(mission_id,nurse_id));
 CREATE TABLE assignment(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),mission_id uuid NOT NULL REFERENCES mission(id),nurse_id uuid NOT NULL REFERENCES profile(user_id),application_id uuid NOT NULL REFERENCES application(id),status text NOT NULL DEFAULT 'ACTIVE' CHECK(status IN('ACTIVE','COMPLETED','CANCELLED')),start_at timestamptz NOT NULL,end_at timestamptz NOT NULL,created_at timestamptz NOT NULL DEFAULT now(),CHECK(start_at<end_at));
 CREATE UNIQUE INDEX one_active_assignment_per_mission ON assignment(mission_id) WHERE status='ACTIVE';
 ALTER TABLE assignment ADD CONSTRAINT no_overlapping_active_assignments EXCLUDE USING gist(nurse_id WITH =,tstzrange(start_at,end_at,'[)') WITH &&) WHERE(status='ACTIVE');
 CREATE TABLE audit(id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,actor_id uuid,event text NOT NULL,resource_id uuid,details jsonb NOT NULL DEFAULT '{}',created_at timestamptz NOT NULL DEFAULT now());
 CREATE TABLE idempotency(actor_id uuid NOT NULL,operation text NOT NULL,key text NOT NULL,content_hash text NOT NULL,response jsonb NOT NULL,created_at timestamptz NOT NULL DEFAULT now(),PRIMARY KEY(actor_id,operation,key));
 CREATE TABLE outbox(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),event text NOT NULL,payload jsonb NOT NULL,attempts integer NOT NULL DEFAULT 0,available_at timestamptz NOT NULL DEFAULT now(),lease_until timestamptz,lease_token uuid,completed_at timestamptz,last_error text,created_at timestamptz NOT NULL DEFAULT now());
 CREATE TABLE workflow_receipt(event_id uuid NOT NULL REFERENCES outbox(id),action text NOT NULL,created_at timestamptz NOT NULL DEFAULT now(),PRIMARY KEY(event_id,action));
 CREATE TABLE notification(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),user_id uuid NOT NULL REFERENCES account(id),event_id uuid REFERENCES outbox(id),kind text NOT NULL,message text NOT NULL,read_at timestamptz,created_at timestamptz NOT NULL DEFAULT now(),UNIQUE(user_id,event_id,kind));
 CREATE TABLE external_offer(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),source text NOT NULL,source_id text NOT NULL,title text NOT NULL,description text NOT NULL,url text NOT NULL,location_label text NOT NULL,qualification text,raw_hash text NOT NULL,imported_at timestamptz NOT NULL DEFAULT now(),expires_at timestamptz,active boolean NOT NULL DEFAULT true,UNIQUE(source,source_id));
 CREATE TABLE favorite(user_id uuid NOT NULL REFERENCES profile(user_id),kind text NOT NULL CHECK(kind IN('MISSION','EXTERNAL','ESTABLISHMENT')),target_id uuid NOT NULL,created_at timestamptz NOT NULL DEFAULT now(),PRIMARY KEY(user_id,kind,target_id));
 CREATE TABLE document(id uuid PRIMARY KEY,owner_id uuid NOT NULL REFERENCES account(id),assignment_id uuid REFERENCES assignment(id),kind text NOT NULL CHECK(kind IN('EVIDENCE','CONFIRMATION','BANK')),mime text NOT NULL,status text NOT NULL CHECK(status IN('STAGING','READY')),key_version integer NOT NULL DEFAULT 1,size_bytes integer NOT NULL,created_at timestamptz NOT NULL DEFAULT now());
 CREATE TABLE session(sid varchar PRIMARY KEY,sess json NOT NULL,expire timestamp(6) NOT NULL);
 CREATE INDEX session_expire_idx ON session(expire);
 CREATE FUNCTION check_assignment_consistency() RETURNS trigger LANGUAGE plpgsql AS $$
 DECLARE mid uuid; s text; n integer;
 BEGIN
  IF TG_TABLE_NAME='mission' THEN mid=NEW.id; ELSE mid=NEW.mission_id; END IF;
  SELECT status INTO s FROM mission WHERE id=mid;
  SELECT count(*) INTO n FROM assignment WHERE mission_id=mid AND status='ACTIVE';
  IF (s='FILLED' AND n!=1) OR (s!='FILLED' AND n!=0) THEN RAISE EXCEPTION 'assignment and mission inconsistent' USING ERRCODE='23514'; END IF;
  RETURN NULL;
 END $$;
 CREATE CONSTRAINT TRIGGER mission_assignment_consistency AFTER INSERT OR UPDATE ON mission DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION check_assignment_consistency();
 CREATE CONSTRAINT TRIGGER assignment_mission_consistency AFTER INSERT OR UPDATE ON assignment DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION check_assignment_consistency();
 `);
  }
  async down(): Promise<void> {
    throw new Error(
      "Destructive rollback intentionally unavailable; restore a verified backup.",
    );
  }
}
