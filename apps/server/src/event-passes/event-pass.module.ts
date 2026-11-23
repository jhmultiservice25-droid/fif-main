import { Global, Module } from "@nestjs/common";
import { MailerModule } from "../mailer/mailer.module";
import { EventPassController } from "./event-pass.controller";
import { EventPassService } from "./event-pass.service";

@Global()
@Module({
  imports: [MailerModule],
  controllers: [EventPassController],
  providers: [EventPassService],
  exports: [EventPassService],
})
export class EventPassModule {}
