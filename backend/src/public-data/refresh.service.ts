import {BadRequestException,Injectable,Module} from '@nestjs/common';
import {Database} from '../database/database';
import {fetchOffers,importOffers} from './offers';
import {fetchJobsPipe,normalizeJobsPipe} from './jobspipe';

export const PROVIDERS=['FRANCE_TRAVAIL','JOBSPIPE'] as const;
export type Provider=typeof PROVIDERS[number];
export function providerName(value:string):Provider {
  if(!(PROVIDERS as readonly string[]).includes(value))throw new BadRequestException('Source inconnue.');
  return value as Provider;
}

@Injectable()
export class RefreshService {
  constructor(private readonly db:Database){}
  async run(provider:Provider,manual=false) {
    // The transaction-scoped lock is held across acquisition and import. Another
    // trigger returns immediately instead of multiplying network calls.
    return this.db.transaction(async em=>{
      const [lock]=await em.query('SELECT pg_try_advisory_xact_lock($1) AS acquired',[provider==='FRANCE_TRAVAIL'?1789381901:1789381902]);
      if(!lock.acquired)return {provider,status:'BUSY',accepted:0};
      const [control]=await em.query('SELECT enabled,last_started_at FROM source_control WHERE provider=$1 FOR UPDATE',[provider]);
      if(!control)throw Error('SOURCE_CONTROL_MISSING');
      if(!manual&&!control.enabled)return {provider,status:'PAUSED',accepted:0};
      if(control.last_started_at&&Date.now()-new Date(control.last_started_at).getTime()<60000)return {provider,status:'COOLDOWN',accepted:0};
      await em.query('UPDATE source_control SET last_started_at=now() WHERE provider=$1',[provider]);
      try {
        const summary=provider==='FRANCE_TRAVAIL'
          ?await importOffers(this.db,await fetchOffers(25),false)
          :await importOffers(this.db,await fetchJobsPipe(10),false,normalizeJobsPipe,'JOBSPIPE');
        return {provider,status:'SUCCESS',accepted:summary.accepted};
      } catch {
        await em.query("INSERT INTO import_run(provider,status,summary) VALUES($1,'FAILED',$2)",[provider,JSON.stringify({code:'PROVIDER_REFRESH_FAILED'})]);
        return {provider,status:'RETRY_REQUIRED',accepted:0};
      }
    });
  }
}
@Module({providers:[RefreshService],exports:[RefreshService]})
export class RefreshModule {}
