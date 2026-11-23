import { Body, Controller, Get, Header, HttpCode, Post, Put } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { AdminAuth } from "../auth/admin-auth";
import { ApiStandardErrors } from "../http/envelope";
import { FestivalDaysPreviewDto, FestivalSettingsDto } from "./festival.dto";
import { FestivalService } from "./festival.service";

@ApiStandardErrors()
@Controller()
export class FestivalController {
  constructor(private readonly festival: FestivalService) {}

  @Get("festival")
  @Header("Cache-Control", "no-store")
  @ApiTags("Festival")
  @ApiOperation({ summary: "Identité, dates et échéances du festival" })
  publicView() {
    return this.festival.publicView();
  }

  @AdminAuth()
  @Get("admin/festival")
  @Header("Cache-Control", "no-store")
  @ApiTags("Admin")
  @ApiOperation({ summary: "Réglages du festival" })
  settings() {
    return this.festival.publicView();
  }

  @AdminAuth()
  @Post("admin/festival/preview")
  @HttpCode(200)
  @ApiTags("Admin")
  @ApiOperation({ summary: "Ce qu'un changement de dates déplacerait (sans enregistrer)" })
  preview(@Body() body: FestivalDaysPreviewDto) {
    return this.festival.previewUpdate(body.days);
  }

  @AdminAuth()
  @Put("admin/festival")
  @ApiTags("Admin")
  @ApiOperation({ summary: "Modifier les dates et l'identité (les sessions suivent les jours déplacés)" })
  update(@Body() body: FestivalSettingsDto) {
    return this.festival.update(body);
  }
}
