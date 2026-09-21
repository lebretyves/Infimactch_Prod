import { BadRequestException, Body, ConflictException, Controller, Delete, Headers, Injectable, Param, ParseUUIDPipe, Post, Req, UseGuards } from '@nestjs/common';
import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, Length, Matches } from 'class-validator';
import { Request } from 'express';
import { Database, audit } from '../database/database';
import { member, SessionGuard, user } from '../common/access';
import { commandReceipt } from '../common/idempotency';
import { FINESS_PATTERN } from '../reference-data/finess';
export class AgencyEstablishmentDto {
  @ApiProperty() @IsString() @Length(2,150) name!: string;
  @ApiProperty() @IsString() @Length(5,500) address!: string;
  @ApiProperty() @IsString() @Length(2,150) referent!: string;
  @ApiProperty({required:false}) @IsOptional() @Matches(FINESS_PATTERN) finess?: string;
}
@Injectable()
export class AgencyEstablishmentsService {
  constructor(private readonly db: Database) {}
  add(actor: string, agencyId: string, body: AgencyEstablishmentDto, key: string) {
    const b={...body,name:body.name.trim(),address:body.address.trim(),referent:body.referent.trim()};
    if(b.name.length<2||b.address.length<5||b.referent.length<2)throw new BadRequestException('Complétez le nom, l’adresse et le référent.');
    return this.db.transaction(async em=>{
      await member(em,actor,agencyId,'AGENCY');
      await em.query('SELECT id FROM organization WHERE id=$1 FOR UPDATE',[agencyId]);
      const receipt=await commandReceipt(em,actor,'agency-establishment:add',key,{agencyId,...b});
      if(receipt.replay)return receipt.response;
      // FINESS describes a public place; it must never grant access to another organization's private data.
      // Reuse only an establishment already linked to this agency, otherwise create a separate agency record.
      const [existing]=await em.query(`SELECT o.id FROM organization o JOIN agency_link l ON l.establishment_id=o.id
        WHERE l.agency_id=$1 AND (($2::text IS NOT NULL AND o.finess=$2) OR (lower(o.name)=lower($3) AND lower(o.address)=lower($4))) ORDER BY o.id LIMIT 1`,[agencyId,b.finess??null,b.name,b.address]);
      if(existing)return receipt.save({id:existing.id,alreadyLinked:true});
      const [created]=await em.query("INSERT INTO organization(kind,name,address,referent,finess) VALUES('ESTABLISHMENT',$1,$2,$3,$4) RETURNING id",[b.name,b.address,b.referent,b.finess??null]);
      await em.query('INSERT INTO agency_link(agency_id,establishment_id) VALUES($1,$2)',[agencyId,created.id]);
      await audit(em,actor,'AGENCY_ESTABLISHMENT_ADDED',created.id,{agencyId});
      return receipt.save({id:created.id,alreadyLinked:false});
    });
  }
  remove(actor: string, agencyId: string, id: string) {
    return this.db.transaction(async em=>{
      await member(em,actor,agencyId,'AGENCY');
      // Same link row is held FOR SHARE during mission creation, serializing removal with new missions.
      const [link]=await em.query('SELECT agency_id FROM agency_link WHERE agency_id=$1 AND establishment_id=$2 FOR UPDATE',[agencyId,id]);
      if(!link)return {ok:true};
      const active=await em.query("SELECT id FROM mission WHERE agency_id=$1 AND establishment_id=$2 AND status IN('DRAFT','OPEN','FILLED') LIMIT 1",[agencyId,id]);
      if(active.length)throw new ConflictException('Cet établissement possède encore des missions en brouillon, ouvertes ou pourvues. Terminez ou annulez ces missions avant de le retirer.');
      await em.query('DELETE FROM agency_link WHERE agency_id=$1 AND establishment_id=$2',[agencyId,id]);
      await audit(em,actor,'AGENCY_ESTABLISHMENT_REMOVED',id,{agencyId});
      return {ok:true};
    });
  }
}
@Controller('agencies/:agencyId/establishments')
@UseGuards(SessionGuard)
export class AgencyEstablishmentsController {
  constructor(private readonly service: AgencyEstablishmentsService) {}
  @Post() add(@Req() r:Request,@Param('agencyId',ParseUUIDPipe) agencyId:string,@Body() b:AgencyEstablishmentDto,@Headers('idempotency-key') key:string) {return this.service.add(user(r),agencyId,b,key);}
  @Delete(':id') remove(@Req() r:Request,@Param('agencyId',ParseUUIDPipe) agencyId:string,@Param('id',ParseUUIDPipe) id:string) {return this.service.remove(user(r),agencyId,id);}
}
