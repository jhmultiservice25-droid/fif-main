import { Module } from "@nestjs/common";
import { MailerModule } from "../mailer/mailer.module";
import { CatalogueController } from "./catalogue.controller";
import { CatalogueService } from "./catalogue.service";

@Module({
  imports: [MailerModule],
  controllers: [CatalogueController],
  providers: [CatalogueService],
})
export class CatalogueModule {}
