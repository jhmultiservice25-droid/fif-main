import { Body, Controller, Delete, Get, Header, HttpCode, Param, Patch, Post, Req, Res } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import type { Request, Response } from "express";
import { AdminAuth } from "../auth/admin-auth";
import { ApiStandardErrors } from "../http/envelope";
import {
  AddAttendeeDto,
  CancelSessionDto,
  CheckSessionDto,
  DecideRequestsDto,
  RoomInputDto,
  SessionInputDto,
  UpdateSessionDto,
} from "./programme-admin.dto";
import { ProgrammeAdminService } from "./programme-admin.service";

type Authed = Request & { user?: { id: string } };

@ApiTags("Admin")
@ApiStandardErrors()
@AdminAuth()
@Controller("admin/programme")
export class ProgrammeAdminController {
  constructor(private readonly admin: ProgrammeAdminService) {}

  @Get()
  @Header("Cache-Control", "no-store")
  @ApiOperation({ summary: "Programme complet : jours, salles, sessions, compteurs et conflits" })
  overview() {
    return this.admin.overview();
  }

  @Post("sessions/check")
  @HttpCode(200)
  @ApiOperation({ summary: "Vérifier les conflits d'une session sans l'enregistrer" })
  check(@Body() body: CheckSessionDto) {
    return this.admin.check(body);
  }

  @Post("sessions")
  @ApiOperation({ summary: "Créer une session (409 si conflit bloquant non confirmé)" })
  create(@Body() body: SessionInputDto, @Req() request: Authed) {
    return this.admin.create(body, request.user!.id);
  }

  @Patch("sessions/:id")
  @ApiOperation({ summary: "Modifier une session (verrou optimiste par version)" })
  update(@Param("id") id: string, @Body() body: UpdateSessionDto, @Req() request: Authed) {
    return this.admin.update(id, body, request.user!.id);
  }

  @Post("sessions/:id/cancel")
  @HttpCode(200)
  @ApiOperation({ summary: "Annuler une session et prévenir les inscrits" })
  cancel(@Param("id") id: string, @Body() body: CancelSessionDto, @Req() request: Authed) {
    return this.admin.cancel(id, body.reason, request.user!.id);
  }

  @Post("sessions/:id/restore")
  @HttpCode(200)
  @ApiOperation({ summary: "Reprogrammer une session annulée" })
  restore(@Param("id") id: string, @Req() request: Authed) {
    return this.admin.restore(id, request.user!.id);
  }

  @Post("sessions/:id/duplicate")
  @ApiOperation({ summary: "Dupliquer une session (sans salle)" })
  duplicate(@Param("id") id: string, @Req() request: Authed) {
    return this.admin.duplicate(id, request.user!.id);
  }

  @Delete("sessions/:id")
  @ApiOperation({ summary: "Supprimer une session sans inscrit" })
  remove(@Param("id") id: string) {
    return this.admin.remove(id);
  }

  @Get("sessions/:id/history")
  @ApiOperation({ summary: "Historique des modifications" })
  history(@Param("id") id: string) {
    return this.admin.history(id);
  }

  @Get("sessions/:id/attendees")
  @ApiOperation({ summary: "Participants d'une session" })
  attendees(@Param("id") id: string) {
    return this.admin.attendees(id);
  }

  @Get("sessions/:id/attendees.csv")
  @ApiOperation({ summary: "Export CSV des participants" })
  async attendeesCsv(@Param("id") id: string, @Res() response: Response) {
    const { filename, content } = await this.admin.attendeesCsv(id);
    response.setHeader("Content-Type", "text/csv; charset=utf-8");
    response.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    response.send(content);
  }

  @Post("sessions/:id/attendees")
  @ApiOperation({ summary: "Ajouter un participant (seul accès aux sessions sur invitation)" })
  addAttendee(@Param("id") id: string, @Body() body: AddAttendeeDto) {
    return this.admin.addAttendee(id, body);
  }

  @Delete("sessions/:id/attendees/:userId")
  @ApiOperation({ summary: "Retirer un participant" })
  removeAttendee(@Param("id") id: string, @Param("userId") userId: string) {
    return this.admin.removeAttendee(id, userId);
  }

  @Get("requests")
  @ApiOperation({ summary: "Demandes de participation en attente, par session" })
  requests() {
    return this.admin.requests();
  }

  @Post("requests/decide")
  @HttpCode(200)
  @ApiOperation({ summary: "Accepter ou refuser des demandes (une ou plusieurs)" })
  decide(@Body() body: DecideRequestsDto, @Req() request: Authed) {
    return this.admin.decide(body, request.user!.id);
  }

  @Get("rooms")
  @ApiOperation({ summary: "Salles" })
  rooms() {
    return this.admin.rooms();
  }

  @Post("rooms")
  @ApiOperation({ summary: "Créer une salle" })
  createRoom(@Body() body: RoomInputDto) {
    return this.admin.createRoom(body);
  }

  @Patch("rooms/:id")
  @ApiOperation({ summary: "Modifier une salle" })
  updateRoom(@Param("id") id: string, @Body() body: RoomInputDto) {
    return this.admin.updateRoom(id, body);
  }

  @Delete("rooms/:id")
  @ApiOperation({ summary: "Supprimer une salle inutilisée" })
  removeRoom(@Param("id") id: string) {
    return this.admin.removeRoom(id);
  }
}
