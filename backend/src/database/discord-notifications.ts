import { MigrationInterface, QueryRunner } from "typeorm";
export class DiscordNotifications1789381300000 implements MigrationInterface {
  async up(q: QueryRunner) {
    await q.query(`
      CREATE TABLE discord_link (
        account_id uuid PRIMARY KEY REFERENCES account(id) ON DELETE CASCADE,
        discord_user_id text NOT NULL CHECK(discord_user_id ~ '^[0-9]{17,20}$'),
        username text NOT NULL,
        connected_at timestamptz NOT NULL DEFAULT now()
      );
      CREATE TABLE discord_oauth_state (
        state_hash text PRIMARY KEY,
        account_id uuid NOT NULL REFERENCES account(id) ON DELETE CASCADE,
        session_hash text NOT NULL,
        organization_id uuid REFERENCES organization(id) ON DELETE CASCADE,
        expires_at timestamptz NOT NULL
      );
      CREATE TABLE discord_destination (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id uuid UNIQUE REFERENCES account(id) ON DELETE CASCADE,
        organization_id uuid UNIQUE REFERENCES organization(id) ON DELETE CASCADE,
        connected_by uuid NOT NULL REFERENCES discord_link(account_id) ON DELETE CASCADE,
        target_type text NOT NULL CHECK(target_type IN('user','channel')),
        target_id text NOT NULL CHECK(target_id ~ '^[0-9]{17,20}$'),
        guild_id text CHECK(guild_id ~ '^[0-9]{17,20}$'),
        channel_name text,
        enabled boolean NOT NULL DEFAULT false,
        events text[] NOT NULL DEFAULT '{}',
        version integer NOT NULL DEFAULT 1,
        updated_at timestamptz NOT NULL DEFAULT now(),
        CHECK(events <@ ARRAY['MATCH','CONFIRMATION','CANCELLATION','REMINDER']::text[]),
        CHECK((target_type='user' AND user_id IS NOT NULL AND organization_id IS NULL AND guild_id IS NULL AND connected_by=user_id) OR (target_type='channel' AND user_id IS NULL AND organization_id IS NOT NULL AND guild_id IS NOT NULL))
      );
      CREATE TABLE discord_delivery (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        destination_id uuid NOT NULL REFERENCES discord_destination(id) ON DELETE CASCADE,
        destination_version integer NOT NULL,
        event_id uuid NOT NULL REFERENCES outbox(id) ON DELETE CASCADE,
        mission_id uuid NOT NULL REFERENCES mission(id) ON DELETE CASCADE,
        mission_version integer NOT NULL,
        kind text NOT NULL CHECK(kind IN('MATCH','CONFIRMATION','CANCELLATION','REMINDER')),
        status text NOT NULL DEFAULT 'PENDING' CHECK(status IN('PENDING','LEASED','SENDING','SENT','CANCELLED','FAILED','UNCERTAIN')),
        attempts integer NOT NULL DEFAULT 0,
        available_at timestamptz NOT NULL DEFAULT now(),
        lease_token uuid,
        lease_until timestamptz,
        discord_message_id text,
        last_error text,
        created_at timestamptz NOT NULL DEFAULT now(),
        sent_at timestamptz,
        UNIQUE(destination_id,event_id,kind)
      );
      CREATE INDEX discord_delivery_pending ON discord_delivery(available_at,created_at) WHERE status IN('PENDING','LEASED','SENDING');
      CREATE INDEX discord_oauth_expiry ON discord_oauth_state(expires_at);
    `);
  }
  async down() { throw new Error("Restore a verified backup instead of destructive rollback"); }
}
