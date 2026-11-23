import { Module } from "@nestjs/common";
import { AdminInnovatorsController } from "./admin-innovators.controller";
import { AdminProjectsController } from "./admin-projects.controller";
import { InnovatorsController } from "./innovators.controller";
import { InnovatorsService } from "./innovators.service";

@Module({
  controllers: [InnovatorsController, AdminProjectsController, AdminInnovatorsController],
  providers: [InnovatorsService],
  exports: [InnovatorsService],
})
export class InnovatorsModule {}
