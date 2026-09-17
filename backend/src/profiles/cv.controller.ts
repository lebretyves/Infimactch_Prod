import {Body,Controller,Post,Req,UseGuards} from '@nestjs/common';
import {ApiProperty} from '@nestjs/swagger';
import {IsString,Length} from 'class-validator';
import {Request} from 'express';
import {Database} from '../database/database';
import {SessionGuard,nurse,user} from '../common/access';
import {parseCvExperience} from './cv-parser';
export class CvTextDto {@ApiProperty({maxLength:60000,description:'Texte extrait du CV ; analyse sans enregistrement du document ou du profil.'}) @IsString() @Length(1,60000) text!:string;}
@Controller('profile/cv') @UseGuards(SessionGuard)
export class CvController {
 constructor(private readonly db:Database){}
 @Post('parse') async parse(@Req() r:Request,@Body() b:CvTextDto){await this.db.transaction(em=>nurse(em,user(r)));return parseCvExperience(b.text);}
}
