import {Body,Controller,Get,Headers,HttpCode,Module,Param,ParseUUIDPipe,Post,Req,UseGuards} from '@nestjs/common';
import {Request} from 'express';
import {SessionGuard,user} from '../common/access';
import {AdminGuard,authorizeAdmin} from '../admin/admin-auth';
import {EmailDeliveryService,authorizeEmailWebhook} from './email-delivery';

@Controller('internal/automation/smtp2go')
export class EmailWebhookController {
  constructor(private readonly service: EmailDeliveryService) {}
  @Post('webhook') @HttpCode(200)
  webhook(@Headers('authorization') authorization: string, @Body() body: unknown) {
    authorizeEmailWebhook(authorization);
    return this.service.receive(body);
  }
}
@Controller('me/email-deliveries') @UseGuards(SessionGuard)
export class MyEmailDeliveriesController {
  constructor(private readonly service: EmailDeliveryService) {}
  @Get() list(@Req() req: Request) { return this.service.journal(user(req)); }
}
@Controller('admin/accounts') @UseGuards(AdminGuard)
export class AdminEmailDeliveriesController {
  constructor(private readonly service: EmailDeliveryService) {}
  @Get(':id/email-deliveries') list(@Req() req: Request, @Param('id',ParseUUIDPipe) id: string) {
    authorizeAdmin(req,'accounts'); return this.service.journal(id,true);
  }
}
@Module({controllers:[EmailWebhookController,MyEmailDeliveriesController,AdminEmailDeliveriesController],providers:[EmailDeliveryService,SessionGuard,AdminGuard]})
export class EmailDeliveryModule {}
