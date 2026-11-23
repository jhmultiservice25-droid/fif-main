import { Global, Module } from "@nestjs/common";
import { MailerService } from "./mailer.service";

/** Global: most features send mail now (badges, codes, candidatures, programme, showcase, mises en relation). */
@Global()
@Module({
  providers: [MailerService],
  exports: [MailerService],
})
export class MailerModule {}
