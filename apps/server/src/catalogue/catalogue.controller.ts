import { Body, Controller, Get, Header, HttpCode, Param, Post, Query, Req } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import type { Request } from "express";
import { AdminAuth, ParticipantAuth } from "../auth/admin-auth";
import { ApiStandardErrors } from "../http/envelope";
import { CatalogueQueryDto, ContactDto } from "./catalogue.dto";
import { CatalogueService } from "./catalogue.service";

const clientIp = (request: Request) =>
  String(request.headers["x-forwarded-for"] ?? "").split(",")[0]?.trim() || request.socket.remoteAddress || "unknown";

@ApiTags("Catalogue")
@ApiStandardErrors()
@Controller()
export class CatalogueController {
  constructor(private readonly catalogue: CatalogueService) {}

  @Get("catalogue/solutions")
  @Header("Cache-Control", "no-store")
  @ApiOperation({ summary: "Solutions FIF 2026 (sélection importée)" })
  solutions(@Query() query: CatalogueQueryDto) {
    return this.catalogue.solutions(query);
  }

  @Get("catalogue/solutions/:reference")
  @ApiOperation({ summary: "Détail d'une solution" })
  solution(@Param("reference") reference: string) {
    return this.catalogue.solution(reference);
  }

  @Get("catalogue/projects")
  @Header("Cache-Control", "no-store")
  @ApiOperation({ summary: "Projets soumis publiés par leurs porteurs" })
  projects(@Query() query: CatalogueQueryDto) {
    return this.catalogue.projects(query);
  }

  @Get("catalogue/projects/:id")
  @ApiOperation({ summary: "Détail d'un projet publié" })
  project(@Param("id") id: string) {
    return this.catalogue.project(id);
  }

  @Post("catalogue/contact")
  @HttpCode(200)
  @ApiOperation({ summary: "Contacter le porteur (message relayé par e-mail)" })
  contact(@Body() body: ContactDto, @Req() request: Request) {
    return this.catalogue.contact(body, clientIp(request));
  }

  @ParticipantAuth()
  @Get("me/contact-messages")
  @ApiOperation({ summary: "Messages de partenaires reçus pour mes projets" })
  mine(@Req() request: Request & { user?: { id: string } }) {
    return this.catalogue.messagesForOwner(request.user!.id);
  }

  @AdminAuth()
  @Get("admin/contact-messages")
  @ApiOperation({ summary: "Mises en relation (tous les messages)" })
  adminMessages(@Query("page") page?: string) {
    return this.catalogue.adminMessages(Number(page) || 1);
  }
}
