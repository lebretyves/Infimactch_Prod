import {BadRequestException, Injectable, UnauthorizedException} from '@nestjs/common';
import {createHash, timingSafeEqual} from 'node:crypto';
import {Database} from '../database/database';

export const EMAIL_CORRELATION_HEADER = 'X-InfiMatch-Email-ID';
export type DeliveryEventName = 'processed' | 'delivered' | 'bounce' | 'reject' | 'spam';
export type DeliveryStatus = 'NOT_REPORTED' | 'PROCESSED' | 'DELIVERED' | 'BOUNCED' | 'REJECTED' | 'SPAM';
export type DeliveryEvent = {event: DeliveryEventName; providerId: string; recipient: string; emailId: string | null; happenedAt: Date; bounceType: 'hard'|'soft'|null; fingerprint: string};
const statuses: Record<DeliveryEventName,DeliveryStatus> = {processed:'PROCESSED',delivered:'DELIVERED',bounce:'BOUNCED',reject:'REJECTED',spam:'SPAM'};
const priority: Record<DeliveryStatus,number> = {NOT_REPORTED:0,PROCESSED:1,DELIVERED:2,BOUNCED:3,REJECTED:4,SPAM:5};
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function authorizeEmailWebhook(header: unknown, secret = process.env.SMTP2GO_WEBHOOK_SECRET) {
  if (!secret || secret.length < 32 || typeof header !== 'string') throw new UnauthorizedException('Webhook authentication required');
  const expected = Buffer.from('Bearer '+secret), supplied = Buffer.from(header);
  if (expected.length !== supplied.length || !timingSafeEqual(expected,supplied)) throw new UnauthorizedException('Webhook authentication required');
}

function eventTime(raw: unknown): Date {
  let value: string | number;
  if (typeof raw === 'number' && Number.isFinite(raw)) value = raw < 1e12 ? raw*1000 : raw;
  else if (typeof raw === 'string' && /^\d{10}(?:\d{3})?$/.test(raw)) value = Number(raw)*(raw.length===10?1000:1);
  else if (typeof raw === 'string' && /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}(?:\.\d{1,9})?(?:Z| ?[+-]\d{2}:?\d{2})?$/.test(raw)) {
    value=raw.replace(' ','T').replace(/ ([+-]\d{2}:?\d{2})$/,'$1'); if (!/(Z|[+-]\d{2}:?\d{2})$/.test(value)) value+='Z';
  } else throw new BadRequestException('Invalid email event');
  const parsed = new Date(value);
  if (!Number.isFinite(parsed.getTime()) || parsed.getTime()<Date.UTC(2000,0,1)) throw new BadRequestException('Invalid email event');
  return parsed;
}

/** Keep only technical fields: never persist auth, subject, message, recipient or the raw payload. */
export function parseEmailEvent(body: unknown, now=Date.now()): DeliveryEvent | null {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new BadRequestException('Invalid email event');
  const b=body as Record<string,unknown>;
  if (typeof b.event !== 'string') throw new BadRequestException('Invalid email event');
  if (!Object.hasOwn(statuses,b.event)) return null; // no opening/click tracking
  if (typeof b.email_id !== 'string' || !/^[A-Za-z0-9._:-]{1,200}$/.test(b.email_id) || typeof b.rcpt !== 'string' || !/^[^\s@<>]+@[^\s@<>]+$/.test(b.rcpt) || b.rcpt.length>254) throw new BadRequestException('Invalid email event');
  const happenedAt=eventTime(b.time);
  if (happenedAt.getTime()>now+300000) throw new BadRequestException('Invalid email event');
  const headerKeys=Object.keys(b).filter(key=>key.toLowerCase()===EMAIL_CORRELATION_HEADER.toLowerCase());
  if (headerKeys.length>1) throw new BadRequestException('Invalid email event');
  const custom=headerKeys.length ? b[headerKeys[0]!] : undefined;
  if (custom!==undefined && (typeof custom!=='string' || !uuid.test(custom))) throw new BadRequestException('Invalid email event');
  const event=b.event as DeliveryEventName, recipient=b.rcpt.toLowerCase();
  const bounceType=event==='bounce' && (b.bounce==='hard'||b.bounce==='soft') ? b.bounce : null;
  // Provider's id identifies the webhook, not necessarily an individual event.
  const fingerprint=createHash('sha256').update(JSON.stringify([b.email_id,recipient,event,happenedAt.toISOString(),bounceType])).digest('hex');
  return {event,providerId:b.email_id,recipient,emailId:typeof custom==='string'?custom.toLowerCase():null,happenedAt,bounceType,fingerprint};
}

/** Processed never regresses delivery. Later delivery may resolve a soft bounce; spam is terminal. */
export function nextDeliveryState(current: DeliveryStatus, currentAt: Date | string | null, incoming: DeliveryEvent): {status: DeliveryStatus; at: Date|string|null} {
  const next=statuses[incoming.event];
  if (current==='SPAM' || (next==='PROCESSED' && current!=='NOT_REPORTED' && current!=='PROCESSED')) return {status:current,at:currentAt};
  if (next==='SPAM' || (current==='PROCESSED' && next!=='PROCESSED')) return {status:next,at:incoming.happenedAt};
  const before=currentAt ? new Date(currentAt).getTime() : 0, after=incoming.happenedAt.getTime();
  if (after<before || (after===before && priority[next]<=priority[current])) return {status:current,at:currentAt};
  return {status:next,at:incoming.happenedAt};
}

@Injectable()
export class EmailDeliveryService {
  constructor(private readonly db: Database) {}
  async receive(body: unknown) {
    const event=parseEmailEvent(body); if (!event) return {ok:true};
    await this.db.transaction(async em=>{
      const rows=await em.query(`SELECT id,recipient,provider_id,status,first_attempt_at,delivery_status,delivery_event_at
        FROM mission_email WHERE (($1::uuid IS NOT NULL AND id=$1) OR ($1::uuid IS NULL AND provider_id=$2))
        AND lower(recipient)=$3 AND first_attempt_at IS NOT NULL AND attempts>0
        ORDER BY id LIMIT 2 FOR UPDATE`,[event.emailId,event.providerId,event.recipient]);
      if (rows.length!==1) return;
      const row=rows[0];
      if ((row.provider_id && row.provider_id!==event.providerId) || event.happenedAt.getTime()<new Date(row.first_attempt_at).getTime()-300000) return;
      const inserted=await em.query(`INSERT INTO mission_email_delivery_event(fingerprint,email_id,event,happened_at,bounce_type)
        VALUES($1,$2,$3,$4,$5) ON CONFLICT DO NOTHING RETURNING fingerprint`,[event.fingerprint,row.id,event.event,event.happenedAt,event.bounceType]);
      if (!inserted.length) return;
      const state=nextDeliveryState(row.delivery_status,row.delivery_event_at,event);
      const column: Record<DeliveryEventName,string>={processed:'processed_at',delivered:'delivered_at',bounce:'bounced_at',reject:'rejected_at',spam:'spam_at'};
      // An authenticated callback resolves a lost API acknowledgement. Close its lease so a
      // racing response/timeout cannot overwrite this evidence or make the row sendable again.
      await em.query(`UPDATE mission_email SET provider_id=COALESCE(provider_id,$2),
        status='SENT',sent_at=COALESCE(sent_at,$3),accepted_at=COALESCE(accepted_at,$3),
        delivery_status=$4,delivery_event_at=$5,${column[event.event]}=GREATEST(${column[event.event]},$3),
        lease_until=NULL,lease_token=NULL,last_error=NULL WHERE id=$1`,[row.id,event.providerId,event.happenedAt,state.status,state.at]);
    });
    // Same receipt for unknown, retired, conflicting and processed messages; no account oracle.
    return {ok:true};
  }
  async journal(userId: string, admin=false) {
    const items=await this.db.query(`SELECT e.id,e.kind,e.status AS "sendStatus",e.delivery_status AS "deliveryStatus",
      e.created_at AS "createdAt",e.accepted_at AS "acceptedAt",e.delivery_event_at AS "deliveryEventAt",
      e.processed_at AS "processedAt",e.delivered_at AS "deliveredAt",e.bounced_at AS "bouncedAt",
      e.rejected_at AS "rejectedAt",e.spam_at AS "spamAt",e.attempts,
      COALESCE((SELECT jsonb_agg(x ORDER BY x."happenedAt" DESC,x.event) FROM
        (SELECT event,happened_at AS "happenedAt",received_at AS "receivedAt",bounce_type AS "bounceType"
         FROM mission_email_delivery_event WHERE email_id=e.id ORDER BY happened_at DESC,event LIMIT 10) x),'[]'::jsonb) AS events
      FROM mission_email e WHERE e.user_id=$1 AND ($2::boolean OR e.organization_id IS NULL OR EXISTS
        (SELECT 1 FROM membership m WHERE m.user_id=$1 AND m.organization_id=e.organization_id AND m.active))
      ORDER BY e.created_at DESC,e.id LIMIT 50`,[userId,admin]);
    return {items,limit:50,observedAt:new Date().toISOString()};
  }
}
