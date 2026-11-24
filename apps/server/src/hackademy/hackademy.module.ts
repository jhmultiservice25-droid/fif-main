import { Module } from "@nestjs/common";
import { HackademyController } from "./hackademy.controller";
import { HackademyService } from "./hackademy.service";

@Module({
  controllers: [HackademyController],
  providers: [HackademyService],
})
export class HackademyModule {}
