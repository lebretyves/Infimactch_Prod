import {Controller,Headers,Module,Post,UnauthorizedException} from "@nestjs/common";
import {timingSafeEqual} from "node:crypto";
import {required} from "../config";
import {AutomationModule,AutomationService} from "./automation.module";
import {NotificationsModule,NotificationsService} from "../notifications/notifications.module";
@Controller("internal/automation/jobs")
export class CloudJobsController {
 constructor(private readonly automation:AutomationService,private readonly notifications:NotificationsService){}
 @Post("dispatch") async dispatch(@Headers("x-infimatch-token") token:string){
  const expected=required("SERVICE_TOKEN");
  if(typeof token!=="string"||Buffer.byteLength(token)!==Buffer.byteLength(expected)||!timingSafeEqual(Buffer.from(token),Buffer.from(expected)))throw new UnauthorizedException();
  const events=await this.automation.dispatch(1);
  await this.notifications.dispatch(5);
  return {processed:events.length};
 }
}
@Module({imports:[AutomationModule,NotificationsModule],controllers:[CloudJobsController]})
export class CloudJobsModule {}
