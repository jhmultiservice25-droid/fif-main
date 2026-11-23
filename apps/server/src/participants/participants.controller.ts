import { Body, Controller, Get, HttpCode, HttpStatus, Param, Patch, Post, Query } from "@nestjs/common";
import { ApiBody, ApiOperation, ApiParam, ApiTags } from "@nestjs/swagger";
import { AdminAuth } from "../auth/admin-auth";
import { ApiCreatedData, ApiOkData, ApiStandardErrors } from "../http/envelope";
import {
  ParticipantAdminListPageResponse,
  ParticipantBadgeResponse,
  ParticipantRegistrationResponse,
  ResendParticipantEmailResponse,
} from "../http/models";
import { MarketplaceListQueryDto } from "../organizations/organizations.dto";
import { ParticipantRegistrationDto } from "./participants.dto";
import { ParticipantsService } from "./participants.service";

@Controller()
@ApiStandardErrors()
export class ParticipantsController {
  constructor(private readonly participants: ParticipantsService) {}

  @Post("applications/participant")
  @ApiTags("Candidatures")
  @ApiOperation({ summary: "S'inscrire comme participant" })
  @ApiBody({ type: ParticipantRegistrationDto })
  @ApiCreatedData(ParticipantRegistrationResponse, "Inscription participant enregistrée.")
  create(@Body() body: ParticipantRegistrationDto) {
    return this.participants.create(body);
  }

  @Post("applications/participant/:id/badge")
  @HttpCode(HttpStatus.OK)
  @ApiTags("Candidatures")
  @ApiOperation({ summary: "Générer/récupérer mon badge participant" })
  @ApiParam({ name: "id" })
  @ApiOkData(ParticipantBadgeResponse)
  getBadge(@Param("id") id: string) {
    return this.participants.getBadge(id);
  }

  @AdminAuth()
  @Get("admin/participants")
  @ApiTags("Admin")
  @ApiOperation({ summary: "Lister les inscriptions participant" })
  @ApiOkData(ParticipantAdminListPageResponse)
  adminList(@Query() query: MarketplaceListQueryDto) {
    return this.participants.adminList(query);
  }

  @AdminAuth()
  @Patch("admin/participants/:id/resend-email")
  @ApiTags("Admin")
  @ApiOperation({ summary: "Renvoyer l'e-mail de confirmation à un participant" })
  @ApiParam({ name: "id" })
  @ApiOkData(ResendParticipantEmailResponse)
  async resendEmail(@Param("id") id: string) {
    const emailSent = await this.participants.resendEmail(id);
    return { emailSent };
  }
}
