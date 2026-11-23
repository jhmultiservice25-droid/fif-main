import { Controller, Get, Param, Patch, Req } from "@nestjs/common";
import { ModuleRef } from "@nestjs/core";
import { ApiOperation, ApiParam, ApiTags } from "@nestjs/swagger";
import type { Request } from "express";
import { AdminAuth, ParticipantAuth } from "../auth/admin-auth";
import { ApiOkData, ApiStandardErrors } from "../http/envelope";
import { CheckInResultResponse, EventPassResponse, MyEventPassResponse, ResendEmailResponse } from "../http/models";
import { ParticipantAccessService } from "../programme/participant-access.service";
import { EventPassService } from "./event-pass.service";

type Authed = Request & { user?: { id: string; email: string; name?: string; role: string } };

@ApiStandardErrors()
@Controller()
export class EventPassController {
  constructor(
    private readonly eventPasses: EventPassService,
    private readonly moduleRef: ModuleRef,
  ) {}

  /** Resolved lazily: the programme module depends on event passes, not the other way round. */
  private get participantAccess() {
    return this.moduleRef.get(ParticipantAccessService, { strict: false });
  }

  @ParticipantAuth()
  @Get("me/event-pass")
  @ApiTags("Organisation", "Innovateur")
  @ApiOperation({ summary: "Mon badge FIF 2026 (code QR)" })
  @ApiOkData(MyEventPassResponse)
  async mine(@Req() request: Authed) {
    const user = request.user!;
    // Someone who registered as a participant keeps that badge, even after becoming an innovator.
    const participantPass = await this.participantAccess.passForParticipantUser(user.id);
    if (participantPass) {
      return participantPass;
    }
    const kind = user.role === "ORGANIZATION" ? "ORGANIZATION" : "INNOVATOR";
    const pass = await this.eventPasses.getOrIssueForSource({
      kind,
      sourceId: user.id,
      fullName: user.name ?? user.email,
      email: user.email,
    });
    return this.eventPasses.withQrCode(pass);
  }

  @AdminAuth()
  @Get("admin/checkin")
  @ApiTags("Admin")
  @ApiOperation({ summary: "Derniers badges enregistrés sur place" })
  @ApiOkData([EventPassResponse])
  recent() {
    return this.eventPasses.listRecentCheckIns();
  }

  @AdminAuth()
  @Get("admin/checkin/:token")
  @ApiTags("Admin")
  @ApiOperation({ summary: "Vérifier un badge à partir de son code QR" })
  @ApiParam({ name: "token" })
  @ApiOkData(EventPassResponse)
  verify(@Param("token") token: string) {
    return this.eventPasses.verify(token);
  }

  @AdminAuth()
  @Patch("admin/checkin/:token/confirm")
  @ApiTags("Admin")
  @ApiOperation({ summary: "Confirmer l'entrée sur place" })
  @ApiParam({ name: "token" })
  @ApiOkData(CheckInResultResponse)
  async confirm(@Param("token") token: string) {
    const { pass, alreadyCheckedIn } = await this.eventPasses.confirmCheckIn(token);
    return { ...pass, alreadyCheckedIn };
  }

  @AdminAuth()
  @Patch("admin/checkin/:token/resend-email")
  @ApiTags("Admin")
  @ApiOperation({ summary: "Renvoyer manuellement l'e-mail de confirmation (badge)" })
  @ApiParam({ name: "token" })
  @ApiOkData(ResendEmailResponse)
  async resendEmail(@Param("token") token: string) {
    const { pass, emailSent } = await this.eventPasses.resendEmail(token);
    return { ...pass, emailSent };
  }
}
