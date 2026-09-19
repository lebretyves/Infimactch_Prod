import {Body,Controller,Get,Module,Param,ParseUUIDPipe,Put,Req,UseGuards} from '@nestjs/common';
import {ApiProperty} from '@nestjs/swagger';
import {Type} from 'class-transformer';
import {IsDefined,IsInt,IsObject,IsString,Max,MaxLength,Min,ValidateNested} from 'class-validator';
import {Request} from 'express';
import {SessionGuard,user} from '../common/access';
import {ContractsService} from './contracts.service';
export class ContractNotesDto {
 @ApiProperty({maxLength:2000}) @IsString() @MaxLength(2000) reason!:string;
 @ApiProperty({maxLength:2000}) @IsString() @MaxLength(2000) workSchedule!:string;
 @ApiProperty({maxLength:2000}) @IsString() @MaxLength(2000) payTerms!:string;
 @ApiProperty({maxLength:150}) @IsString() @MaxLength(150) contactName!:string;
 @ApiProperty({maxLength:2000}) @IsString() @MaxLength(2000) additionalNotes!:string;
}
export class ContractPreparationDto {
 @ApiProperty({minimum:0,maximum:2147483646}) @IsInt() @Min(0) @Max(2147483646) version!:number;
 @ApiProperty({type:ContractNotesDto}) @IsDefined() @IsObject() @ValidateNested() @Type(()=>ContractNotesDto) notes!:ContractNotesDto;
}
@Controller('assignments/:id/contract-preparation') @UseGuards(SessionGuard)
export class ContractsController {
 constructor(private readonly service:ContractsService){}
 @Get() get(@Req() r:Request,@Param('id',ParseUUIDPipe) id:string){return this.service.read(user(r),id);}
 @Put() save(@Req() r:Request,@Param('id',ParseUUIDPipe) id:string,@Body() body:ContractPreparationDto){return this.service.save(user(r),id,body);}
}
@Module({controllers:[ContractsController],providers:[ContractsService,SessionGuard]})
export class ContractsModule {}
