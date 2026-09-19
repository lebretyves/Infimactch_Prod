import {MigrationInterface,QueryRunner} from 'typeorm';
export class SupportTickets1789851600000 implements MigrationInterface {
 async up(q:QueryRunner){await q.query(`
 CREATE TABLE support_ticket(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),owner_id uuid NOT NULL REFERENCES account(id) ON DELETE CASCADE,client_request_id uuid NOT NULL,category text NOT NULL CHECK(category IN('ACCESS','PROFILE','MISSION','DOCUMENT','NOTIFICATION','OTHER')),subject text NOT NULL CHECK(length(subject) BETWEEN 3 AND 150),description text NOT NULL CHECK(length(description) BETWEEN 10 AND 4000),status text NOT NULL DEFAULT 'OPEN' CHECK(status IN('OPEN','RESOLVED')),created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now(),UNIQUE(owner_id,client_request_id));
 CREATE INDEX support_ticket_owner ON support_ticket(owner_id,created_at DESC,id);
 CREATE INDEX support_ticket_queue ON support_ticket(status,updated_at DESC,id);
 CREATE TABLE support_reply(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),ticket_id uuid NOT NULL REFERENCES support_ticket(id) ON DELETE CASCADE,author_id uuid REFERENCES account(id) ON DELETE SET NULL,is_staff boolean NOT NULL,client_request_id uuid NOT NULL,body text NOT NULL CHECK(length(body) BETWEEN 2 AND 4000),created_at timestamptz NOT NULL DEFAULT now(),UNIQUE(ticket_id,author_id,client_request_id));
 CREATE INDEX support_reply_ticket ON support_reply(ticket_id,created_at,id);
 `);}
 async down(){throw Error('Restore a verified backup instead of destructive rollback');}
}
