import { Global, Module } from "@nestjs/common";
import { FestivalController } from "./festival.controller";
import { FestivalService } from "./festival.service";

@Global()
@Module({
  controllers: [FestivalController],
  providers: [FestivalService],
  exports: [FestivalService],
})
export class FestivalModule {}
