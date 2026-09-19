import {BadRequestException,Controller,Get,Injectable,NotFoundException,Query,Req,UseGuards} from '@nestjs/common';
import {ApiProperty} from '@nestjs/swagger';
import {IsUUID,Matches} from 'class-validator';
import {Request} from 'express';
import {Database} from '../database/database';
import {SessionGuard,user} from '../common/access';
import {mutedDemoMissionIds} from '../notifications/demo-suppression';

export class ConversionQuery {
  @ApiProperty({format:'uuid'}) @IsUUID() organizationId!:string;
  @ApiProperty({format:'date',description:'Premier jour inclus, UTC'}) @Matches(/^\d{4}-\d{2}-\d{2}$/) from!:string;
  @ApiProperty({format:'date',description:'Dernier jour inclus, UTC; période maximale de 366 jours'}) @Matches(/^\d{4}-\d{2}-\d{2}$/) to!:string;
}
export function validateConversionPeriod(from:string,to:string,now=Date.now()) {
  const day=(value:string)=>{if(!/^\d{4}-\d{2}-\d{2}$/.test(value))return NaN;const parsed=Date.parse(value+'T00:00:00.000Z');return Number.isFinite(parsed)&&new Date(parsed).toISOString().slice(0,10)===value?parsed:NaN;};
  const start=day(from),end=day(to),today=day(new Date(now).toISOString().slice(0,10));
  if(!Number.isFinite(start)||!Number.isFinite(end)||start<Date.UTC(2000,0,1)||end<start||end>today||end-start>365*86400000)
    throw new BadRequestException('Choisissez une période valide de 366 jours maximum, entre le 1er janvier 2000 et aujourd’hui (UTC).');
}
export function conversionRate(numerator:number,denominator:number){return{numerator,denominator,percent:denominator?Math.round(numerator/denominator*10000)/100:null};}
@Injectable()
export class ConversionService {
  constructor(private readonly db:Database){}
  async report(actor:string,input:ConversionQuery){
    validateConversionPeriod(input.from,input.to);
    return this.db.transaction(async em=>{
      await em.query('SET TRANSACTION ISOLATION LEVEL REPEATABLE READ');
      const [organization]=await em.query(`SELECT o.id,o.name,o.kind FROM organization o
        JOIN membership mb ON mb.organization_id=o.id AND mb.user_id=$1 AND mb.active
        JOIN account a ON a.id=mb.user_id AND a.active AND NOT a.platform_only AND a.family='ENTERPRISE'
        WHERE o.id=$2`,[actor,input.organizationId]);
      if(!organization)throw new NotFoundException();
      const [data]=await em.query(`WITH scoped AS (
        SELECT m.*,m.id=ANY($4::uuid[]) AS demo FROM mission m WHERE $1::uuid IN(m.agency_id,m.establishment_id)
      ), real_missions AS (SELECT * FROM scoped WHERE NOT demo), publication_cohort AS (
        SELECT * FROM real_missions WHERE first_published_at>=$2::date AND first_published_at<$3::date+interval '1 day'
      ), submissions AS (
        SELECT a.id,a.mission_id,(SELECT min(t.created_at) FROM audit t WHERE t.resource_id=a.id AND t.event='APPLICATION_SUBMITTED'
          AND t.details ? 'previousStatus' AND t.details->'previousStatus'='null'::jsonb) AS submitted_at
        FROM application a JOIN real_missions m ON m.id=a.mission_id
      ), application_cohort AS (
        SELECT * FROM submissions WHERE submitted_at>=$2::date AND submitted_at<$3::date+interval '1 day'
      ), assignment_cohort AS (
        SELECT a.* FROM assignment a JOIN real_missions m ON m.id=a.mission_id
          WHERE a.created_at>=$2::date AND a.created_at<$3::date+interval '1 day'
      ), filling_delays AS (
        SELECT m.id,extract(epoch FROM (min(a.created_at)-m.first_published_at))/3600 AS hours
        FROM publication_cohort m JOIN assignment a ON a.mission_id=m.id AND a.status IN('ACTIVE','COMPLETED')
          AND a.created_at>=m.first_published_at GROUP BY m.id,m.first_published_at
      ) SELECT
        (SELECT count(*)::int FROM publication_cohort) AS published,
        (SELECT count(*)::int FROM publication_cohort m WHERE EXISTS(SELECT 1 FROM assignment a WHERE a.mission_id=m.id AND a.status IN('ACTIVE','COMPLETED'))) AS filled,
        (SELECT count(*)::int FROM publication_cohort WHERE status='CANCELLED') AS cancelled_missions,
        (SELECT count(*)::int FROM application_cohort) AS applications,
        (SELECT count(*)::int FROM application_cohort c WHERE EXISTS(SELECT 1 FROM assignment a WHERE a.application_id=c.id)) AS selected,
        (SELECT count(*)::int FROM assignment_cohort) AS assignments,
        (SELECT count(*)::int FROM assignment_cohort WHERE status='CANCELLED') AS cancelled_assignments,
        (SELECT avg(hours)::double precision FROM filling_delays) AS average_fill_hours,
        (SELECT count(*)::int FROM filling_delays) AS delay_samples,
        (SELECT count(*)::int FROM real_missions WHERE first_published_at IS NULL AND status<>'DRAFT') AS undated_publications,
        (SELECT count(*)::int FROM submissions WHERE submitted_at IS NULL) AS undated_applications,
        (SELECT count(*)::int FROM scoped WHERE demo) AS excluded_demo,
        transaction_timestamp() AS observed_at`,[organization.id,input.from,input.to,mutedDemoMissionIds]);
      return {organization,period:{from:input.from,to:input.to,timeZone:'UTC',endInclusive:true},observedAt:new Date(data.observed_at).toISOString(),
        fillRate:conversionRate(data.filled,data.published),selectionRate:conversionRate(data.selected,data.applications),
        missionCancellationRate:conversionRate(data.cancelled_missions,data.published),assignmentCancellationRate:conversionRate(data.cancelled_assignments,data.assignments),
        fillDelay:{averageHours:data.average_fill_hours===null?null:Math.round(data.average_fill_hours*100)/100,samples:data.delay_samples},
        exclusions:{demoMissions:data.excluded_demo,undatedPublications:data.undated_publications,undatedApplications:data.undated_applications,externalOffers:true},
        definitions:{fill:'Missions de la cohorte de première publication connue ayant actuellement une affectation ACTIVE ou COMPLETED.',selection:'Candidatures dont la soumission initiale est attestée dans la période par APPLICATION_SUBMITTED (previousStatus null), ayant produit au moins une affectation, même annulée ensuite.',cancellation:'Mission : statut actuel CANCELLED de la cohorte publiée. Affectation : statut actuel CANCELLED de la cohorte de création des affectations.',delay:'Moyenne, parmi les missions publiées dans la période, du délai jusqu’à leur première affectation encore ACTIVE ou COMPLETED ; délais négatifs exclus.',history:'Résultats actuels de cohortes datées, pas photographie à la fin de période. Historique non datable exclu, compté sur toute l’organisation. Les resoumissions ne créent pas une nouvelle candidature distincte. Seuls les UUID du reçu de démonstration conservé sont exclus : un jeu fictif non identifié ne peut pas être reconnu automatiquement. Aucune statistique de consultation collectée.'}};
    });
  }
}
@Controller('dashboards/conversions')
@UseGuards(SessionGuard)
export class ConversionController {
  constructor(private readonly conversions:ConversionService){}
  @Get() report(@Req() request:Request,@Query() query:ConversionQuery){return this.conversions.report(user(request),query);}
}
