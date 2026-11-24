import { Module } from "@nestjs/common";
import { HackademyController } from "./hackademy.controller";
import { HackademyService } from "./hackademy.service";
import { HackademyRegistrationGuard } from "./hackademy-registration.guard";

@Module({
  controllers: [HackademyController],
  providers: [HackademyService, HackademyRegistrationGuard],
})
export class HackademyModule {}
