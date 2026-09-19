import { BadRequestException, Body, Controller, Injectable, Post } from '@nestjs/common';
import { IsEmail, IsString, Length, Matches } from 'class-validator';
import { createHash, randomBytes } from 'node:crypto';
import { recoveryMailConfig, sendRecoveryMail, RECOVERY_RESPONSE_MINIMUM_MS } from './recovery-mail';
import * as argon2 from 'argon2';
import { Database, audit } from '../database/database';

export const recoveryHash = (value: string) => createHash('sha256').update(value).digest('hex');
export const recoveryAcknowledgement = { ok: true, message: 'Si cette adresse correspond à un compte client, la demande sera examinée par l’administration. L’envoi automatique est indisponible : contactez votre interlocuteur habituel pour vérifier votre identité.' };
export const automaticRecoveryAcknowledgement = { ok: true, message: 'Si cette adresse correspond à un compte client admissible et qu’aucune demande récente n’existe, un lien de réinitialisation vous sera envoyé. Vérifiez vos courriers indésirables. Le lien est valable 30 minutes. Si vous ne recevez rien, vous pouvez refaire une demande après une heure ou contacter l’administration.' };
class RecoveryRequestDto { @IsEmail() @Length(3,254) email!: string; }
class RecoveryCompleteDto { @Matches(/^[a-f0-9]{64}$/) token!: string; @IsString() @Length(12,128) password!: string; }

@Injectable()
export class RecoveryService {
  constructor(private readonly db: Database) {}
  async request(email: string) {
    const started = Date.now();
    const config = recoveryMailConfig();
    const token = randomBytes(32).toString('hex');
    const tokenHash = recoveryHash(token);
    try {
      const request = await this.db.transaction(async em => {
        // Same lock order as manual recovery and administrator promotion/removal.
        await em.query('SELECT pg_advisory_xact_lock(1789381700)');
        const [account] = await em.query(`SELECT a.id,a.email,a.session_version FROM account a
          WHERE lower(a.email)=lower($1) AND a.active AND NOT a.platform_only
          AND NOT EXISTS(SELECT 1 FROM platform_admin p WHERE p.user_id=a.id)
          AND NOT EXISTS(SELECT 1 FROM closure_request c WHERE c.account_id=a.id AND c.status IN('APPROVED','PROCESSING'))
          FOR UPDATE OF a`, [email.trim()]);
        if (!account) return null;
        const recent = await em.query("SELECT 1 FROM recovery_request WHERE account_id=$1 AND requested_at>now()-interval '1 hour'", [account.id]);
        if (recent.length) return null;
        // An expired link or old assistance request must not block future requests forever.
        // A still-valid link issued manually remains valid and is not silently replaced.
        const live = await em.query("SELECT 1 FROM recovery_request WHERE account_id=$1 AND status='ISSUED' AND expires_at>now()", [account.id]);
        if (live.length) return null;
        await em.query(`UPDATE recovery_request SET status='REJECTED',token_hash=NULL,decision_reason='Demande remplacée après expiration du délai de renouvellement.'
          WHERE account_id=$1 AND status IN('REQUESTED','ISSUED')`, [account.id]);
        const [row] = await em.query(`INSERT INTO recovery_request(account_id,status,issued_at,expires_at,token_hash,account_version,email_status)
          VALUES($1,$2,CASE WHEN $3 THEN now() ELSE NULL END,CASE WHEN $3 THEN now()+interval '30 minutes' ELSE NULL END,$4,$5,$6)
          RETURNING id`, [account.id, config ? 'ISSUED' : 'REQUESTED', !!config, config ? tokenHash : null,
            config ? account.session_version : null, config ? 'SENDING' : 'NOT_REQUESTED']);
        return { id: row.id, email: account.email };
      });
      if (request && config) {
        const result = await sendRecoveryMail(config, request.email, token);
        // Never leak provider errors, account eligibility or the token to the caller.
        // Guard by token: manual reissue/completion may have happened during the send.
        await this.db.query(`UPDATE recovery_request SET email_status=$3,email_provider_id=$4,email_last_error=$5,
            status=CASE WHEN $3='FAILED' THEN 'REQUESTED' ELSE status END,
            token_hash=CASE WHEN $3='FAILED' THEN NULL ELSE token_hash END,
            expires_at=CASE WHEN $3='FAILED' THEN NULL ELSE expires_at END
          WHERE id=$1 AND token_hash=$2 AND status='ISSUED'`,
          [request.id, tokenHash, result.status, result.providerId, result.error]).catch(() => undefined);
      }
      // An accepted provider request is not a guarantee of inbox delivery.
      return config ? automaticRecoveryAcknowledgement : recoveryAcknowledgement;
    } finally {
      // Unknown/excluded/rate-limited accounts wait through the same mail time budget.
      await new Promise(resolve => setTimeout(resolve, Math.max(0, (config ? RECOVERY_RESPONSE_MINIMUM_MS : 300) - (Date.now() - started))));
    }
  }
  async complete(token: string, password: string) {
    const invalid = () => new BadRequestException({code:'RECOVERY_INVALID',message:'Ce lien est invalide, expiré ou déjà utilisé. Demandez un nouveau lien depuis « Mot de passe oublié ».'});
    // Precheck avoids expensive password hashing for random tokens; recheck under lock below.
    const [candidate] = await this.db.query("SELECT account_id FROM recovery_request WHERE token_hash=$1 AND status='ISSUED' AND expires_at>now()",[recoveryHash(token)]);
    if(!candidate) throw invalid();
    const passwordHash = await argon2.hash(password,{type:argon2.argon2id,memoryCost:65536,timeCost:3,parallelism:1});
    await this.db.transaction(async em => {
      await em.query('SELECT pg_advisory_xact_lock(1789381700)');
      const [account] = await em.query('SELECT id,active,platform_only,session_version FROM account WHERE id=$1 FOR UPDATE',[candidate.account_id]);
      const [row] = await em.query("SELECT id,account_version FROM recovery_request WHERE account_id=$1 AND token_hash=$2 AND status='ISSUED' AND expires_at>now() FOR UPDATE",[candidate.account_id,recoveryHash(token)]);
      const admins=await em.query('SELECT 1 FROM platform_admin WHERE user_id=$1',[candidate.account_id]);
      const closing=await em.query("SELECT 1 FROM closure_request WHERE account_id=$1 AND status IN('APPROVED','PROCESSING')",[candidate.account_id]);
      if(!account?.active||account.platform_only||admins.length||closing.length||!row||row.account_version!==account.session_version) throw invalid();
      await em.query('UPDATE account SET password_hash=$2,session_version=session_version+1 WHERE id=$1',[account.id,passwordHash]);
      await em.query("DELETE FROM session WHERE sess->>'userId'=$1",[account.id]);
      await em.query("UPDATE recovery_request SET status='COMPLETED',completed_at=now(),token_hash=NULL WHERE id=$1",[row.id]);
      await audit(em,account.id,'PASSWORD_RECOVERED',account.id,{requestId:row.id});
    });
    return {ok:true};
  }
}

@Controller('auth/recovery')
export class RecoveryController {
  constructor(private readonly service: RecoveryService) {}
  @Post('request') request(@Body() b: RecoveryRequestDto) { return this.service.request(b.email); }
  @Post('complete') complete(@Body() b: RecoveryCompleteDto) { return this.service.complete(b.token,b.password); }
}
