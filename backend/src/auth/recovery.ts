import { BadRequestException, Body, Controller, Injectable, Post } from '@nestjs/common';
import { IsEmail, IsString, Length, Matches } from 'class-validator';
import { createHash } from 'node:crypto';
import * as argon2 from 'argon2';
import { Database, audit } from '../database/database';

export const recoveryHash = (value: string) => createHash('sha256').update(value).digest('hex');
export const recoveryAcknowledgement = { ok: true, message: 'Si cette adresse correspond à un compte client, la demande sera examinée par l’administration. Aucun email automatique n’est envoyé. Contactez votre interlocuteur habituel pour vérifier votre identité.' };
class RecoveryRequestDto { @IsEmail() @Length(3,254) email!: string; }
class RecoveryCompleteDto { @Matches(/^[a-f0-9]{64}$/) token!: string; @IsString() @Length(12,128) password!: string; }

@Injectable()
export class RecoveryService {
  constructor(private readonly db: Database) {}
  async request(email: string) {
    const started = Date.now();
    // Same response for unknown, inactive, administrator and existing client accounts.
    await this.db.query(`INSERT INTO recovery_request(account_id)
      SELECT a.id FROM account a WHERE lower(a.email)=lower($1) AND a.active AND NOT a.platform_only
      AND NOT EXISTS(SELECT 1 FROM platform_admin p WHERE p.user_id=a.id)
      AND NOT EXISTS(SELECT 1 FROM recovery_request r WHERE r.account_id=a.id AND r.requested_at>now()-interval '1 hour')
      AND NOT EXISTS(SELECT 1 FROM closure_request c WHERE c.account_id=a.id AND c.status IN('APPROVED','PROCESSING'))
      ON CONFLICT DO NOTHING`, [email.trim()]);
    await new Promise(resolve => setTimeout(resolve, Math.max(0, 300-(Date.now()-started))));
    return recoveryAcknowledgement;
  }
  async complete(token: string, password: string) {
    const invalid = () => new BadRequestException({code:'RECOVERY_INVALID',message:'Ce lien est invalide, expiré ou déjà utilisé. Demandez un nouveau lien à l’administration.'});
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
