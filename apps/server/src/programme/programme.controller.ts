import { Body, Controller, Delete, Get, Header, HttpCode, Param, Patch, Post, Req, Res } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import type { Request, Response } from "express";
import { ParticipantAuth } from "../auth/admin-auth";
import { ApiStandardErrors } from "../http/envelope";
import {
  JoinSessionsDto,
  OnboardingCodeDto,
  OnboardingDirectDto,
  PatchParticipantProfileDto,
  RequestCodeDto,
  RegisterParticipantDto,
  StartInterestDto,
  VerifyCodeDto,
} from "./programme.dto";
import { ParticipantAccessService } from "./participant-access.service";
import { ProgrammeService } from "./programme.service";

type Authed = Request & { user?: { id: string; role: string } };

const clientIp = (request: Request) =>
  String(request.headers["x-forwarded-for"] ?? "").split(",")[0]?.trim() || request.socket.remoteAddress || "unknown";

@ApiTags("Programme")
@ApiStandardErrors()
@Controller()
export class ProgrammeController {
  constructor(
    private readonly programme: ProgrammeService,
    private readonly access: ParticipantAccessService,
  ) {}

  @Get("programme")
  // Admins change the schedule live: browsers and proxies must never serve an old copy.
  @Header("Cache-Control", "no-store")
  @ApiOperation({ summary: "Programme public du festival, par jour" })
  publicProgramme() {
    return this.programme.publicProgramme();
  }

  @Post("programme/interest")
  @HttpCode(200)
  @ApiOperation({ summary: "Enregistrer une sélection et envoyer le code de confirmation par e-mail" })
  startInterest(@Body() body: StartInterestDto, @Req() request: Request) {
    return this.access.startInterest(body, clientIp(request));
  }

  /** Public one-step participant registration: no e-mail OTP and no login session. */
  @Post("programme/register")
  @HttpCode(201)
  @Header("Cache-Control", "no-store")
  @ApiOperation({ summary: "Inscription publique aux activités sans vérification e-mail préalable" })
  registerDirect(@Body() body: RegisterParticipantDto, @Req() request: Request) {
    return this.access.registerDirect(body, clientIp(request));
  }

  @Post("participant-auth/onboarding")
  @HttpCode(200)
  @Header("Cache-Control", "no-store")
  @ApiOperation({ summary: "Créer ou ouvrir directement un espace innovateur/organisation sans code ni mot de passe" })
  onboardingDirect(
    @Body() body: OnboardingDirectDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    return this.access.onboardingDirect(body, clientIp(request), response);
  }

  @Post("participant-auth/access")
  @HttpCode(200)
  @ApiOperation({ summary: "Ouvrir « Mon espace » avec la seule adresse e-mail, sans code" })
  accessSpace(@Body() body: RequestCodeDto, @Req() request: Request, @Res({ passthrough: true }) response: Response) {
    return this.access.access(body.email, clientIp(request), response);
  }

  @Post("participant-auth/request-code")
  @HttpCode(200)
  @ApiOperation({ summary: "Recevoir un code de connexion à « Mon espace » (voie de secours)" })
  requestCode(@Body() body: RequestCodeDto, @Req() request: Request) {
    return this.access.requestCode(body.email, clientIp(request));
  }

  @Post("participant-auth/onboarding-code")
  @HttpCode(200)
  @ApiOperation({ summary: "S'inscrire comme innovateur ou organisation : recevoir un code" })
  onboardingCode(@Body() body: OnboardingCodeDto, @Req() request: Request) {
    return this.access.requestOnboardingCode(body.email, body.profile, clientIp(request));
  }

  @Post("participant-auth/verify")
  @HttpCode(200)
  @ApiOperation({ summary: "Vérifier le code, ouvrir la session et appliquer la sélection en attente" })
  verify(@Body() body: VerifyCodeDto, @Req() request: Request, @Res({ passthrough: true }) response: Response) {
    return this.access.verify(body.email, body.otp, request, response);
  }

  @ParticipantAuth()
  @Get("me/programme")
  @Header("Cache-Control", "no-store")
  @ApiOperation({ summary: "Mes sessions et les changements non vus" })
  myProgramme(@Req() request: Authed) {
    return this.programme.myProgramme(request.user!.id);
  }

  @ParticipantAuth()
  @Post("me/programme/sessions")
  @HttpCode(200)
  @ApiOperation({ summary: "S'inscrire ou demander à participer à des sessions" })
  join(@Req() request: Authed, @Body() body: JoinSessionsDto) {
    return this.programme.joinMany(request.user!.id, body.sessionIds);
  }

  @ParticipantAuth()
  @Delete("me/programme/sessions/:sessionId")
  @ApiOperation({ summary: "Se désinscrire ou retirer une demande" })
  cancel(@Req() request: Authed, @Param("sessionId") sessionId: string) {
    return this.programme.cancel(request.user!.id, sessionId);
  }

  @ParticipantAuth()
  @Post("me/programme/seen")
  @HttpCode(200)
  @ApiOperation({ summary: "Marquer les changements du programme comme vus" })
  markSeen(@Req() request: Authed) {
    return this.programme.markSeen(request.user!.id);
  }

  @ParticipantAuth()
  @Get("me/participant")
  @ApiOperation({ summary: "Mon profil participant" })
  profile(@Req() request: Authed) {
    return this.access.profile(request.user!.id);
  }

  @ParticipantAuth()
  @Post("me/participant/become-innovator")
  @HttpCode(200)
  @ApiOperation({ summary: "Passer de participant à innovateur pour soumettre un projet" })
  becomeInnovator(@Req() request: Authed, @Res({ passthrough: true }) response: Response) {
    return this.access.becomeInnovator(request.user!.id, request, response);
  }

  @ParticipantAuth()
  @Post("me/participant/become-organization")
  @HttpCode(200)
  @ApiOperation({ summary: "Passer de participant à organisation" })
  becomeOrganization(@Req() request: Authed, @Res({ passthrough: true }) response: Response) {
    return this.access.becomeOrganization(request.user!.id, request, response);
  }

  @ParticipantAuth()
  @Patch("me/participant")
  @ApiOperation({ summary: "Mettre à jour ville et WhatsApp" })
  patchProfile(@Req() request: Authed, @Body() body: PatchParticipantProfileDto) {
    return this.access.patchProfile(request.user!.id, body);
  }
}
