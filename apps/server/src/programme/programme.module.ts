import { Module } from "@nestjs/common";
import { MailerModule } from "../mailer/mailer.module";
import { ProgrammeAdminController } from "./programme-admin.controller";
import { ProgrammeAdminService } from "./programme-admin.service";
import { ParticipantAccessService } from "./participant-access.service";
import { ProgrammeController } from "./programme.controller";
import { ProgrammeService } from "./programme.service";

@Module({
  imports: [MailerModule],
  controllers: [ProgrammeController, ProgrammeAdminController],
  providers: [ProgrammeService, ParticipantAccessService, ProgrammeAdminService],
  exports: [ProgrammeService],
})
export class ProgrammeModule {}
