import { Module } from "@nestjs/common";
import { MailerModule } from "../mailer/mailer.module";
import { BroadcastController } from "./broadcast.controller";
import { BroadcastService } from "./broadcast.service";

@Module({
  imports: [MailerModule],
  controllers: [BroadcastController],
  providers: [BroadcastService],
})
export class BroadcastModule {}
