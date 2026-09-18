import {cancellationRecord} from '../automation/mission-mail';
import {validDateBounds,startsInPast} from "../domain/schedule-period";
import { assessApplication } from "./application-assessment";
import { assessAssignment } from "./assignment-assessment";
import { requireActiveAccount } from "../common/access";
import { commandReceipt } from "../common/idempotency";
import { geodesicKm } from "../database/distance";
import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from "@nestjs/common";
import { SqlClient } from "../database/database";
import { createHash } from "node:crypto";
import { Database, audit, event } from "../database/database";
import { member, nurse } from "../common/access";
import { MissionDto } from "./mission.dto";
import { interval, MatchMission } from "../domain/matching";
import { professional } from "../profiles/profiles.module";
export const missionSelect =
  "SELECT m.*,ST_Y(m.location::geometry) AS latitude,ST_X(m.location::geometry) AS longitude FROM mission m";
export function matchingMission(m: any): MatchMission {
  return {
    start: new Date(m.start_at).toISOString(),
    end: new Date(m.end_at).toISOString(),
    status: m.status,
    qualification: m.qualification,
    service: m.service,
    population: m.population,
    block: m.block,
    specialty: m.specialty,
    requiredSkills: m.required_skills,
    desiredSkills: m.desired_skills,
    minExperienceMonths: Number(m.min_experience_months),
    latitude: m.latitude,
    longitude: m.longitude,
    shift: m.shift,
    schedulePrecision: m.schedule_precision,
  };
}
export async function lockMission(em: SqlClient, id: string) {
  const [m] = await em.query(missionSelect + " WHERE m.id=$1 FOR UPDATE", [id]);
  if (!m) throw new NotFoundException();
  return m;
}
export async function scope(
  em: SqlClient,
  actor: string,
  m: any,
  agencyOnly = false,
) {
  if (agencyOnly) return m.agency_id ? member(em, actor, m.agency_id, "AGENCY") : member(em, actor, m.establishment_id, "ESTABLISHMENT");
  const rows = await em.query(
    "SELECT organization_id FROM membership WHERE user_id=$1 AND active AND organization_id IN($2,$3) FOR SHARE",
    [actor, m.agency_id, m.establishment_id],
  );
  if (!rows.length) throw new NotFoundException();
}
export async function eligible(em: SqlClient, p: any, m: any) {
  if (new Date(m.start_at).getTime() <= Date.now())
    throw new ConflictException("Mission already started");
  const conflicts = await em.query(
    "SELECT start_at,end_at FROM assignment WHERE nurse_id=$1 AND status='ACTIVE'",
    [p.user_id],
  );
  const result = assessAssignment(
    professional(p, conflicts),
    matchingMission(m),
    await geodesicKm(em, p, m),
  );
  if (!result.eligible)
    throw new ConflictException({
      code: "INELIGIBLE",
      reasons: result.blockingReasons,
    });
  return result;
}
async function applicationAssessment(em: SqlClient, p: any, m: any) {
  const conflicts = await em.query(
    "SELECT start_at,end_at FROM assignment WHERE nurse_id=$1 AND status='ACTIVE'",
    [p.user_id],
  );
  return assessApplication(professional(p, conflicts), matchingMission(m), await geodesicKm(em, p, m));
}
@Injectable()
export class MissionsService {
  constructor(private readonly db: Database) {}
  private validate(b: MissionDto) {
    if (b.timezone !== undefined) {
      try {
        if (typeof b.timezone !== "string" || !/^[A-Za-z_]+(?:\/[A-Za-z0-9_+.-]+)*$/.test(b.timezone)) throw new Error();
        new Intl.DateTimeFormat("en", { timeZone: b.timezone }).format();
      } catch { throw new BadRequestException("Invalid mission timezone"); }
    }
    try {
      interval(b);
    } catch {
      throw new BadRequestException("Invalid mission interval");
    }
    if (b.schedulePrecision === 'DATE' && !validDateBounds(b.start,b.end,b.timezone))
      throw new BadRequestException("Date-only bounds must be complete local calendar days");
    if (b.block === "SPECIALIZED" && !b.specialty)
      throw new BadRequestException("Specialty required");
    if (b.block !== "SPECIALIZED" && b.specialty)
      throw new BadRequestException(
        "Specialty only applies to specialized block",
      );
  }
  async create(actor: string, b: MissionDto, key?: string, publish = false) {
    this.validate(b);
    return this.db.transaction(async (em) => {
      if (b.agencyId) {
        await member(em, actor, b.agencyId, "AGENCY");
        const linked = await em.query("SELECT 1 FROM agency_link WHERE agency_id=$1 AND establishment_id=$2 FOR SHARE", [b.agencyId,b.establishmentId]);
        if (!linked.length) throw new NotFoundException("Authorized establishment link required");
      } else {
        await member(em, actor, b.establishmentId, "ESTABLISHMENT");
      }
      if (b.staffingRequestId) {
        const [need] = await em.query("SELECT establishment_id FROM staffing_request WHERE id=$1 FOR SHARE",[b.staffingRequestId]);
        if (!need || need.establishment_id !== b.establishmentId) throw new NotFoundException("Staffing request not available for this organization");
      }
      const receipt = await commandReceipt(em, actor, publish ? "mission:create-open" : "mission:create", key, b);
      if (receipt.replay) return receipt.response;
      if (publish && startsInPast(b.start,b.schedulePrecision,b.timezone))
        throw new ConflictException("Mission must start in the future");
      const [m] = await em.query(
        `INSERT INTO mission(agency_id,establishment_id,title,description,qualification,service,population,block,specialty,required_skills,desired_skills,min_experience_months,start_at,end_at,shift,address,location,hourly_salary,staffing_request_id,timezone,schedule_precision) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,ST_SetSRID(ST_MakePoint($17,$18),4326)::geography,$19,$20,$21,$22) RETURNING id,version,status`,
        [
          b.agencyId ?? null,
          b.establishmentId,
          b.title,
          b.description,
          b.qualification,
          b.service,
          b.population,
          b.block,
          b.specialty ?? null,
          b.requiredSkills,
          b.desiredSkills,
          b.minExperienceMonths,
          b.start,
          b.end,
          b.shift,
          b.address,
          b.longitude,
          b.latitude,
          b.hourlySalary,
          b.staffingRequestId ?? null,
          b.timezone ?? "Europe/Paris",
          b.schedulePrecision ?? "EXACT",
        ],
      );
      await audit(em, actor, "MISSION_CREATED", m.id);
      if (publish) {
        const [opened] = await em.query("UPDATE mission SET status='OPEN' WHERE id=$1 RETURNING id,version,status", [m.id]);
        await audit(em, actor, "MISSION_OPEN", m.id);
        await event(em, "MissionOPEN", {missionId:m.id,version:opened.version});
        return receipt.save(opened);
      }
      return receipt.save(m);
    });
  }
  async edit(actor: string, id: string, b: MissionDto, key?: string) {
    this.validate(b);
    return this.db.transaction(async (em) => {
      const m = await lockMission(em, id);
      await scope(em, actor, m, true);
      this.validate({...b,schedulePrecision:b.schedulePrecision ?? m.schedule_precision,timezone:b.timezone ?? m.timezone});
      const receipt = await commandReceipt(
        em,
        actor,
        "mission:edit:" + id,
        key,
        b,
      );
      if (receipt.replay) return receipt.response;
      if (!["DRAFT", "OPEN"].includes(m.status))
        throw new ConflictException(
          "Cancel and republish assigned missions before changing them",
        );
      if (
        (b.agencyId ?? null) !== m.agency_id ||
        b.establishmentId !== m.establishment_id
      )
        throw new BadRequestException("Organization cannot be reassigned");
      if (b.staffingRequestId && b.staffingRequestId !== m.staffing_request_id) throw new BadRequestException("Staffing request cannot be reassigned");
      const oldTerms = [
        m.qualification,
        m.service,
        m.population,
        m.block,
        m.specialty,
        [...m.required_skills].sort(),
        [...m.desired_skills].sort(),
        Number(m.min_experience_months),
        new Date(m.start_at).toISOString(),
        new Date(m.end_at).toISOString(),
        m.shift,
        m.address,
        m.longitude,
        m.latitude,
        Number(m.hourly_salary),
        m.timezone ?? "Europe/Paris",
        m.schedule_precision ?? "EXACT",
      ];
      const newTerms = [
        b.qualification,
        b.service,
        b.population,
        b.block,
        b.specialty ?? null,
        [...b.requiredSkills].sort(),
        [...b.desiredSkills].sort(),
        b.minExperienceMonths,
        new Date(b.start).toISOString(),
        new Date(b.end).toISOString(),
        b.shift,
        b.address,
        b.longitude,
        b.latitude,
        b.hourlySalary,
        b.timezone ?? m.timezone ?? "Europe/Paris",
        b.schedulePrecision ?? m.schedule_precision ?? "EXACT",
      ];
      const revision =
        JSON.stringify(oldTerms) === JSON.stringify(newTerms) ? 0 : 1;
      const [updated] = await em.query(
        `UPDATE mission SET title=$2,description=$3,qualification=$4,service=$5,population=$6,block=$7,specialty=$8,required_skills=$9,desired_skills=$10,min_experience_months=$11,start_at=$12,end_at=$13,shift=$14,address=$15,location=ST_SetSRID(ST_MakePoint($16,$17),4326)::geography,hourly_salary=$18,version=version+$19,timezone=$20,schedule_precision=$21 WHERE id=$1 RETURNING id,version,status`,
        [
          id,
          b.title,
          b.description,
          b.qualification,
          b.service,
          b.population,
          b.block,
          b.specialty ?? null,
          b.requiredSkills,
          b.desiredSkills,
          b.minExperienceMonths,
          b.start,
          b.end,
          b.shift,
          b.address,
          b.longitude,
          b.latitude,
          b.hourlySalary,
          revision,
          b.timezone ?? m.timezone ?? "Europe/Paris",
          b.schedulePrecision ?? m.schedule_precision ?? "EXACT",
        ],
      );
      await audit(em, actor, "MISSION_REVISED", id, {
        version: updated.version,
        conditionsChanged: Boolean(revision),
      });
      if (revision && m.status === "OPEN")
        await event(em, "MissionOPEN", {
          missionId: id,
          version: updated.version,
        });
      return receipt.save(updated);
    });
  }
  async transition(
    actor: string,
    id: string,
    action: "publish" | "cancel" | "reopen" | "complete",
    key?: string,
  ) {
    return this.db.transaction(async (em) => {
      const m = await lockMission(em, id);
      await scope(em, actor, m, true);
      const receipt = await commandReceipt(
        em,
        actor,
        "mission:" + action + ":" + id,
        key,
        {},
      );
      if (receipt.replay) return receipt.response;
      const target = {
        publish: "OPEN",
        cancel: "CANCELLED",
        reopen: "DRAFT",
        complete: "COMPLETED",
      }[action];
      const allowed = {
        publish: ["DRAFT"],
        cancel: ["DRAFT", "OPEN", "FILLED"],
        reopen: ["CANCELLED"],
        complete: ["FILLED"],
      }[action];
      if (!allowed.includes(m.status))
        throw new ConflictException("Invalid mission transition");
      if (action === "publish" && startsInPast(new Date(m.start_at).toISOString(),m.schedule_precision,m.timezone))
        throw new ConflictException("Mission must start in the future");
      if (action === "complete" && new Date(m.end_at).getTime() > Date.now())
        throw new ConflictException("Mission has not ended");
      const assignments = await em.query(
        "SELECT * FROM assignment WHERE mission_id=$1 AND status='ACTIVE' ORDER BY nurse_id",
        [id],
      );
      for (const a of assignments) {
        await nurse(em, a.nurse_id);
        await em.query("UPDATE profile SET updated_at=now() WHERE user_id=$1", [
          a.nurse_id,
        ]);
      }
      if (action === "cancel")
        for (const a of assignments) await cancellationRecord(em,m,a,"ENTERPRISE");
      if (["cancel", "complete"].includes(action))
        await em.query(
          "UPDATE assignment SET status=$2 WHERE mission_id=$1 AND status='ACTIVE'",
          [id, target],
        );
      if (action === "cancel")
        await em.query(
          "UPDATE mission_confirmation SET status='CANCELLED' WHERE assignment_id IN(SELECT id FROM assignment WHERE mission_id=$1)",
          [id],
        );
      const [updated] = await em.query(
        "UPDATE mission SET status=$2,version=version+$3 WHERE id=$1 RETURNING id,version,status",
        [id, target, action === "reopen" ? 1 : 0],
      );
      await audit(em, actor, "MISSION_" + target, id);
      await event(em, "Mission" + target, {
        missionId: id,
        version: updated.version,
        ...(action === "cancel" ? {previousStatus: m.status, nurseIds: assignments.map((a: {nurse_id: string}) => a.nurse_id)} : {}),
      });
      return receipt.save(updated);
    });
  }
  async applicationCheck(actor: string, id: string) {
    return this.db.transaction(async (em) => {
      const m = await lockMission(em, id);
      await requireActiveAccount(em, actor);
      const p = await nurse(em, actor);
      return applicationAssessment(em, p, m);
    });
  }
  async apply(actor: string, id: string, version: number, key?: string) {
    return this.db.transaction(async (em) => {
      const m = await lockMission(em, id);
      await requireActiveAccount(em, actor);
      const p = await nurse(em, actor);
      const receipt = await commandReceipt(
        em,
        actor,
        "application:submit:" + id,
        key,
        { version },
      );
      if (receipt.replay) return receipt.response;
      const [previous] = await em.query(
        "SELECT * FROM application WHERE mission_id=$1 AND nurse_id=$2 FOR UPDATE",
        [id, actor],
      );
      if (previous?.status === "ACCEPTED" && m.status !== "OPEN")
        throw new ConflictException("Assigned application");
      if (m.version !== version)
        throw new ConflictException("Mission version changed");
      const assessment = await applicationAssessment(em, p, m);
      if (assessment.blockingReasons.length)
        throw new ConflictException({code: "INELIGIBLE", reasons: assessment.blockingReasons});
      const [a] = await em.query(
        `INSERT INTO application(mission_id,nurse_id,consent_version) VALUES($1,$2,$3) ON CONFLICT(mission_id,nurse_id) DO UPDATE SET status='SUBMITTED',consent_version=$3,updated_at=now() RETURNING *`,
        [id, actor, version],
      );
      await audit(em, actor, "APPLICATION_SUBMITTED", a.id, {
        missionId: id,
        version,
        previousStatus: previous?.status ?? null,
        warnings: assessment.warnings,
      });
      return receipt.save({...a, warnings: assessment.warnings});
    });
  }
  async applicationAction(
    actor: string,
    id: string,
    action: "WITHDRAWN" | "SELECTED" | "REJECTED",
    key?: string,
  ) {
    return this.db.transaction(async (em) => {
      const [ref] = await em.query(
        "SELECT mission_id,nurse_id FROM application WHERE id=$1",
        [id],
      );
      if (!ref) throw new NotFoundException();
      const m = await lockMission(em, ref.mission_id);
      if (action === "SELECTED") await requireActiveAccount(em, ref.nurse_id);
      await nurse(em, ref.nurse_id);
      const [a] = await em.query(
        "SELECT * FROM application WHERE id=$1 FOR UPDATE",
        [id],
      );
      if (action === "WITHDRAWN") {
        if (a.nurse_id !== actor) throw new NotFoundException();
      } else await scope(em, actor, m);
      const receipt = await commandReceipt(
        em,
        actor,
        "application:" + action + ":" + id,
        key,
        {},
      );
      if (receipt.replay) return receipt.response;
      if (!["SUBMITTED", "SELECTED"].includes(a.status))
        throw new ConflictException("Invalid application transition");
      if (
        action !== "WITHDRAWN" &&
        (m.status !== "OPEN" || a.consent_version !== m.version)
      )
        throw new ConflictException("Fresh consent required");
      await em.query(
        "UPDATE application SET status=$2,updated_at=now() WHERE id=$1",
        [id, action],
      );
      await audit(em, actor, "APPLICATION_" + action, id);
      return receipt.save({ id, status: action });
    });
  }
  async cancelAssignment(actor:string,id:string,key?:string) {
    return this.db.transaction(async em=>{
      const [ref]=await em.query('SELECT mission_id,nurse_id FROM assignment WHERE id=$1',[id]);
      if(!ref || ref.nurse_id!==actor)throw new NotFoundException();
      const m=await lockMission(em,ref.mission_id);
      await requireActiveAccount(em,actor);
      await nurse(em,actor);
      const receipt=await commandReceipt(em,actor,'assignment:cancel:'+id,key,{});
      if(receipt.replay)return receipt.response;
      const [a]=await em.query('SELECT * FROM assignment WHERE id=$1 FOR UPDATE',[id]);
      if(a.status==='CANCELLED')return receipt.save({id,status:'CANCELLED'});
      if(a.status!=='ACTIVE' || m.status!=='FILLED')throw new ConflictException('Cette affectation ne peut plus être annulée.');
      if(new Date(a.start_at).getTime()<=Date.now())throw new ConflictException('La mission a déjà commencé. Contactez l’entreprise pour organiser son interruption.');
      await cancellationRecord(em,m,a,'NURSE');
      await em.query("UPDATE assignment SET status='CANCELLED' WHERE id=$1",[id]);
      await em.query("UPDATE application SET status='WITHDRAWN',updated_at=now() WHERE id=$1",[a.application_id]);
      await em.query("UPDATE mission_confirmation SET status='CANCELLED' WHERE assignment_id=$1",[id]);
      await em.query("UPDATE mission SET status='OPEN' WHERE id=$1 AND NOT EXISTS(SELECT 1 FROM assignment WHERE mission_id=$1 AND status='ACTIVE')",[m.id]);
      await em.query('UPDATE profile SET updated_at=now() WHERE user_id=$1',[actor]);
      await audit(em,actor,'ASSIGNMENT_CANCELLED',id,{missionId:m.id});
      const [e]=await em.query("INSERT INTO outbox(event,payload,completed_at) VALUES('AssignmentCancelled',$1,now()) RETURNING id",[JSON.stringify({assignmentId:id,missionId:m.id,version:m.version})]);
      await em.query("INSERT INTO notification(user_id,event_id,kind,message,organization_id,href,context) SELECT s.user_id,$1,'CANCELLATION','L’intérimaire a annulé son affectation. Le PDF d’annulation sera disponible dans le suivi.',s.organization_id,$2,$3 FROM membership s JOIN account a ON a.id=s.user_id AND a.active WHERE s.active AND s.organization_id IN($4,$5) ON CONFLICT DO NOTHING",[e.id,'/gestion/missions/'+m.id,JSON.stringify({missionId:m.id,version:m.version,assignmentId:id}),m.agency_id,m.establishment_id]);
      return receipt.save({id,status:'CANCELLED'});
    });
  }
  async assign(actor: string, id: string, applicationId: string, key: string) {
    if (!key || key.length > 100)
      throw new BadRequestException(
        "Idempotency-Key required (max 100 characters)",
      );
    const operation = "assign:" + id,
      hash = createHash("sha256")
        .update(JSON.stringify({ id, applicationId }))
        .digest("hex");
    try {
      return await this.db.transaction(async (em) => {
        const m = await lockMission(em, id);
        await scope(em, actor, m, true);
        const [saved] = await em.query(
          "SELECT * FROM idempotency WHERE actor_id=$1 AND operation=$2 AND key=$3",
          [actor, operation, key],
        );
        if (saved) {
          if (saved.content_hash !== hash)
            throw new ConflictException(
              "Idempotency key reused with different content",
            );
          return saved.response;
        }
        const [ref] = await em.query(
          "SELECT nurse_id FROM application WHERE id=$1 AND mission_id=$2",
          [applicationId, id],
        );
        if (!ref) throw new NotFoundException();
        await requireActiveAccount(em, ref.nurse_id);
        const p = await nurse(em, ref.nurse_id);
        const [a] = await em.query(
          "SELECT * FROM application WHERE id=$1 FOR UPDATE",
          [applicationId],
        );
        if (
          !["SUBMITTED", "SELECTED"].includes(a.status) ||
          a.consent_version !== m.version
        )
          throw new ConflictException("Fresh application consent required");
        const assessment = await eligible(em, p, m);
        const [assigned] = await em.query(
          "INSERT INTO assignment(mission_id,nurse_id,application_id,start_at,end_at) VALUES($1,$2,$3,$4,$5) RETURNING *",
          [id, p.user_id, a.id, m.start_at, m.end_at],
        );
        await em.query(
          "UPDATE application SET status='ACCEPTED',updated_at=now() WHERE id=$1",
          [a.id],
        );
        await em.query("UPDATE mission SET status='FILLED' WHERE id=$1", [id]);
        await em.query("UPDATE profile SET updated_at=now() WHERE user_id=$1", [
          p.user_id,
        ]);
        await audit(em, actor, "ASSIGNMENT_CREATED", assigned.id, {
          missionId: id,
          profileWarnings: assessment.warnings,
        });
        await event(em, "AssignmentCreated", {
          assignmentId: assigned.id,
          missionId: id,
          version: m.version,
        });
        await em.query(
          "INSERT INTO idempotency(actor_id,operation,key,content_hash,response) VALUES($1,$2,$3,$4,$5)",
          [actor, operation, key, hash, JSON.stringify(assigned)],
        );
        return assigned;
      });
    } catch (e: any) {
      if (["23P01", "23505", "40001", "40P01"].includes(e.code))
        throw new ConflictException("Concurrent incompatible assignment");
      throw e;
    }
  }
}
