import {Body,Controller,Get,Module,Param,ParseUUIDPipe,Post,Query,Req,UseGuards} from '@nestjs/common';
import {IsIn,IsOptional,IsString,IsUUID,Length} from 'class-validator';
import {Request} from 'express';
import {SessionGuard,user} from '../common/access';
import {AdminGuard,authorizeAdmin} from '../admin/admin-auth';
import {SupportService,SUPPORT_CATEGORIES,supportOffset} from './support.service';
class CreateTicket {@IsUUID() clientRequestId!:string;@IsIn(SUPPORT_CATEGORIES) category!:string;@IsString() @Length(3,150) subject!:string;@IsString() @Length(10,4000) description!:string;}
class ReplyTicket {@IsUUID() clientRequestId!:string;@IsString() @Length(2,4000) body!:string;@IsOptional() @IsIn(['OPEN','RESOLVED']) status?:string;}
@Controller('me/support-tickets') @UseGuards(SessionGuard)
export class MySupportController {
 constructor(private readonly service:SupportService){}
 @Get() list(@Req() r:Request,@Query('offset') offset?:string){return this.service.list(user(r),supportOffset(offset));}
 @Post() create(@Req() r:Request,@Body() b:CreateTicket){return this.service.create(user(r),b);}
 @Get(':id') detail(@Req() r:Request,@Param('id',ParseUUIDPipe) id:string,@Query('offset') offset?:string){return this.service.detail(user(r),id,supportOffset(offset));}
 @Post(':id/replies') reply(@Req() r:Request,@Param('id',ParseUUIDPipe) id:string,@Body() b:ReplyTicket){return this.service.reply(user(r),id,b);}
}
@Controller('admin/support-tickets') @UseGuards(AdminGuard)
export class AdminSupportController {
 constructor(private readonly service:SupportService){}
 @Get() list(@Req() r:Request,@Query('offset') offset?:string){return this.service.list(authorizeAdmin(r,'accounts'),supportOffset(offset),true);}
 @Get(':id') detail(@Req() r:Request,@Param('id',ParseUUIDPipe) id:string,@Query('offset') offset?:string){return this.service.detail(authorizeAdmin(r,'accounts'),id,supportOffset(offset),true);}
 @Post(':id/replies') reply(@Req() r:Request,@Param('id',ParseUUIDPipe) id:string,@Body() b:ReplyTicket){return this.service.reply(authorizeAdmin(r,'accounts:write',true),id,b,true);}
}
@Module({controllers:[MySupportController,AdminSupportController],providers:[SupportService,SessionGuard,AdminGuard]})
export class SupportModule {}
