import { Module } from "@nestjs/common";
import { MailerModule } from "../mailer/mailer.module";
import { ProgrammeModule } from "../programme/programme.module";
import { ShowcaseController } from "./showcase.controller";
import { ShowcaseService } from "./showcase.service";

@Module({
  imports: [MailerModule, ProgrammeModule],
  controllers: [ShowcaseController],
  providers: [ShowcaseService],
})
export class ShowcaseModule {}
