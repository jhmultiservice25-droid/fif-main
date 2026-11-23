import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Res,
} from "@nestjs/common";
import {
  ApiBody,
  ApiExtraModels,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiProduces,
  ApiTags,
} from "@nestjs/swagger";
import type { Response } from "express";
import { AdminAuth } from "../auth/admin-auth";
import {
  ApiCreatedData,
  ApiOkData,
  ApiOkOneOf,
  ApiStandardErrors,
  SkipEnvelope,
} from "../http/envelope";
import {
  AdminStatsResponse,
  ApplicationListPage,
  CommitteeApplicationDetail,
  CommitteeApplicationRecord,
  VolunteerApplicationDetail,
  VolunteerApplicationRecord,
} from "../http/models";
import { ApplicationsService } from "./applications.service";
import {
  CommitteeApplicationDto,
  ListQueryDto,
  PatchApplicationDto,
  VolunteerApplicationDto,
} from "./dto";

@Controller()
@ApiStandardErrors()
@ApiExtraModels(CommitteeApplicationDto, VolunteerApplicationDto, PatchApplicationDto)
export class ApplicationsController {
  constructor(private readonly applications: ApplicationsService) {}

  @Post("applications/committee")
  @ApiTags("Candidatures")
  @ApiOperation({ summary: "Déposer une candidature comité" })
  @ApiBody({ type: CommitteeApplicationDto })
  @ApiCreatedData(CommitteeApplicationRecord, "Candidature comité enregistrée.")
  createCommittee(@Body() body: CommitteeApplicationDto) {
    return this.applications.createCommittee(body);
  }

  @Post("applications/volunteer")
  @ApiTags("Candidatures")
  @ApiOperation({ summary: "Déposer une candidature volontaire" })
  @ApiBody({ type: VolunteerApplicationDto })
  @ApiCreatedData(VolunteerApplicationRecord, "Candidature volontaire enregistrée.")
  createVolunteer(@Body() body: VolunteerApplicationDto) {
    return this.applications.createVolunteer(body);
  }

  @AdminAuth()
  @Get("admin/applications")
  @ApiTags("Admin")
  @ApiOperation({ summary: "Lister les candidatures" })
  @ApiOkData(ApplicationListPage, "Page de candidatures comité et/ou volontaires.")
  list(@Query() query: ListQueryDto) {
    return this.applications.list(query);
  }

  @AdminAuth()
  @Get("admin/applications/export.csv")
  @ApiTags("Admin")
  @ApiOperation({
    summary: "Exporter les candidatures en CSV",
    description: "Réponse `text/csv` brute, hors enveloppe JSON.",
  })
  @ApiProduces("text/csv")
  @SkipEnvelope()
  @ApiOkResponse({
    description: "Fichier CSV. Hors enveloppe JSON.",
    content: {
      "text/csv": {
        schema: {
          type: "string",
          example: "id,type,nom,email,whatsapp,ville,choix,statut,date",
        },
      },
    },
  })
  async exportCsv(@Query() query: ListQueryDto, @Res() res: Response) {
    const csv = await this.applications.exportCsv(query);
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", "attachment; filename=fif-candidatures.csv");
    res.send(csv);
  }

  @AdminAuth()
  @Get("admin/applications/:id")
  @ApiTags("Admin")
  @ApiOperation({ summary: "Détail d’une candidature" })
  @ApiParam({ name: "id" })
  @ApiOkOneOf(
    [CommitteeApplicationDetail, VolunteerApplicationDetail],
    "Candidature comité (avec postes) ou volontaire.",
  )
  getOne(@Param("id") id: string) {
    return this.applications.getOne(id);
  }

  @AdminAuth()
  @Patch("admin/applications/:id")
  @ApiTags("Admin")
  @ApiOperation({ summary: "Mettre à jour le statut ou l’affectation" })
  @ApiParam({ name: "id" })
  @ApiBody({ type: PatchApplicationDto })
  @ApiOkOneOf(
    [CommitteeApplicationRecord, VolunteerApplicationRecord],
    "Candidature mise à jour.",
  )
  patch(@Param("id") id: string, @Body() body: PatchApplicationDto) {
    return this.applications.patch(id, body);
  }

  @AdminAuth()
  @Get("admin/stats")
  @ApiTags("Admin")
  @ApiOperation({ summary: "Compteurs de candidatures" })
  @ApiOkData(AdminStatsResponse, "Totaux et répartitions par statut, poste et équipe.")
  stats() {
    return this.applications.stats();
  }
}
